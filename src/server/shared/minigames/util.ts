import type { AskApi } from "@/server/ask/api";
import type { EventContext } from "@/server/logic/events/core";
import { RollbackError } from "@/server/logic/events/core";
import type { QueriedEntityWith } from "@/server/logic/events/query";
import type { SpaceClipboardDelta } from "@/server/logic/events/space_clipboard";
import {
  cutSpace,
  deleteSpace,
  pasteCopySpace,
  pasteSpace,
} from "@/server/logic/events/space_clipboard";
import { PlayerInventoryEditor } from "@/server/logic/inventory/player_inventory_editor";
import { forcePlayerWarp } from "@/server/logic/utils/players";
import { stashEntity, unstashComponents } from "@/server/logic/utils/stashing";
import type { LogicApi } from "@/server/shared/api/logic";
import type { LazyEntity, LazyEntityWith } from "@/server/shared/ecs/gen/lazy";
import {
  baseMinigameServerRuleset,
  buildMetagameServerRuleset,
} from "@/server/shared/minigames/ruleset/server_base";
import type { ServerRuleset } from "@/server/shared/minigames/ruleset/server_types";
import type { ServerMods } from "@/server/shared/minigames/server_mods";
import {
  ALL_SERVER_MODS,
  serverModFor,
} from "@/server/shared/minigames/server_mods";
import type {
  CreateMinigameSpaceClipboardSpec,
  DeleteContext,
  ExpireMinigameSpaceClipboardSpec,
  TickMinigameSpaceClipboardSpec,
} from "@/server/shared/minigames/types";
import type { WorldApi } from "@/server/shared/world/api";
import { BikkieIds } from "@/shared/bikkie/ids";
import { attribs } from "@/shared/bikkie/schema/attributes";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import type {
  MinigameInstance,
  MinigameInstanceTickInfo,
  ReadonlyMinigameInstance,
} from "@/shared/ecs/gen/components";
import { Box, CreatedBy } from "@/shared/ecs/gen/components";
import type { Delta, DeltaWith } from "@/shared/ecs/gen/delta";
import { aabbToBox } from "@/shared/game/group";
import type { ItemPayload } from "@/shared/game/item";
import { placeableOrientationToPlayerOrientation } from "@/shared/game/placeables";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import {
  add,
  integerAABB,
  pointsToAABB,
  volumeAABB,
} from "@/shared/math/linear";
import type { OptionallyOrientedPoint } from "@/shared/math/types";
import { ok } from "assert";
import { compact, sample } from "lodash";

export function defaultMinigameItemAttributes(
  minigameId: BiomesId
): ItemPayload {
  return {
    [attribs.minigameId.id]: minigameId,
  };
}

export function determineArenaBoundary(minigameElements: LazyEntity[]) {
  const bboxMarkers = minigameElements.filter(
    (e) =>
      e.placeableComponent()?.item_id === BikkieIds.bboxMarker && e.position()
  );

  ok(
    bboxMarkers.length >= 2,
    "Unable to determine arena size, need at least two markers"
  );

  const aabb = integerAABB(
    pointsToAABB(...bboxMarkers.map((e) => e.position()!.v))
  );
  ok(volumeAABB(aabb) > 0, "Arena has 0 volume");
  ok(
    volumeAABB(aabb) < CONFIG.minigames.max_arena_volume,
    "Desired arena is too large"
  );

  return aabb;
}

export function resetMinigameInstanceSpace(
  minigameInstance: Delta,
  stowage: TickMinigameSpaceClipboardSpec,
  context: EventContext<{}>
) {
  const deleteReturn = deleteSpace(
    stowage.aabb,
    stowage.terrain,
    stowage.terrainRelevantEntities,
    context
  );

  const mutInstance = minigameInstance.mutableMinigameInstance();
  for (const entity of deleteReturn.deletedEntities) {
    mutInstance.instance_element_ids.delete(entity.id);
  }

  const copyReturn = pasteCopySpace(
    stowage.spaceClipboardEntity,
    stowage.aabb,
    stowage.terrain,
    stowage.spaceRelevantEntities,
    stowage.clonedRelevantEntityIds,
    context
  );

  for (const entity of copyReturn.clonedEntities) {
    mutInstance.instance_element_ids.add(entity.id);
  }

  return copyReturn.clonedEntities;
}

