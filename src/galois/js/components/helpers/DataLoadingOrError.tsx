import type {
  AssetDataWithKind,
  AssetKind,
  DataOf,
  ErrorData,
} from "@/galois/interface/types/data";
import type * as l from "@/galois/lang";
import type { BuildAssetFn } from "@/galois/server/interface";
import * as React from "react";
import { useEffect, useState } from "react";

export function dataIsError(data: any): data is ErrorData {
  return data?.kind === "Error";
}

export function renderError(data: ErrorData) {
  return (
    <div className="error">
      <div>Error:</div>
      {Array.from(data.info.entries()).map(([i, x]) => (
        <div key={i}>{x}</div>
      ))}
    </div>
  );
}

export class ReactDataLoadingOrError {
  private loadingAssetState;
  private assetDataState;

  constructor(build: BuildAssetFn, dependencies: unknown[]) {
    this.loadingAssetState = useState<l.Asset | undefined>();
    this.assetDataState = useState<{
      loadId: number;
      data?: AssetDataWithKind | ErrorData;
    }>({
      loadId: 0,
    });
    const [loadingAsset, _] = this.loadingAssetState;
    const [assetData, setAssetData] = this.assetDataState;

    useEffect(() => {
      const newLoadId = assetData.loadId + 1;
      setAssetData({ data: undefined, loadId: newLoadId });

      void (async () => {
        if (!loadingAsset) {
          return;
        }

        const data = await build(loadingAsset);
        // Only up-date the data if this load is the current load.
        setAssetData((x) => {
          if (newLoadId == x.loadId) {
            return { ...x, data: data as AssetDataWithKind | ErrorData };
          } else {
            return x;
          }
        });
      })();
    }, [loadingAsset && loadingAsset.hash, ...dependencies]);
  }

  public loadAsset<T extends AssetKind>(asset: l.GeneralNode<T>) {
    const [loadingAsset, setLoadingAsset] = this.loadingAssetState;
    const [assetData, _] = this.assetDataState;

    if (!loadingAsset || loadingAsset.hash != asset.hash) {
      setLoadingAsset(asset);
      return undefined;
    }

    return assetData.data as DataOf<T> | ErrorData | undefined;
  }
}
