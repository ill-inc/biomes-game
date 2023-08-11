import type { AssetData, ErrorData } from "@/galois/interface/types/data";
import type * as l from "@/galois/lang";

export interface Api {
  build<T extends AssetData>(a: l.Asset): Promise<T | ErrorData>;
}

export function clientApi() {
  if (typeof window === "undefined") {
    throw new Error("Attempt to use client API outside of window");
  }
  return (window as any).api as Api;
}