// Expire is an event that fires async after close, with enriched metadata
export function expireMinigameInstance(
  minigame: DeltaWith<"minigame_component">,
  minigameInstance: DeltaWith<"minigame_instance">,
  activePlayers: Delta[],
  activePlayerStashes: DeltaWith<"stashed">[],
  context: EventContext<{}>,
  stowage?: ExpireMinigameSpaceClipboardSpec
) {
  log.debug("Expiring minigame instance", {
    type: minigameInstance.minigameInstance().state.kind,
    id: minigameInstance.id,
  });
  const stashMap = new Map(activePlayerStashes.map((e) => [e.id, e]));
  const playerMap = new Map(activePlayers.map((e) => [e.id, e]));

  for (const [playerId, info] of minigameInstance.minigameInstance()
    .active_players) {
    const stash = stashMap.get(info.entry_stash_id);
    const player = playerMap.get(playerId);

    ok(
      stash && player,
      "Inconsistent state for minigame -- stash or player not found"
    );

    removePlayerFromMinigameInstance(
      player,
      stash,
      minigame,
      minigameInstance,
      context
    );
  }

  if (minigameInstance.minigameInstance().space_clipboard) {
    ok(stowage, "Expected a space clipboard");
    // Restore space back to original space (/not/ a copy)
    deleteSpace(
      stowage.aabb,
      stowage.terrain,
      stowage.terrainRelevantEntities,
      context
    );
    pasteSpace(
      context.voxeloo,
      stowage.spaceClipboardEntity,
      stowage.aabb,
      stowage.terrain,
      stowage.spaceRelevantEntities
    );
    context.delete(stowage.spaceClipboardEntity.id);
    minigameInstance.mutableMinigameInstance().space_clipboard = undefined;
  }

  const mutInstance = minigameInstance.mutableMinigameInstance();
  mutInstance.instance_element_ids.clear();

  minigameInstance.setIced();
  minigameInstance.clearMinigameInstanceExpire();
  minigameInstance.clearMinigameInstanceTickInfo();

  const mod = serverModFor(minigameInstance.minigameInstance().state.kind);
  mod.logicHooks.onExpired?.(
    { minigameEntity: minigame, minigameInstanceEntity: minigameInstance },
    context
  );
}

export function createMinigameInstance(
  minigameEntity: DeltaWith<"minigame_component">,
  newInstanceId: BiomesId,
  instanceSpec: MinigameInstance,
  context: EventContext<{}>,
  options: {
    spaceStowage?: CreateMinigameSpaceClipboardSpec;
  } = {}
) {
  ok(
    minigameEntity.minigameComponent().metadata.kind === instanceSpec.state.kind
  );

  const newInstance = context.create({
    id: newInstanceId,
    created_by: CreatedBy.create({
      id: minigameEntity.id,
      created_at: secondsSinceEpoch(),
    }),
    minigame_instance: instanceSpec,
  });

  minigameEntity
    .mutableMinigameComponent()
    .active_instance_ids.add(newInstance.id);

  if (options.spaceStowage) {
    ok(
      minigameEntity.minigameComponent().active_instance_ids.size === 1,
      "You can only have one active instance if you are stowing space"
    );
    const stowOptions = options.spaceStowage;
    ok(
      stowOptions.clonedRelevantEntityIds.length >=
        stowOptions.relevantEntities.length,
      `Expected ${stowOptions.relevantEntities.length} new ids and got ${stowOptions.clonedRelevantEntityIds.length}`
    );

    ok(
      volumeAABB(stowOptions.aabb) < CONFIG.minigames.max_arena_volume,
      "Arena is too large!"
    );

    const spaceEntity = context.create({
      id: stowOptions.spaceEntityId,
    });
    cutSpace(
      context.voxeloo,
      spaceEntity,
      stowOptions.aabb,
      stowOptions.terrain,
      stowOptions.relevantEntities
    );

    const mutInstance = newInstance.mutableMinigameInstance();

    mutInstance.space_clipboard = {
      region: {
        kind: "aabb",
        box: Box.clone(aabbToBox(stowOptions.aabb)),
        clipboard_entity_id: stowOptions.spaceEntityId,
      },
    };

    const pasteCopyReturn = pasteCopySpace(
      spaceEntity as SpaceClipboardDelta,
      stowOptions.aabb,
      stowOptions.terrain,
      stowOptions.relevantEntities,
      stowOptions.clonedRelevantEntityIds,
      context
    );

    for (const entity of pasteCopyReturn.clonedEntities) {
      mutInstance.instance_element_ids.add(entity.id);
    }
  }

  const mod = serverModFor(instanceSpec.state.kind);
  mod.logicHooks.onCreated?.(
    {
      minigameEntity,
      minigameInstanceEntity: newInstance,
      clipboard: options.spaceStowage,
    },
    context
  );

  return newInstance;
}

