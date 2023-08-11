// GENERATED: This file is generated from entities.ts.j2. Do not modify directly.
// Content Hash: f3af497e4523eb11738b78866e21aa12

import * as c from "@/shared/ecs/gen/components";
import { Delta } from "@/shared/ecs/gen/delta";
import { BiomesId } from "@/shared/ids";
import { PathDef } from "@/shared/resources/path_map";
import { z } from "zod";

// ==================
// Entity definitions
// ==================

export interface Entity {
  readonly id: BiomesId;
  iced?: c.Iced;
  remote_connection?: c.RemoteConnection;
  position?: c.Position;
  orientation?: c.Orientation;
  rigid_body?: c.RigidBody;
  size?: c.Size;
  box?: c.Box;
  shard_seed?: c.ShardSeed;
  shard_diff?: c.ShardDiff;
  shard_shapes?: c.ShardShapes;
  shard_sky_occlusion?: c.ShardSkyOcclusion;
  shard_irradiance?: c.ShardIrradiance;
  shard_water?: c.ShardWater;
  shard_occupancy?: c.ShardOccupancy;
  shard_dye?: c.ShardDye;
  shard_moisture?: c.ShardMoisture;
  shard_growth?: c.ShardGrowth;
  shard_placer?: c.ShardPlacer;
  shard_muck?: c.ShardMuck;
  label?: c.Label;
  grab_bag?: c.GrabBag;
  acquisition?: c.Acquisition;
  loose_item?: c.LooseItem;
  inventory?: c.Inventory;
  container_inventory?: c.ContainerInventory;
  priced_container_inventory?: c.PricedContainerInventory;
  selected_item?: c.SelectedItem;
  wearing?: c.Wearing;
  emote?: c.Emote;
  appearance_component?: c.AppearanceComponent;
  group_component?: c.GroupComponent;
  challenges?: c.Challenges;
  recipe_book?: c.RecipeBook;
  expires?: c.Expires;
  icing?: c.Icing;
  warpable?: c.Warpable;
  player_status?: c.PlayerStatus;
  player_behavior?: c.PlayerBehavior;
  world_metadata?: c.WorldMetadata;
  npc_metadata?: c.NpcMetadata;
  npc_state?: c.NpcState;
  group_preview_reference?: c.GroupPreviewReference;
  acl_component?: c.AclComponent;
  deed_component?: c.DeedComponent;
  group_preview_component?: c.GroupPreviewComponent;
  blueprint_component?: c.BlueprintComponent;
  crafting_station_component?: c.CraftingStationComponent;
  health?: c.Health;
  buffs_component?: c.BuffsComponent;
  gremlin?: c.Gremlin;
  placeable_component?: c.PlaceableComponent;
  grouped_entities?: c.GroupedEntities;
  in_group?: c.InGroup;
  picture_frame_contents?: c.PictureFrameContents;
  trigger_state?: c.TriggerState;
  lifetime_stats?: c.LifetimeStats;
  occupancy_component?: c.OccupancyComponent;
  video_component?: c.VideoComponent;
  player_session?: c.PlayerSession;
  preset_applied?: c.PresetApplied;
  preset_prototype?: c.PresetPrototype;
  farming_plant_component?: c.FarmingPlantComponent;
  shard_farming?: c.ShardFarming;
  created_by?: c.CreatedBy;
  minigame_component?: c.MinigameComponent;
  minigame_instance?: c.MinigameInstance;
  playing_minigame?: c.PlayingMinigame;
  minigame_element?: c.MinigameElement;
  active_tray?: c.ActiveTray;
  stashed?: c.Stashed;
  minigame_instance_tick_info?: c.MinigameInstanceTickInfo;
  warping_to?: c.WarpingTo;
  minigame_instance_expire?: c.MinigameInstanceExpire;
  placer_component?: c.PlacerComponent;
  quest_giver?: c.QuestGiver;
  default_dialog?: c.DefaultDialog;
  unmuck?: c.Unmuck;
  robot_component?: c.RobotComponent;
  admin_entity?: c.AdminEntity;
  protection?: c.Protection;
  projects_protection?: c.ProjectsProtection;
  deletes_with?: c.DeletesWith;
  item_buyer?: c.ItemBuyer;
  inspection_tweaks?: c.InspectionTweaks;
  profile_pic?: c.ProfilePic;
  entity_description?: c.EntityDescription;
  landmark?: c.Landmark;
  collideable?: c.Collideable;
  restoration?: c.Restoration;
  terrain_restoration_diff?: c.TerrainRestorationDiff;
  team?: c.Team;
  player_current_team?: c.PlayerCurrentTeam;
  user_roles?: c.UserRoles;
  restores_to?: c.RestoresTo;
  trade?: c.Trade;
  active_trades?: c.ActiveTrades;
  placed_by?: c.PlacedBy;
  text_sign?: c.TextSign;
  irradiance?: c.Irradiance;
  locked_in_place?: c.LockedInPlace;
  death_info?: c.DeathInfo;
  synthetic_stats?: c.SyntheticStats;
  idle?: c.Idle;
  voice?: c.Voice;
  gift_giver?: c.GiftGiver;
}

