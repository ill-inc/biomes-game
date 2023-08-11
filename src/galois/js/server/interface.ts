import type { AssetData, ErrorData } from "@/galois/interface/types/data";
import * as l from "@/galois/lang";

export type NamedQuery = l.Asset & { name: string };
export type AssetQuery = l.Asset | NamedQuery;

export type BuildAssetFn = <T extends AssetData>(
  query: AssetQuery
) => Promise<T | ErrorData>;

export interface AssetServer {
  build: BuildAssetFn;
  stop(): Promise<void>;
}

export async function buildBatch<
  S extends AssetData,
  T extends keyof l.AssetTypes
>(buildAssetFn: BuildAssetFn, assets: l.GeneralNode<T>[]) {
  return buildAssetFn<S[]>(l.makeDerived("List", "List", assets));
}

export async function buildMap<
  S extends AssetData,
  T extends keyof l.AssetTypes
>(buildAssetFn: BuildAssetFn, assets: Iterable<[string, l.GeneralNode<T>]>) {
  return buildAssetFn<S[]>(
    l.makeDerived(
      "List",
      "List",
      Array.from(assets).map(([key, val]) =>
        l.makeDerived("Tuple", "Tuple", [l.toStr(key), val])
      )
    )
  );
}
