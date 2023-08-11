import type { SyncTarget } from "@/shared/api/sync";
import type { BiomesId } from "@/shared/ids";
import { legacyIdOrBiomesId } from "@/shared/ids";
import { fixed2, round } from "@/shared/math/linear";
import type { Vec2, Vec3 } from "@/shared/math/types";
import type {
  BucketedImageCloudBundle,
  CloudBucketKey,
  ImageCloudBundle,
  ImageUrls,
} from "@/shared/url_types";
import { bucketURL } from "@/shared/url_types";
import { stripLeadingSlash } from "@/shared/util/helpers";
import type { ImageSizes } from "@/shared/util/urls";
import { imageUrlForSize } from "@/shared/util/urls";
import { ok } from "assert";
import { kebabCase, mapValues } from "lodash";

export interface GameURLAction {
  kind: "play_minigame";
  minigameId: BiomesId;
}

export function absoluteWebServerURL(relativeUrl: string) {
  return `https://www.biomes.gg/${stripLeadingSlash(relativeUrl)}`;
}

export function dynamicBaseURL(relativeUrl: string) {
  return `${window.location.origin}/${stripLeadingSlash(relativeUrl)}`;
}

export function absoluteBucketURL(bucket: string, path: string, useCDN = true) {
  return bucketURL(bucket, path, useCDN);
}

export function slugifyUsername(username: string) {
  return encodeURIComponent(username);
}

export function slugifyGenericName(name: string) {
  return kebabCase(name).slice(0, 30);
}

export function postPublicPermalink(id: BiomesId) {
  return `/p/${encodeURIComponent(id)}`;
}

export function minigamePublicPermalink(id: BiomesId, name?: string) {
  return `/at/${id}/${slugifyGenericName(name ?? "")}`;
}

export function rewrittenWorldPermalink(
  coords: Vec3,
  orientation?: Vec2,
  baseURL?: URL
) {
  const r = round(coords);
  const ret = baseURL ? new URL(baseURL) : new URL(window.location.href);
  ret.pathname = `/at/${r[0]}/${r[1]}/${r[2]}`;
  if (orientation) {
    const o = fixed2(orientation, 3);
    ret.pathname += `/${o[0]}/${o[1]}`;
  }
  return ret;
}

export function environmentGroupPublicPermalink(
  id: BiomesId,
  environmentGroupName?: string
) {
  return `/g/${slugifyGenericName(
    environmentGroupName ?? ""
  )}/${encodeURIComponent(id)}`;
}

export function userPublicPermalink(id: BiomesId, username?: string) {
  if (username) {
    return `/u/${slugifyUsername(username)}`;
  } else {
    return `/u/${encodeURIComponent(id)}`;
  }
}

export function avatarPlaceholderURL() {
  return "https://static.biomes.gg/public/hud/avatar-placeholder.png";
}

export function extractIdFromEnvironmentGroupURL(
  environmentGroupURL: string
): BiomesId | undefined {
  const match1 = environmentGroupURL.match(/\/api\/md\/eg\/([^\/]+)/);
  if (match1 && match1.length === 2) {
    const biomesId = legacyIdOrBiomesId(match1[1]);
    if (biomesId !== undefined) {
      return biomesId;
    }
  }
  const match2 = environmentGroupURL.match(
    /\/environment_group\/([^\/]+)\/external_metadata/
  );

  if (match2 && match2.length === 2) {
    const biomesId = legacyIdOrBiomesId(match2[1]);
    if (biomesId !== undefined) {
      return biomesId;
    }
  }

  return undefined;
}

export function resolveImageUrls(
  bucket: CloudBucketKey,
  cloudLocations: ImageCloudBundle,
  fallbackURL?: string
): ImageUrls {
  const ret = mapValues(cloudLocations ?? {}, (bucketPath) => {
    ok(bucketPath !== undefined);
    return absoluteBucketURL(bucket, bucketPath);
  }) as ImageUrls;
  if (fallbackURL) {
    ret.fallback = fallbackURL;
  }
  return ret;
}

export function resolvedImageUrlForSize(
  size: ImageSizes,
  locations: BucketedImageCloudBundle
) {
  return imageUrlForSize(size, resolveImageUrls(locations.bucket, locations));
}

export function observerURLForEntityId(entityId: BiomesId) {
  return `/at/${entityId}`;
}

export function observerUrlForSyncTarget(syncTarget: SyncTarget) {
  switch (syncTarget.kind) {
    case "position":
      return `/at/${syncTarget.position.join("/")}`;
    case "entity":
      return `/at/${syncTarget.entityId}`;
    case "localUser":
      return "/";
  }
}

export function googleErrorConsoleURL(userId: BiomesId) {
  return `https://console.cloud.google.com/logs/query;query=severity%3DERROR%0A%2528jsonPayload.userId%3D${userId}%20OR%20jsonPayload.entityId%3D${userId}%2529;summaryFields=:false:32:beginning?project=zones-cloud`;
}
