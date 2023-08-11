import { getBiscuit } from "@/shared/bikkie/active";
import { BikkieIds } from "@/shared/bikkie/ids";
import type {
  PlayerModifier,
  PlayerModifiersRequired,
} from "@/shared/bikkie/schema/types";
import {
  zPlayerModifiers,
  zPlayerModifiersRequired,
} from "@/shared/bikkie/schema/types";
import type {
  ReadonlyBuffsComponent,
  ReadonlySelectedItem,
  ReadonlyWearing,
} from "@/shared/ecs/gen/components";
import type {
  AsDelta,
  ComponentName,
  ReadonlyEntity,
  ReadonlyEntityWith,
} from "@/shared/ecs/gen/entities";
import type {
  EcsResourceDeps,
  EcsResources,
} from "@/shared/game/ecs_resources";

import { terrainIdToBlock } from "@/shared/bikkie/terrain";
import { CAVE_OCCLUSION_THRESHOLD, MUCKED_THRESHOLD } from "@/shared/constants";
import type { Buff, Item, ReadonlyBuffsList } from "@/shared/ecs/gen/types";
import { anItem } from "@/shared/game/item";
import { TerrainHelper } from "@/shared/game/terrain_helper";
import type { BiomesId } from "@/shared/ids";
import {
  EPSILON,
  anchorAndSizeToAABB,
  centerAABB,
  mul,
  sub,
} from "@/shared/math/linear";
import type { AABB, Vec3 } from "@/shared/math/types";
import type { VoxelooModule } from "@/shared/wasm/types";
import { ok } from "assert";

const DEFAULT_PLAYER_SCALE = 1;
const PLAYER_MESH_BOX_SIZE: Vec3 = [0.75, 1.8, 0.75];
export const MAX_VOXELS_TO_CHECK_FOR_BUFF_BLOCKS = 3;

export function playerAABB(
  position: Readonly<Vec3>,
  scale: number = DEFAULT_PLAYER_SCALE
): AABB {
  return anchorAndSizeToAABB(position, mul(scale, PLAYER_MESH_BOX_SIZE));
}

export const PLAYER_NEEDED_COMPONENTS = ["remote_connection"] as const;

export interface HasComponentChecker {
  has<C extends ComponentName>(...components: C[]): boolean;
}

export function isPlayer(
  entity?: ReadonlyEntity
): entity is ReadonlyEntityWith<"remote_connection">;
export function isPlayer(
  entity?: AsDelta<ReadonlyEntity>
): entity is AsDelta<ReadonlyEntityWith<"remote_connection">>;
export function isPlayer(
  entity?: ReadonlyEntity | AsDelta<ReadonlyEntity>
): entity is
  | ReadonlyEntityWith<"remote_connection">
  | AsDelta<ReadonlyEntityWith<"remote_connection">>;
export function isPlayer(entity?: HasComponentChecker): boolean;
export function isPlayer(
  entity?: ReadonlyEntity | AsDelta<ReadonlyEntity> | HasComponentChecker
): entity is ReadonlyEntity | AsDelta<ReadonlyEntity> {
  if (entity && "has" in entity) {
    return entity.has("remote_connection");
  }
  return !!entity?.remote_connection;
}

export function getPlayerModifiersFromBuffs(buffs?: ReadonlyBuffsList) {
  return getPlayerModifiersFromBuffIds(
    buffs?.filter((buff) => !buff.is_disabled).map((buff) => buff.item_id) || []
  );
}

export function getPlayerModifiersFromBuffIds(
  buffIds: BiomesId[]
): PlayerModifiersRequired {
  // Grab the default modifier object.
  const modifiers: PlayerModifiersRequired = zPlayerModifiersRequired.parse({});

  for (const id of buffIds) {
    const buff = anItem(id);
    if (!buff) {
      continue;
    }

    const keys = zPlayerModifiers.keyof().options;
    for (const key of keys) {
      const currentModifier = modifiers[key] as PlayerModifier;
      const buffModifier = buff.playerModifiers?.[key] as PlayerModifier;
      if (!buffModifier) {
        continue;
      }
      switch (currentModifier.kind) {
        case "boolean": {
          ok(buffModifier?.kind === "boolean");
          currentModifier.enabled =
            currentModifier.enabled || buffModifier.enabled;
          break;
        }
        case "additive": {
          ok(buffModifier?.kind === "additive");
          currentModifier.increase =
            currentModifier.increase + buffModifier.increase;
          break;
        }
        case "multiplicative": {
          ok(buffModifier?.kind === "multiplicative");
          currentModifier.multiplier =
            currentModifier.multiplier * buffModifier.multiplier;
          break;
        }
        default: {
          ok(false, `Unknown player modifier kind: ${currentModifier}`);
        }
      }
    }
  }

  return modifiers;
}

export function inTheMuck(muckyness: number) {
  return muckyness > MUCKED_THRESHOLD;
}

export function inCave(skyOcclusion: number) {
  return skyOcclusion > CAVE_OCCLUSION_THRESHOLD;
}

