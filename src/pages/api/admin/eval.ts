import { findAllSyncServerEndpoints } from "@/server/shared/sync";
import { makeClient } from "@/server/shared/zrpc/client";
import type { EvalResponse } from "@/server/sync/api";
import { zEvalResponse, zInternalSyncService } from "@/server/sync/api";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zBiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { z } from "zod";

export const zAdminEvalRequest = z.object({
  user: zBiomesId.optional(),
  code: z.string(),
});

export type AdminEvalRequest = z.infer<typeof zAdminEvalRequest>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zAdminEvalRequest,
    response: zEvalResponse,
    zrpc: true,
  },
  async ({ body: { user, code } }) => {
    okOrAPIError(CONFIG.evalEnabled, "killswitched");

    log.warn("Running distributed eval", { user, code });

    const syncServers = await findAllSyncServerEndpoints();

    const response: EvalResponse = { results: [] };
    await Promise.all(
      syncServers.map(async (syncServer) => {
        // TODO: Maybe cache the client somewhere?
        const client = makeClient(
          zInternalSyncService,
          `${syncServer.ip}:3004`
        );
        try {
          const evalResponse = await client.eval({
            user,
            code,
            timeoutMs: CONFIG.evalTimeoutMs,
          });
          response.results.push(...evalResponse.results);
        } finally {
          void client.close();
        }
      })
    );
    return response;
  }
);
