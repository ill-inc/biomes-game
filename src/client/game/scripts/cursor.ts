import type { PermissionsManager } from "@/client/game/context_managers/permissions_manager";
import type { ClientTable } from "@/client/game/game";
import { traceBlueprints } from "@/client/game/helpers/blueprint";
import { MarchHelper } from "@/client/game/helpers/march";
import { occupancyAt } from "@/client/game/helpers/occupancy";
import type { Cursor } from "@/client/game/resources/cursor";
import { attackableEntitiesInAttackRegion } from "@/client/game/resources/melee_attack_region";
import type { ClientResources } from "@/client/game/resources/types";
import type { Script } from "@/client/game/scripts/script_controller";
import type { TerrainHit } from "@/shared/game/spatial";
import { traceEntities } from "@/shared/game/spatial";
import { TerrainHelper } from "@/shared/game/terrain_helper";
import { terrainMarch } from "@/shared/game/terrain_march";
import type { BiomesId } from "@/shared/ids";
import { cross } from "@/shared/math/linear";
import type { VoxelooModule } from "@/shared/wasm/types";
import { compact, isEqual, last } from "lodash";

const MAX_CURSOR_DISTANCE = 32;

export class CursorScript implements Script {
  readonly name = "cursor";

  constructor(
    readonly userId: BiomesId,
    readonly resources: ClientResources,
    readonly permissionsManager: PermissionsManager,
    readonly table: ClientTable,
    readonly voxeloo: VoxelooModule
  ) {}

  getCursorHit(): Cursor {
    const ray = MarchHelper.getPlayerRay(this.resources, MAX_CURSOR_DISTANCE);
    const source = ray.source.toArray();
    const direction = ray.direction.toArray();
    const maxDistance = MAX_CURSOR_DISTANCE;
    // Check entities hit by the ray.

    const entityHits = traceEntities(this.table, source, direction, {
      maxDistance,
      entityFilter: (e) =>
        !e.gremlin &&
        e.id !== this.userId &&
        (!e.health || e.health.hp > 0) &&
        !e.protection && // TODO: Add an "interactable" component to entities the user can interact with.
        !e.blueprint_component,
    });
    let entityHit = last(entityHits);

    const terrainHelper = TerrainHelper.fromResources(
      this.voxeloo,
      this.resources
    );
    // Check terrain hit by the ray.
    let terrainHit: TerrainHit | undefined;
    terrainMarch(
      this.voxeloo,
      this.resources,
      source,
      direction,
      maxDistance,
      (hit) => {
        terrainHit = {
          kind: "terrain",
          pos: hit.pos,
          face: hit.face,
          terrainId: hit.terrainId,
          distance: hit.distance,
          terrainSample: {
            dye: terrainHelper.getDye(hit.pos),
            muck: terrainHelper.getMuck(hit.pos),
            moisture: terrainHelper.getMoisture(hit.pos),
            terrainId: hit.terrainId,
          },
        };
        return false;
      }
    );
    if (terrainHit) {
      // Augment terrain hit with group occupancy.
      terrainHit.groupId = occupancyAt(this.resources, terrainHit.pos);
    }

    // Check blueprint voxels hit by the ray.

    const blueprintHit = traceBlueprints(
      { resources: this.resources, table: this.table },
      source,
      direction,
      MAX_CURSOR_DISTANCE
    );
    if (
      blueprintHit &&
      terrainHit &&
      isEqual(blueprintHit.pos, terrainHit.pos)
    ) {
      // Augment blueprint hit with terrain hit if they are the same position.
      blueprintHit.terrainId = terrainHit?.terrainId;
      blueprintHit.face = terrainHit?.face;
      entityHit = undefined;
    }

    // Determine which hit is closest.

    let hit = last(
      compact([entityHit, terrainHit, blueprintHit]).sort(
        (a, b) =>
          (b?.distance ?? Number.POSITIVE_INFINITY) -
          (a?.distance ?? Number.POSITIVE_INFINITY)
      )
    );

    if (
      hit === terrainHit &&
      terrainHit &&
      blueprintHit &&
      isEqual(terrainHit.pos, blueprintHit.pos)
    ) {
      // All things equal, prefer blueprint hit over terrain hit.
      hit = blueprintHit;
    }

    // Check attackable entities in the region.

    const player = this.resources.get("/scene/local_player");
    const attackableEntities = attackableEntitiesInAttackRegion(
      this,
      player.id
    );

    const right = cross([0, -1, 0], direction);

    return {
      startPos: source,
      dir: direction,
      right,
      hit,
      attackableEntities,
    };
  }

  tick(_dt: number) {
    // Update cursor.
    const prev = this.resources.get("/scene/cursor");
    const curr = this.getCursorHit();

    if (curr.hit) {
      // Use rough distance so that we don't invalidate resources that depend on this needlessly.
      curr.hit.distance = Math.floor(curr.hit.distance);
    }

    if (!isEqual(curr, prev)) {
      this.resources.update("/scene/cursor", (cursor) => {
        Object.assign(cursor, curr);
      });
    }
  }
}
