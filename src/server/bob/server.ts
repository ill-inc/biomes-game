import type { BobServerConfig, BobServerContext } from "@/server/bob/main";
import {
  GITHUB_THIS_OWNER,
  GITHUB_THIS_REPO,
  getGitHubOctokitApi,
} from "@/server/shared/github";
import { connectToCustomK8 } from "@/server/shared/k8";
import { getSecret } from "@/server/shared/secrets";
import type { BDB } from "@/server/shared/storage";
import type { DiscordHookType } from "@/server/web/util/discord";
import { postToDiscord } from "@/server/web/util/discord";
import {
  BackgroundTaskController,
  ChainableAbortController,
  forkSignal,
} from "@/shared/abort";
import { log, withLogContext } from "@/shared/logging";
import { createGauge } from "@/shared/metrics/metrics";
import { Timer, TimerNeverSet } from "@/shared/metrics/timer";
import pluralize from "@/shared/plural";
import type { RegistryLoader } from "@/shared/registry";
import { sleep, withTimeout } from "@/shared/util/async";
import { DefaultMap, compactMap } from "@/shared/util/collections";
import type { BackoffConfig } from "@/shared/util/retry_helpers";
import {
  asyncBackoffOnAllErrors,
  asyncBackoffOnRecoverableError,
} from "@/shared/util/retry_helpers";
import { assertNever } from "@/shared/util/type_helpers";
import { createAppAuth } from "@octokit/auth-app";
import { ok } from "assert";
import checkDiskSpace from "check-disk-space";
import { spawn } from "child_process";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "fs/promises";
import { groupBy, uniq } from "lodash";
import { Octokit } from "octokit";
import path from "path";
import type { Readable } from "stream";

const GITHUB_PATH = `https://github.com/${GITHUB_THIS_OWNER}/${GITHUB_THIS_REPO}.git`;
const MOSSY_MUCKER_EMAIL = "110620858+mossymucker@users.noreply.github.com";
const OCTOKIT_CONFIG = {
  owner: GITHUB_THIS_OWNER,
  repo: GITHUB_THIS_REPO,
} as const;

const BACKOFF_CONFIG: BackoffConfig = {
  maxAttempts: 3,
  baseMs: 250,
  exponent: 3,
};
const IMAGE_NAME = "us-central1-docker.pkg.dev/zones-cloud/b/biomes";

type RunOptions = {
  signal: AbortSignal;
  env?: Record<string, string>;
  noVenvInPath?: boolean;
};

type GitChange = {
  hash: string;
  email: string;
  when: Date;
  subject: string;
  body: string;
  checks?: Map<string, number>;
};

type GithubReviewablePr = {
  id: number;
  updatedAtMs: number;
  title: string;
  author: string;
  reviewers: string[];
};

function changeCount(changes: GitChange[]) {
  return `${changes.length} ${pluralize("change", changes.length)}`;
}

function changesToCommitMessage(changes: GitChange[], sha: string) {
  return `Deploy ${changeCount(changes)} as ${sha}`;
}

function shouldIgnoreChange(change: GitChange) {
  if (CONFIG.bobIgnoreChangeEmails.includes(change.email)) {
    return true;
  }
  const match = CONFIG.bobIgnoreChangeSubject.exec(change.subject);
  if (match) {
    return true;
  }
  return false;
}

class MentionThrottler {
  private readonly lookup = new DefaultMap<string, [string, string]>((key) => [
    key,
    key,
  ]);
  private readonly lastMentionedAt = new Map<string, Timer>();

  constructor() {
    this.refreshLookup();
    CONFIG_EVENTS.on("changed", this.refreshLookup);
  }

  private refreshLookup = () => {
    for (const [contacts, discord] of CONFIG.bobGithubEmailToDiscord) {
      for (const contact of contacts) {
        this.lookup.set(contact, discord);
      }
    }
  };

  private emailToDiscord(matchEmail: string): [mention: string, name: string] {
    return this.lookup.get(matchEmail);
  }

  mention(email: string, mode: "always" | "never" | "auto" = "auto"): string {
    const [mention, name] = this.emailToDiscord(email);
    switch (mode) {
      case "auto":
        const lastMentionedAt = this.lastMentionedAt.get(mention);
        if (
          lastMentionedAt === undefined ||
          lastMentionedAt.elapsed > CONFIG.bobMentionMinDelayMs
        ) {
          this.lastMentionedAt.set(mention, new Timer());
          return mention;
        }
        return name;
      case "always":
        return mention;
      case "never":
        return name;
    }
  }

  stop() {
    CONFIG_EVENTS.off("changed", this.refreshLookup);
  }
}

function mentionAllAuthors(mentioner: MentionThrottler, changes: GitChange[]) {
  const authors = new Set(changes.map((change) => change.email));
  return Array.from(authors, (email) => mentioner.mention(email)).join(" ");
}

function changesToPrMessage(changes: GitChange[]) {
  const messages = changes.map(
    ({ hash, email, subject }) => `* ${hash} ${email}: ${subject}`
  );
  return messages.join("\n");
}

function printChanges(changes: GitChange[]) {
  for (const change of changes) {
    const { hash, email, subject } = change;
    log.info(`${hash} ${email}: ${subject}`, {
      change,
    });
  }
}

async function buildStep<R>(name: string, fn: () => Promise<R>): Promise<R> {
  const timer = new Timer();
  log.info(`Starting ${name}...`);
  try {
    return await fn();
  } catch (error) {
    log.error(`Error in ${name}:`, { error });
    throw error;
  } finally {
    log.info(`Finished ${name} in ${timer.elapsed}ms`);
  }
}

function tagName(sha: string) {
  return `bob-${sha}`;
}

function deployBranchName(sha: string) {
  return `mossymucker/deploy-${sha}`;
}

function octokitOrDie() {
  const octokit = getGitHubOctokitApi();
  ok(octokit, "No GitHub API found");
  return octokit;
}