export interface ReadonlyEntity {
  readonly id: BiomesId;
  readonly iced?: c.ReadonlyIced;
  readonly remote_connection?: c.ReadonlyRemoteConnection;
  readonly position?: c.ReadonlyPosition;
  readonly orientation?: c.ReadonlyOrientation;
  readonly rigid_body?: c.ReadonlyRigidBody;
  readonly size?: c.ReadonlySize;
  readonly box?: c.ReadonlyBox;
  readonly shard_seed?: c.ReadonlyShardSeed;
  readonly shard_diff?: c.ReadonlyShardDiff;
  readonly shard_shapes?: c.ReadonlyShardShapes;
  readonly shard_sky_occlusion?: c.ReadonlyShardSkyOcclusion;
  readonly shard_irradiance?: c.ReadonlyShardIrradiance;
  readonly shard_water?: c.ReadonlyShardWater;
  readonly shard_occupancy?: c.ReadonlyShardOccupancy;
  readonly shard_dye?: c.ReadonlyShardDye;
  readonly shard_moisture?: c.ReadonlyShardMoisture;
  readonly shard_growth?: c.ReadonlyShardGrowth;
  readonly shard_placer?: c.ReadonlyShardPlacer;
  readonly shard_muck?: c.ReadonlyShardMuck;
  readonly label?: c.ReadonlyLabel;
  readonly grab_bag?: c.ReadonlyGrabBag;
  readonly acquisition?: c.ReadonlyAcquisition;
  readonly loose_item?: c.ReadonlyLooseItem;
  readonly inventory?: c.ReadonlyInventory;
  readonly container_inventory?: c.ReadonlyContainerInventory;
  readonly priced_container_inventory?: c.ReadonlyPricedContainerInventory;
  readonly selected_item?: c.ReadonlySelectedItem;
  readonly wearing?: c.ReadonlyWearing;
  readonly emote?: c.ReadonlyEmote;
  readonly appearance_component?: c.ReadonlyAppearanceComponent;
  readonly group_component?: c.ReadonlyGroupComponent;
  readonly challenges?: c.ReadonlyChallenges;
  readonly recipe_book?: c.ReadonlyRecipeBook;
  readonly expires?: c.ReadonlyExpires;
  readonly icing?: c.ReadonlyIcing;
  readonly warpable?: c.ReadonlyWarpable;
  readonly player_status?: c.ReadonlyPlayerStatus;
  readonly player_behavior?: c.ReadonlyPlayerBehavior;
  readonly world_metadata?: c.ReadonlyWorldMetadata;
  readonly npc_metadata?: c.ReadonlyNpcMetadata;
  readonly npc_state?: c.ReadonlyNpcState;
  readonly group_preview_reference?: c.ReadonlyGroupPreviewReference;
  readonly acl_component?: c.ReadonlyAclComponent;
  readonly deed_component?: c.ReadonlyDeedComponent;
  readonly group_preview_component?: c.ReadonlyGroupPreviewComponent;
  readonly blueprint_component?: c.ReadonlyBlueprintComponent;
  readonly crafting_station_component?: c.ReadonlyCraftingStationComponent;
  readonly health?: c.ReadonlyHealth;
  readonly buffs_component?: c.ReadonlyBuffsComponent;
  readonly gremlin?: c.ReadonlyGremlin;
  readonly placeable_component?: c.ReadonlyPlaceableComponent;
  readonly grouped_entities?: c.ReadonlyGroupedEntities;
  readonly in_group?: c.ReadonlyInGroup;
  readonly picture_frame_contents?: c.ReadonlyPictureFrameContents;
  readonly trigger_state?: c.ReadonlyTriggerState;
  readonly lifetime_stats?: c.ReadonlyLifetimeStats;
  readonly occupancy_component?: c.ReadonlyOccupancyComponent;
  readonly video_component?: c.ReadonlyVideoComponent;
  readonly player_session?: c.ReadonlyPlayerSession;
  readonly preset_applied?: c.ReadonlyPresetApplied;
  readonly preset_prototype?: c.ReadonlyPresetPrototype;
  readonly farming_plant_component?: c.ReadonlyFarmingPlantComponent;
  readonly shard_farming?: c.ReadonlyShardFarming;
  readonly created_by?: c.ReadonlyCreatedBy;
  readonly minigame_component?: c.ReadonlyMinigameComponent;
  readonly minigame_instance?: c.ReadonlyMinigameInstance;
  readonly playing_minigame?: c.ReadonlyPlayingMinigame;
  readonly minigame_element?: c.ReadonlyMinigameElement;
  readonly active_tray?: c.ReadonlyActiveTray;
  readonly stashed?: c.ReadonlyStashed;
  readonly minigame_instance_tick_info?: c.ReadonlyMinigameInstanceTickInfo;
  readonly warping_to?: c.ReadonlyWarpingTo;
  readonly minigame_instance_expire?: c.ReadonlyMinigameInstanceExpire;
  readonly placer_component?: c.ReadonlyPlacerComponent;
  readonly quest_giver?: c.ReadonlyQuestGiver;
  readonly default_dialog?: c.ReadonlyDefaultDialog;
  readonly unmuck?: c.ReadonlyUnmuck;
  readonly robot_component?: c.ReadonlyRobotComponent;
  readonly admin_entity?: c.ReadonlyAdminEntity;
  readonly protection?: c.ReadonlyProtection;
  readonly projects_protection?: c.ReadonlyProjectsProtection;
  readonly deletes_with?: c.ReadonlyDeletesWith;
  readonly item_buyer?: c.ReadonlyItemBuyer;
  readonly inspection_tweaks?: c.ReadonlyInspectionTweaks;
  readonly profile_pic?: c.ReadonlyProfilePic;
  readonly entity_description?: c.ReadonlyEntityDescription;
  readonly landmark?: c.ReadonlyLandmark;
  readonly collideable?: c.ReadonlyCollideable;
  readonly restoration?: c.ReadonlyRestoration;
  readonly terrain_restoration_diff?: c.ReadonlyTerrainRestorationDiff;
  readonly team?: c.ReadonlyTeam;
  readonly player_current_team?: c.ReadonlyPlayerCurrentTeam;
  readonly user_roles?: c.ReadonlyUserRoles;
  readonly restores_to?: c.ReadonlyRestoresTo;
  readonly trade?: c.ReadonlyTrade;
  readonly active_trades?: c.ReadonlyActiveTrades;
  readonly placed_by?: c.ReadonlyPlacedBy;
  readonly text_sign?: c.ReadonlyTextSign;
  readonly irradiance?: c.ReadonlyIrradiance;
  readonly locked_in_place?: c.ReadonlyLockedInPlace;
  readonly death_info?: c.ReadonlyDeathInfo;
  readonly synthetic_stats?: c.ReadonlySyntheticStats;
  readonly idle?: c.ReadonlyIdle;
  readonly voice?: c.ReadonlyVoice;
  readonly gift_giver?: c.ReadonlyGiftGiver;
}

export type AsDelta<T> = { -readonly [P in keyof T]: T[P] | null } & {
  readonly id: BiomesId;
};

export type ComponentName = Exclude<keyof Entity, "id"> & string;

export const zComponentName = z.string() as z.ZodType<ComponentName>;