export function closeMinigameInstance(
  minigame: DeltaWith<"minigame_component">,
  minigameInstance: DeltaWith<"minigame_instance">,
  context: DeleteContext
) {
  if (!minigameInstance.minigameInstanceExpire()) {
    log.warn("Already closed");
  }
  log.debug("Closing minigame instance", {
    type: minigameInstance.minigameInstance().state.kind,
    id: minigameInstance.id,
  });
  if (minigameInstance.minigameInstanceTickInfo()) {
    minigameInstance.clearMinigameInstanceTickInfo();
  }

  minigame
    .mutableMinigameComponent()
    .active_instance_ids.delete(minigameInstance.id);

  const mut = minigameInstance.mutableMinigameInstance();
  mut.finished = true;
  minigameInstance.setMinigameInstanceExpire({
    trigger_at: secondsSinceEpoch(),
  });

  deleteMinigameIfUnreachable(minigame, context);
}

export interface AddPlayerToMinigameInstanceInfo {
  player: Delta;
  minigameCreator: Delta | undefined;
  minigame: DeltaWith<"minigame_component">;
  minigameInstance: DeltaWith<"minigame_instance">;
  minigameElements: DeltaWith<"minigame_element">[];
  stashEntityId: BiomesId;
}

export function addPlayerToMinigameInstance(
  info: AddPlayerToMinigameInstanceInfo,
  context: EventContext<{}>
) {
  const {
    player,
    minigameCreator,
    minigame,
    minigameInstance,
    minigameElements,
    stashEntityId,
  } = info;
  ok(
    !player.playingMinigame(),
    "Player is already in a minigame and must quit first"
  );

  ok(
    !minigameInstance.minigameInstance().finished,
    `Tried to join an already closed minigame instance ${minigameInstance.id}`
  );

  const entryPrice = BigInt(minigame.minigameComponent().entry_price ?? 0);
  const needsSpend = entryPrice > 0n && minigameCreator?.id !== player.id;
  // Spend the entry price
  if (needsSpend) {
    const inv = new PlayerInventoryEditor(context, player);
    if (!inv.trySpendCurrency(BikkieIds.bling, BigInt(entryPrice))) {
      throw new RollbackError("Not enough dough to play the game!");
    }

    if (minigameCreator) {
      const creatorInv = new PlayerInventoryEditor(context, minigameCreator);
      creatorInv.giveCurrency(BikkieIds.bling, BigInt(entryPrice));
    }
  }

  log.debug("Adding player to minigame instance", {
    type: minigameInstance.minigameInstance().state.kind,
    playerId: player.id,
    id: minigameInstance.id,
  });

  if (stashEntityId) {
    stashEntity(player, stashEntityId, context, minigameInstance.id);
  }

  const mod = serverModFor(minigameInstance.minigameInstance().state.kind);
  const spawn = mod.spawnPosition({
    kind: "initial",
    minigame,
    minigameInstance,
    minigameElements,
    player,
  });
  const spawnPosition = spawn?.[0];
  const spawnOrientation = spawn?.[1];

  minigameInstance.mutableMinigameInstance().active_players.set(player.id, {
    entry_stash_id: stashEntityId,
    entry_position: [...(player.position()?.v ?? [0, 0, 0])],
    entry_warped_to: spawnPosition,
    entry_time: secondsSinceEpoch(),
  });

  if (spawnPosition) {
    forcePlayerWarp(player, spawnPosition, spawnOrientation);
  }

  player.setPlayingMinigame({
    minigame_id: minigameInstance.minigameInstance().minigame_id,
    minigame_instance_id: minigameInstance.id,
    minigame_type: minigameInstance.minigameInstance().state.kind,
  });

  mod.logicHooks.onMinigamePlayerAdded?.(
    {
      player,
      minigameInstanceEntity: minigameInstance,
      minigameEntity: minigame,
    },
    context
  );

  context.publish({
    kind: "joinedMinigameEvent",
    entityId: player.id,
    minigameId: minigame.id,
    royaltyAmount: needsSpend ? entryPrice : undefined,
    royaltyTo: needsSpend ? minigameCreator?.id : undefined,
  });
}

