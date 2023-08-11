import type { OobServerContext } from "@/server/oob/main";
import { verifyAuthenticatedRequest } from "@/server/shared/auth/cookies";
import { jsonFromRequest } from "@/server/shared/http";
import { hasRole } from "@/server/shared/roles";
import type { WorldApi } from "@/server/shared/world/api";
import type { SessionStore } from "@/server/web/db/sessions";
import type { OobRequest, OobResponse } from "@/shared/api/oob";
import { zOobRequest } from "@/shared/api/oob";
import type { SerializeTarget } from "@/shared/ecs/gen/json_serde";
import type { WrappedEntity } from "@/shared/ecs/zod";
import { WrappedEntityFor } from "@/shared/ecs/zod";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID, safeParseBiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";
import { zrpcSerialize } from "@/shared/zrpc/serde";
import { ok } from "assert";
import type {
  Server as HTTPServer,
  IncomingMessage,
  ServerResponse,
} from "http";
import type { ParsedUrlQuery } from "querystring";
import { parse } from "url";

function addListenerToExistingServer(
  http: HTTPServer,
  interceptor: (req: IncomingMessage, res: ServerResponse) => boolean
) {
  http.listeners("request").forEach((listener) => {
    http.removeListener("request", listener as any);
    http.on("request", (req, res) => {
      if (!interceptor(req, res)) {
        listener(req, res);
      }
    });
  });
}

const OOB_PATTERN = /^\/sync\/oob$/;

// Out of band requests for sync data.
export class OobServer {
  constructor(
    private readonly sessionStore: SessionStore,
    http: HTTPServer,
    private readonly worldApi: WorldApi
  ) {
    addListenerToExistingServer(http, (request, response) => {
      if (!request.url) {
        return false;
      }
      const { pathname, query } = parse(request.url, true);
      if (!pathname) {
        return false;
      }
      const match = OOB_PATTERN.exec(pathname);
      if (match === null) {
        return false;
      }
      this.handleRequest(request, query, response)
        .catch((error: any) => {
          log.error("Unable to intercept HTTP request for entity data", {
            error,
          });
          response.statusCode = 500;
        })
        .finally(() => response.end());
      return true;
    });
  }

  private async handleRequest(
    request: IncomingMessage,
    query: ParsedUrlQuery,
    response: ServerResponse
  ) {
    const queryUser = query["u"];
    const clientCheckUserId =
      typeof queryUser === "string" ? safeParseBiomesId(queryUser) : undefined;
    const auth = await verifyAuthenticatedRequest(this.sessionStore, request);
    if (process.env.NODE_ENV === "production") {
      if (auth.error) {
        ok(process.env.PERMIT_ANONYMOUS && !clientCheckUserId);
      } else {
        ok(!clientCheckUserId || clientCheckUserId === auth.auth.userId);
      }
    }
    const userId = auth.error
      ? clientCheckUserId ?? INVALID_BIOMES_ID
      : auth.auth.userId;
    const skipCors = auth.error
      ? false
      : await hasRole(this.worldApi, auth.auth, "oobNoCors");
    const result = await this.oobLookup(
      userId,
      await jsonFromRequest(request, zOobRequest)
    );
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/octet-stream");
    if (skipCors || process.env.NODE_ENV !== "production") {
      response.setHeader("Access-Control-Allow-Origin", "*");
      response.setHeader("Access-Control-Allow-Headers", "*");
    }
    response.write(zrpcSerialize(result));
  }

  private async oobLookup(
    userId: BiomesId,
    request?: OobRequest
  ): Promise<OobResponse> {
    if (request === undefined || request.ids.length === 0) {
      return { entities: [] };
    }
    const target: SerializeTarget = {
      whoFor: "client",
      id: userId,
    };
    const entities = (await this.worldApi.getWithVersion(request.ids)).map(
      ([tick, entity]) =>
        [
          tick,
          entity
            ? new WrappedEntityFor(target, entity.materialize())
            : undefined,
        ] as [number, WrappedEntity | undefined]
    );
    return { entities };
  }
}

export async function registerOobServer<C extends OobServerContext>(
  loader: RegistryLoader<C>
) {
  return new OobServer(
    ...(await Promise.all([
      loader.get("sessionStore"),
      loader.get("http"),
      loader.get("worldApi"),
    ]))
  );
}
