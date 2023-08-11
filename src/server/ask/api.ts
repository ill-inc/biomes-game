import { LazyEntity } from "@/server/shared/ecs/gen/lazy";
import { HostPort } from "@/server/shared/ports";
import { makeClient } from "@/server/shared/zrpc/client";
import type { ZService } from "@/server/shared/zrpc/server_types";
import type { Vec3f } from "@/shared/ecs/gen/types";
import { zEncodedVersionMap } from "@/shared/ecs/version";
import { zEntity } from "@/shared/ecs/zod";
import { zBiomesId } from "@/shared/ids";
import { zAABB, zVec3f } from "@/shared/math/types";
import type { ZClient } from "@/shared/zrpc/core";
import { zservice } from "@/shared/zrpc/service";
import { z } from "zod";

export const zGetNpcsByType = z.object({
  kind: z.literal("npcsByType"),
  typeId: zBiomesId,
});

export const zGetPresetByLabel = z.object({
  kind: z.literal("presetByLabel"),
  label: z.string(),
});

export const zGetMinigameElementsByMinigameId = z.object({
  kind: z.literal("minigameElementByMinigameId"),
  minigameId: zBiomesId,
});

export const zGetMinigameInstancesByMinigameId = z.object({
  kind: z.literal("minigameInstancesByMinigameId"),
  minigameId: zBiomesId,
});

export const zGetRobotsByCreatorId = z.object({
  kind: z.literal("robotsByCreatorId"),
  creatorId: zBiomesId,
});

export const zGetMinigamesByCreatorId = z.object({
  kind: z.literal("minigamesByCreatorId"),
  creatorId: zBiomesId,
});

export const zGetPlaceablesByItemId = z.object({
  kind: z.literal("placeablesByItemId"),
  itemId: zBiomesId,
});

export const zGetByKeysRequest = z.discriminatedUnion("kind", [
  zGetNpcsByType,
  zGetPresetByLabel,
  zGetMinigameElementsByMinigameId,
  zGetMinigameInstancesByMinigameId,
  zGetRobotsByCreatorId,
  zGetMinigamesByCreatorId,
  zGetPlaceablesByItemId,
]);
export type GetByKeysRequest = z.infer<typeof zGetByKeysRequest>;

export const zScanAllRequest = z.enum([
  "npcs",
  "gremlins",
  "presets",
  "ready_minigames",
  "quest_givers",
  "named_npcs",
  "landmarks",
  "robots",
  "players",
]);
export type ScanAllRequest = z.infer<typeof zScanAllRequest>;

export const zScanForExportRequest = z.object({
  aabb: zAABB,
  versionMap: zEncodedVersionMap.optional(),
});
export type ScanForExportRequest = z.infer<typeof zScanForExportRequest>;

export const zEntityWithVersion = z.tuple([z.number(), zEntity.optional()]);

export const zAskService = zservice("ask")
  .addRpc("get", z.array(zBiomesId), z.array(zEntity.optional()))
  .addRpc("getWithVersion", z.array(zBiomesId), zEntityWithVersion.array())
  .addRpc("has", z.array(zBiomesId), z.array(zBiomesId))
  .addRpc("centerOfTerrain", z.void(), zVec3f)
  .addRpc("getByKeys", zGetByKeysRequest, z.array(zEntity))
  .addRpc("playerCount", z.void(), z.number())
  .addStreamingRpc("scanAll", zScanAllRequest, z.array(zEntity))
  .addStreamingRpc("scanForExport", zScanForExportRequest, zEntityWithVersion);

export type AskService = ZService<typeof zAskService>;
type AskClient = ZClient<typeof zAskService>;

export class AskApi {
  private readonly client: AskClient;

  constructor(client?: AskClient) {
    this.client =
      client ??
      makeClient(
        zAskService,
        process.env.NODE_ENV === "production"
          ? HostPort.forAsk().rpc
          : HostPort.forLogic().rpc
      );
  }

  playerCount(): Promise<number> {
    return this.client.playerCount();
  }

  async centerOfTerrain(): Promise<Vec3f> {
    return this.client.centerOfTerrain();
  }

  async getByKeys(request: GetByKeysRequest): Promise<LazyEntity[]> {
    return (await this.client.getByKeys(request)).map((wrapped) =>
      LazyEntity.forDecoded(wrapped.entity)
    );
  }

  async scanAll(request: ScanAllRequest): Promise<LazyEntity[]> {
    const entities: LazyEntity[] = [];
    for await (const batch of this.client.scanAll(request)) {
      entities.push(...batch.map((w) => LazyEntity.forDecoded(w.entity)));
    }
    return entities;
  }

  async *scanForExport(
    request: ScanForExportRequest,
    signal?: AbortSignal
  ): AsyncIterable<[number, LazyEntity]> {
    for await (const [version, wrapped] of this.client.scanForExport(
      request,
      signal
    )) {
      if (!wrapped) {
        continue;
      }
      yield [version, LazyEntity.forDecoded(wrapped.entity)];
    }
  }
}

export async function registerAskApi(): Promise<AskApi> {
  return new AskApi();
}
