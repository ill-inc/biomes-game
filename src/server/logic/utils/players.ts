import type { EventContext } from "@/server/logic/events/core";
import type { QueriedEntityWith } from "@/server/logic/events/query";
import { PlayerInventoryEditor } from "@/server/logic/inventory/player_inventory_editor";
import { onPlayerDeathHook } from "@/server/shared/minigames/logic_hooks";
import type { WorldEditor } from "@/server/shared/world/editor";
import { getBiscuits } from "@/shared/bikkie/active";
import { BikkieIds } from "@/shared/bikkie/ids";
import { attribs } from "@/shared/bikkie/schema/attributes";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import {
  AppearanceComponent,
  BuffsComponent,
  Challenges,
  Collideable,
  DeathInfo,
  Emote,
  GroupPreviewReference,
  Health,
  Icing,
  Inventory,
  Label,
  Orientation,
  PlayerBehavior,
  PlayerStatus,
  Position,
  RecipeBook,
  RemoteConnection,
  RigidBody,
  SelectedItem,
  TriggerState,
  Wearing,
} from "@/shared/ecs/gen/components";
import type { Delta, ReadonlyDelta } from "@/shared/ecs/gen/delta";
import { PatchableEntity } from "@/shared/ecs/gen/delta";
import type {
  AsDelta,
  Entity,
  Player,
  ReadonlyEntity,
} from "@/shared/ecs/gen/entities";
import type { Item, OptionalDamageSource, Vec3f } from "@/shared/ecs/gen/types";
import { WorldMetadataId } from "@/shared/ecs/ids";
import {
  PLAYER_HOTBAR_SLOTS,
  PLAYER_INVENTORY_SLOTS,
  currencyRefTo,
} from "@/shared/game/inventory";
import { anItem } from "@/shared/game/item";
import { countOf, createBag } from "@/shared/game/items";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { containsAABB } from "@/shared/math/linear";
import type {
  ReadonlyAABB,
  ReadonlyVec2,
  ReadonlyVec3,
} from "@/shared/math/types";
import { ok } from "assert";
import { sample } from "lodash";

export function newPlayerInventory() {
  const ret = Inventory.create({
    items: new Array(PLAYER_INVENTORY_SLOTS),
    hotbar: new Array(PLAYER_HOTBAR_SLOTS),
    selected: { kind: "hotbar", idx: 0 },
  });

  ret.items[PLAYER_INVENTORY_SLOTS - 1] = countOf(BikkieIds.homestone, 1n);

  return ret;
}

export function startingAppearance() {
  return AppearanceComponent.create({
    appearance: {
      eye_color_id: "eye_color_0",
      skin_color_id: `skin_color_${Math.floor(Math.random() * 12)}`,
      hair_color_id: "hair_color_8",
      head_id: BikkieIds.androgenous,
    },
  });
}

function randomlyDyedItem(id: BiomesId) {
  const dye = sample(getBiscuits("/dyes"))?.id;
  if (dye === undefined) {
    return anItem(id);
  }
  return anItem(id, { [attribs.dyedWith.id]: dye });
}

export function startingWearing() {
  return Wearing.create({
    items: new Map([
      [BikkieIds.top, randomlyDyedItem(BikkieIds.muckyTop)],
      [BikkieIds.bottoms, randomlyDyedItem(BikkieIds.muckySkirt)],
    ] as [BiomesId, Item][]),
  });
}

export function newPlayer(id: BiomesId, name: string): Player {
  const inventory = newPlayerInventory();
  const [startPosition, startOrientation] = sample(
    CONFIG.playerStartPositions
  )!;
  const player: Player = {
    id: id,
    label: Label.create({ text: name }),
    appearance_component: startingAppearance(),
    position: Position.create({ v: [...startPosition] }),
    orientation: Orientation.create({
      v: [...startOrientation],
    }),
    rigid_body: RigidBody.create(),
    inventory: inventory,
    selected_item: { ...SelectedItem.create(), item: inventory.hotbar[0] },
    wearing: startingWearing(),
    emote: Emote.create({ emote_type: undefined, emote_start_time: 0 }),
    remote_connection: RemoteConnection.create(),
    challenges: Challenges.create(),
    recipe_book: RecipeBook.create(),
    player_status: PlayerStatus.create(),
    player_behavior: PlayerBehavior.create(),
    group_preview_reference: GroupPreviewReference.create(),
    health: Health.create({ hp: 100, maxHp: 100 }),
    buffs_component: BuffsComponent.create(),
    trigger_state: TriggerState.create(),
    collideable: Collideable.create(),
  };
  return player;
}