export function removePlayerFromMinigameInstance(
  player: Delta,
  playerStash: DeltaWith<"stashed">,
  minigame: DeltaWith<"minigame_component">,
  minigameInstance: DeltaWith<"minigame_instance">,
  context: DeleteContext
) {
  const kind = minigame.minigameComponent().metadata.kind;
  const mod = serverModFor(kind);

  const activePlayerInfo = minigameInstance
    .minigameInstance()
    .active_players.get(player.id);

  ok(
    player.playingMinigame()?.minigame_instance_id === minigameInstance.id,
    "Not playing this instance"
  );
  ok(
    activePlayerInfo?.entry_stash_id === playerStash.id,
    "Incorrect player stash passed"
  );

  log.debug("Removing player to minigame instance", {
    type: minigameInstance.minigameInstance().state.kind,
    playerId: player.id,
    id: minigameInstance.id,
  });

  unstashComponents(
    player,
    playerStash.asReadonlyEntity(),
    context,
    mod.playerRestoredComponents
  );

  player.clearPlayingMinigame();
  minigameInstance.mutableMinigameInstance().active_players.delete(player.id);
  mod.logicHooks.onMinigamePlayerRemoved({
    player,
    playerStashedEntity: playerStash,
    minigameEntity: minigame,
    minigameInstanceEntity: minigameInstance,
    context,
  });
}

export function minigameTickIn(deltaS: number): MinigameInstanceTickInfo {
  return {
    trigger_at: secondsSinceEpoch() + deltaS,
    last_tick: secondsSinceEpoch(),
  };
}

export function scheduleMinigameTick(
  entity: QueriedEntityWith<"minigame_instance">,
  deltaS: number
) {
  entity.setMinigameInstanceTickInfo(minigameTickIn(deltaS));
}

export function sampleElementPositionForSpawn(
  elements: (LazyEntity | Delta)[]
): OptionallyOrientedPoint | undefined {
  const element = sample(elements);
  if (!element || !element.position()?.v) {
    return undefined;
  }
  return [
    [...element.position()!.v],
    element.orientation()?.v &&
      placeableOrientationToPlayerOrientation(element.orientation()!.v),
  ];
}

export function sampleElementPositionForObserver(
  elements: (LazyEntity | Delta)[]
): OptionallyOrientedPoint | undefined {
  const ret = sampleElementPositionForSpawn(elements);

  if (ret) {
    ret[0] = add(ret[0], [0, 2, 0]);
  }
  return ret;
}

export function serverRuleset(
  deps: {
    serverMods?: ServerMods;
  },
  player: LazyEntity | Delta,
  minigame?:
    | LazyEntityWith<"minigame_component">
    | DeltaWith<"minigame_component">,
  minigameInstance?:
    | LazyEntityWith<"minigame_instance">
    | DeltaWith<"minigame_instance">
): ServerRuleset {
  const metagameBase = buildMetagameServerRuleset();
  const serverMods = deps.serverMods ?? ALL_SERVER_MODS;

  if (minigame && minigameInstance) {
    const rebase = baseMinigameServerRuleset(metagameBase);

    const mod = serverModFor(
      minigame.minigameComponent()!.metadata.kind,
      serverMods
    );

    if (mod.buildServerRuleset) {
      return mod.buildServerRuleset(rebase, player, minigame, minigameInstance);
    }

    return rebase;
  }

  return metagameBase;
}

