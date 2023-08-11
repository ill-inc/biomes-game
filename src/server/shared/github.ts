import { getSecret } from "@/server/shared/secrets";
import { log } from "@/shared/logging";
import { Octokit } from "octokit";

export const GITHUB_THIS_REPO = "biomes";
export const GITHUB_THIS_OWNER = "ill-inc";
export const GITHUB_MAIN_BRANCH = "main";

const PERSONAL_ACCESS_TOKEN_ENV = "GH_PAT";

export function hasGitHubAuth() {
  return (
    process.env.NODE_ENV === "production" ||
    PERSONAL_ACCESS_TOKEN_ENV in process.env
  );
}

export function getGitHubOctokitApi() {
  if (process.env.NODE_ENV === "production") {
    return new Octokit({
      auth: getSecret("github-mossy-mucker-personal-access-token"),
    });
  }

  const ghPersonalAccessToken = process.env[PERSONAL_ACCESS_TOKEN_ENV];
  if (ghPersonalAccessToken) {
    return new Octokit({
      auth: ghPersonalAccessToken,
    });
  } else {
    log.error(
      `Could not find credentials to use for accessing the GitHub API. To access locally, make sure to set the environment variable "${PERSONAL_ACCESS_TOKEN_ENV}" to your GitHub personal access token.`
    );
    return undefined;
  }
}

function getRepoParamsFromOptions(options: { owner?: string; repo?: string }) {
  return {
    owner: options.owner || GITHUB_THIS_OWNER,
    repo: options.repo || GITHUB_THIS_REPO,
  };
}

export function getBranchHead(params: {
  octokit: Octokit;
  branch?: string;
  owner?: string;
  repo?: string;
}) {
  return params.octokit.rest.repos
    .getBranch({
      ...getRepoParamsFromOptions(params),
      branch: params.branch ?? GITHUB_MAIN_BRANCH,
    })
    .then((x) => x.data.commit);
}

export async function makeFileUpdatePr(params: {
  octokit: Octokit;
  path: string;
  data: string;
  title: string;
  message: string;
  name: string;
  email: string;
  branchNameBase: string;
  baseBranch?: string;
  baseCommitSha?: string;
  owner?: string;
  repo?: string;
}) {
  const repoParams = getRepoParamsFromOptions(params);

  const baseBranch = params.baseBranch || GITHUB_MAIN_BRANCH;

  const [baseCommitSha, blob] = await Promise.all([
    (async () =>
      params.baseCommitSha ||
      (
        await getBranchHead({ octokit: params.octokit, branch: baseBranch })
      ).sha)(),
    params.octokit.rest.git.createBlob({
      ...repoParams,
      content: Buffer.from(params.data).toString("base64"),
      encoding: "base64",
    }),
  ]);

  const tree = await params.octokit.rest.git.createTree({
    ...repoParams,
    base_tree: baseCommitSha,
    tree: [
      {
        path: params.path,
        type: "blob",
        sha: blob.data.sha,
        mode: "100644",
      },
    ],
  });

  const commit = await params.octokit.rest.git.createCommit({
    ...repoParams,
    message: `${params.title}\n\n${params.message}`,
    committer: {
      name: params.name,
      email: params.email,
    },
    tree: tree.data.sha,
    parents: [baseCommitSha],
  });

  const truncatedCommitSha = tree.data.sha.substring(0, 8);
  const featureBranchName = `${params.branchNameBase}_${truncatedCommitSha}`;
  await params.octokit.rest.git.createRef({
    ...repoParams,
    ref: `refs/heads/${featureBranchName}`,
    sha: commit.data.sha,
  });

  const pr = await params.octokit.rest.pulls.create({
    ...repoParams,
    head: featureBranchName,
    base: GITHUB_MAIN_BRANCH,
    title: params.title,
    body: params.message,
  });

  return pr.data;
}