export interface SuperEntity {
  readonly id: BiomesId;
  iced: c.Iced;
  remote_connection: c.RemoteConnection;
  position: c.Position;
  orientation: c.Orientation;
  rigid_body: c.RigidBody;
  size: c.Size;
  box: c.Box;
  shard_seed: c.ShardSeed;
  shard_diff: c.ShardDiff;
  shard_shapes: c.ShardShapes;
  shard_sky_occlusion: c.ShardSkyOcclusion;
  shard_irradiance: c.ShardIrradiance;
  shard_water: c.ShardWater;
  shard_occupancy: c.ShardOccupancy;
  shard_dye: c.ShardDye;
  shard_moisture: c.ShardMoisture;
  shard_growth: c.ShardGrowth;
  shard_placer: c.ShardPlacer;
  shard_muck: c.ShardMuck;
  label: c.Label;
  grab_bag: c.GrabBag;
  acquisition: c.Acquisition;
  loose_item: c.LooseItem;
  inventory: c.Inventory;
  container_inventory: c.ContainerInventory;
  priced_container_inventory: c.PricedContainerInventory;
  selected_item: c.SelectedItem;
  wearing: c.Wearing;
  emote: c.Emote;
  appearance_component: c.AppearanceComponent;
  group_component: c.GroupComponent;
  challenges: c.Challenges;
  recipe_book: c.RecipeBook;
  expires: c.Expires;
  icing: c.Icing;
  warpable: c.Warpable;
  player_status: c.PlayerStatus;
  player_behavior: c.PlayerBehavior;
  world_metadata: c.WorldMetadata;
  npc_metadata: c.NpcMetadata;
  npc_state: c.NpcState;
  group_preview_reference: c.GroupPreviewReference;
  acl_component: c.AclComponent;
  deed_component: c.DeedComponent;
  group_preview_component: c.GroupPreviewComponent;
  blueprint_component: c.BlueprintComponent;
  crafting_station_component: c.CraftingStationComponent;
  health: c.Health;
  buffs_component: c.BuffsComponent;
  gremlin: c.Gremlin;
  placeable_component: c.PlaceableComponent;
  grouped_entities: c.GroupedEntities;
  in_group: c.InGroup;
  picture_frame_contents: c.PictureFrameContents;
  trigger_state: c.TriggerState;
  lifetime_stats: c.LifetimeStats;
  occupancy_component: c.OccupancyComponent;
  video_component: c.VideoComponent;
  player_session: c.PlayerSession;
  preset_applied: c.PresetApplied;
  preset_prototype: c.PresetPrototype;
  farming_plant_component: c.FarmingPlantComponent;
  shard_farming: c.ShardFarming;
  created_by: c.CreatedBy;
  minigame_component: c.MinigameComponent;
  minigame_instance: c.MinigameInstance;
  playing_minigame: c.PlayingMinigame;
  minigame_element: c.MinigameElement;
  active_tray: c.ActiveTray;
  stashed: c.Stashed;
  minigame_instance_tick_info: c.MinigameInstanceTickInfo;
  warping_to: c.WarpingTo;
  minigame_instance_expire: c.MinigameInstanceExpire;
  placer_component: c.PlacerComponent;
  quest_giver: c.QuestGiver;
  default_dialog: c.DefaultDialog;
  unmuck: c.Unmuck;
  robot_component: c.RobotComponent;
  admin_entity: c.AdminEntity;
  protection: c.Protection;
  projects_protection: c.ProjectsProtection;
  deletes_with: c.DeletesWith;
  item_buyer: c.ItemBuyer;
  inspection_tweaks: c.InspectionTweaks;
  profile_pic: c.ProfilePic;
  entity_description: c.EntityDescription;
  landmark: c.Landmark;
  collideable: c.Collideable;
  restoration: c.Restoration;
  terrain_restoration_diff: c.TerrainRestorationDiff;
  team: c.Team;
  player_current_team: c.PlayerCurrentTeam;
  user_roles: c.UserRoles;
  restores_to: c.RestoresTo;
  trade: c.Trade;
  active_trades: c.ActiveTrades;
  placed_by: c.PlacedBy;
  text_sign: c.TextSign;
  irradiance: c.Irradiance;
  locked_in_place: c.LockedInPlace;
  death_info: c.DeathInfo;
  synthetic_stats: c.SyntheticStats;
  idle: c.Idle;
  voice: c.Voice;
  gift_giver: c.GiftGiver;
}

export interface ReadonlySuperEntity {
  readonly id: BiomesId;
  readonly iced: c.ReadonlyIced;
  readonly remote_connection: c.ReadonlyRemoteConnection;
  readonly position: c.ReadonlyPosition;
  readonly orientation: c.ReadonlyOrientation;
  readonly rigid_body: c.ReadonlyRigidBody;
  readonly size: c.ReadonlySize;
  readonly box: c.ReadonlyBox;
  readonly shard_seed: c.ReadonlyShardSeed;
  readonly shard_diff: c.ReadonlyShardDiff;
  readonly shard_shapes: c.ReadonlyShardShapes;
  readonly shard_sky_occlusion: c.ReadonlyShardSkyOcclusion;
  readonly shard_irradiance: c.ReadonlyShardIrradiance;
  readonly shard_water: c.ReadonlyShardWater;
  readonly shard_occupancy: c.ReadonlyShardOccupancy;
  readonly shard_dye: c.ReadonlyShardDye;
  readonly shard_moisture: c.ReadonlyShardMoisture;
  readonly shard_growth: c.ReadonlyShardGrowth;
  readonly shard_placer: c.ReadonlyShardPlacer;
  readonly shard_muck: c.ReadonlyShardMuck;
  readonly label: c.ReadonlyLabel;
  readonly grab_bag: c.ReadonlyGrabBag;
  readonly acquisition: c.ReadonlyAcquisition;
  readonly loose_item: c.ReadonlyLooseItem;
  readonly inventory: c.ReadonlyInventory;
  readonly container_inventory: c.ReadonlyContainerInventory;
  readonly priced_container_inventory: c.ReadonlyPricedContainerInventory;
  readonly selected_item: c.ReadonlySelectedItem;
  readonly wearing: c.ReadonlyWearing;
  readonly emote: c.ReadonlyEmote;
  readonly appearance_component: c.ReadonlyAppearanceComponent;
  readonly group_component: c.ReadonlyGroupComponent;
  readonly challenges: c.ReadonlyChallenges;
  readonly recipe_book: c.ReadonlyRecipeBook;
  readonly expires: c.ReadonlyExpires;
  readonly icing: c.ReadonlyIcing;
  readonly warpable: c.ReadonlyWarpable;
  readonly player_status: c.ReadonlyPlayerStatus;
  readonly player_behavior: c.ReadonlyPlayerBehavior;
  readonly world_metadata: c.ReadonlyWorldMetadata;
  readonly npc_metadata: c.ReadonlyNpcMetadata;
  readonly npc_state: c.ReadonlyNpcState;
  readonly group_preview_reference: c.ReadonlyGroupPreviewReference;
  readonly acl_component: c.ReadonlyAclComponent;
  readonly deed_component: c.ReadonlyDeedComponent;
  readonly group_preview_component: c.ReadonlyGroupPreviewComponent;
  readonly blueprint_component: c.ReadonlyBlueprintComponent;
  readonly crafting_station_component: c.ReadonlyCraftingStationComponent;
  readonly health: c.ReadonlyHealth;
  readonly buffs_component: c.ReadonlyBuffsComponent;
  readonly gremlin: c.ReadonlyGremlin;
  readonly placeable_component: c.ReadonlyPlaceableComponent;
  readonly grouped_entities: c.ReadonlyGroupedEntities;
  readonly in_group: c.ReadonlyInGroup;
  readonly picture_frame_contents: c.ReadonlyPictureFrameContents;
  readonly trigger_state: c.ReadonlyTriggerState;
  readonly lifetime_stats: c.ReadonlyLifetimeStats;
  readonly occupancy_component: c.ReadonlyOccupancyComponent;
  readonly video_component: c.ReadonlyVideoComponent;
  readonly player_session: c.ReadonlyPlayerSession;
  readonly preset_applied: c.ReadonlyPresetApplied;
  readonly preset_prototype: c.ReadonlyPresetPrototype;
  readonly farming_plant_component: c.ReadonlyFarmingPlantComponent;
  readonly shard_farming: c.ReadonlyShardFarming;
  readonly created_by: c.ReadonlyCreatedBy;
  readonly minigame_component: c.ReadonlyMinigameComponent;
  readonly minigame_instance: c.ReadonlyMinigameInstance;
  readonly playing_minigame: c.ReadonlyPlayingMinigame;
  readonly minigame_element: c.ReadonlyMinigameElement;
  readonly active_tray: c.ReadonlyActiveTray;
  readonly stashed: c.ReadonlyStashed;
  readonly minigame_instance_tick_info: c.ReadonlyMinigameInstanceTickInfo;
  readonly warping_to: c.ReadonlyWarpingTo;
  readonly minigame_instance_expire: c.ReadonlyMinigameInstanceExpire;
  readonly placer_component: c.ReadonlyPlacerComponent;
  readonly quest_giver: c.ReadonlyQuestGiver;
  readonly default_dialog: c.ReadonlyDefaultDialog;
  readonly unmuck: c.ReadonlyUnmuck;
  readonly robot_component: c.ReadonlyRobotComponent;
  readonly admin_entity: c.ReadonlyAdminEntity;
  readonly protection: c.ReadonlyProtection;
  readonly projects_protection: c.ReadonlyProjectsProtection;
  readonly deletes_with: c.ReadonlyDeletesWith;
  readonly item_buyer: c.ReadonlyItemBuyer;
  readonly inspection_tweaks: c.ReadonlyInspectionTweaks;
  readonly profile_pic: c.ReadonlyProfilePic;
  readonly entity_description: c.ReadonlyEntityDescription;
  readonly landmark: c.ReadonlyLandmark;
  readonly collideable: c.ReadonlyCollideable;
  readonly restoration: c.ReadonlyRestoration;
  readonly terrain_restoration_diff: c.ReadonlyTerrainRestorationDiff;
  readonly team: c.ReadonlyTeam;
  readonly player_current_team: c.ReadonlyPlayerCurrentTeam;
  readonly user_roles: c.ReadonlyUserRoles;
  readonly restores_to: c.ReadonlyRestoresTo;
  readonly trade: c.ReadonlyTrade;
  readonly active_trades: c.ReadonlyActiveTrades;
  readonly placed_by: c.ReadonlyPlacedBy;
  readonly text_sign: c.ReadonlyTextSign;
  readonly irradiance: c.ReadonlyIrradiance;
  readonly locked_in_place: c.ReadonlyLockedInPlace;
  readonly death_info: c.ReadonlyDeathInfo;
  readonly synthetic_stats: c.ReadonlySyntheticStats;
  readonly idle: c.ReadonlyIdle;
  readonly voice: c.ReadonlyVoice;
  readonly gift_giver: c.ReadonlyGiftGiver;
}

