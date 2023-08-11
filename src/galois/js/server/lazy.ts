import type { AssetData } from "@/galois/interface/types/data";
import type * as l from "@/galois/lang";
import type { AssetServer } from "@/galois/server/interface";

export class LazyAssetServer implements AssetServer {
  #backing?: AssetServer;

  constructor(private readonly createFn: () => AssetServer) {}

  private get backing(): AssetServer {
    if (this.#backing === undefined) {
      this.#backing = this.createFn();
    }
    return this.#backing;
  }

  async build<T extends AssetData>(asset: l.Asset) {
    return this.backing.build<T>(asset);
  }

  stop() {
    return this.backing.stop();
  }
}
