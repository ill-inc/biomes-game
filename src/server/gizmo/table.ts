import {
  ProtectionByTeamIdSelector,
  RobotsByCreatorIdSelector,
  RobotsByLandmarkNameSelector,
  TerrainShardSelector,
} from "@/shared/ecs/gen/selectors";
import { keyFromComponent } from "@/shared/ecs/key_index";
import type { Table, WriteableTable } from "@/shared/ecs/table";
import { createTable } from "@/shared/ecs/table";

function createGizmoIndexConfig() {
  return {
    ...TerrainShardSelector.createIndexFor.spatial(),
    ...RobotsByCreatorIdSelector.createIndexFor.key(
      keyFromComponent("created_by", (c) => [c.id])
    ),
    ...RobotsByLandmarkNameSelector.createIndexFor.key(
      keyFromComponent("landmark", (c) =>
        c.override_name ? [c.override_name] : []
      )
    ),
    ...ProtectionByTeamIdSelector.createIndexFor.key(
      keyFromComponent("acl_component", (c) =>
        c.acl.creatorTeam?.[0] ? [c.acl.creatorTeam[0]] : []
      )
    ),
  };
}

export type GizmoMetaIndex = ReturnType<typeof createGizmoIndexConfig>;
export type GizmoTable = WriteableTable & Table<GizmoMetaIndex>;

export function createGizmoTable(): GizmoTable {
  return createTable(createGizmoIndexConfig());
}