export type EntityWith<C extends keyof Entity> = Pick<SuperEntity, C | "id"> &
  Omit<Entity, C | "id">;

export type ReadonlyEntityWith<C extends keyof ReadonlyEntity> = Pick<
  ReadonlySuperEntity,
  C | "id"
> &
  Omit<ReadonlyEntity, C | "id">;

export class Entity {
  static has<C extends keyof Entity>(
    entity?: Entity,
    ...components: C[]
  ): entity is EntityWith<C>;
  static has<C extends keyof Entity>(
    entity?: ReadonlyEntity,
    ...components: C[]
  ): entity is ReadonlyEntityWith<C>;
  static has<C extends keyof Entity>(
    entity?: ReadonlyEntity | Entity,
    ...components: C[]
  ): boolean {
    if (!entity) {
      return false;
    }
    for (const component of components) {
      if (entity[component] === undefined) {
        return false;
      }
    }
    return true;
  }
}

export interface Player extends Entity {
  readonly label: c.Label;
  readonly appearance_component: c.AppearanceComponent;
  readonly position: c.Position;
  readonly orientation: c.Orientation;
  readonly rigid_body: c.RigidBody;
  readonly inventory: c.Inventory;
  readonly selected_item: c.SelectedItem;
  readonly emote: c.Emote;
  readonly remote_connection: c.RemoteConnection;
  readonly challenges: c.Challenges;
  readonly recipe_book: c.RecipeBook;
  readonly wearing: c.Wearing;
  readonly player_status: c.PlayerStatus;
  readonly player_behavior: c.PlayerBehavior;
  readonly group_preview_reference: c.GroupPreviewReference;
  readonly health: c.Health;
  readonly buffs_component: c.BuffsComponent;
}

export class Player {
  static from(entity?: ReadonlyEntity): Player | undefined {
    return Entity.has(
      entity,
      "label",
      "appearance_component",
      "position",
      "orientation",
      "rigid_body",
      "inventory",
      "selected_item",
      "emote",
      "remote_connection",
      "challenges",
      "recipe_book",
      "wearing",
      "player_status",
      "player_behavior",
      "group_preview_reference",
      "health",
      "buffs_component"
    )
      ? (entity as Player)
      : undefined;
  }
}
export interface Npc extends Entity {
  readonly npc_metadata: c.NpcMetadata;
  readonly npc_state: c.NpcState;
  readonly orientation: c.Orientation;
  readonly position: c.Position;
  readonly rigid_body: c.RigidBody;
  readonly size: c.Size;
  readonly health: c.Health;
}

export class Npc {
  static from(entity?: ReadonlyEntity): Npc | undefined {
    return Entity.has(
      entity,
      "npc_metadata",
      "npc_state",
      "orientation",
      "position",
      "rigid_body",
      "size",
      "health"
    )
      ? (entity as Npc)
      : undefined;
  }
}
export interface NpcSpawnEvent extends Entity {}

export class NpcSpawnEvent {
  static from(entity?: ReadonlyEntity): NpcSpawnEvent | undefined {
    return entity as NpcSpawnEvent | undefined;
  }
}
export interface Placeable extends Entity {
  readonly position: c.Position;
  readonly orientation: c.Orientation;
  readonly placeable_component: c.PlaceableComponent;
  readonly picture_frame_contents: c.PictureFrameContents;
}

export class Placeable {
  static from(entity?: ReadonlyEntity): Placeable | undefined {
    return Entity.has(
      entity,
      "position",
      "orientation",
      "placeable_component",
      "picture_frame_contents"
    )
      ? (entity as Placeable)
      : undefined;
  }
}
export interface Container extends Entity {
  readonly position: c.Position;
  readonly orientation: c.Orientation;
  readonly placeable_component: c.PlaceableComponent;
  readonly container_inventory: c.ContainerInventory;
}

export class Container {
  static from(entity?: ReadonlyEntity): Container | undefined {
    return Entity.has(
      entity,
      "position",
      "orientation",
      "placeable_component",
      "container_inventory"
    )
      ? (entity as Container)
      : undefined;
  }
}
export interface PricedContainer extends Entity {
  readonly position: c.Position;
  readonly orientation: c.Orientation;
  readonly placeable_component: c.PlaceableComponent;
  readonly priced_container_inventory: c.PricedContainerInventory;
}

export class PricedContainer {
  static from(entity?: ReadonlyEntity): PricedContainer | undefined {
    return Entity.has(
      entity,
      "position",
      "orientation",
      "placeable_component",
      "priced_container_inventory"
    )
      ? (entity as PricedContainer)
      : undefined;
  }
}
export interface TerrainShard extends Entity {
  readonly box: c.Box;
  readonly shard_seed: c.ShardSeed;
  readonly shard_diff: c.ShardDiff;
  readonly shard_shapes: c.ShardShapes;
  readonly shard_sky_occlusion: c.ShardSkyOcclusion;
  readonly shard_irradiance: c.ShardIrradiance;
  readonly shard_water: c.ShardWater;
  readonly shard_occupancy: c.ShardOccupancy;
  readonly shard_placer: c.ShardPlacer;
  readonly shard_farming: c.ShardFarming;
  readonly shard_growth: c.ShardGrowth;
  readonly shard_dye: c.ShardDye;
  readonly shard_moisture: c.ShardMoisture;
  readonly shard_muck: c.ShardMuck;
}

