import type {
  AskService,
  GetByKeysRequest,
  ScanAllRequest,
  ScanForExportRequest,
} from "@/server/ask/api";
import { zAskService, zScanAllRequest } from "@/server/ask/api";
import type { AskMetaIndex, AskReplica } from "@/server/ask/table";
import { LandmarkSelector, NamedNpcSelector } from "@/server/ask/table";
import { centerOfTerrain } from "@/server/shared/replica/util";
import type { ZrpcServer } from "@/server/shared/zrpc/server";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import {
  ActivePlayersSelector,
  GremlinSelector,
  MinigameElementByMinigameIdSelector,
  MinigameInstancesByMinigameIdSelector,
  MinigamesByCreatorIdSelector,
  NamedQuestGiverSelector,
  NpcSelector,
  PlaceablesByItemIdSelector,
  PresetByLabelSelector,
  ReadyMinigameSelector,
  RobotSelector,
  RobotsByCreatorIdSelector,
} from "@/shared/ecs/gen/selectors";
import type { Table } from "@/shared/ecs/table";
import { decodeVersionMap } from "@/shared/ecs/version";
import { WrappedEntity } from "@/shared/ecs/zod";
import { isPlayer } from "@/shared/game/players";
import type { BiomesId } from "@/shared/ids";
import { containsAABB, intersectsAABB } from "@/shared/math/linear";
import type { Vec3 } from "@/shared/math/types";
import { createGauge } from "@/shared/metrics/metrics";
import type { RegistryLoader } from "@/shared/registry";
import { assertNever } from "@/shared/util/type_helpers";
import type { RpcContext } from "@/shared/zrpc/core";
import { ok } from "assert";

// Wrap the response, but eliminate undefined.
function bulkEntityResponse(
  entities: Iterable<ReadonlyEntity | undefined>
): WrappedEntity[] {
  const results: WrappedEntity[] = [];
  for (const entity of entities) {
    if (entity) {
      results.push(WrappedEntity.for(entity));
    }
  }
  return results;
}

export class AskServiceImpl implements AskService {
  constructor(private readonly table: Table<AskMetaIndex>) {
    createGauge({
      name: "replica_tick",
      help: "Current tick of a replica server",
      collect: (gauge) => {
        gauge.set(this.table.tick);
      },
    });
  }

  async ping() {}

  async get(_context: RpcContext, ids: BiomesId[]) {
    return ids.map((id) => WrappedEntity.for(this.table.get(id)));
  }

  async getWithVersion(_context: RpcContext, ids: BiomesId[]) {
    return ids.map((id) => {
      const [version, entity] = this.table.getWithVersion(id);
      return [version, WrappedEntity.for(entity)] as [
        number,
        WrappedEntity | undefined
      ];
    });
  }

  async playerCount(_context: RpcContext) {
    return (
      this.table.metaIndex.realActivePlayers.size +
      this.table.metaIndex.activeGremlins.size
    );
  }

  async has(_context: RpcContext, ids: BiomesId[]) {
    return ids.filter((id) => this.table.get(id) === undefined);
  }

  async getByKeys(_context: RpcContext, request: GetByKeysRequest) {
    switch (request.kind) {
      case "npcsByType":
        return bulkEntityResponse(
          this.table.scan(NpcSelector.query.key(request.typeId))
        );
      case "presetByLabel":
        return bulkEntityResponse(
          this.table.scan(PresetByLabelSelector.query.key(request.label))
        );
      case "minigameElementByMinigameId":
        return bulkEntityResponse(
          this.table.scan(
            MinigameElementByMinigameIdSelector.query.key(request.minigameId)
          )
        );
      case "minigameInstancesByMinigameId":
        return bulkEntityResponse(
          this.table.scan(
            MinigameInstancesByMinigameIdSelector.query.key(request.minigameId)
          )
        );
      case "robotsByCreatorId":
        return bulkEntityResponse(
          this.table.scan(
            RobotsByCreatorIdSelector.query.key(request.creatorId)
          )
        );
      case "minigamesByCreatorId":
        return bulkEntityResponse(
          this.table.scan(
            MinigamesByCreatorIdSelector.query.key(request.creatorId)
          )
        );
      case "placeablesByItemId":
        return bulkEntityResponse(
          this.table.scan(PlaceablesByItemIdSelector.query.key(request.itemId))
        );
      default:
        assertNever(request);
        throw new Error(`Unknown key type: ${JSON.stringify(request)}`);
    }
  }

  async centerOfTerrain(_context: RpcContext): Promise<Vec3> {
    return centerOfTerrain(this.table);
  }

  async *scanAll(
    _context: RpcContext,
    scanAllRequest: ScanAllRequest
  ): AsyncIterable<WrappedEntity[]> {
    ok(scanAllRequest in zScanAllRequest.Values);
    const query = (() => {
      switch (scanAllRequest) {
        case "npcs":
          return NpcSelector.query.all();
        case "gremlins":
          return GremlinSelector.query.all();
        case "presets":
          return PresetByLabelSelector.query.all();
        case "ready_minigames":
          return ReadyMinigameSelector.query.all();
        case "quest_givers":
          return NamedQuestGiverSelector.query.all();
        case "named_npcs":
          return NamedNpcSelector.query.all();
        case "landmarks":
          return LandmarkSelector.query.all();
        case "robots":
          return RobotSelector.query.all();
        case "players":
          return ActivePlayersSelector.query.all();
        default:
          assertNever(scanAllRequest);
      }
    })()!;
    const chunk: WrappedEntity[] = [];
    const flush = () => {
      if (chunk.length) {
        const result = Array.from(chunk);
        chunk.length = 0;
        return result;
      }
      return [];
    };

    for (const entity of this.table.scan(query)) {
      chunk.push(WrappedEntity.for(entity));
      if (chunk.length >= 50) {
        yield flush();
      }
    }
    yield flush();
  }

  async *scanForExport(
    _context: RpcContext,
    { versionMap: encodedVersionMap, aabb }: ScanForExportRequest
  ): AsyncIterable<[number, WrappedEntity]> {
    const versionMap = decodeVersionMap(encodedVersionMap);
    for (const [id, [version, entity]] of this.table.deltaSince()) {
      if (!entity) {
        continue;
      }
      const existingVersion = versionMap.get(id);
      if (existingVersion !== undefined && existingVersion >= version) {
        continue;
      }
      if (!isPlayer(entity)) {
        if (entity.position) {
          if (!containsAABB(aabb, entity.position.v)) {
            continue;
          }
        } else if (entity.box) {
          if (!intersectsAABB(aabb, [entity.box.v0, entity.box.v1])) {
            continue;
          }
        }
      }
      yield [version, WrappedEntity.for(entity)];
    }
  }
}

export async function registerAskService<
  C extends {
    replica: AskReplica;
    rpcServer: ZrpcServer;
  }
>(loader: RegistryLoader<C>) {
  const [replica, rpcServer] = await Promise.all([
    loader.get("replica"),
    loader.get("rpcServer"),
  ]);
  const service = new AskServiceImpl(replica.table);
  rpcServer.install(zAskService, service);
  return service;
}
