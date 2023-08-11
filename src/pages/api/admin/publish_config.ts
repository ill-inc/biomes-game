import {
  getGitHubOctokitApi,
  hasGitHubAuth,
  makeFileUpdatePr,
} from "@/server/shared/github";
import { findByUID } from "@/server/web/db/users_fetch";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import type { BiomesId } from "@/shared/ids";
import { existsSync } from "fs";
import { writeFile } from "fs/promises";
import { resolve } from "path";
import { z } from "zod";

export const zPublishConfigRequest = z.object({
  path: z.string(),
  data: z.string(),
  baseCommitSha: z.string().optional(),
});
export type PublishConfigRequest = z.infer<typeof zPublishConfigRequest>;

export const zPublishConfigResponse = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("githubSuccess"),
    prNumber: z.number(),
  }),
  z.object({
    kind: z.literal("localSuccess"),
    path: z.string(),
  }),
  z.object({ kind: z.literal("error"), message: z.string() }),
]);
export type PublishConfigResponse = z.infer<typeof zPublishConfigResponse>;

async function publishToGitHub(
  path: string,
  data: string,
  baseCommitSha: string | undefined,
  userName: string | undefined,
  userId: BiomesId
): Promise<PublishConfigResponse> {
  const octokit = getGitHubOctokitApi();
  if (!octokit) {
    return {
      kind: "error",
      message: "Could not find authorization to use GitHub API.",
    };
  }

  const name = userName ? `${userName} (${userId})` : `${userId}`;

  const result = await makeFileUpdatePr({
    octokit,
    path,
    data,
    title: `Update config "${path}"`,
    name,
    email: "mossymucker@github.com",
    branchNameBase: "mossymucker",
    message: `PR generated automatically by the admin tool on behalf of Biomes user "${name}".\n\nUpdates the configuration file "${path}".`,
    baseCommitSha: baseCommitSha,
  });

  return {
    kind: "githubSuccess",
    prNumber: result.number,
  };
}

async function publishLocally(
  path: string,
  data: string
): Promise<PublishConfigResponse> {
  if (!existsSync(path)) {
    return {
      kind: "error",
      message: `Expected file ${resolve(
        path
      )} to exist already before writing to it, but it doesn't exist.`,
    };
  }
  try {
    await writeFile(path, data);
    return {
      kind: "localSuccess",
      path: resolve(path),
    };
  } catch (err) {
    return { kind: "error", message: `${err}` };
  }
}

export default biomesApiHandler(
  {
    auth: "admin",
    body: zPublishConfigRequest,
    response: zPublishConfigResponse,
  },
  async ({
    context: { db },
    auth: { userId },
    body: { path, data, baseCommitSha },
  }): Promise<z.infer<typeof zPublishConfigResponse>> => {
    if (hasGitHubAuth()) {
      const user = await findByUID(db, userId);
      return publishToGitHub(path, data, baseCommitSha, user?.username, userId);
    } else {
      return publishLocally(path, data);
    }
  }
);