export class TerrainShard {
  static from(entity?: ReadonlyEntity): TerrainShard | undefined {
    return Entity.has(
      entity,
      "box",
      "shard_seed",
      "shard_diff",
      "shard_shapes",
      "shard_sky_occlusion",
      "shard_irradiance",
      "shard_water",
      "shard_occupancy",
      "shard_placer",
      "shard_farming",
      "shard_growth",
      "shard_dye",
      "shard_moisture",
      "shard_muck"
    )
      ? (entity as TerrainShard)
      : undefined;
  }
}
export interface EnvironmentGroup extends Entity {
  readonly box: c.Box;
  readonly group_component: c.GroupComponent;
  readonly label: c.Label;
  readonly warpable: c.Warpable;
}

export class EnvironmentGroup {
  static from(entity?: ReadonlyEntity): EnvironmentGroup | undefined {
    return Entity.has(entity, "box", "group_component", "label", "warpable")
      ? (entity as EnvironmentGroup)
      : undefined;
  }
}
export interface Blueprint extends Entity {
  readonly position: c.Position;
  readonly orientation: c.Orientation;
  readonly blueprint_component: c.BlueprintComponent;
}

export class Blueprint {
  static from(entity?: ReadonlyEntity): Blueprint | undefined {
    return Entity.has(entity, "position", "orientation", "blueprint_component")
      ? (entity as Blueprint)
      : undefined;
  }
}
export interface CraftingStation extends Entity {
  readonly position: c.Position;
  readonly orientation: c.Orientation;
  readonly placeable_component: c.PlaceableComponent;
  readonly crafting_station_component: c.CraftingStationComponent;
}

export class CraftingStation {
  static from(entity?: ReadonlyEntity): CraftingStation | undefined {
    return Entity.has(
      entity,
      "position",
      "orientation",
      "placeable_component",
      "crafting_station_component"
    )
      ? (entity as CraftingStation)
      : undefined;
  }
}
export interface Portal extends Entity {
  readonly warpable: c.Warpable;
}

export class Portal {
  static from(entity?: ReadonlyEntity): Portal | undefined {
    return Entity.has(entity, "warpable") ? (entity as Portal) : undefined;
  }
}
export interface GroupPreview extends Entity {
  readonly box: c.Box;
  readonly group_component: c.GroupComponent;
  readonly expires: c.Expires;
  readonly group_preview_component: c.GroupPreviewComponent;
}

export class GroupPreview {
  static from(entity?: ReadonlyEntity): GroupPreview | undefined {
    return Entity.has(
      entity,
      "box",
      "group_component",
      "expires",
      "group_preview_component"
    )
      ? (entity as GroupPreview)
      : undefined;
  }
}
export interface Deed extends Entity {
  readonly label: c.Label;
  readonly box: c.Box;
  readonly acl_component: c.AclComponent;
  readonly deed_component: c.DeedComponent;
}

export class Deed {
  static from(entity?: ReadonlyEntity): Deed | undefined {
    return Entity.has(entity, "label", "box", "acl_component", "deed_component")
      ? (entity as Deed)
      : undefined;
  }
}
export interface FarmingPlant extends Entity {
  readonly position: c.Position;
  readonly farming_plant_component: c.FarmingPlantComponent;
}

export class FarmingPlant {
  static from(entity?: ReadonlyEntity): FarmingPlant | undefined {
    return Entity.has(entity, "position", "farming_plant_component")
      ? (entity as FarmingPlant)
      : undefined;
  }
}
export interface Robot extends Entity {
  readonly robot_component: c.RobotComponent;
}

export class Robot {
  static from(entity?: ReadonlyEntity): Robot | undefined {
    return Entity.has(entity, "robot_component")
      ? (entity as Robot)
      : undefined;
  }
}

export interface EntityResourcePaths {
  "/ecs/entity": PathDef<[BiomesId], ReadonlyEntity | undefined>;
}

export const RESOURCE_PATH_TO_ENTITY_PROP = new Map<
  keyof c.ComponentResourcePaths,
  keyof Omit<Entity, "id">