export async function resolveMinigameWarpPosition(
  deps: {
    askApi: AskApi;
    worldApi: WorldApi;
    serverMods: ServerMods;
  },
  playerId: BiomesId,
  minigameId: BiomesId,
  minigameInstanceId?: BiomesId
): Promise<OptionallyOrientedPoint | undefined> {
  const [minigame, player] = await deps.worldApi.get([minigameId, playerId]);
  if (!minigame || !minigame.minigameComponent()) {
    log.warn("Tried to warp to minigame location but location not found!", {
      minigameId,
    });
    return undefined;
  }

  if (!player) {
    log.warn("Tried to warp to minigame location but player not found!", {
      playerId,
    });
    return undefined;
  }

  const minigameInstance =
    minigameInstanceId && (await deps.worldApi.get(minigameInstanceId));

  if (minigameInstanceId && !minigameInstance?.minigameInstance()) {
    log.warn(
      "Tried to warp to minigame location with instance specified but instance not found!",
      {
        minigameId,
      }
    );
    return undefined;
  }

  const allMinigameElements = await deps.askApi.getByKeys({
    kind: "minigameElementByMinigameId",
    minigameId: minigameId,
  });

  return serverModFor(
    minigame.minigameComponent()!.metadata.kind,
    deps.serverMods
  ).spawnPosition({
    kind: "respawn",
    player,
    minigame: minigame as LazyEntityWith<"minigame_component">,
    minigameInstance: minigameInstance as
      | LazyEntityWith<"minigame_instance">
      | undefined,
    minigameElements:
      allMinigameElements as LazyEntityWith<"minigame_element">[],
  });
}

export async function handleCreateOrJoinWebRequest(
  deps: {
    askApi: AskApi;
    worldApi: WorldApi;
    logicApi: LogicApi;
    serverMods: ServerMods;
    userId: BiomesId;
  },
  minigameId: BiomesId
) {
  const minigame = await deps.worldApi.get(minigameId);
  ok(minigame, "No minigame found");

  const activeInstanceIds =
    minigame.minigameComponent()?.active_instance_ids ?? new Set();

  const activeInstances = compact(
    await deps.worldApi.get([...activeInstanceIds])
  );

  const minigameElements = (await deps.askApi.getByKeys({
    kind: "minigameElementByMinigameId",
    minigameId,
  })) as LazyEntityWith<"minigame_element">[];

  return serverModFor(
    minigame.minigameComponent()!.metadata.kind,
    deps.serverMods
  ).handleCreateOrJoinWebRequest(
    deps,
    minigame as LazyEntityWith<"minigame_component">,
    activeInstances as LazyEntityWith<"minigame_instance">[],
    minigameElements
  );
}

export function associateMinigameElement(
  element: Delta,
  minigame: DeltaWith<"minigame_component">
) {
  element.mutableMinigameElement().minigame_id = minigame.id;
  const mutMini = minigame.mutableMinigameComponent();
  mutMini.minigame_element_ids.add(element.id);
  mutMini.game_modified_at = secondsSinceEpoch();
  const mod = serverModFor(minigame.minigameComponent().metadata.kind);
  mod.logicHooks.onMinigameElementAssociated?.({ element, minigame });
}

export function disassociateMinigameElement(
  element: Delta,
  minigame: DeltaWith<"minigame_component">,
  context: DeleteContext
) {
  element.clearMinigameElement();
  const mutMini = minigame.mutableMinigameComponent();
  mutMini.minigame_element_ids.delete(element.id);
  mutMini.game_modified_at = secondsSinceEpoch();
  const mod = serverModFor(minigame.minigameComponent().metadata.kind);
  mod.logicHooks.onMinigameElementDisassociated?.({ element, minigame });
  deleteMinigameIfUnreachable(minigame, context);
}

export function minigameStashEntityIdForPlayerId(
  minigameInstance: ReadonlyMinigameInstance,
  playerId: BiomesId
) {
  return minigameInstance.active_players.get(playerId)?.entry_stash_id;
}

export function deleteMinigameIfUnreachable(
  minigame: DeltaWith<"minigame_component">,
  context: DeleteContext
) {
  const mg = minigame.minigameComponent();
  if (mg.minigame_element_ids.size > 0 || mg.active_instance_ids.size > 0) {
    return;
  }
  context.delete(minigame.id);
}