export function copyPlayer(from: ReadonlyDelta, to: Delta) {
  // Specifically copy components that represent to state
  to.setAppearanceComponent(
    AppearanceComponent.clone(from.appearanceComponent())
  );
  to.setPosition(Position.clone(from.position()));
  to.setOrientation(Orientation.clone(from.orientation()));
  to.setRigidBody(RigidBody.clone(from.rigidBody()));
  to.setInventory(Inventory.clone(from.inventory()));
  to.setWearing(Wearing.clone(from.wearing()));
  to.setSelectedItem(SelectedItem.clone(from.selectedItem()));
  to.setEmote(Emote.clone(from.emote()));
  to.setChallenges(Challenges.clone(from.challenges()));
  to.setRecipeBook(RecipeBook.clone(from.recipeBook()));
  to.setPlayerStatus(PlayerStatus.clone(from.playerStatus()));
  to.setPlayerBehavior(PlayerBehavior.clone(from.playerBehavior()));
  to.setHealth(Health.clone(from.health()));
  to.setBuffsComponent(BuffsComponent.clone(from.buffsComponent()));
  to.setTriggerState(TriggerState.clone(from.triggerState()));
}

export function resetPlayerDelta(from: ReadonlyEntity): AsDelta<Entity> {
  ok(from.label?.text);
  const newPlayerEntity = newPlayer(from.id, from.label.text);
  const player = new PatchableEntity(from);
  copyPlayer(new PatchableEntity(newPlayerEntity), player);
  return player.finish()!;
}

export function forcePlayerWarp(
  player: Delta,
  position: ReadonlyVec3,
  orientation?: ReadonlyVec2
) {
  player.setPosition({ v: [...position] });
  if (orientation) {
    player.setOrientation({ v: [...orientation] });
  }

  player.setWarpingTo({
    position: [...position],
    orientation: orientation && [...orientation],
    set_at: secondsSinceEpoch(),
  });
  player.setRigidBody({ velocity: [0, 0, 0] });
}

export function startPlayerEmote(player: Delta, fields: Partial<Emote>) {
  player.setEmote(
    Emote.create({
      emote_nonce: Math.random(),
      ...fields,
    })
  );
}

export async function ensurePlayerExists(
  editor: WorldEditor,
  userId: BiomesId,
  username: string,
  isGremlin = false
) {
  const result = await editor.get([userId, WorldMetadataId]);
  let player = result[0];
  const world = result[1];
  if (!player) {
    // The player doesn't actually exist as far as we're concerned.
    // Create them directly - this bypasses logic and so should
    // result in them existing as soon as possible on all servers.
    player = editor.create(newPlayer(userId, username));
  }
  if (player.label()?.text !== username) {
    player.mutableLabel().text = username;
  }
  player.clearIdle();
  keepAlivePlayer({ player, world, isGremlin });
  repairPlayer(player);
}

export function modifyPlayerHealth(
  player: Delta,
  delta: number,
  damageSource: OptionalDamageSource,
  activeMinigame: QueriedEntityWith<"id" | "minigame_component"> | undefined,
  activeMinigameInstance:
    | QueriedEntityWith<"id" | "minigame_instance">
    | undefined,
  context: EventContext<{}>
) {
  const health = player.health();
  setPlayerHealth(
    player,
    Math.min(health?.maxHp ?? Infinity, (health?.hp ?? 0) + delta),
    damageSource,
    activeMinigame,
    activeMinigameInstance,
    context
  );
}