>([
  ["/ecs/c/iced", "iced"],
  ["/ecs/c/remote_connection", "remote_connection"],
  ["/ecs/c/position", "position"],
  ["/ecs/c/orientation", "orientation"],
  ["/ecs/c/rigid_body", "rigid_body"],
  ["/ecs/c/size", "size"],
  ["/ecs/c/box", "box"],
  ["/ecs/c/shard_seed", "shard_seed"],
  ["/ecs/c/shard_diff", "shard_diff"],
  ["/ecs/c/shard_shapes", "shard_shapes"],
  ["/ecs/c/shard_sky_occlusion", "shard_sky_occlusion"],
  ["/ecs/c/shard_irradiance", "shard_irradiance"],
  ["/ecs/c/shard_water", "shard_water"],
  ["/ecs/c/shard_occupancy", "shard_occupancy"],
  ["/ecs/c/shard_dye", "shard_dye"],
  ["/ecs/c/shard_moisture", "shard_moisture"],
  ["/ecs/c/shard_growth", "shard_growth"],
  ["/ecs/c/shard_placer", "shard_placer"],
  ["/ecs/c/shard_muck", "shard_muck"],
  ["/ecs/c/label", "label"],
  ["/ecs/c/grab_bag", "grab_bag"],
  ["/ecs/c/acquisition", "acquisition"],
  ["/ecs/c/loose_item", "loose_item"],
  ["/ecs/c/inventory", "inventory"],
  ["/ecs/c/container_inventory", "container_inventory"],
  ["/ecs/c/priced_container_inventory", "priced_container_inventory"],
  ["/ecs/c/selected_item", "selected_item"],
  ["/ecs/c/wearing", "wearing"],
  ["/ecs/c/emote", "emote"],
  ["/ecs/c/appearance_component", "appearance_component"],
  ["/ecs/c/group_component", "group_component"],
  ["/ecs/c/challenges", "challenges"],
  ["/ecs/c/recipe_book", "recipe_book"],
  ["/ecs/c/expires", "expires"],
  ["/ecs/c/icing", "icing"],
  ["/ecs/c/warpable", "warpable"],
  ["/ecs/c/player_status", "player_status"],
  ["/ecs/c/player_behavior", "player_behavior"],
  ["/ecs/c/world_metadata", "world_metadata"],
  ["/ecs/c/npc_metadata", "npc_metadata"],
  ["/ecs/c/npc_state", "npc_state"],
  ["/ecs/c/group_preview_reference", "group_preview_reference"],
  ["/ecs/c/acl_component", "acl_component"],
  ["/ecs/c/deed_component", "deed_component"],
  ["/ecs/c/group_preview_component", "group_preview_component"],
  ["/ecs/c/blueprint_component", "blueprint_component"],
  ["/ecs/c/crafting_station_component", "crafting_station_component"],
  ["/ecs/c/health", "health"],
  ["/ecs/c/buffs_component", "buffs_component"],
  ["/ecs/c/gremlin", "gremlin"],
  ["/ecs/c/placeable_component", "placeable_component"],
  ["/ecs/c/grouped_entities", "grouped_entities"],
  ["/ecs/c/in_group", "in_group"],
  ["/ecs/c/picture_frame_contents", "picture_frame_contents"],
  ["/ecs/c/trigger_state", "trigger_state"],
  ["/ecs/c/lifetime_stats", "lifetime_stats"],
  ["/ecs/c/occupancy_component", "occupancy_component"],
  ["/ecs/c/video_component", "video_component"],
  ["/ecs/c/player_session", "player_session"],
  ["/ecs/c/preset_applied", "preset_applied"],
  ["/ecs/c/preset_prototype", "preset_prototype"],
  ["/ecs/c/farming_plant_component", "farming_plant_component"],
  ["/ecs/c/shard_farming", "shard_farming"],
  ["/ecs/c/created_by", "created_by"],
  ["/ecs/c/minigame_component", "minigame_component"],
  ["/ecs/c/minigame_instance", "minigame_instance"],
  ["/ecs/c/playing_minigame", "playing_minigame"],
  ["/ecs/c/minigame_element", "minigame_element"],
  ["/ecs/c/active_tray", "active_tray"],
  ["/ecs/c/stashed", "stashed"],
  ["/ecs/c/minigame_instance_tick_info", "minigame_instance_tick_info"],
  ["/ecs/c/warping_to", "warping_to"],
  ["/ecs/c/minigame_instance_expire", "minigame_instance_expire"],
  ["/ecs/c/placer_component", "placer_component"],
  ["/ecs/c/quest_giver", "quest_giver"],
  ["/ecs/c/default_dialog", "default_dialog"],
  ["/ecs/c/unmuck", "unmuck"],
  ["/ecs/c/robot_component", "robot_component"],
  ["/ecs/c/admin_entity", "admin_entity"],
  ["/ecs/c/protection", "protection"],
  ["/ecs/c/projects_protection", "projects_protection"],
  ["/ecs/c/deletes_with", "deletes_with"],
  ["/ecs/c/item_buyer", "item_buyer"],
  ["/ecs/c/inspection_tweaks", "inspection_tweaks"],
  ["/ecs/c/profile_pic", "profile_pic"],
  ["/ecs/c/entity_description", "entity_description"],
  ["/ecs/c/landmark", "landmark"],
  ["/ecs/c/collideable", "collideable"],
  ["/ecs/c/restoration", "restoration"],
  ["/ecs/c/terrain_restoration_diff", "terrain_restoration_diff"],
  ["/ecs/c/team", "team"],
  ["/ecs/c/player_current_team", "player_current_team"],
  ["/ecs/c/user_roles", "user_roles"],
  ["/ecs/c/restores_to", "restores_to"],
  ["/ecs/c/trade", "trade"],
  ["/ecs/c/active_trades", "active_trades"],
  ["/ecs/c/placed_by", "placed_by"],
  ["/ecs/c/text_sign", "text_sign"],
  ["/ecs/c/irradiance", "irradiance"],
  ["/ecs/c/locked_in_place", "locked_in_place"],
  ["/ecs/c/death_info", "death_info"],
  ["/ecs/c/synthetic_stats", "synthetic_stats"],
  ["/ecs/c/idle", "idle"],
  ["/ecs/c/voice", "voice"],
  ["/ecs/c/gift_giver", "gift_giver"],
]);

export const ENTITY_PROP_TO_RESOURCE_PATH: {
  [key in keyof Entity]: keyof (c.ComponentResourcePaths & EntityResourcePaths);
} = {
  id: "/ecs/entity",
  iced: "/ecs/c/iced",
  remote_connection: "/ecs/c/remote_connection",
  position: "/ecs/c/position",
  orientation: "/ecs/c/orientation",
  rigid_body: "/ecs/c/rigid_body",
  size: "/ecs/c/size",
  box: "/ecs/c/box",
  shard_seed: "/ecs/c/shard_seed",
  shard_diff: "/ecs/c/shard_diff",
  shard_shapes: "/ecs/c/shard_shapes",
  shard_sky_occlusion: "/ecs/c/shard_sky_occlusion",
  shard_irradiance: "/ecs/c/shard_irradiance",
  shard_water: "/ecs/c/shard_water",
  shard_occupancy: "/ecs/c/shard_occupancy",
  shard_dye: "/ecs/c/shard_dye",
  shard_moisture: "/ecs/c/shard_moisture",
  shard_growth: "/ecs/c/shard_growth",
  shard_placer: "/ecs/c/shard_placer",
  shard_muck: "/ecs/c/shard_muck",
  label: "/ecs/c/label",
  grab_bag: "/ecs/c/grab_bag",
  acquisition: "/ecs/c/acquisition",
  loose_item: "/ecs/c/loose_item",
  inventory: "/ecs/c/inventory",
  container_inventory: "/ecs/c/container_inventory",
  priced_container_inventory: "/ecs/c/priced_container_inventory",
  selected_item: "/ecs/c/selected_item",
  wearing: "/ecs/c/wearing",
  emote: "/ecs/c/emote",
  appearance_component: "/ecs/c/appearance_component",
  group_component: "/ecs/c/group_component",
  challenges: "/ecs/c/challenges",
  recipe_book: "/ecs/c/recipe_book",
  expires: "/ecs/c/expires",
  icing: "/ecs/c/icing",
  warpable: "/ecs/c/warpable",
  player_status: "/ecs/c/player_status",
  player_behavior: "/ecs/c/player_behavior",
  world_metadata: "/ecs/c/world_metadata",
  npc_metadata: "/ecs/c/npc_metadata",
  npc_state: "/ecs/c/npc_state",
  group_preview_reference: "/ecs/c/group_preview_reference",
  acl_component: "/ecs/c/acl_component",
  deed_component: "/ecs/c/deed_component",
  group_preview_component: "/ecs/c/group_preview_component",
  blueprint_component: "/ecs/c/blueprint_component",
  crafting_station_component: "/ecs/c/crafting_station_component",
  health: "/ecs/c/health",
  buffs_component: "/ecs/c/buffs_component",
  gremlin: "/ecs/c/gremlin",
  placeable_component: "/ecs/c/placeable_component",
  grouped_entities: "/ecs/c/grouped_entities",
  in_group: "/ecs/c/in_group",
  picture_frame_contents: "/ecs/c/picture_frame_contents",
  trigger_state: "/ecs/c/trigger_state",
  lifetime_stats: "/ecs/c/lifetime_stats",
  occupancy_component: "/ecs/c/occupancy_component",
  video_component: "/ecs/c/video_component",
  player_session: "/ecs/c/player_session",
  preset_applied: "/ecs/c/preset_applied",
  preset_prototype: "/ecs/c/preset_prototype",
  farming_plant_component: "/ecs/c/farming_plant_component",
  shard_farming: "/ecs/c/shard_farming",
  created_by: "/ecs/c/created_by",
  minigame_component: "/ecs/c/minigame_component",
  minigame_instance: "/ecs/c/minigame_instance",
  playing_minigame: "/ecs/c/playing_minigame",
  minigame_element: "/ecs/c/minigame_element",
  active_tray: "/ecs/c/active_tray",
  stashed: "/ecs/c/stashed",
  minigame_instance_tick_info: "/ecs/c/minigame_instance_tick_info",
  warping_to: "/ecs/c/warping_to",
  minigame_instance_expire: "/ecs/c/minigame_instance_expire",
  placer_component: "/ecs/c/placer_component",
  quest_giver: "/ecs/c/quest_giver",
  default_dialog: "/ecs/c/default_dialog",
  unmuck: "/ecs/c/unmuck",
  robot_component: "/ecs/c/robot_component",
  admin_entity: "/ecs/c/admin_entity",
  protection: "/ecs/c/protection",
  projects_protection: "/ecs/c/projects_protection",
  deletes_with: "/ecs/c/deletes_with",
  item_buyer: "/ecs/c/item_buyer",
  inspection_tweaks: "/ecs/c/inspection_tweaks",
  profile_pic: "/ecs/c/profile_pic",
  entity_description: "/ecs/c/entity_description",
  landmark: "/ecs/c/landmark",
  collideable: "/ecs/c/collideable",
  restoration: "/ecs/c/restoration",
  terrain_restoration_diff: "/ecs/c/terrain_restoration_diff",
  team: "/ecs/c/team",
  player_current_team: "/ecs/c/player_current_team",
  user_roles: "/ecs/c/user_roles",
  restores_to: "/ecs/c/restores_to",
  trade: "/ecs/c/trade",
  active_trades: "/ecs/c/active_trades",
  placed_by: "/ecs/c/placed_by",
  text_sign: "/ecs/c/text_sign",
  irradiance: "/ecs/c/irradiance",
  locked_in_place: "/ecs/c/locked_in_place",
  death_info: "/ecs/c/death_info",
  synthetic_stats: "/ecs/c/synthetic_stats",
  idle: "/ecs/c/idle",
  voice: "/ecs/c/voice",
  gift_giver: "/ecs/c/gift_giver",
};