function appOcotkitOrDie() {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: 262950,
      installationId: 31331448,
      privateKey: getSecret("biomesbob-private-key"),
      clientId: "Iv1.5d797f6fb3d6b0e7",
      clientSecret: getSecret("biomesbob-client-secret"),
    },
  });
}

const CHANGE_PR_RE = /\(#(\d+)\)$/;

async function changeForDiscord(
  octokit: Octokit,
  change: GitChange
): Promise<string> {
  const { hash, subject } = change;
  const match = CHANGE_PR_RE.exec(change.subject);
  if (!match) {
    // No pull request info
    return `* ${subject} (${hash})`;
  }
  try {
    const { data: pull } = await octokit.rest.pulls.get({
      ...OCTOKIT_CONFIG,
      pull_number: parseInt(match[1]),
    });
    return `* ${pull.title} (#${pull.number})`;
  } catch (error) {
    // Ignore errors fetching pull info.
  }
  return `* ${subject}`;
}

async function changesForDiscord(
  mentioner: MentionThrottler,
  changes?: GitChange[]
): Promise<string> {
  if (!changes || !changes.length) {
    return "";
  }

  const octokit = octokitOrDie();
  if (changes.length === 1) {
    const change = changes[0];
    return `\n${await changeForDiscord(octokit, change)} by ${mentioner.mention(
      change.email
    )}`;
  }

  const changesByEmail = groupBy(changes, (x) => x.email);
  let output = "";
  for (const [email, changes] of Object.entries(changesByEmail)) {
    output += `\n**By ${mentioner.mention(email)}**`;
    for (const change of changes) {
      output += `\n${await changeForDiscord(octokit, change)}`;
    }
  }
  return output;
}

function logUrl(sha: string, when?: Date) {
  return `https://console.cloud.google.com/logs/query;query=resource.type%3D%22k8s_container%22%0Aresource.labels.container_name%3D%22bob%22%0Alabels.%22k8s-pod%2Fname%22%3D%22bob%22%0AjsonPayload.headSha%3D%22${sha}%22;timeRange=PT3H;summaryFields=:false:32:beginning;cursorTimestamp=${(
    when ?? new Date()
  ).toISOString()}?project=zones-cloud`;
}

interface FluxOkStatus {
  kind: "ok";
  sha: string;
}

interface FluxSuspendedStatus {
  kind: "suspended";
  sha: string;
}

interface FluxErrorStatus {
  kind: "error";
  sha: string;
  error: string;
}

type FluxStatus = FluxOkStatus | FluxSuspendedStatus | FluxErrorStatus;

async function getFluxStatus(): Promise<FluxStatus> {
  const k8 = connectToCustomK8();
  const kustomization = (
    await k8.getNamespacedCustomObject(
      "kustomize.toolkit.fluxcd.io",
      "v1",
      "flux-system",
      "kustomizations",
      "biomes"
    )
  ).body as {
    spec?: {
      suspend?: boolean;
    };
    status?: {
      conditions?: {
        message?: string;
        status?: string;
      }[];
      lastAppliedRevision?: string;
    };
  };
  let sha = kustomization.status?.lastAppliedRevision ?? "";
  if (sha.includes(":")) {
    sha = sha.split(":")[1];
  }
  sha = sha.slice(0, 9);
  if (kustomization.spec?.suspend) {
    return {
      kind: "suspended",
      sha,
    };
  } else if (kustomization.status?.conditions?.[0]?.status !== "True") {
    return {
      kind: "error",
      sha,
      error: kustomization.status?.conditions?.[0]?.message ?? "",
    };
  }
  return { kind: "ok", sha };
}

export class BobTheBuilder {
  private readonly controller = new BackgroundTaskController();
  private readonly mentioner = new MentionThrottler();
  private lastAnnouncedGremlinCount?: number;

  constructor(
    private readonly config: BobServerConfig,
    private readonly db: BDB,
    private readonly gracefulShutdown: () => void
  ) {}

  get cwd() {
    return path.join(this.config.workspace, CONFIG.bobBaseDirectory);
  }

  // Get the disk usage percentage of the workspace directory.
  async getStorageUsage() {
    const { free, size } = await checkDiskSpace(this.cwd);
    if (!size) {
      return 1.0;
    }
    return Math.max(0, (size - free) / size);
  }

  get venv() {
    return path.join(this.cwd, ".venv");
  }

  get contextDir() {
    return path.join(this.config.workspace, "context");
  }

  private async venvExists(): Promise<boolean> {
    try {
      const info = await stat(path.join(this.venv, "bin", "python3"));
      return info.isFile();
    } catch (error) {
      return false;
    }
  }

  private async workspaceExists(): Promise<boolean> {
    try {
      const info = await stat(this.config.workspace);
      if (info.isDirectory()) {
        const gitDir = await stat(path.join(this.cwd, ".git"));
        return gitDir.isDirectory();
      }
    } catch (error) {
      return false;
    }
    throw new Error(`Workspace ${this.config.workspace} is not a directory`);
  }

  private async run(
    command: string,
    args: string[],
    { signal, env, noVenvInPath }: RunOptions
  ) {
    if (signal.aborted) {
      return;
    }
    const PATH = noVenvInPath
      ? process.env.PATH
      : `${path.join(this.venv, "bin")}:${process.env.PATH}`;
    log.debug(`Running: ${command} ${args.join(" ")}`, { command, args, PATH });
    const controller = new ChainableAbortController().chain(signal);
    const child = spawn(command, args, {
      cwd: this.cwd,
      env: {
        ...process.env,
        NODE_OPTIONS: undefined,
        PATH,
        PWD: path.resolve(this.cwd),
        ...env,
      },
      stdio: ["pipe", "pipe", "pipe"],
      signal: controller.signal,
      killSignal: "SIGKILL",
    });

    // Capture all stdout.
    const output = { text: "" };
    const tail = async (io: Readable) => {
      io.setEncoding("utf8");
      for await (const data of io) {
        if (process.env.TAIL_OUTPUT) {
          process.stdout.write(data);
        }
        output.text += data.toString();
      }
    };
    const tailLogs = Promise.allSettled([
      tail(child.stdout),
      tail(child.stderr),
    ]);

    return new Promise<string>((resolve, reject) => {
      child.on("close", (code) => {
        tailLogs.finally(() => {
          if (code) {
            reject(
              new Error(
                `${command} exited with code: ${child.exitCode}\n${output.text}`
              )
            );
          } else {
            log.debug(`Finished: ${command} ${args.join(" ")}`, {
              command,
              args,
              output,
            });
            resolve(output.text);
          }
        });
      });
      child.on("error", (error) =>
        reject(new Error(`Error running ${command}: ${error}\n${output.text}`))
      );
    }).finally(() => controller.abort());
  }

  private async git(options: RunOptions, ...args: string[]) {
    if (process.env.NODE_ENV !== "production") {
      return this.run("git", args, options);
    }
    return this.run(
      "git",
      ["--config-env", "credential.helper=GIT_CREDENTIAL_HELPER", ...args],
      {
        ...options,
        env: {
          GIT_CREDENTIAL_HELPER:
            '!f() { sleep 1; echo "username=${GIT_USER}"; echo "password=${GIT_PASSWORD}"; }; f',
          GIT_USER: "mossymucker",
          GIT_PASSWORD: getSecret("github-mossy-mucker-personal-access-token"),
        },
      }
    );
  }

  private async gitAnyFilesChanged(signal: AbortSignal): Promise<boolean> {
    if (!(await this.workspaceExists())) {
      return false;
    }
    const status = await this.git({ signal }, "status", "--porcelain");
    return Boolean(status?.trim()?.length);
  }

  private async cleanGit(signal: AbortSignal) {
    if (!(await this.workspaceExists())) {
      return;
    }
    await buildStep("clean-git", async () => {
      await this.git({ signal }, "reset", "HEAD", "--hard");
      await this.git({ signal }, "clean", "-fd");
      await this.git({ signal }, "checkout", "main");
      await this.git({ signal }, "reset", "HEAD", "--hard");
      await this.git({ signal }, "clean", "-fd");
    });
  }

  private async prepareGitAuthor(signal: AbortSignal) {
    if (process.env.NODE_ENV !== "production") {
      return;
    }
    await this.git(
      { signal },
      "config",
      "--global",
      "user.email",
      MOSSY_MUCKER_EMAIL
    );
    await this.git(
      { signal },
      "config",
      "--global",
      "user.name",
      "Mossy Mucker"
    );
  }

  private async cloneRepo(signal: AbortSignal) {
    try {
      await buildStep("erase-old-code", () =>
        rm(this.cwd, {
          recursive: true,
          force: true,
        })
      );
    } catch (error) {
      // ..ignore
    }
    await buildStep("make-cwd", () => mkdir(this.cwd, { recursive: true }));
    await buildStep("clone-repo", () =>
      this.git({ signal }, "clone", GITHUB_PATH, ".")
    );
  }

  private async pullRepo(signal: AbortSignal) {
    await buildStep("pull-code", () => this.git({ signal }, "pull"));
  }

  private async updateRepo(signal: AbortSignal) {
    // Check if directory config exists
    // If not, clone repo
    // If so, pull repo
    if (await this.workspaceExists()) {
      if (!process.env.BOB_OVERRIDE_BUILD_SHA) {
        await this.pullRepo(signal);
      }
    } else {
      await this.cloneRepo(signal);
    }
    if (process.env.BOB_OVERRIDE_BUILD_SHA) {
      await buildStep("checkout-override-branch", () =>
        this.git({ signal }, "checkout", process.env.BOB_OVERRIDE_BUILD_SHA!)
      );
    }
    await buildStep("pull-lfs", () => this.git({ signal }, "lfs", "pull"));
  }

  private async pip(signal: AbortSignal, ...args: string[]) {
    await this.run("pip3", args, { signal });
  }

  private async yarn(signal: AbortSignal, ...args: string[]) {
    await this.run("yarn", args, { signal });
  }

  private async b(signal: AbortSignal, ...args: string[]) {
    await this.run("./b", ["--build-config=release"].concat(args), { signal });
  }

  private async getHeadSha(signal: AbortSignal) {
    const output = await this.git({ signal }, "rev-parse", "--short", "HEAD");
    return (output ?? "unknown").trim();
  }

  private async determineProductionBuild() {
    const k8File = await readFile(
      path.join(this.cwd, "deploy", "k8", "biomes.ts"),
      "utf8"
    );
    const match = k8File.match(/LAST_BOB_BUILD = "([^"]+)"/);
    if (!match) {
      throw new Error("Failed to find LAST_BOB_BUILD in k8 file");
    }
    const parts = match[1].split("-", 2);
    return parts[1] ?? parts[0];
  }

  private async changesSince(
    signal: AbortSignal,
    lastSha: string
  ): Promise<GitChange[]> {
    const raw = await this.git(
      { signal },
      "log",
      "--pretty=tformat:%h\t%ae\t%at\t%s\t%b\t\t",
      `${lastSha}...HEAD`
    );
    if (!raw) {
      log.info("No changes since last build");
      return [];
    }
    const rawChanges = raw.split("\t\t").map((x) => x.trim());
    const output: GitChange[] = [];
    for (const rawChange of rawChanges) {
      const parts = rawChange.split("\t").map((x) => x.trim());
      if (parts.length < 4) {
        continue;
      }
      const [hash, email, timestamp, subject, body] = parts;
      const change = <GitChange>{
        hash,
        email,
        when: new Date(parseInt(timestamp, 10) * 1000),
        subject,
        body: body ?? "",
      };
      if (shouldIgnoreChange(change)) {
        continue;
      }
      output.push(change);
    }
    return output;
  }

  private async filedChangedSince(
    signal: AbortSignal,
    lastSha: string
  ): Promise<string[]> {
    const raw = await this.git(
      { signal },
      "diff",
      "--name-only",
      `${lastSha}...HEAD`
    );
    if (!raw) {
      return [];
    }
    return compactMap(raw.split(/\s+/), (x) => x.trim());
  }

  private async updateDependencies(signal: AbortSignal) {
    await Promise.all([
      buildStep("python-dependencies", async () => {
        if (!(await this.venvExists())) {
          await buildStep("setup-venv", () =>
            this.run("python3", ["-m", "venv", "--copies", this.venv], {
              signal,
              noVenvInPath: true,
            })
          );
        }
        await buildStep("pip-install", () =>
          this.pip(signal, "install", "-r", "requirements.txt")
        );
        await buildStep("install-voxeloo", () =>
          this.pip(signal, "install", "./voxeloo")
        );
      }),
      buildStep("yarn-dependencies", () =>
        this.yarn(
          signal,
          "install",
          "--production=false", // We want devDependencies
          "--frozen-lockfile",
          "--non-interactive"
        )
      ),
    ]);
  }

  private async runLintAndTest(signal: AbortSignal) {
    await Promise.all([
      buildStep("lint", () => this.b(signal, "lint", "ts")),
      buildStep("test", () => this.b(signal, "test")),
    ]);
  }

  private async rsyncToContext(
    signal: AbortSignal,
    dirName: string,
    exclude?: string
  ) {
    await this.run(
      "rsync",
      [
        "-aW",
        "--no-compress",
        "--delete",
        ...(exclude ? ["--exclude", exclude] : []),
        `${path.join(this.cwd, dirName)}/`,
        `${path.join(this.contextDir, dirName)}/`,
      ],
      { signal }
    );
  }

  private async setupImageDir(signal: AbortSignal) {
    await mkdir(path.join(this.contextDir, ".next"), { recursive: true });

    await Promise.all([
      this.rsyncToContext(signal, ".next", "cache"),
      ...[
        [".env"],
        ["next.config.js"],
        ["package.json"],
        ["tsconfig.json"],
        ["yarn.lock"],
        ["Dockerfile.biomes", "Dockerfile"],
      ].map(([from, to]) =>
        cp(path.join(this.cwd, from), path.join(this.contextDir, to ?? from), {
          recursive: true,
          force: true,
        })
      ),
      ...[".venv", "node_modules", "src", "dist", "deploy", "public"].map(
        (dir) => this.rsyncToContext(signal, dir)
      ),
    ]);
  }

  private async setupDockerAuth(signal: AbortSignal) {
    await this.run(
      "docker-credential-gcr",
      ["configure-docker", "--registries=us-central1-docker.pkg.dev"],
      { signal }
    );
  }

  private async buildImage(signal: AbortSignal, headSha: string) {
    await Promise.all([
      buildStep("create-image-dir", async () => this.setupImageDir(signal)),
      buildStep("setup-docker-auth", async () => this.setupDockerAuth(signal)),
    ]);

    // Build Docker image.
    await buildStep("docker-image", async () =>
      this.run(
        "docker",
        [
          "build",
          "--tag",
          `${IMAGE_NAME}:${tagName(headSha)}`,
          "--tag",
          `${IMAGE_NAME}:latest`,
          this.contextDir,
        ],
        {
          signal,
        }
      )
    );

    // Push the image
    await buildStep("push-image", () => this.pushImage(signal));
  }

  private async pushImage(signal: AbortSignal | undefined) {
    const maxAttempts = 5;
    for (
      let attempt = 0;
      !signal?.aborted && attempt < maxAttempts;
      ++attempt
    ) {
      log.info(`Pushing image (attempt ${attempt + 1} of ${maxAttempts})...`);
      if (
        await withTimeout(
          async (signal) => {
            try {
              await this.run("docker", ["push", "--all-tags", IMAGE_NAME], {
                signal,
              });
              return true;
            } catch (error) {
              log.error(`Failed to push image: ${error}`, { error });
              return false;
            }
          },
          // Give it 30 min to upload.
          30 * 60 * 1000
        )
      ) {
        return;
      }
    }
    throw new Error("Could not push image after multiple attempts!");
  }

  private async notifyDiscord(
    sha: string,
    message: string,
    extra: {
      includeLogLink?: boolean;
      changes?: GitChange[];
      hook?: DiscordHookType; // default to deploy
    } = {}
  ) {
    if (
      process.env.NODE_ENV !== "production" &&
      !process.env.BOB_NOTIFY_DISCORD
    ) {
      return;
    }
    try {
      await postToDiscord(extra.hook ?? "deploy", {
        username: "Mossy Mucker",
        avatar_url: "https://avatars.githubusercontent.com/u/110620858?v=4",
        content:
          message + (await changesForDiscord(this.mentioner, extra.changes)),
        ...(sha && extra.includeLogLink
          ? {
              embeds: [
                {
                  title: "View logs",
                  url: logUrl(sha),
                },
              ],
            }
          : {}),
      });
    } catch (error) {
      log.warn(`Failed to notify Discord: ${message}`, { error });
    }
  }

  private async prepareRepo(
    signal: AbortSignal
  ): Promise<[lastSha: string, headSha: string] | undefined> {
    try {
      await buildStep("clean-repo", async () => {
        try {
          await this.cleanGit(signal);
        } catch (error) {
          log.warn("Failed to clean git state, wiping entirely", { error });
          await Promise.all([
            rm(this.cwd, {
              recursive: true,
              force: true,
            }),
            rm(this.contextDir, {
              recursive: true,
              force: true,
            }),
          ]);
        }
      });

      return await buildStep("update-repo", async () => {
        await this.cleanGit(signal);
        await this.updateRepo(signal);
        return Promise.all([
          this.determineProductionBuild(),
          this.getHeadSha(signal),
        ]);
      });
    } catch (error) {
      log.error("Error preparing", { error });
    }
  }

  private async discordNotifyError(
    headSha: string,
    message: string,
    error: any
  ) {
    if (String(error).includes("AbortError")) {
      await this.notifyDiscord(
        headSha,
        `\uD83D\uDD54 Bob restarting, will start over`
      );
    } else if ((await this.getStorageUsage()) > 0.85) {
      await this.notifyDiscord(
        headSha,
        `\uD83D\uDC94 ${message} \`${headSha}\`:\nDisk usage high, restarting.`
      );
      this.gracefulShutdown();
    } else {
      await this.notifyDiscord(
        headSha,
        `\uD83D\uDC94 ${message} \`${headSha}\`:\nWill try again soon!`,
        {
          includeLogLink: true,
        }
      );
    }
  }

  private async build(
    signal: AbortSignal,
    changes: GitChange[],
    headSha: string
  ): Promise<boolean> {
    await this.notifyDiscord(
      headSha,
      `\u2692\uFE0F Building \`${headSha}\` with ${changeCount(changes)}`,
      {
        changes,
      }
    );
    try {
      await buildStep(`build-${headSha}`, async () => {
        await this.updateDependencies(signal);
        if (!process.env.BOB_SKIP_LINT_AND_TEST) {
          await this.runLintAndTest(signal);
        }

        await buildStep("mark-build", async () => {
          await mkdir(path.join(this.cwd, ".next"), { recursive: true });
          await writeFile(path.join(this.cwd, ".next", "BUILD_ID"), headSha);
        });

        // Build things.
        await Promise.all([
          buildStep("build-client", () => this.b(signal, "build", "next")),
          buildStep("build-server", () => this.b(signal, "build", "server")),
        ]);

        // Prepare things.
        await buildStep("source-maps", async () =>
          this.run("./scripts/separate_source_maps.sh", [], { signal })
        );
      });
    } catch (error: any) {
      log.error("Error Building", { error });
      await this.discordNotifyError(headSha, "Build failed", error);
      return false;
    }
    return true;
  }

  private async gsRsync(signal: AbortSignal, origin: string, dest: string) {
    await asyncBackoffOnRecoverableError(
      () =>
        this.run(
          "gsutil",
          ["-m", "rsync", "-c", "-r", origin, `gs://${dest}`],
          {
            signal,
          }
        ),
      () => true,
      {
        baseMs: 500,
        maxMs: 10000,
        maxAttempts: 5,
        exponent: 2,
      }
    );
  }

  private async gsRsyncContents(
    signal: AbortSignal,
    originDir: string,
    destDir: string
  ) {
    const work: Promise<unknown>[] = [];
    for (const file of await readdir(path.join(this.cwd, originDir), {
      withFileTypes: true,
    })) {
      if (!file.isDirectory()) {
        continue;
      }
      work.push(
        this.gsRsync(
          signal,
          path.join(originDir, file.name),
          path.join(destDir, file.name)
        )
      );
    }
    await Promise.all(work);
  }

  private async setProdBuild(sha: string) {
    const k8Config = path.join(this.cwd, "deploy", "k8", "biomes.ts");
    const contents = await readFile(k8Config, "utf8");
    await writeFile(
      k8Config,
      contents.replace(
        /const LAST_BOB_BUILD = "[a-z0-9-]+";/,
        `const LAST_BOB_BUILD = "${tagName(sha)}";`
      )
    );
  }

  private async setProdImage(sha: string) {
    const k8Config = path.join(this.cwd, "deploy", "k8", "biomes.ts");
    const contents = await readFile(k8Config, "utf8");
    await writeFile(
      k8Config,
      contents.replace(
        /const LAST_BOB_IMAGE = "[a-z0-9-]+";/,
        `const LAST_BOB_IMAGE = "${tagName(sha)}";`
      )
    );
  }

  private async createDeployCommit(
    signal: AbortSignal,
    changes: GitChange[],
    sha: string,
    changeImage: boolean
  ): Promise<boolean> {
    await this.git({ signal }, "checkout", "-b", deployBranchName(sha));
    await this.setProdBuild(sha);
    if (changeImage) {
      await this.setProdImage(sha);
    }
    await buildStep("build-deploy", () => this.yarn(signal, "build:deploy"));
    if (!(await this.gitAnyFilesChanged(signal))) {
      return false;
    }
    await this.git(
      { signal },
      "commit",
      "-am",
      changesToCommitMessage(changes, sha)
    );
    return true;
  }

  private async pushDeployCommit(signal: AbortSignal, sha: string) {
    await buildStep("push-commit", () =>
      this.git({ signal }, "push", "origin", deployBranchName(sha))
    );
  }

  private async markStarted(
    signal: AbortSignal,
    linkSha: string,
    changes: GitChange[],
    checkName: string
  ) {
    const octokit = appOcotkitOrDie();
    const now = new Date();
    // Used for log links.
    const oneHourFromNow = new Date();
    oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);
    for (const result of await Promise.allSettled(
      changes.map(async (change) => {
        const result = await asyncBackoffOnAllErrors(
          () =>
            octokit.rest.checks.create({
              ...OCTOKIT_CONFIG,
              request: { signal },
              status: "in_progress",
              name: checkName,
              head_sha: change.hash,
              details_url: logUrl(linkSha, oneHourFromNow),
              started_at: now.toISOString(),
            }),
          BACKOFF_CONFIG
        );
        (change.checks ??= new Map()).set(checkName, result.data.id);
      })
    )) {
      if (result.status === "rejected") {
        log.warn("Failed to mark started", { error: result.reason });
      }
    }
  }

  private async markCompleted(
    changes: GitChange[],
    checkName: string,
    conclusion: "failure" | "success"
  ) {
    const octokit = appOcotkitOrDie();
    const now = new Date();
    for (const result of await Promise.allSettled(
      changes.map(async (change) => {
        const checkRunId = change.checks?.get(checkName);
        if (!checkRunId) {
          return;
        }
        await asyncBackoffOnAllErrors(
          () =>
            octokit.rest.checks.update({
              ...OCTOKIT_CONFIG,
              check_run_id: checkRunId,
              status: "completed",
              completed_at: now.toISOString(),
              conclusion,
            }),
          BACKOFF_CONFIG
        );
      })
    )) {
      if (result.status === "rejected") {
        log.warn("Failed to mark completed", { error: result.reason });
      }
    }
  }

  private async runAsCheck(
    signal: AbortSignal,
    linkSha: string,
    changes: GitChange[],
    checkName: string,
    fn: () => Promise<boolean>
  ) {
    try {
      await this.markStarted(signal, linkSha, changes, checkName);
      if (await fn()) {
        await this.markCompleted(changes, checkName, "success");
        return true;
      }
    } catch (error: any) {
      log.error("Uncaught error in check", { error });
    }
    await this.markCompleted(changes, checkName, "failure");
    return false;
  }

  private async createPr(
    signal: AbortSignal,
    changes: GitChange[],
    sha: string
  ): Promise<number> {
    const octokit = octokitOrDie();
    const response = await octokit.rest.pulls.create({
      ...OCTOKIT_CONFIG,
      request: { signal },
      head: deployBranchName(sha),
      base: "main",
      title: changesToCommitMessage(changes, sha),
      body: changesToPrMessage(changes),
    });
    const pr = response.data.number;
    await octokit.rest.issues.addLabels({
      ...OCTOKIT_CONFIG,
      request: { signal },
      issue_number: pr,
      labels: ["breakglass"],
    } as any);
    return pr;
  }

  private async checkIsMergable(
    signal: AbortSignal,
    pr: number
  ): Promise<"can-merge" | "unknown" | "merged" | "cannot-merge"> {
    const octokit = octokitOrDie();
    const {
      data: { mergeable, state, merged },
    } = await octokit.rest.pulls.get({
      ...OCTOKIT_CONFIG,
      request: { signal },
      pull_number: pr,
    });
    if (state !== "open") {
      if (merged) {
        log.error("#${pr} was merged already", { pr });
        return "merged";
      }
      log.error("#${pr} was closed", { pr });
      return "cannot-merge";
    }
    if (mergeable === false) {
      // Abandon it, it's not mergable.
      log.error(`#${pr} cannot be merged, abandoning`, { pr });
      await octokit.rest.pulls.update({
        ...OCTOKIT_CONFIG,
        // Don't provide the signal, cleanup is important.
        pull_number: pr,
        state: "closed",
      } as any);
      return "cannot-merge";
    }
    return mergeable ? "can-merge" : "unknown";
  }

  private async attemptMergePr(
    signal: AbortSignal,
    pr: number
  ): Promise<boolean> {
    const octokit = octokitOrDie();
    try {
      // Try a merge on a whim anyway.
      const {
        data: { merged },
      } = await octokit.rest.pulls.merge({
        ...OCTOKIT_CONFIG,
        request: { signal },
        pull_number: pr,
        merge_method: "squash",
      } as any);
      return merged;
    } catch (error) {
      log.warn(`#${pr} failed to merge`, { error });
    }
    return false;
  }

  private async mergePr(signal: AbortSignal, pr: number): Promise<boolean> {
    while (await sleep(CONFIG.bobWaitMergableIntervalMs, signal)) {
      const status = await this.checkIsMergable(signal, pr);
      switch (status) {
        case "can-merge":
          if (await this.attemptMergePr(signal, pr)) {
            log.info(`#${pr} merged`);
            return true;
          }
          break;
        case "merged":
          return true;
        case "cannot-merge":
          return false;
        case "unknown":
          break;
        default:
          assertNever(status);
      }
    }
    return false;
  }

  private async deploy(
    signal: AbortSignal,
    changes: GitChange[],
    sha: string
  ): Promise<boolean> {
    try {
      return await buildStep(`deploy-${sha}`, async () => {
        await Promise.all([
          buildStep("image", () => this.buildImage(signal, sha)),
          buildStep("rsync-public", () =>
            this.gsRsyncContents(signal, "public", "biomes-static")
          ),
          buildStep("rsync-static", () =>
            this.gsRsyncContents(
              signal,
              ".next/static",
              "biomes-static/_next/static"
            )
          ),
          buildStep("rsync-source-maps", () =>
            this.gsRsyncContents(
              signal,
              ".next-source-maps/static",
              "biomes-source-maps/_next/static"
            )
          ),
        ]);

        await this.cleanGit(signal);
        try {
          await buildStep("setup-author", () => this.prepareGitAuthor(signal));
          if (
            !(await buildStep("deploy-commit", () =>
              this.createDeployCommit(signal, changes, sha, true)
            ))
          ) {
            // It was successful, but did nothing.
            log.warn("No changes to deploy", { sha });
            return true;
          }
          await buildStep("deploy-commit-push", () =>
            this.pushDeployCommit(signal, sha)
          );
        } finally {
          await this.cleanGit(signal);
        }

        const pr = await buildStep("create-pr", () =>
          this.createPr(signal, changes, sha)
        );
        if (await buildStep("merge-pr", () => this.mergePr(signal, pr))) {
          await this.notifyDiscord(
            sha,
            `\u2764\uFE0F Deployed \`${sha}\` with ${changeCount(
              changes
            )} - FYI ${mentionAllAuthors(this.mentioner, changes)}`
          );
          return true;
        }
        return false;
      });
    } catch (error: any) {
      log.error("Error Deploying", { error });
      await this.discordNotifyError(sha, "Deploy failed", error);
    }
    return false;
  }

  private async k8OnlyDeploy(
    signal: AbortSignal,
    changes: GitChange[],
    sha: string
  ): Promise<boolean> {
    try {
      return await buildStep(`k8-deploy-${sha}`, async () => {
        await this.cleanGit(signal);
        try {
          await buildStep("setup-author", () => this.prepareGitAuthor(signal));
          if (
            !(await buildStep("deploy-commit", () =>
              this.createDeployCommit(signal, changes, sha, false)
            ))
          ) {
            // It was successful, but did nothing.
            log.warn("No changes to deploy", { sha });
            return true;
          }
          await buildStep("deploy-commit-push", () =>
            this.pushDeployCommit(signal, sha)
          );
        } finally {
          await this.cleanGit(signal);
        }

        const pr = await buildStep("create-pr", () =>
          this.createPr(signal, changes, sha)
        );
        if (await buildStep("merge-pr", () => this.mergePr(signal, pr))) {
          await this.notifyDiscord(
            sha,
            `\uD83E\uDE84 Applied K8 Changes \`${sha}\` with ${changeCount(
              changes
            )}`,
            {
              changes,
            }
          );
          return true;
        }
        return false;
      });
    } catch (error: any) {
      log.error("Error K8 Deploying", { error });
      await this.discordNotifyError(sha, "K8 Deploy failed", error);
    }
    return false;
  }

  private async shouldBuild(
    signal: AbortSignal,
    lastSha: string,
    headSha: string
  ): Promise<["deploy" | "code" | "skip", GitChange[]]> {
    if (lastSha === headSha && !process.env.BOB_ALWAYS_BUILD) {
      log.info("No commits since last production build", { headSha });
      return ["skip", []];
    }

    const [files, changes] = await Promise.all([
      this.filedChangedSince(signal, lastSha),
      this.changesSince(signal, lastSha),
    ]);

    if (
      (files.length === 0 || changes.length === 0) &&
      !process.env.BOB_ALWAYS_BUILD
    ) {
      log.info("No files changed since last production build", {
        headSha,
        files,
        changes,
      });
      return ["skip", []];
    }

    if (
      !files.some((file) =>
        CONFIG.bobIgnorePaths.every((ignore) => !file.startsWith(ignore))
      )
    ) {
      log.info("Only ignored files have changed, skipping build", {
        headSha,
        files,
        changes,
      });
      return ["skip", []];
    }
    return [
      files.every((file) =>
        CONFIG.bobDeployPaths.some((path) => file.startsWith(path))
      )
        ? "deploy"
        : "code",
      changes,
    ];
  }

  private async maybeAnnounceGremlins() {
    if (this.lastAnnouncedGremlinCount === CONFIG.gremlinsPopulation) {
      return;
    }
    try {
      await this.notifyDiscord(
        "",
        CONFIG.gremlinsPopulation > 0
          ? `\uD83D\uDC7B ${CONFIG.gremlinsPopulation} gremlins are running around!`
          : `\uD83D\uDC7B NO gremlins are active`
      );
      this.lastAnnouncedGremlinCount = CONFIG.gremlinsPopulation;
    } catch (error) {
      log.warn("Could not announce Gremlin count", { error });
    }
  }

  private async continuousBuild(overallSignal: AbortSignal) {
    let myLastBuiltSha: string | undefined;
    let lastBuildFailed = false;
    while (await sleep(CONFIG.bobBuildIntervalMs, overallSignal)) {
      const signal = forkSignal(overallSignal);
      await this.maybeAnnounceGremlins();

      const result = await this.prepareRepo(signal);
      if (!result) {
        continue;
      }

      const [lastSha, headSha] = result;
      const [mode, changes] = await this.shouldBuild(signal, lastSha, headSha);
      if (mode === "skip") {
        continue;
      }

      if (CONFIG.bobHaltBuilds) {
        log.warn("Builds are halted, skipping build", { headSha });
        await this.notifyDiscord(
          headSha,
          `\uD83D\uDC94 Builds halted, would build \`${headSha}\`! `
        );
        continue;
      }

      printChanges(changes);

      if (myLastBuiltSha === headSha) {
        if (lastBuildFailed) {
          log.warn(
            "Bob failed to build this commit, will delay until proceeding..."
          );
          await sleep(CONFIG.bobStuckOnBuildWaitMs, signal);
        } else {
          log.warn(
            "Bob already attempted this commit, will delay until proceeding..."
          );
          await sleep(CONFIG.bobStuckOnCommitWaitMs, signal);
          myLastBuiltSha = undefined; // Don't wait again.
        }
        continue;
      }

      const runAsCheck = async (
        name: string,
        fn: (
          signal: AbortSignal,
          changes: GitChange[],
          sha: string
        ) => Promise<boolean>
      ) => {
        return this.runAsCheck(signal, headSha, changes, name, () =>
          fn(signal, changes, headSha)
        );
      };

      myLastBuiltSha = headSha;
      await withLogContext(
        {
          extra: {
            changes,
            headSha,
          },
        },
        async () => {
          if (mode === "deploy" && process.env.BOB_DEPLOY) {
            await runAsCheck("BobTheOperator", this.k8OnlyDeploy.bind(this));
          } else if (mode === "code") {
            if (await runAsCheck("BobTheBuilder", this.build.bind(this))) {
              lastBuildFailed = false;
              if (process.env.BOB_DEPLOY) {
                await runAsCheck("BobTheDeployer", this.deploy.bind(this));
              }
            } else {
              lastBuildFailed = true;
            }
          }
        }
      );
    }
  }

  async checkFluxStatusPeriodically(signal: AbortSignal) {
    const lastOk = new Timer(TimerNeverSet);
    let lastStatus: FluxStatus["kind"] | undefined;
    let createdGauge = false;
    do {
      try {
        const status = await getFluxStatus();
        if (status.kind === "ok") {
          lastOk.reset();
        }
        if (status.kind === lastStatus) {
          continue;
        }
        log.info("Flux status changed", { status });
        lastStatus = status.kind;

        switch (status.kind) {
          case "ok":
            await this.notifyDiscord(
              status.sha,
              `\uD83C\uDFD6 Flux ok, deployed \`${status.sha}\``
            );
            break;
          case "suspended":
            await this.notifyDiscord(
              status.sha,
              `\uD83D\uDED1 Flux suspended at \`${status.sha}\`!`
            );
            break;
          case "error":
            await this.notifyDiscord(
              status.sha,
              `\uD83D\uDEA8 Flux error, stuck at \`${status.sha}\`\n\`${status.error}\``
            );
            break;
          default:
            assertNever(status);
        }
        if (!createdGauge) {
          // Delay export of the metric until we have a known value.
          createGauge({
            name: "bob_flux_time_since_ok_ms",
            help: "Time since flux was last ok",
            collect: (g) => g.set(lastOk.elapsed),
          });
          createdGauge = true;
        }
      } catch (error) {
        log.error("Failed to check flux status", { error });
      }
    } while (await sleep(CONFIG.bobFluxCheckIntervalMs, signal));
  }

  async needsReviewNotification(): Promise<GithubReviewablePr[]> {
    const octokit = octokitOrDie();
    const out = new Map<number, GithubReviewablePr>();
    for await (const { data: batch } of octokit.paginate.iterator(
      octokit.rest.pulls.list,
      {
        ...OCTOKIT_CONFIG,
        // Don't suplly the abort
        state: "open",
        base: "main",
      }
    )) {
      if (batch.length === 0) {
        continue;
      }
      const pulls = batch.filter(
        (pull) => !pull.draft && !!pull.requested_reviewers?.length
      );
      log.info("Scanned open PRs", { pulls: pulls.length });
      const states = (
        await Promise.allSettled(
          pulls.map(async (pull) => {
            const doc = await this.db
              .collection("notified-prs")
              .doc(String(pull.number))
              .get();
            const data = doc.data();
            if (!data) {
              return;
            }
            return {
              notified: data.notified ?? [],
              updatedAtMs: data.updatedAtMs ?? 0,
            };
          })
        )
      ).map(
        (result) =>
          (result.status === "fulfilled" ? result.value : undefined) ?? {
            notified: [],
            updatedAtMs: 0,
          }
      );
      pulls.forEach((pull, i) => {
        if (!pull.user?.login) {
          return;
        }
        const state = states[i]!;
        const contacts = (
          pull.requested_reviewers?.map((r) => r.email || r.login) ?? []
        )
          .sort()
          .filter((c) => !state.notified.includes(c));
        if (contacts.length === 0) {
          return;
        }
        out.set(pull.number, {
          id: pull.number,
          author: pull.user?.login,
          updatedAtMs: new Date(pull.updated_at).getTime(),
          title: pull.title,
          reviewers: contacts,
        });
      });
    }
    if (out.size > 0) {
      log.info("Found PRs needing review", { pulls: Array.from(out.keys()) });
    }
    return Array.from(out.values());
  }

  private async notifyNeedsReview(pulls: GithubReviewablePr[]) {
    const lines = pulls.map((pull) => {
      const reviewers = pull.reviewers
        .map((email) => this.mentioner.mention(email, "always"))
        .join(", ");
      return (
        `"${pull.title}"\n` +
        `^ by ${this.mentioner.mention(
          pull.author,
          "never"
        )} - Reviewer ${reviewers}\n` +
        `https://github.com/ill-inc/biomes/pull/${pull.id}`
      );
    });
    if (!lines.length) {
      return;
    }
    await this.notifyDiscord(
      "",
      `\uD83D\uDC40 PR are needing review \uD83D\uDC40\n${lines.join("\n")}`,
      {
        hook: "review",
      }
    );
  }

  private async markNotified(pull: GithubReviewablePr) {
    const ref = this.db.collection("notified-prs").doc(String(pull.id));
    await this.db.runTransaction(async (transaction) => {
      const doc = await transaction.get(ref);
      transaction.set(ref, {
        notified: uniq(pull.reviewers.concat(doc.data()?.notified ?? [])),
        updatedAtMs: pull.updatedAtMs,
      });
    });
  }

  private async notifyPrs(signal: AbortSignal) {
    while (await sleep(CONFIG.bobNotifyPrIntervalMs, signal)) {
      const pulls = await this.needsReviewNotification();
      try {
        await this.notifyNeedsReview(pulls);
      } finally {
        await Promise.all(pulls.map((pull) => this.markNotified(pull)));
      }
    }
  }

  async start() {
    for (const hook of ["deploy", "review"] as const) {
      try {
        await this.notifyDiscord("", `\uD83C\uDF86 Bob started!`, {
          hook,
        });
      } catch (error) {
        log.warn("Could not announce Bob start", { error });
      }
    }
    this.controller.runInBackground("checkFluxStatus", (signal) =>
      this.checkFluxStatusPeriodically(signal)
    );
    this.controller.runInBackground("continuousBuild", (signal) =>
      this.continuousBuild(signal)
    );
    this.controller.runInBackground("notifyReviews", (signal) =>
      this.notifyPrs(signal)
    );
  }

  async stop() {
    this.mentioner.stop();
    await this.controller.abortAndWait();
  }
}

export async function registerBobTheBuilder<C extends BobServerContext>(
  loader: RegistryLoader<C>
) {
  const [config, db, gracefulShutdown] = await Promise.all([
    loader.get("config"),
    loader.get("db"),
    loader.get("gracefulShutdown"),
  ]);
  return new BobTheBuilder(config, db, gracefulShutdown);
}
