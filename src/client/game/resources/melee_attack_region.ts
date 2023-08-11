import type { ClientContextSubset } from "@/client/game/context";
import type { ClientTable } from "@/client/game/game";
import type { Player } from "@/client/game/resources/players";
import type { ClientRuleSet } from "@/server/shared/minigames/ruleset/client_types";
import type { TweakableConfig } from "@/server/shared/minigames/ruleset/tweaks";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { CollideableSelector } from "@/shared/ecs/gen/selectors";
import { isEntryDomainAabb } from "@/shared/ecs/spatial/types";
import { isPlayer } from "@/shared/game/players";
import type { BiomesId } from "@/shared/ids";
import {
  frustumBoundingSphere,
  frustumToConvexPolytope,
  intersectConvexPolytopeAABB,
  makeOrthoProjection,
  makeTranslation,
  makeXRotate,
  makeYRotate,
  mulm4,
  pointInConvexPolytope,
} from "@/shared/math/linear";
import type { ConvexPolytope, Mat4, Sphere } from "@/shared/math/types";
import { idToNpcType } from "@/shared/npc/bikkie";
import * as THREE from "three";

export function canAttackFilter(
  ruleset: ClientRuleSet,
  aclAllowsPlayers: boolean,
  source: ReadonlyEntity | undefined,
  x: ReadonlyEntity
): boolean {
  if (!x.health || x.health.hp <= 0) {
    return false;
  }

  if (
    source &&
    isPlayer(x) &&
    ruleset.canAttackPlayer(aclAllowsPlayers, source, x)
  ) {
    return true;
  }

  const npcTypeId = x.npc_metadata?.type_id;
  if (npcTypeId === undefined) {
    return false;
  }
  return idToNpcType(npcTypeId).behavior.damageable?.attackable ?? false;
}

export function attackableEntitiesInAttackRegion(
  deps: ClientContextSubset<"table" | "resources" | "permissionsManager">,
  owningPlayerId: BiomesId
): ReadonlyEntity[] {
  const attackRegion = deps.resources.get(
    "/player/melee_attack_region",
    owningPlayerId
  );
  const aclAllowsPlayers = deps.permissionsManager.clientActionAllowedAt(
    "pvp",
    attackRegion.boundingSphere.center
  );

  const ruleSet = deps.resources.get("/ruleset/current");
  const me = deps.resources.get("/ecs/entity", owningPlayerId);

  return entitiesInAttackRegion(
    deps.table,
    attackRegion,
    (x) => x.id !== owningPlayerId
  ).filter((e) => canAttackFilter(ruleSet, aclAllowsPlayers, me, e));
}

// The 🤘cone of attack🤘.
export interface MeleeAttackRegion {
  frustum: Mat4;
  region: ConvexPolytope;
  boundingSphere: Sphere;
}

export function meleeAttackRegionTemplate(tweaks: TweakableConfig): Mat4 {
  const near = tweaks.combat.meleeAttackRegion.near;
  const far = Math.max(near + 0.01, tweaks.combat.meleeAttackRegion.far);
  const left = tweaks.combat.meleeAttackRegion.left;
  const right = Math.max(left + 0.01, tweaks.combat.meleeAttackRegion.right);
  const bottom = tweaks.combat.meleeAttackRegion.bottom;
  const top = Math.max(bottom + 0.01, tweaks.combat.meleeAttackRegion.top);

  return makeOrthoProjection(near, far, left, right, top, bottom);
}

// Essentially transforms the static MeleeAttackRegion over to in front of the
// player.
export function getPlayerMeleeAttackRegion(
  player: Player,
  template: Mat4
): MeleeAttackRegion {
  const playerWorld = mulm4(
    makeTranslation(player.position),
    mulm4(
      makeYRotate(player.orientation[1]),
      makeXRotate(player.orientation[0])
    )
  );
  // Almost avoided THREE.js...  Didn't want to write a Matrix inverse function
  // though.
  const playerView = new THREE.Matrix4()
    .fromArray(playerWorld)
    .invert()
    .toArray();
  const attackRegion = mulm4(template, playerView);

  return {
    frustum: attackRegion,
    region: frustumToConvexPolytope(attackRegion),
    boundingSphere: frustumBoundingSphere(attackRegion),
  };
}

export function entitiesInAttackRegion(
  table: ClientTable,
  attackRegion: MeleeAttackRegion,
  filter: (x: ReadonlyEntity) => boolean
): ReadonlyEntity[] {
  const { region, boundingSphere } = attackRegion;

  const entities: ReadonlyEntity[] = [];
  for (const entity of table.scan(
    CollideableSelector.query.spatial.inSphere(boundingSphere, {
      refine: (domain) => {
        if (isEntryDomainAabb(domain)) {
          return intersectConvexPolytopeAABB(region, domain);
        } else {
          return pointInConvexPolytope(region, domain);
        }
      },
    })
  )) {
    if (!filter(entity)) {
      continue;
    }
    entities.push(entity);
  }

  return entities;
}