export const COMPONENT_PROP_NAME_TO_ID = new Map<ComponentName, number>([
  ["iced", 57],
  ["remote_connection", 31],
  ["position", 54],
  ["orientation", 55],
  ["rigid_body", 32],
  ["size", 110],
  ["box", 33],
  ["shard_seed", 34],
  ["shard_diff", 35],
  ["shard_shapes", 60],
  ["shard_sky_occlusion", 76],
  ["shard_irradiance", 80],
  ["shard_water", 82],
  ["shard_occupancy", 93],
  ["shard_dye", 111],
  ["shard_moisture", 112],
  ["shard_growth", 113],
  ["shard_placer", 120],
  ["shard_muck", 124],
  ["label", 37],
  ["grab_bag", 51],
  ["acquisition", 52],
  ["loose_item", 53],
  ["inventory", 41],
  ["container_inventory", 79],
  ["priced_container_inventory", 86],
  ["selected_item", 59],
  ["wearing", 49],
  ["emote", 43],
  ["appearance_component", 56],
  ["group_component", 45],
  ["challenges", 46],
  ["recipe_book", 48],
  ["expires", 50],
  ["icing", 58],
  ["warpable", 61],
  ["player_status", 63],
  ["player_behavior", 64],
  ["world_metadata", 65],
  ["npc_metadata", 66],
  ["npc_state", 67],
  ["group_preview_reference", 68],
  ["acl_component", 70],
  ["deed_component", 71],
  ["group_preview_component", 72],
  ["blueprint_component", 87],
  ["crafting_station_component", 74],
  ["health", 75],
  ["buffs_component", 101],
  ["gremlin", 77],
  ["placeable_component", 78],
  ["grouped_entities", 83],
  ["in_group", 95],
  ["picture_frame_contents", 84],
  ["trigger_state", 88],
  ["lifetime_stats", 91],
  ["occupancy_component", 97],
  ["video_component", 92],
  ["player_session", 98],
  ["preset_applied", 99],
  ["preset_prototype", 100],
  ["farming_plant_component", 102],
  ["shard_farming", 103],
  ["created_by", 104],
  ["minigame_component", 105],
  ["minigame_instance", 106],
  ["playing_minigame", 107],
  ["minigame_element", 108],
  ["active_tray", 109],
  ["stashed", 115],
  ["minigame_instance_tick_info", 117],
  ["warping_to", 118],
  ["minigame_instance_expire", 119],
  ["placer_component", 121],
  ["quest_giver", 122],
  ["default_dialog", 123],
  ["unmuck", 125],
  ["robot_component", 126],
  ["admin_entity", 140],
  ["protection", 127],
  ["projects_protection", 128],
  ["deletes_with", 129],
  ["item_buyer", 130],
  ["inspection_tweaks", 131],
  ["profile_pic", 132],
  ["entity_description", 133],
  ["landmark", 134],
  ["collideable", 135],
  ["restoration", 136],
  ["terrain_restoration_diff", 137],
  ["team", 138],
  ["player_current_team", 139],
  ["user_roles", 141],
  ["restores_to", 142],
  ["trade", 143],
  ["active_trades", 144],
  ["placed_by", 145],
  ["text_sign", 146],
  ["irradiance", 147],
  ["locked_in_place", 148],
  ["death_info", 149],
  ["synthetic_stats", 150],
  ["idle", 151],
  ["voice", 152],
  ["gift_giver", 153],
]);