export function killPlayer(
  player: Delta,
  damageSource: OptionalDamageSource,
  activeMinigame: QueriedEntityWith<"id" | "minigame_component"> | undefined,
  activeMinigameInstance:
    | QueriedEntityWith<"id" | "minigame_instance">
    | undefined,
  context: EventContext<{}>
) {
  setPlayerHealth(
    player,
    0,
    damageSource,
    activeMinigame,
    activeMinigameInstance,
    context
  );
}

export function setPlayerHealth(
  player: Delta,
  newHp: number,
  damageSource: OptionalDamageSource,
  activeMinigame: QueriedEntityWith<"id" | "minigame_component"> | undefined,
  activeMinigameInstance:
    | QueriedEntityWith<"id" | "minigame_instance">
    | undefined,
  context: EventContext<{}>
) {
  newHp = Math.max(newHp, 0);
  const oldHp = Math.max(player.health()?.hp ?? 0, 0);
  if (newHp === oldHp) {
    return;
  }
  const health = player.mutableHealth();
  if (health.hp > 0 && damageSource !== undefined) {
    health.lastDamageSource = damageSource;
    health.lastDamageTime = secondsSinceEpoch();
    health.lastDamageAmount = newHp - oldHp;
  }
  health.hp = newHp;
  if (newHp <= 0 && oldHp > 0) {
    const inventory = new PlayerInventoryEditor(context, player);
    const bling = inventory.get(currencyRefTo(BikkieIds.bling));
    const deathCost = player.playingMinigame()
      ? 0n
      : (bling?.count ?? 0n) / 10n;
    if (deathCost > 0n) {
      inventory.trySpendCurrency(BikkieIds.bling, deathCost);
    }
    health.lastDamageInventoryConsequence = createBag(
      countOf(BikkieIds.bling, deathCost)
    );
    player.clearBuffsComponent();
    player.setDeathInfo(
      DeathInfo.create({
        last_death_pos: [...(player.position()?.v ?? [0, 0, 0])],
        last_death_time: secondsSinceEpoch(),
      })
    );
    onPlayerDeathHook(
      player,
      activeMinigame,
      activeMinigameInstance,
      damageSource
    );
  }

  if (damageSource?.kind === "fireHeal") {
    context.publish({
      kind: "fireHeal",
      entityId: player.id,
    });
  }
}

export function setPlayerMaxHealth(player: Delta, newMaxHp: number) {
  const oldMaxHealth = player.health()?.maxHp ?? 0;
  if (newMaxHp === oldMaxHealth) {
    return;
  }
  const health = player.mutableHealth();
  health.maxHp = newMaxHp;
  if (health.hp > newMaxHp) {
    health.hp = newMaxHp;
  }
}

export function ensurePlayerHasReasonablePosition(
  world: ReadonlyDelta,
  player: Delta
) {
  if (!world.worldMetadata()) {
    // Don't know the bounds, nothing we can do.
    return;
  }
  let position =
    player.staleOk().warpingTo()?.position ?? player.staleOk().position()?.v;
  let orientation =
    player.staleOk().warpingTo()?.orientation ??
    player.staleOk().orientation()?.v;
  // Ensure they have a position.
  const [startPosition, startOrientation] = sample(
    CONFIG.playerStartPositions
  )!;
  if (position === undefined) {
    log.warn(`Player ${player.id} is missing a position, assigning`, {
      position: startPosition,
    });
    position = startPosition;
    player.setPosition(Position.create({ v: [...startPosition] }));
  }

  if (orientation === undefined) {
    orientation = startOrientation;
    player.setOrientation(Orientation.create({ v: [...startOrientation] }));
  }
  const bounds: ReadonlyAABB = [
    world.worldMetadata()!.aabb.v0,
    world.worldMetadata()!.aabb.v1,
  ];
  if (!containsAABB(bounds, position)) {
    // Outside bounds, check if the default position is okay.
    if (containsAABB(bounds, startPosition)) {
      log.warn(
        `Player ${player.id} is outside bounds, resetting to start position`,
        {
          bounds,
          oldPosition: position,
          newPosition: startPosition,
        }
      );
      player.setPosition(Position.create({ v: [...startPosition] }));
      player.setOrientation(Orientation.create({ v: [...startOrientation] }));
    } else {
      // Default position is outside bounds, find a new one.
      const newPosition: Vec3f = [
        bounds[0][0] + (bounds[1][0] - bounds[0][0]) * Math.random(),
        bounds[0][1] - 3, // Drop from the sky.
        bounds[0][2] + (bounds[1][2] - bounds[0][2]) * Math.random(),
      ];
      log.warn(
        `Player ${player.id} is outside bounds, default start is also outside bounds, resetting`,
        {
          bounds,
          oldPosition: position,
          newPosition,
        }
      );
      player.setPosition(Position.create({ v: newPosition }));
      player.setOrientation(Orientation.create({ v: [...startOrientation] }));
    }
  }
}

