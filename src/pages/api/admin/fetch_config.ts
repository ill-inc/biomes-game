import {
  getBranchHead,
  getGitHubOctokitApi,
  GITHUB_THIS_OWNER,
  GITHUB_THIS_REPO,
  hasGitHubAuth,
} from "@/server/shared/github";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { log } from "@/shared/logging";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { z } from "zod";

export const zFetchConfigRequest = z.object({
  path: z.string(),
});
export type FetchConfigRequest = z.infer<typeof zFetchConfigRequest>;

const zFetchConfigResponseResult = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("contents"),
    data: z.string(),
    // We send along the commit sha the file contents came from so that if one
    // were to subsequently publish changes to them, they could know what base
    // they started from.
    baseCommitSha: z.string().optional(),
  }),
  z.object({ kind: z.literal("error"), message: z.string() }),
]);
type FetchConfigResponseResult = z.infer<typeof zFetchConfigResponseResult>;

export const zFetchConfigResponse = z.object({
  source: z.enum(["github", "local"]),
  result: zFetchConfigResponseResult,
});
export type FetchConfigResponse = z.infer<typeof zFetchConfigResponse>;
export type FetchConfigDataSource = FetchConfigResponse["source"];

async function fetchFromGitHub(
  path: string
): Promise<FetchConfigResponseResult> {
  const octokit = getGitHubOctokitApi();
  if (!octokit) {
    return {
      kind: "error",
      message: "Could not find authorization to use GitHub API.",
    };
  }

  const mainHead = await getBranchHead({ octokit });

  const result = await octokit.rest.repos.getContent({
    repo: GITHUB_THIS_REPO,
    owner: GITHUB_THIS_OWNER,
    path,
    ref: mainHead.sha,
  });
  if (
    !Array.isArray(result.data) &&
    result.data.type === "file" &&
    result.data.encoding === "base64"
  ) {
    return {
      kind: "contents",
      data: Buffer.from(result.data.content, "base64").toString("utf8"),
      baseCommitSha: mainHead.sha,
    };
  } else {
    return {
      kind: "error",
      message: `Received unexpected data from GitHub while fetching path: ${path}`,
    };
  }
}

async function fetchLocally(path: string): Promise<FetchConfigResponseResult> {
  if (existsSync(path)) {
    try {
      return {
        kind: "contents",
        data: await readFile(path, {
          encoding: "utf8",
        }),
      };
    } catch (err) {
      return {
        kind: "error",
        message: `${err}`,
      };
    }
  } else {
    return { kind: "error", message: `Could not open path: ${path}` };
  }
}

export default biomesApiHandler(
  {
    auth: "admin",
    body: zFetchConfigRequest,
    response: zFetchConfigResponse,
  },
  async ({ body: { path } }): Promise<z.infer<typeof zFetchConfigResponse>> => {
    if (hasGitHubAuth()) {
      log.info(`Fetching config file path "${path}" from GitHub...`);
      return {
        source: "github",
        result: await fetchFromGitHub(path),
      };
    } else {
      log.info(
        `Fetching config file path "${path}" from the local filesystem...`
      );
      return {
        source: "local",
        result: await fetchLocally(path),
      };
    }
  }
);
