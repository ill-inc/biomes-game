import { migrateEntities } from "@/../scripts/node/abstract_migrate_script";
import { DEFAULT_ROBOT_EXPIRATION_S } from "@/shared/constants";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { ReadonlyVec3, Vec3 } from "@/shared/math/types";
import { all } from "@/shared/util/helpers";

// Script that just re-runs getNpcSize on all of them.
const [backupFile] = process.argv.slice(2);

function isGridSize([w, h, d]: ReadonlyVec3) {
  const [tw, th, td] = toGridSize([w, h, d]);
  return all([w == tw, h == th, d == td], (b) => b);
}

function toGridSize([w, h, d]: ReadonlyVec3): Vec3 {
  return [
    32 * Math.floor((w + 31) / 32),
    32 * Math.floor((h + 31) / 32),
    32 * Math.floor((d + 31) / 32),
  ];
}

const expireAt = secondsSinceEpoch() + DEFAULT_ROBOT_EXPIRATION_S;
migrateEntities(
  backupFile,
  (entity) =>
    entity.robot_component !== undefined &&
    (!entity.unmuck?.snapToGrid ||
      !isGridSize(entity.projects_protection!.size)),
  (entity) => {
    const grid = toGridSize(entity.projectsProtection()!.size);

    // Update unmuck field.
    Object.assign(entity.mutableUnmuck(), {
      volume: { kind: "box", box: [...grid] },
      snapToGrid: 32,
    });

    // Update projection field.
    Object.assign(entity.mutableProjectsProtection(), {
      ...entity.projectsProtection(),
      size: [...grid],
      snapToGrid: 32,
    });
  }
);
