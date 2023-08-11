import assetVersions from "@/galois/interface/gen/asset_versions.json";
import staticAssetHostFilePath from "@/galois/interface/gen/static_asset_host.json";

export type AssetPath = keyof (typeof assetVersions)["paths"];

export function assetPaths(): AssetPath[] {
  return Object.keys(assetVersions["paths"]) as AssetPath[];
}

export function resolveAssetPath(path: AssetPath) {
  return assetVersions["paths"][path];
}

function isAssetPath(path: string): path is AssetPath {
  return path in assetVersions["paths"];
}

export function resolveAssetPathUntyped(path: string) {
  return isAssetPath(path) ? assetVersions["paths"][path] : undefined;
}

function staticUrl() {
  return (
    process.env.GALOIS_STATIC_PREFIX ||
    staticAssetHostFilePath["staticAssetBaseUrl"]
  );
}

export function resolveAssetUrl(path: AssetPath) {
  return `${staticUrl()}${resolveAssetPath(path)}`;
}
export function resolveAssetUrlUntyped(path: string) {
  const resolved = resolveAssetPathUntyped(path);
  if (!resolved) {
    return undefined;
  }

  return `${staticUrl()}${resolved}`;
}
