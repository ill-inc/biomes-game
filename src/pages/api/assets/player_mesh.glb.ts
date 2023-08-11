import { assetDataToDataWithMimeType } from "@/galois/interface/asset_server/exports";
import type {
  WebServerApiRequest,
  WebServerContext,
} from "@/server/web/context";
import type { MaybeAuthedAPIRequest } from "@/server/web/util/api_middleware";
import {
  DoNotSendResponse,
  biomesApiHandler,
  zDoNotSendResponse,
} from "@/server/web/util/api_middleware";
import type {
  SlotToWearableMap,
  SlotToWearableMapResults,
} from "@/shared/api/assets";
import {
  ASSET_EXPORTS_SERVER_VERSION,
  parsePlayerMeshUrl,
} from "@/shared/api/assets";
import { APIError } from "@/shared/api/errors";
import { log } from "@/shared/logging";
import { Timer } from "@/shared/metrics/timer";
import type * as http from "http";
import * as https from "https";
import type { NextApiResponse } from "next/types";
import { z } from "zod";

const CDN_CACHE_TTL = 60 * 60 * 24 * 365;

// To determine if a resource is expired or not, the browser will compare
// "max-age" (the Cache-Control header that BROWSER_CACHE_TTL translates to) to
// a value that is at-least the "age" of the asset.  The "age" specified in the
// response will indicate how long the assets has been in the CDN's cache.
// Therefore, if the Browser's cache length is smaller than the CDN's cache
// length, it will *always* issue revalidation checks if the CDN serves an asset
// with age > max-age.
// Therefore, the browser cache's TTL should be at least the size of the CDN
// cache's TTL...  And we'll need to make sure the CDN isn't capping the
// browser cache's TTL (the default caps on Cloud CDN TTL is 1 hour for the
// browser and 1 day for the CDN, and the CDN will re-write the "max-age" field
// accordingly. See https://cloud.google.com/cdn/docs/using-ttl-overrides for
// more details).
// See https://stackoverflow.com/a/70970543 for more info on the age/max-age
// interaction.
const BROWSER_CACHE_TTL = CDN_CACHE_TTL;

export interface CachedPlayerMesh {
  data: Buffer;
  mime: string;
  computedAt: number; // MS since epoch.
  assetExportVersion: number;
}

export default biomesApiHandler(
  {
    auth: "optional",
    response: z.union([zDoNotSendResponse, z.instanceof(Buffer)]),
  },
  async ({ context, unsafeRequest, unsafeResponse }) => {
    if (context.config.assetServerMode === "proxy") {
      await forwardAssetRequest(unsafeRequest, unsafeResponse);
      return DoNotSendResponse;
    }

    if (!unsafeRequest.url) {
      throw new APIError(
        "invalid_request",
        "There is no URL provided for an asset server request."
      );
    }

    const playerMeshParse = parsePlayerMeshUrl(unsafeRequest.url);

    if (playerMeshParse.kind === "UrlParseError") {
      throw new APIError("invalid_request", "Could not parse URL.");
    }

    const mesh = await fetchOrComputeMesh(
      context,
      unsafeRequest.url,
      playerMeshParse
    );
    if (playerMeshParse.warning?.kind === "AssetVersionMismatch") {
      // Make sure the clients/proxies don't cache anything if there was a
      // version mismatch here...  That should resolve itself and we don't
      // want the client to be stuck with a bad version.
      unsafeResponse.setHeader("Cache-Control", "no-cache");
    } else {
      unsafeResponse.setHeader(
        "Cache-Control",
        `s-maxage=${CDN_CACHE_TTL},public,max-age=${BROWSER_CACHE_TTL},immutable`
      );
    }
    unsafeResponse.setHeader("Content-Type", mesh.mime);
    return mesh.data;
  }
);

async function fetchOrComputeMesh(
  context: WebServerContext,
  url: string,
  playerMeshParse: SlotToWearableMapResults
) {
  const generateNewMesh = async () => {
    const timer = new Timer();
    log.info("Started generating asset", { url });
    try {
      return await computePlayerMesh(context, playerMeshParse);
    } finally {
      log.info("Finished generating asset", { url, ms: timer.elapsed });
    }
  };

  const [cached] = await context.serverCache.get("player-mesh", url);
  if (!cached) {
    // Wait for generation now.
    return context.serverCache.getOrCompute(
      0,
      "player-mesh",
      url,
      generateNewMesh
    );
  }

  if (
    cached.assetExportVersion !== ASSET_EXPORTS_SERVER_VERSION ||
    Date.now() - cached.computedAt >
      CONFIG.assetServerPlayerMeshRecomputeIntervalMs
  ) {
    // Use the stale value, but trigger a recomputation to occur in the background.
    generateNewMesh()
      .then((mesh) => context.serverCache.set(0, "player-mesh", url, mesh))
      .catch((err) => log.warn("Failed to generate new mesh", { err }));
  }
  return cached;
}

async function computePlayerMesh(
  { assetExportsServer }: WebServerContext,
  {
    map: slotToWearableMap,
    skinColorId,
    eyeColorId,
    hairColorId,
  }: SlotToWearableMapResults
): Promise<CachedPlayerMesh> {
  // Apply any last minute filters to how the final mesh output should
  // appear.
  const filteredWearableMap = applyWearableAppearanceFilters(slotToWearableMap);

  const assetData = await assetExportsServer.build(
    "wearables/animated_player_mesh",
    filteredWearableMap,
    skinColorId,
    eyeColorId,
    hairColorId
  );
  const [data, mime] = assetDataToDataWithMimeType(assetData);
  return {
    data: data as Buffer,
    mime,
    computedAt: Date.now() + CONFIG.assetServerJitterIntervalMs * Math.random(),
    assetExportVersion: ASSET_EXPORTS_SERVER_VERSION,
  };
}

// For development environments, to reduce developer environment setup
// requirements (e.g. python environment), we by default forward to prod
// when running locally.
async function forwardAssetRequest(
  req: MaybeAuthedAPIRequest<WebServerApiRequest>,
  res: NextApiResponse
) {
  // Server-side redirect to prod.
  const remoteUrl = new URL(req.url!, "https://www.biomes.gg");

  // Send out a request to prod for this asset, and await the response.
  const [status, headers, data] = await new Promise<
    [number | undefined, http.IncomingHttpHeaders, Buffer]
  >((resolve, reject) => {
    https
      .get(remoteUrl, (resp) => {
        const data: Uint8Array[] = [];
        resp.on("data", (chunk) => {
          data.push(chunk);
        });
        // The whole response has been received, we're done now and we have a
        // result.
        resp.on("end", () => {
          const buffer = Buffer.concat(data);
          resolve([resp.statusCode, resp.headers, buffer]);
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });

  Object.entries(headers).forEach(([k, v]) => {
    if (v) {
      res.setHeader(k, v);
    }
  });

  return res.status(status!).send(data);
}

function applyWearableAppearanceFilters(
  slotToWearableMap: SlotToWearableMap
): SlotToWearableMap {
  const hatValue = slotToWearableMap.get("hat");
  if (!hatValue) {
    return slotToWearableMap;
  }

  const hairValue = slotToWearableMap.get("hair");
  if (!hairValue) {
    return slotToWearableMap;
  }
  const outMap: SlotToWearableMap = new Map(slotToWearableMap);
  outMap.set("hair_with_hat", { ...hairValue, withHatVariant: true });
  outMap.delete("hair");
  return outMap;
}