export const COMPONENT_ID_TO_PROP_NAME: ComponentName[] = [];
COMPONENT_ID_TO_PROP_NAME[57] = "iced";
COMPONENT_ID_TO_PROP_NAME[31] = "remote_connection";
COMPONENT_ID_TO_PROP_NAME[54] = "position";
COMPONENT_ID_TO_PROP_NAME[55] = "orientation";
COMPONENT_ID_TO_PROP_NAME[32] = "rigid_body";
COMPONENT_ID_TO_PROP_NAME[110] = "size";
COMPONENT_ID_TO_PROP_NAME[33] = "box";
COMPONENT_ID_TO_PROP_NAME[34] = "shard_seed";
COMPONENT_ID_TO_PROP_NAME[35] = "shard_diff";
COMPONENT_ID_TO_PROP_NAME[60] = "shard_shapes";
COMPONENT_ID_TO_PROP_NAME[76] = "shard_sky_occlusion";
COMPONENT_ID_TO_PROP_NAME[80] = "shard_irradiance";
COMPONENT_ID_TO_PROP_NAME[82] = "shard_water";
COMPONENT_ID_TO_PROP_NAME[93] = "shard_occupancy";
COMPONENT_ID_TO_PROP_NAME[111] = "shard_dye";
COMPONENT_ID_TO_PROP_NAME[112] = "shard_moisture";
COMPONENT_ID_TO_PROP_NAME[113] = "shard_growth";
COMPONENT_ID_TO_PROP_NAME[120] = "shard_placer";
COMPONENT_ID_TO_PROP_NAME[124] = "shard_muck";
COMPONENT_ID_TO_PROP_NAME[37] = "label";
COMPONENT_ID_TO_PROP_NAME[51] = "grab_bag";
COMPONENT_ID_TO_PROP_NAME[52] = "acquisition";
COMPONENT_ID_TO_PROP_NAME[53] = "loose_item";
COMPONENT_ID_TO_PROP_NAME[41] = "inventory";
COMPONENT_ID_TO_PROP_NAME[79] = "container_inventory";
COMPONENT_ID_TO_PROP_NAME[86] = "priced_container_inventory";
COMPONENT_ID_TO_PROP_NAME[59] = "selected_item";
COMPONENT_ID_TO_PROP_NAME[49] = "wearing";
COMPONENT_ID_TO_PROP_NAME[43] = "emote";
COMPONENT_ID_TO_PROP_NAME[56] = "appearance_component";
COMPONENT_ID_TO_PROP_NAME[45] = "group_component";
COMPONENT_ID_TO_PROP_NAME[46] = "challenges";
COMPONENT_ID_TO_PROP_NAME[48] = "recipe_book";
COMPONENT_ID_TO_PROP_NAME[50] = "expires";
COMPONENT_ID_TO_PROP_NAME[58] = "icing";
COMPONENT_ID_TO_PROP_NAME[61] = "warpable";
COMPONENT_ID_TO_PROP_NAME[63] = "player_status";
COMPONENT_ID_TO_PROP_NAME[64] = "player_behavior";
COMPONENT_ID_TO_PROP_NAME[65] = "world_metadata";
COMPONENT_ID_TO_PROP_NAME[66] = "npc_metadata";
COMPONENT_ID_TO_PROP_NAME[67] = "npc_state";
COMPONENT_ID_TO_PROP_NAME[68] = "group_preview_reference";
COMPONENT_ID_TO_PROP_NAME[70] = "acl_component";
COMPONENT_ID_TO_PROP_NAME[71] = "deed_component";
COMPONENT_ID_TO_PROP_NAME[72] = "group_preview_component";
COMPONENT_ID_TO_PROP_NAME[87] = "blueprint_component";
COMPONENT_ID_TO_PROP_NAME[74] = "crafting_station_component";
COMPONENT_ID_TO_PROP_NAME[75] = "health";
COMPONENT_ID_TO_PROP_NAME[101] = "buffs_component";
COMPONENT_ID_TO_PROP_NAME[77] = "gremlin";
COMPONENT_ID_TO_PROP_NAME[78] = "placeable_component";
COMPONENT_ID_TO_PROP_NAME[83] = "grouped_entities";
COMPONENT_ID_TO_PROP_NAME[95] = "in_group";
COMPONENT_ID_TO_PROP_NAME[84] = "picture_frame_contents";
COMPONENT_ID_TO_PROP_NAME[88] = "trigger_state";
COMPONENT_ID_TO_PROP_NAME[91] = "lifetime_stats";
COMPONENT_ID_TO_PROP_NAME[97] = "occupancy_component";
COMPONENT_ID_TO_PROP_NAME[92] = "video_component";
COMPONENT_ID_TO_PROP_NAME[98] = "player_session";
COMPONENT_ID_TO_PROP_NAME[99] = "preset_applied";
COMPONENT_ID_TO_PROP_NAME[100] = "preset_prototype";
COMPONENT_ID_TO_PROP_NAME[102] = "farming_plant_component";
COMPONENT_ID_TO_PROP_NAME[103] = "shard_farming";
COMPONENT_ID_TO_PROP_NAME[104] = "created_by";
COMPONENT_ID_TO_PROP_NAME[105] = "minigame_component";
COMPONENT_ID_TO_PROP_NAME[106] = "minigame_instance";
COMPONENT_ID_TO_PROP_NAME[107] = "playing_minigame";
COMPONENT_ID_TO_PROP_NAME[108] = "minigame_element";
COMPONENT_ID_TO_PROP_NAME[109] = "active_tray";
COMPONENT_ID_TO_PROP_NAME[115] = "stashed";
COMPONENT_ID_TO_PROP_NAME[117] = "minigame_instance_tick_info";
COMPONENT_ID_TO_PROP_NAME[118] = "warping_to";
COMPONENT_ID_TO_PROP_NAME[119] = "minigame_instance_expire";
COMPONENT_ID_TO_PROP_NAME[121] = "placer_component";
COMPONENT_ID_TO_PROP_NAME[122] = "quest_giver";
COMPONENT_ID_TO_PROP_NAME[123] = "default_dialog";
COMPONENT_ID_TO_PROP_NAME[125] = "unmuck";
COMPONENT_ID_TO_PROP_NAME[126] = "robot_component";
COMPONENT_ID_TO_PROP_NAME[140] = "admin_entity";
COMPONENT_ID_TO_PROP_NAME[127] = "protection";
COMPONENT_ID_TO_PROP_NAME[128] = "projects_protection";
COMPONENT_ID_TO_PROP_NAME[129] = "deletes_with";
COMPONENT_ID_TO_PROP_NAME[130] = "item_buyer";
COMPONENT_ID_TO_PROP_NAME[131] = "inspection_tweaks";
COMPONENT_ID_TO_PROP_NAME[132] = "profile_pic";
COMPONENT_ID_TO_PROP_NAME[133] = "entity_description";
COMPONENT_ID_TO_PROP_NAME[134] = "landmark";
COMPONENT_ID_TO_PROP_NAME[135] = "collideable";
COMPONENT_ID_TO_PROP_NAME[136] = "restoration";
COMPONENT_ID_TO_PROP_NAME[137] = "terrain_restoration_diff";
COMPONENT_ID_TO_PROP_NAME[138] = "team";
COMPONENT_ID_TO_PROP_NAME[139] = "player_current_team";
COMPONENT_ID_TO_PROP_NAME[141] = "user_roles";
COMPONENT_ID_TO_PROP_NAME[142] = "restores_to";
COMPONENT_ID_TO_PROP_NAME[143] = "trade";
COMPONENT_ID_TO_PROP_NAME[144] = "active_trades";
COMPONENT_ID_TO_PROP_NAME[145] = "placed_by";
COMPONENT_ID_TO_PROP_NAME[146] = "text_sign";
COMPONENT_ID_TO_PROP_NAME[147] = "irradiance";
COMPONENT_ID_TO_PROP_NAME[148] = "locked_in_place";
COMPONENT_ID_TO_PROP_NAME[149] = "death_info";
COMPONENT_ID_TO_PROP_NAME[150] = "synthetic_stats";
COMPONENT_ID_TO_PROP_NAME[151] = "idle";
COMPONENT_ID_TO_PROP_NAME[152] = "voice";
COMPONENT_ID_TO_PROP_NAME[153] = "gift_giver";