function getMuckynessForPlayer(
  voxeloo: VoxelooModule,
  playerId: BiomesId,
  resources: EcsResources | EcsResourceDeps
) {
  const terrainHelper = TerrainHelper.fromResources(voxeloo, resources);
  const playerPosition = resources.get("/ecs/c/position", playerId);
  if (!playerPosition) {
    return 0;
  }
  const aabb = playerAABB(playerPosition.v);
  const center = centerAABB(aabb);
  return terrainHelper.getMuck(center);
}

export function getBlockBelowPlayer(
  voxeloo: VoxelooModule,
  resources: EcsResources | EcsResourceDeps,
  playerId: BiomesId,
  maxDepthToCheck: number
): [Item, number] | [undefined, undefined] {
  const terrainHelper = TerrainHelper.fromResources(voxeloo, resources);
  const playerPosition = resources.get("/ecs/c/position", playerId);
  if (!playerPosition) {
    return [undefined, undefined];
  }
  const aabb = playerAABB(playerPosition.v);
  const bottomCenter = sub(centerAABB(aabb), [
    0,
    (aabb[1][1] - aabb[0][1]) / 2,
    0,
  ]);

  for (let i = 0; i <= maxDepthToCheck; i += 1) {
    const blockUnder = terrainIdToBlock(
      terrainHelper.getTerrainID(sub(bottomCenter, [0, i + EPSILON, 0]))
    );
    if (blockUnder) {
      return [blockUnder, i];
    }
  }

  return [undefined, undefined];
}

export function getPlayerBuffs(
  voxeloo: VoxelooModule,
  resources: EcsResources | EcsResourceDeps,
  playerId: BiomesId
) {
  const buffsComponent = resources.get("/ecs/c/buffs_component", playerId);
  const wearing = resources.get("/ecs/c/wearing", playerId);
  const selectedItem = resources.get("/ecs/c/selected_item", playerId);
  const muckyness = getMuckynessForPlayer(voxeloo, playerId, resources);
  const [blockBelow] = getBlockBelowPlayer(
    voxeloo,
    resources,
    playerId,
    MAX_VOXELS_TO_CHECK_FOR_BUFF_BLOCKS
  );

  return getPlayerBuffsByComponents({
    buffsComponent,
    wearing,
    selectedItem,
    muckyness,
    blockBelow,
  });
}

export function getPlayerBuffsByComponents({
  buffsComponent,
  wearing,
  selectedItem,
  muckyness,
  blockBelow,
}: {
  buffsComponent?: ReadonlyBuffsComponent;
  wearing?: ReadonlyWearing;
  selectedItem?: ReadonlySelectedItem;
  muckyness?: number;
  blockBelow?: Item;
}) {
  const buffs: Buff[] = [];

  // Right now the `buffs` bikkie attribute has overloaded meaning and it
  // is inferred based off of the item's type. It means
  // * give the buff when _eaten_ for consumables
  // * give the buff when _worn_ for wearables
  // * give the buff when _held_ for non-consumables/non-wearables
  // May want to make this more explicit in bikkie in the future to denote
  // what action should be taken in order for the buff to be activated.
  for (const buff of buffsComponent?.buffs || []) {
    buffs.push(buff);
  }

  for (const wearable of wearing?.items.values() || []) {
    const wearableBuffs = anItem(wearable.id)?.buffs;
    for (const buff of wearableBuffs || []) {
      buffs.push({
        item_id: buff[0],
        from_id: wearable.id,
        start_time: undefined,
        is_disabled: undefined,
      });
    }
  }

  const selectedItemBiscuit = selectedItem?.item?.item;
  if (
    selectedItemBiscuit &&
    !selectedItemBiscuit.isConsumable &&
    !selectedItemBiscuit.isWearable
  ) {
    for (const buff of selectedItemBiscuit.buffs || []) {
      buffs.push({
        item_id: buff[0],
        from_id: selectedItemBiscuit.id,
        start_time: undefined,
        is_disabled: undefined,
      });
    }
  }

  if (muckyness && inTheMuck(muckyness)) {
    const muckSicknessBuff = getBiscuit(BikkieIds.muckSickness);
    if (muckSicknessBuff) {
      buffs.push({
        item_id: muckSicknessBuff.id,
        start_time: undefined,
        from_id: undefined,
        is_disabled: undefined,
      });
    }
  }

  if (blockBelow && blockBelow.buffs) {
    for (const buff of blockBelow.buffs) {
      buffs.push({
        item_id: buff[0],
        start_time: undefined,
        from_id: blockBelow.id,
        is_disabled: undefined,
      });
    }
  }

  const buffsToNegate: BiomesId[] = [];
  for (const { item_id } of buffs) {
    const biscuit = getBiscuit(item_id);
    if (biscuit.negatesBuffs) {
      buffsToNegate.push(...biscuit.negatesBuffs);
    }
  }

  for (const buff of buffs) {
    if (buffsToNegate.includes(buff.item_id)) {
      buff.is_disabled = true;
    }
  }

  return buffs;
}

export const ALWAYS_ALLOWED_ITEM_ACTIONS = [
  "fish",
  "eat",
  "drink",
  "photo",
  "warpHome",
  "placeEphemeral",
];