function extendPlayerLifetime(player: Delta, isGremlin: boolean) {
  player.clearIced();
  const expiry = isGremlin
    ? CONFIG.gremlinsExpirationSecs
    : CONFIG.gamePlayerExpirationSecs;
  if (expiry === undefined) {
    player.clearIcing();
  } else {
    player.setIcing(
      Icing.create({
        trigger_at: secondsSinceEpoch() + expiry,
      })
    );
  }
}

export function repairPlayer(player: Delta) {
  if (
    !player.staleOk().inventory()?.items.length ||
    !player.staleOk().inventory()?.hotbar.length
  ) {
    player.setInventory(newPlayerInventory());
  }
  if (!player.staleOk().health()?.maxHp) {
    player.mutableHealth().hp = 100;
    player.mutableHealth().maxHp = 100;
  }

  if (player.staleOk().appearanceComponent() === undefined) {
    player.setAppearanceComponent(startingAppearance());
  }

  const [startPosition, startOrientation] = sample(
    CONFIG.playerStartPositions
  )!;
  if (player.staleOk().position() === undefined) {
    player.setPosition(Position.create({ v: [...startPosition] }));
  }

  if (player.staleOk().orientation() === undefined) {
    player.setOrientation(
      Orientation.create({
        v: [...startOrientation],
      })
    );
  }

  if (player.staleOk().rigidBody() === undefined) {
    player.setRigidBody(RigidBody.create());
  }

  if (player.staleOk().selectedItem() === undefined) {
    player.setSelectedItem(SelectedItem.create());
  }

  if (player.staleOk().wearing() === undefined) {
    player.setWearing(startingWearing());
  }

  if (player.staleOk().emote() === undefined) {
    player.setEmote(
      Emote.create({ emote_type: undefined, emote_start_time: 0 })
    );
  }

  if (player.staleOk().remoteConnection() === undefined) {
    player.setRemoteConnection();
  }

  if (player.staleOk().challenges() === undefined) {
    player.setChallenges(Challenges.create());
  }

  if (player.staleOk().recipeBook() === undefined) {
    player.setRecipeBook(RecipeBook.create());
  }

  if (player.staleOk().playerStatus() === undefined) {
    player.setPlayerStatus(PlayerStatus.create());
  }

  if (player.staleOk().playerBehavior() === undefined) {
    player.setPlayerBehavior(PlayerBehavior.create());
  }

  if (player.staleOk().groupPreviewReference() === undefined) {
    player.setGroupPreviewReference(GroupPreviewReference.create());
  }

  if (player.staleOk().buffsComponent() === undefined) {
    player.setBuffsComponent(BuffsComponent.create());
  }

  if (player.staleOk().triggerState() === undefined) {
    player.setTriggerState(TriggerState.create());
  }

  if (player.staleOk().collideable() === undefined) {
    player.setCollideable();
  }
}

export function keepAlivePlayer({
  world,
  player,
  isGremlin,
}: {
  world?: ReadonlyDelta;
  player: Delta;
  isGremlin: boolean;
}) {
  if (isGremlin) {
    player.setGremlin();
    player.setPlayerStatus(
      PlayerStatus.create({
        init: true,
      })
    );
  }
  extendPlayerLifetime(player, isGremlin);
  if (world) {
    ensurePlayerHasReasonablePosition(world, player);
  }
}
