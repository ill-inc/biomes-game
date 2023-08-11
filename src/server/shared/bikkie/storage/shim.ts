import type { BakedBiscuitTray } from "@/server/shared/bikkie/registry";
import type { BikkieStorage } from "@/server/shared/bikkie/storage/api";
import type { StoredBakedTray } from "@/server/shared/bikkie/storage/baked";
import {
  fromStoredBakedTray,
  toStoredBakedTray,
  zStoredBakedTray,
} from "@/server/shared/bikkie/storage/baked";
import { parseEncodedTrayDefinition } from "@/server/shared/bikkie/storage/definition";
import type { ZService } from "@/server/shared/zrpc/server_types";
import { type BiscuitTray } from "@/shared/bikkie/tray";
import type { BiomesId } from "@/shared/ids";
import { zBiomesId } from "@/shared/ids";
import type { RpcContext, ZClient } from "@/shared/zrpc/core";
import { zrpcSerialize } from "@/shared/zrpc/serde";
import { zservice } from "@/shared/zrpc/service";
import { ok } from "assert";
import { z } from "zod";

export const zShimBikkieStorageService = zservice("shim-bikkie")
  .addRpc(
    "saveDefinition",
    z.tuple([zBiomesId, z.instanceof(Buffer)]),
    z.void()
  )
  .addRpc("loadDefinition", zBiomesId, z.instanceof(Buffer).optional())
  .addRpc("save", zStoredBakedTray, z.void())
  .addRpc("load", z.void(), zStoredBakedTray);

export type ShimBikkieStorageService = ZService<
  typeof zShimBikkieStorageService
>;
export type ShimBikkieStorageClient = ZClient<typeof zShimBikkieStorageService>;

export class RemoteBikkieStorage implements BikkieStorage {
  constructor(private readonly client: ShimBikkieStorageClient) {}

  async saveDefinition(tray: BiscuitTray) {
    await this.client.saveDefinition([tray.id, zrpcSerialize(tray)]);
  }

  async loadDefinition(id: BiomesId): Promise<BiscuitTray | undefined> {
    const raw = await this.client.loadDefinition(id);
    return parseEncodedTrayDefinition(id, raw, this.loadDefinition.bind(this));
  }

  async save(tray: BakedBiscuitTray) {
    await this.client.save(toStoredBakedTray(tray));
  }

  async load() {
    return fromStoredBakedTray(await this.client.load());
  }
}

export class ExposeBikkieStorageService implements ShimBikkieStorageService {
  constructor(private readonly backing: BikkieStorage) {}

  async saveDefinition(_context: RpcContext, [id, buffer]: [BiomesId, Buffer]) {
    const decoded = await parseEncodedTrayDefinition(id, buffer, (id) =>
      this.backing.loadDefinition(id)
    );
    ok(decoded);
    await this.backing.saveDefinition(decoded);
  }

  async loadDefinition(_context: RpcContext, id: BiomesId) {
    const tray = await this.backing.loadDefinition(id);
    if (tray) {
      return zrpcSerialize(tray);
    }
  }

  async save(_context: RpcContext, tray: StoredBakedTray) {
    await this.backing.save(fromStoredBakedTray(tray));
  }

  async load(_context: RpcContext) {
    return toStoredBakedTray(await this.backing.load());
  }
}
