import {
  migrateTerrain,
  scanEntities,
} from "@/../scripts/node/abstract_migrate_script";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { using } from "@/shared/deletable";
import { scanGroupTensor } from "@/shared/game/group";
import { getAabbForPlaceable } from "@/shared/game/placeables";
import { ShardId, blockPos, voxelShard } from "@/shared/game/shard";
import { ReadonlyTerrain, Terrain } from "@/shared/game/terrain/terrain";
import { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { aabbIterator, add, ceil, floor, sub } from "@/shared/math/linear";
import { ReadonlyVec3, Vec3 } from "@/shared/math/types";
import { MultiMap } from "@/shared/util/collections";
import { zeroToUndefined } from "@/shared/util/helpers";
import { isEqual } from "lodash";

const [backupFile, verboseFlag] = process.argv.slice(2);
const verbose = verboseFlag === "verbose";

const maybeLog = (message?: any, ...optionalParams: any[]) => {
  if (verbose) {
    console.log(message, ...optionalParams);
  }
};

async function main() {
  const voxeloo = await loadVoxeloo();

  // Scan all entities and build a map from shard to occupancies.
  const shardToOccupancies = new MultiMap<ShardId, [Vec3, BiomesId]>();
  const entityIdToVersion = new Map<BiomesId, number>();
  await scanEntities(backupFile, (entity, version) => {
    if (entity.iced) {
      return;
    }
    if (entity.placeable_component && entity.position) {
      const aabb = getAabbForPlaceable(
        entity.placeable_component.item_id,
        entity.position.v,
        entity.orientation?.v
      );
      if (!aabb) {
        return;
      }
      const epsilon = [1e-9, 1e-9, 1e-9] as const;
      for (const worldPos of aabbIterator([
        floor(add(aabb[0], epsilon)),
        ceil(sub(aabb[1], epsilon)),
      ])) {
        const shardPos = blockPos(...worldPos);
        const shardId = voxelShard(...worldPos);
        // Add placeable occupancies.
        shardToOccupancies.add(shardId, [shardPos, entity.id]);
        entityIdToVersion.set(entity.id, version);
      }
    } else if (entity.group_component && entity.box) {
      const tensorBlob = entity.group_component.tensor;
      const box = entity.box;
      using(new voxeloo.GroupTensor(), (tensor) => {
        tensor.load(tensorBlob);
        for (const { tensorPos } of scanGroupTensor(tensor)) {
          const worldPos = add(tensorPos, box.v0);
          const shardPos = blockPos(...worldPos);
          const shardId = voxelShard(...worldPos);
          // Add group occupancies.
          shardToOccupancies.add(shardId, [shardPos, entity.id]);
        }
      });
    }
  });

  let occupancyIsSetButShouldBeNone = 0;
  let occupancyIsNoneButShouldBeSet = 0;
  let occupancyIsSetButWrong = 0;

  const latestEntity: {
    entityId?: BiomesId;
    version?: number;
  } = {};

  // If ReadonlyTerrain is passed, returns boolean whether fix is required; otherwise, applies fix.
  const applyShardFix = (
    terrain: Terrain | ReadonlyTerrain,
    shardId: ShardId
  ): boolean => {
    let changes = false;
    const shardOccupanies = shardToOccupancies.get(shardId);
    const occupancyAt = (shardPos: Vec3) => {
      const occupancy = shardOccupanies.find(([pos]) => isEqual(pos, shardPos));
      return occupancy?.[1];
    };

    // Test and maybe fix occupancy discrepancy.
    const testAndMaybeFix = (
      shardPos: ReadonlyVec3,
      currentOccupancy: BiomesId | undefined,
      neededOccupancy: BiomesId | undefined,
      info: { entityId: BiomesId | undefined; version: number | undefined }
    ) => {
      if (!currentOccupancy && !!neededOccupancy) {
        occupancyIsNoneButShouldBeSet++;
        maybeLog(
          "occupancyIsNoneButShouldBeSet",
          currentOccupancy,
          neededOccupancy
        );
      } else if (!!currentOccupancy && !neededOccupancy) {
        occupancyIsSetButShouldBeNone++;
        maybeLog(
          "occupancyIsSetButShouldBeNone",
          currentOccupancy,
          neededOccupancy
        );
      } else if (currentOccupancy !== neededOccupancy) {
        occupancyIsSetButWrong++;
        maybeLog("occupancyIsSetButWrong", currentOccupancy, neededOccupancy);
      }
      if (currentOccupancy !== neededOccupancy) {
        if (terrain instanceof Terrain) {
          terrain.setTerrainAt(
            shardPos,
            {
              occupancyId: neededOccupancy,
            },
            undefined
          );
        }
        if (!latestEntity.version || info.version! > latestEntity.version) {
          latestEntity.entityId = info.entityId;
          latestEntity.version = info.version;
        }
        changes = true;
      }
    };

    const vecToString = (v: ReadonlyVec3) => v.join(",");
    const alreadyCheckedPositions = new Set<string>();

    // Iterate over occupancy tensor and fix discrepancies.
    const tensor = terrain.buffers.occupancy.getUnsafeTensor();
    if (tensor) {
      for (const [
        shardPos,
        occupancyId,
      ] of terrain.buffers.occupancy.getUnsafeTensor()!) {
        const currentOccupancy = zeroToUndefined(occupancyId as BiomesId);
        const neededOccupancy = occupancyAt(shardPos);
        testAndMaybeFix(shardPos, currentOccupancy, neededOccupancy, {
          entityId: neededOccupancy,
          version: neededOccupancy
            ? entityIdToVersion.get(neededOccupancy)
            : undefined,
        });
        alreadyCheckedPositions.add(vecToString(shardPos));
      }
    }

    // Iterate over placeable / group occupancies and fix discrepancies.
    for (const [shardPos, neededOccupancy] of shardOccupanies) {
      if (alreadyCheckedPositions.has(vecToString(shardPos))) {
        continue;
      }
      const currentOccupancy = zeroToUndefined(
        terrain.occupancy.get(...shardPos) as BiomesId
      );
      testAndMaybeFix(shardPos, currentOccupancy, neededOccupancy, {
        entityId: neededOccupancy,
        version: neededOccupancy
          ? entityIdToVersion.get(neededOccupancy)
          : undefined,
      });
    }
    return changes;
  };

  await migrateTerrain(
    backupFile,
    applyShardFix,
    (terrain, shardId) => {
      applyShardFix(terrain, shardId);
    },
    () => {
      log.info(
        `
        occupancyIsSetButShouldBeNone = ${occupancyIsSetButShouldBeNone}
        occupancyIsNoneButShouldBeSet = ${occupancyIsNoneButShouldBeSet}
        occupancyIsSetButWrong = ${occupancyIsSetButWrong}
        latestEntityId = ${latestEntity.entityId}
        `
      );
    }
  );
}

main();
