// GENERATED: This file is generated from lazy.ts.j2. Do not modify directly.
// Content Hash: 600543f2012805b5d4aeeb62a29abdfb

import { LazyComponentData, LazyEntityLike, LazyLikeWith } from "@/server/shared/ecs/lazy_base";
import * as c from "@/shared/ecs/gen/components";
import { Delta, RawDelta, ReadonlyDelta } from "@/shared/ecs/gen/delta";
import {
  AsDelta,
  COMPONENT_PROP_NAME_TO_ID,
  Entity,
  ReadonlyEntity,
} from "@/shared/ecs/gen/entities";
import * as j from "@/shared/ecs/gen/json_serde";
import { BiomesId } from "@/shared/ids";
import { removeNilishInPlace } from "@/shared/util/object";

abstract class BaseLazyEntityDelta<SuperT, OutT> extends LazyEntityLike<SuperT, OutT> {
  protected decodeAny(componentId: number, value: LazyComponentData) {
    switch (componentId) {
    case 57: {
      this.decode("iced", value, j.IcedSerde.deserialize);
    } return true;
    case 31: {
      this.decode("remote_connection", value, j.RemoteConnectionSerde.deserialize);
    } return true;
    case 54: {
      this.decode("position", value, j.PositionSerde.deserialize);
    } return true;
    case 55: {
      this.decode("orientation", value, j.OrientationSerde.deserialize);
    } return true;
    case 32: {
      this.decode("rigid_body", value, j.RigidBodySerde.deserialize);
    } return true;
    case 110: {
      this.decode("size", value, j.SizeSerde.deserialize);
    } return true;
    case 33: {
      this.decode("box", value, j.BoxSerde.deserialize);
    } return true;
    case 34: {
      this.decode("shard_seed", value, j.ShardSeedSerde.deserialize);
    } return true;
    case 35: {
      this.decode("shard_diff", value, j.ShardDiffSerde.deserialize);
    } return true;
    case 60: {
      this.decode("shard_shapes", value, j.ShardShapesSerde.deserialize);
    } return true;
    case 76: {
      this.decode("shard_sky_occlusion", value, j.ShardSkyOcclusionSerde.deserialize);
    } return true;
    case 80: {
      this.decode("shard_irradiance", value, j.ShardIrradianceSerde.deserialize);
    } return true;
    case 82: {
      this.decode("shard_water", value, j.ShardWaterSerde.deserialize);
    } return true;
    case 93: {
      this.decode("shard_occupancy", value, j.ShardOccupancySerde.deserialize);
    } return true;
    case 111: {
      this.decode("shard_dye", value, j.ShardDyeSerde.deserialize);
    } return true;
    case 112: {
      this.decode("shard_moisture", value, j.ShardMoistureSerde.deserialize);
    } return true;
    case 113: {
      this.decode("shard_growth", value, j.ShardGrowthSerde.deserialize);
    } return true;
    case 120: {
      this.decode("shard_placer", value, j.ShardPlacerSerde.deserialize);
    } return true;
    case 124: {
      this.decode("shard_muck", value, j.ShardMuckSerde.deserialize);
    } return true;
    case 37: {
      this.decode("label", value, j.LabelSerde.deserialize);
    } return true;
    case 51: {
      this.decode("grab_bag", value, j.GrabBagSerde.deserialize);
    } return true;
    case 52: {
      this.decode("acquisition", value, j.AcquisitionSerde.deserialize);
    } return true;
    case 53: {
      this.decode("loose_item", value, j.LooseItemSerde.deserialize);
    } return true;
    case 41: {
      this.decode("inventory", value, j.InventorySerde.deserialize);
    } return true;
    case 79: {
      this.decode("container_inventory", value, j.ContainerInventorySerde.deserialize);
    } return true;
    case 86: {
      this.decode("priced_container_inventory", value, j.PricedContainerInventorySerde.deserialize);
    } return true;
    case 59: {
      this.decode("selected_item", value, j.SelectedItemSerde.deserialize);
    } return true;
    case 49: {
      this.decode("wearing", value, j.WearingSerde.deserialize);
    } return true;
    case 43: {
      this.decode("emote", value, j.EmoteSerde.deserialize);
    } return true;
    case 56: {
      this.decode("appearance_component", value, j.AppearanceComponentSerde.deserialize);
    } return true;
    case 45: {
      this.decode("group_component", value, j.GroupComponentSerde.deserialize);
    } return true;
    case 46: {
      this.decode("challenges", value, j.ChallengesSerde.deserialize);
    } return true;
    case 48: {
      this.decode("recipe_book", value, j.RecipeBookSerde.deserialize);
    } return true;
    case 50: {
      this.decode("expires", value, j.ExpiresSerde.deserialize);
    } return true;
    case 58: {
      this.decode("icing", value, j.IcingSerde.deserialize);
    } return true;
    case 61: {
      this.decode("warpable", value, j.WarpableSerde.deserialize);
    } return true;
    case 63: {
      this.decode("player_status", value, j.PlayerStatusSerde.deserialize);
    } return true;
    case 64: {
      this.decode("player_behavior", value, j.PlayerBehaviorSerde.deserialize);
    } return true;
    case 65: {
      this.decode("world_metadata", value, j.WorldMetadataSerde.deserialize);
    } return true;
    case 66: {
      this.decode("npc_metadata", value, j.NpcMetadataSerde.deserialize);
    } return true;
    case 67: {
      this.decode("npc_state", value, j.NpcStateSerde.deserialize);
    } return true;
    case 68: {
      this.decode("group_preview_reference", value, j.GroupPreviewReferenceSerde.deserialize);
    } return true;
    case 70: {
      this.decode("acl_component", value, j.AclComponentSerde.deserialize);
    } return true;
    case 71: {
      this.decode("deed_component", value, j.DeedComponentSerde.deserialize);
    } return true;
    case 72: {
      this.decode("group_preview_component", value, j.GroupPreviewComponentSerde.deserialize);
    } return true;
    case 87: {
      this.decode("blueprint_component", value, j.BlueprintComponentSerde.deserialize);
    } return true;
    case 74: {
      this.decode("crafting_station_component", value, j.CraftingStationComponentSerde.deserialize);
    } return true;
    case 75: {
      this.decode("health", value, j.HealthSerde.deserialize);
    } return true;
    case 101: {
      this.decode("buffs_component", value, j.BuffsComponentSerde.deserialize);
    } return true;
    case 77: {
      this.decode("gremlin", value, j.GremlinSerde.deserialize);
    } return true;
    case 78: {
      this.decode("placeable_component", value, j.PlaceableComponentSerde.deserialize);
    } return true;
    case 83: {
      this.decode("grouped_entities", value, j.GroupedEntitiesSerde.deserialize);
    } return true;
    case 95: {
      this.decode("in_group", value, j.InGroupSerde.deserialize);
    } return true;
    case 84: {
      this.decode("picture_frame_contents", value, j.PictureFrameContentsSerde.deserialize);
    } return true;
    case 88: {
      this.decode("trigger_state", value, j.TriggerStateSerde.deserialize);
    } return true;
    case 91: {
      this.decode("lifetime_stats", value, j.LifetimeStatsSerde.deserialize);
    } return true;
    case 97: {
      this.decode("occupancy_component", value, j.OccupancyComponentSerde.deserialize);
    } return true;
    case 92: {
      this.decode("video_component", value, j.VideoComponentSerde.deserialize);
    } return true;
    case 98: {
      this.decode("player_session", value, j.PlayerSessionSerde.deserialize);
    } return true;
    case 99: {
      this.decode("preset_applied", value, j.PresetAppliedSerde.deserialize);
    } return true;
    case 100: {
      this.decode("preset_prototype", value, j.PresetPrototypeSerde.deserialize);
    } return true;
    case 102: {
      this.decode("farming_plant_component", value, j.FarmingPlantComponentSerde.deserialize);
    } return true;
    case 103: {
      this.decode("shard_farming", value, j.ShardFarmingSerde.deserialize);
    } return true;
    case 104: {
      this.decode("created_by", value, j.CreatedBySerde.deserialize);
    } return true;
    case 105: {
      this.decode("minigame_component", value, j.MinigameComponentSerde.deserialize);
    } return true;
    case 106: {
      this.decode("minigame_instance", value, j.MinigameInstanceSerde.deserialize);
    } return true;
    case 107: {
      this.decode("playing_minigame", value, j.PlayingMinigameSerde.deserialize);
    } return true;
    case 108: {
      this.decode("minigame_element", value, j.MinigameElementSerde.deserialize);
    } return true;
    case 109: {
      this.decode("active_tray", value, j.ActiveTraySerde.deserialize);
    } return true;
    case 115: {
      this.decode("stashed", value, j.StashedSerde.deserialize);
    } return true;
    case 117: {
      this.decode("minigame_instance_tick_info", value, j.MinigameInstanceTickInfoSerde.deserialize);
    } return true;
    case 118: {
      this.decode("warping_to", value, j.WarpingToSerde.deserialize);
    } return true;
    case 119: {
      this.decode("minigame_instance_expire", value, j.MinigameInstanceExpireSerde.deserialize);
    } return true;
    case 121: {
      this.decode("placer_component", value, j.PlacerComponentSerde.deserialize);
    } return true;
    case 122: {
      this.decode("quest_giver", value, j.QuestGiverSerde.deserialize);
    } return true;
    case 123: {
      this.decode("default_dialog", value, j.DefaultDialogSerde.deserialize);
    } return true;
    case 125: {
      this.decode("unmuck", value, j.UnmuckSerde.deserialize);
    } return true;
    case 126: {
      this.decode("robot_component", value, j.RobotComponentSerde.deserialize);
    } return true;
    case 140: {
      this.decode("admin_entity", value, j.AdminEntitySerde.deserialize);
    } return true;
    case 127: {
      this.decode("protection", value, j.ProtectionSerde.deserialize);
    } return true;
    case 128: {
      this.decode("projects_protection", value, j.ProjectsProtectionSerde.deserialize);
    } return true;
    case 129: {
      this.decode("deletes_with", value, j.DeletesWithSerde.deserialize);
    } return true;
    case 130: {
      this.decode("item_buyer", value, j.ItemBuyerSerde.deserialize);
    } return true;
    case 131: {
      this.decode("inspection_tweaks", value, j.InspectionTweaksSerde.deserialize);
    } return true;
    case 132: {
      this.decode("profile_pic", value, j.ProfilePicSerde.deserialize);
    } return true;
    case 133: {
      this.decode("entity_description", value, j.EntityDescriptionSerde.deserialize);
    } return true;
    case 134: {
      this.decode("landmark", value, j.LandmarkSerde.deserialize);
    } return true;
    case 135: {
      this.decode("collideable", value, j.CollideableSerde.deserialize);
    } return true;
    case 136: {
      this.decode("restoration", value, j.RestorationSerde.deserialize);
    } return true;
    case 137: {
      this.decode("terrain_restoration_diff", value, j.TerrainRestorationDiffSerde.deserialize);
    } return true;
    case 138: {
      this.decode("team", value, j.TeamSerde.deserialize);
    } return true;
    case 139: {
      this.decode("player_current_team", value, j.PlayerCurrentTeamSerde.deserialize);
    } return true;
    case 141: {
      this.decode("user_roles", value, j.UserRolesSerde.deserialize);
    } return true;
    case 142: {
      this.decode("restores_to", value, j.RestoresToSerde.deserialize);
    } return true;
    case 143: {
      this.decode("trade", value, j.TradeSerde.deserialize);
    } return true;
    case 144: {
      this.decode("active_trades", value, j.ActiveTradesSerde.deserialize);
    } return true;
    case 145: {
      this.decode("placed_by", value, j.PlacedBySerde.deserialize);
    } return true;
    case 146: {
      this.decode("text_sign", value, j.TextSignSerde.deserialize);
    } return true;
    case 147: {
      this.decode("irradiance", value, j.IrradianceSerde.deserialize);
    } return true;
    case 148: {
      this.decode("locked_in_place", value, j.LockedInPlaceSerde.deserialize);
    } return true;
    case 149: {
      this.decode("death_info", value, j.DeathInfoSerde.deserialize);
    } return true;
    case 150: {
      this.decode("synthetic_stats", value, j.SyntheticStatsSerde.deserialize);
    } return true;
    case 151: {
      this.decode("idle", value, j.IdleSerde.deserialize);
    } return true;
    case 152: {
      this.decode("voice", value, j.VoiceSerde.deserialize);
    } return true;
    case 153: {
      this.decode("gift_giver", value, j.GiftGiverSerde.deserialize);
    } return true;
    }
    return false;
  }

  altersIced(): boolean {
    return (
      (this.encoded && this.encoded[57] !== undefined) ||
      this.decoded.iced !== undefined
    );
  }

  hasIced(): boolean {
    return (this.encoded && !!this.encoded[57]) || !!this.decoded.iced;
  }

  iced(): c.ReadonlyIced | null | undefined {
    this.decode("iced",
      this.encoded?.[57],
      j.IcedSerde.deserialize);
    this.iced = () => this.decoded.iced as c.ReadonlyIced | null | undefined;
    return this.iced();
  }
  altersRemoteConnection(): boolean {
    return (
      (this.encoded && this.encoded[31] !== undefined) ||
      this.decoded.remote_connection !== undefined
    );
  }

  hasRemoteConnection(): boolean {
    return (this.encoded && !!this.encoded[31]) || !!this.decoded.remote_connection;
  }

  remoteConnection(): c.ReadonlyRemoteConnection | null | undefined {
    this.decode("remote_connection",
      this.encoded?.[31],
      j.RemoteConnectionSerde.deserialize);
    this.remoteConnection = () => this.decoded.remote_connection as c.ReadonlyRemoteConnection | null | undefined;
    return this.remoteConnection();
  }
  altersPosition(): boolean {
    return (
      (this.encoded && this.encoded[54] !== undefined) ||
      this.decoded.position !== undefined
    );
  }

  hasPosition(): boolean {
    return (this.encoded && !!this.encoded[54]) || !!this.decoded.position;
  }

  position(): c.ReadonlyPosition | null | undefined {
    this.decode("position",
      this.encoded?.[54],
      j.PositionSerde.deserialize);
    this.position = () => this.decoded.position as c.ReadonlyPosition | null | undefined;
    return this.position();
  }
  altersOrientation(): boolean {
    return (
      (this.encoded && this.encoded[55] !== undefined) ||
      this.decoded.orientation !== undefined
    );
  }

  hasOrientation(): boolean {
    return (this.encoded && !!this.encoded[55]) || !!this.decoded.orientation;
  }

  orientation(): c.ReadonlyOrientation | null | undefined {
    this.decode("orientation",
      this.encoded?.[55],
      j.OrientationSerde.deserialize);
    this.orientation = () => this.decoded.orientation as c.ReadonlyOrientation | null | undefined;
    return this.orientation();
  }
  altersRigidBody(): boolean {
    return (
      (this.encoded && this.encoded[32] !== undefined) ||
      this.decoded.rigid_body !== undefined
    );
  }

  hasRigidBody(): boolean {
    return (this.encoded && !!this.encoded[32]) || !!this.decoded.rigid_body;
  }

  rigidBody(): c.ReadonlyRigidBody | null | undefined {
    this.decode("rigid_body",
      this.encoded?.[32],
      j.RigidBodySerde.deserialize);
    this.rigidBody = () => this.decoded.rigid_body as c.ReadonlyRigidBody | null | undefined;
    return this.rigidBody();
  }
  altersSize(): boolean {
    return (
      (this.encoded && this.encoded[110] !== undefined) ||
      this.decoded.size !== undefined
    );
  }

  hasSize(): boolean {
    return (this.encoded && !!this.encoded[110]) || !!this.decoded.size;
  }

  size(): c.ReadonlySize | null | undefined {
    this.decode("size",
      this.encoded?.[110],
      j.SizeSerde.deserialize);
    this.size = () => this.decoded.size as c.ReadonlySize | null | undefined;
    return this.size();
  }
  altersBox(): boolean {
    return (
      (this.encoded && this.encoded[33] !== undefined) ||
      this.decoded.box !== undefined
    );
  }

  hasBox(): boolean {
    return (this.encoded && !!this.encoded[33]) || !!this.decoded.box;
  }

  box(): c.ReadonlyBox | null | undefined {
    this.decode("box",
      this.encoded?.[33],
      j.BoxSerde.deserialize);
    this.box = () => this.decoded.box as c.ReadonlyBox | null | undefined;
    return this.box();
  }
  altersShardSeed(): boolean {
    return (
      (this.encoded && this.encoded[34] !== undefined) ||
      this.decoded.shard_seed !== undefined
    );
  }

  hasShardSeed(): boolean {
    return (this.encoded && !!this.encoded[34]) || !!this.decoded.shard_seed;
  }

  shardSeed(): c.ReadonlyShardSeed | null | undefined {
    this.decode("shard_seed",
      this.encoded?.[34],
      j.ShardSeedSerde.deserialize);
    this.shardSeed = () => this.decoded.shard_seed as c.ReadonlyShardSeed | null | undefined;
    return this.shardSeed();
  }
  altersShardDiff(): boolean {
    return (
      (this.encoded && this.encoded[35] !== undefined) ||
      this.decoded.shard_diff !== undefined
    );
  }

  hasShardDiff(): boolean {
    return (this.encoded && !!this.encoded[35]) || !!this.decoded.shard_diff;
  }

  shardDiff(): c.ReadonlyShardDiff | null | undefined {
    this.decode("shard_diff",
      this.encoded?.[35],
      j.ShardDiffSerde.deserialize);
    this.shardDiff = () => this.decoded.shard_diff as c.ReadonlyShardDiff | null | undefined;
    return this.shardDiff();
  }
  altersShardShapes(): boolean {
    return (
      (this.encoded && this.encoded[60] !== undefined) ||
      this.decoded.shard_shapes !== undefined
    );
  }

  hasShardShapes(): boolean {
    return (this.encoded && !!this.encoded[60]) || !!this.decoded.shard_shapes;
  }

  shardShapes(): c.ReadonlyShardShapes | null | undefined {
    this.decode("shard_shapes",
      this.encoded?.[60],
      j.ShardShapesSerde.deserialize);
    this.shardShapes = () => this.decoded.shard_shapes as c.ReadonlyShardShapes | null | undefined;
    return this.shardShapes();
  }
  altersShardSkyOcclusion(): boolean {
    return (
      (this.encoded && this.encoded[76] !== undefined) ||
      this.decoded.shard_sky_occlusion !== undefined
    );
  }

  hasShardSkyOcclusion(): boolean {
    return (this.encoded && !!this.encoded[76]) || !!this.decoded.shard_sky_occlusion;
  }

  shardSkyOcclusion(): c.ReadonlyShardSkyOcclusion | null | undefined {
    this.decode("shard_sky_occlusion",
      this.encoded?.[76],
      j.ShardSkyOcclusionSerde.deserialize);
    this.shardSkyOcclusion = () => this.decoded.shard_sky_occlusion as c.ReadonlyShardSkyOcclusion | null | undefined;
    return this.shardSkyOcclusion();
  }
  altersShardIrradiance(): boolean {
    return (
      (this.encoded && this.encoded[80] !== undefined) ||
      this.decoded.shard_irradiance !== undefined
    );
  }

  hasShardIrradiance(): boolean {
    return (this.encoded && !!this.encoded[80]) || !!this.decoded.shard_irradiance;
  }

  shardIrradiance(): c.ReadonlyShardIrradiance | null | undefined {
    this.decode("shard_irradiance",
      this.encoded?.[80],
      j.ShardIrradianceSerde.deserialize);
    this.shardIrradiance = () => this.decoded.shard_irradiance as c.ReadonlyShardIrradiance | null | undefined;
    return this.shardIrradiance();
  }
  altersShardWater(): boolean {
    return (
      (this.encoded && this.encoded[82] !== undefined) ||
      this.decoded.shard_water !== undefined
    );
  }

  hasShardWater(): boolean {
    return (this.encoded && !!this.encoded[82]) || !!this.decoded.shard_water;
  }

  shardWater(): c.ReadonlyShardWater | null | undefined {
    this.decode("shard_water",
      this.encoded?.[82],
      j.ShardWaterSerde.deserialize);
    this.shardWater = () => this.decoded.shard_water as c.ReadonlyShardWater | null | undefined;
    return this.shardWater();
  }
  altersShardOccupancy(): boolean {
    return (
      (this.encoded && this.encoded[93] !== undefined) ||
      this.decoded.shard_occupancy !== undefined
    );
  }

  hasShardOccupancy(): boolean {
    return (this.encoded && !!this.encoded[93]) || !!this.decoded.shard_occupancy;
  }

  shardOccupancy(): c.ReadonlyShardOccupancy | null | undefined {
    this.decode("shard_occupancy",
      this.encoded?.[93],
      j.ShardOccupancySerde.deserialize);
    this.shardOccupancy = () => this.decoded.shard_occupancy as c.ReadonlyShardOccupancy | null | undefined;
    return this.shardOccupancy();
  }
  altersShardDye(): boolean {
    return (
      (this.encoded && this.encoded[111] !== undefined) ||
      this.decoded.shard_dye !== undefined
    );
  }

  hasShardDye(): boolean {
    return (this.encoded && !!this.encoded[111]) || !!this.decoded.shard_dye;
  }

  shardDye(): c.ReadonlyShardDye | null | undefined {
    this.decode("shard_dye",
      this.encoded?.[111],
      j.ShardDyeSerde.deserialize);
    this.shardDye = () => this.decoded.shard_dye as c.ReadonlyShardDye | null | undefined;
    return this.shardDye();
  }
  altersShardMoisture(): boolean {
    return (
      (this.encoded && this.encoded[112] !== undefined) ||
      this.decoded.shard_moisture !== undefined
    );
  }

  hasShardMoisture(): boolean {
    return (this.encoded && !!this.encoded[112]) || !!this.decoded.shard_moisture;
  }

  shardMoisture(): c.ReadonlyShardMoisture | null | undefined {
    this.decode("shard_moisture",
      this.encoded?.[112],
      j.ShardMoistureSerde.deserialize);
    this.shardMoisture = () => this.decoded.shard_moisture as c.ReadonlyShardMoisture | null | undefined;
    return this.shardMoisture();
  }
  altersShardGrowth(): boolean {
    return (
      (this.encoded && this.encoded[113] !== undefined) ||
      this.decoded.shard_growth !== undefined
    );
  }

  hasShardGrowth(): boolean {
    return (this.encoded && !!this.encoded[113]) || !!this.decoded.shard_growth;
  }

  shardGrowth(): c.ReadonlyShardGrowth | null | undefined {
    this.decode("shard_growth",
      this.encoded?.[113],
      j.ShardGrowthSerde.deserialize);
    this.shardGrowth = () => this.decoded.shard_growth as c.ReadonlyShardGrowth | null | undefined;
    return this.shardGrowth();
  }
  altersShardPlacer(): boolean {
    return (
      (this.encoded && this.encoded[120] !== undefined) ||
      this.decoded.shard_placer !== undefined
    );
  }

  hasShardPlacer(): boolean {
    return (this.encoded && !!this.encoded[120]) || !!this.decoded.shard_placer;
  }

  shardPlacer(): c.ReadonlyShardPlacer | null | undefined {
    this.decode("shard_placer",
      this.encoded?.[120],
      j.ShardPlacerSerde.deserialize);
    this.shardPlacer = () => this.decoded.shard_placer as c.ReadonlyShardPlacer | null | undefined;
    return this.shardPlacer();
  }
  altersShardMuck(): boolean {
    return (
      (this.encoded && this.encoded[124] !== undefined) ||
      this.decoded.shard_muck !== undefined
    );
  }

  hasShardMuck(): boolean {
    return (this.encoded && !!this.encoded[124]) || !!this.decoded.shard_muck;
  }

  shardMuck(): c.ReadonlyShardMuck | null | undefined {
    this.decode("shard_muck",
      this.encoded?.[124],
      j.ShardMuckSerde.deserialize);
    this.shardMuck = () => this.decoded.shard_muck as c.ReadonlyShardMuck | null | undefined;
    return this.shardMuck();
  }
  altersLabel(): boolean {
    return (
      (this.encoded && this.encoded[37] !== undefined) ||
      this.decoded.label !== undefined
    );
  }

  hasLabel(): boolean {
    return (this.encoded && !!this.encoded[37]) || !!this.decoded.label;
  }

  label(): c.ReadonlyLabel | null | undefined {
    this.decode("label",
      this.encoded?.[37],
      j.LabelSerde.deserialize);
    this.label = () => this.decoded.label as c.ReadonlyLabel | null | undefined;
    return this.label();
  }
  altersGrabBag(): boolean {
    return (
      (this.encoded && this.encoded[51] !== undefined) ||
      this.decoded.grab_bag !== undefined
    );
  }

  hasGrabBag(): boolean {
    return (this.encoded && !!this.encoded[51]) || !!this.decoded.grab_bag;
  }

  grabBag(): c.ReadonlyGrabBag | null | undefined {
    this.decode("grab_bag",
      this.encoded?.[51],
      j.GrabBagSerde.deserialize);
    this.grabBag = () => this.decoded.grab_bag as c.ReadonlyGrabBag | null | undefined;
    return this.grabBag();
  }
  altersAcquisition(): boolean {
    return (
      (this.encoded && this.encoded[52] !== undefined) ||
      this.decoded.acquisition !== undefined
    );
  }

  hasAcquisition(): boolean {
    return (this.encoded && !!this.encoded[52]) || !!this.decoded.acquisition;
  }

  acquisition(): c.ReadonlyAcquisition | null | undefined {
    this.decode("acquisition",
      this.encoded?.[52],
      j.AcquisitionSerde.deserialize);
    this.acquisition = () => this.decoded.acquisition as c.ReadonlyAcquisition | null | undefined;
    return this.acquisition();
  }
  altersLooseItem(): boolean {
    return (
      (this.encoded && this.encoded[53] !== undefined) ||
      this.decoded.loose_item !== undefined
    );
  }

  hasLooseItem(): boolean {
    return (this.encoded && !!this.encoded[53]) || !!this.decoded.loose_item;
  }

  looseItem(): c.ReadonlyLooseItem | null | undefined {
    this.decode("loose_item",
      this.encoded?.[53],
      j.LooseItemSerde.deserialize);
    this.looseItem = () => this.decoded.loose_item as c.ReadonlyLooseItem | null | undefined;
    return this.looseItem();
  }
  altersInventory(): boolean {
    return (
      (this.encoded && this.encoded[41] !== undefined) ||
      this.decoded.inventory !== undefined
    );
  }

  hasInventory(): boolean {
    return (this.encoded && !!this.encoded[41]) || !!this.decoded.inventory;
  }

  inventory(): c.ReadonlyInventory | null | undefined {
    this.decode("inventory",
      this.encoded?.[41],
      j.InventorySerde.deserialize);
    this.inventory = () => this.decoded.inventory as c.ReadonlyInventory | null | undefined;
    return this.inventory();
  }
  altersContainerInventory(): boolean {
    return (
      (this.encoded && this.encoded[79] !== undefined) ||
      this.decoded.container_inventory !== undefined
    );
  }

  hasContainerInventory(): boolean {
    return (this.encoded && !!this.encoded[79]) || !!this.decoded.container_inventory;
  }

  containerInventory(): c.ReadonlyContainerInventory | null | undefined {
    this.decode("container_inventory",
      this.encoded?.[79],
      j.ContainerInventorySerde.deserialize);
    this.containerInventory = () => this.decoded.container_inventory as c.ReadonlyContainerInventory | null | undefined;
    return this.containerInventory();
  }
  altersPricedContainerInventory(): boolean {
    return (
      (this.encoded && this.encoded[86] !== undefined) ||
      this.decoded.priced_container_inventory !== undefined
    );
  }

  hasPricedContainerInventory(): boolean {
    return (this.encoded && !!this.encoded[86]) || !!this.decoded.priced_container_inventory;
  }

  pricedContainerInventory(): c.ReadonlyPricedContainerInventory | null | undefined {
    this.decode("priced_container_inventory",
      this.encoded?.[86],
      j.PricedContainerInventorySerde.deserialize);
    this.pricedContainerInventory = () => this.decoded.priced_container_inventory as c.ReadonlyPricedContainerInventory | null | undefined;
    return this.pricedContainerInventory();
  }
  altersSelectedItem(): boolean {
    return (
      (this.encoded && this.encoded[59] !== undefined) ||
      this.decoded.selected_item !== undefined
    );
  }

  hasSelectedItem(): boolean {
    return (this.encoded && !!this.encoded[59]) || !!this.decoded.selected_item;
  }

  selectedItem(): c.ReadonlySelectedItem | null | undefined {
    this.decode("selected_item",
      this.encoded?.[59],
      j.SelectedItemSerde.deserialize);
    this.selectedItem = () => this.decoded.selected_item as c.ReadonlySelectedItem | null | undefined;
    return this.selectedItem();
  }
  altersWearing(): boolean {
    return (
      (this.encoded && this.encoded[49] !== undefined) ||
      this.decoded.wearing !== undefined
    );
  }

  hasWearing(): boolean {
    return (this.encoded && !!this.encoded[49]) || !!this.decoded.wearing;
  }

  wearing(): c.ReadonlyWearing | null | undefined {
    this.decode("wearing",
      this.encoded?.[49],
      j.WearingSerde.deserialize);
    this.wearing = () => this.decoded.wearing as c.ReadonlyWearing | null | undefined;
    return this.wearing();
  }
  altersEmote(): boolean {
    return (
      (this.encoded && this.encoded[43] !== undefined) ||
      this.decoded.emote !== undefined
    );
  }

  hasEmote(): boolean {
    return (this.encoded && !!this.encoded[43]) || !!this.decoded.emote;
  }

  emote(): c.ReadonlyEmote | null | undefined {
    this.decode("emote",
      this.encoded?.[43],
      j.EmoteSerde.deserialize);
    this.emote = () => this.decoded.emote as c.ReadonlyEmote | null | undefined;
    return this.emote();
  }
  altersAppearanceComponent(): boolean {
    return (
      (this.encoded && this.encoded[56] !== undefined) ||
      this.decoded.appearance_component !== undefined
    );
  }

  hasAppearanceComponent(): boolean {
    return (this.encoded && !!this.encoded[56]) || !!this.decoded.appearance_component;
  }

  appearanceComponent(): c.ReadonlyAppearanceComponent | null | undefined {
    this.decode("appearance_component",
      this.encoded?.[56],
      j.AppearanceComponentSerde.deserialize);
    this.appearanceComponent = () => this.decoded.appearance_component as c.ReadonlyAppearanceComponent | null | undefined;
    return this.appearanceComponent();
  }
  altersGroupComponent(): boolean {
    return (
      (this.encoded && this.encoded[45] !== undefined) ||
      this.decoded.group_component !== undefined
    );
  }

  hasGroupComponent(): boolean {
    return (this.encoded && !!this.encoded[45]) || !!this.decoded.group_component;
  }

  groupComponent(): c.ReadonlyGroupComponent | null | undefined {
    this.decode("group_component",
      this.encoded?.[45],
      j.GroupComponentSerde.deserialize);
    this.groupComponent = () => this.decoded.group_component as c.ReadonlyGroupComponent | null | undefined;
    return this.groupComponent();
  }
  altersChallenges(): boolean {
    return (
      (this.encoded && this.encoded[46] !== undefined) ||
      this.decoded.challenges !== undefined
    );
  }

  hasChallenges(): boolean {
    return (this.encoded && !!this.encoded[46]) || !!this.decoded.challenges;
  }

  challenges(): c.ReadonlyChallenges | null | undefined {
    this.decode("challenges",
      this.encoded?.[46],
      j.ChallengesSerde.deserialize);
    this.challenges = () => this.decoded.challenges as c.ReadonlyChallenges | null | undefined;
    return this.challenges();
  }
  altersRecipeBook(): boolean {
    return (
      (this.encoded && this.encoded[48] !== undefined) ||
      this.decoded.recipe_book !== undefined
    );
  }

  hasRecipeBook(): boolean {
    return (this.encoded && !!this.encoded[48]) || !!this.decoded.recipe_book;
  }

  recipeBook(): c.ReadonlyRecipeBook | null | undefined {
    this.decode("recipe_book",
      this.encoded?.[48],
      j.RecipeBookSerde.deserialize);
    this.recipeBook = () => this.decoded.recipe_book as c.ReadonlyRecipeBook | null | undefined;
    return this.recipeBook();
  }
  altersExpires(): boolean {
    return (
      (this.encoded && this.encoded[50] !== undefined) ||
      this.decoded.expires !== undefined
    );
  }

  hasExpires(): boolean {
    return (this.encoded && !!this.encoded[50]) || !!this.decoded.expires;
  }

  expires(): c.ReadonlyExpires | null | undefined {
    this.decode("expires",
      this.encoded?.[50],
      j.ExpiresSerde.deserialize);
    this.expires = () => this.decoded.expires as c.ReadonlyExpires | null | undefined;
    return this.expires();
  }
  altersIcing(): boolean {
    return (
      (this.encoded && this.encoded[58] !== undefined) ||
      this.decoded.icing !== undefined
    );
  }

  hasIcing(): boolean {
    return (this.encoded && !!this.encoded[58]) || !!this.decoded.icing;
  }

  icing(): c.ReadonlyIcing | null | undefined {
    this.decode("icing",
      this.encoded?.[58],
      j.IcingSerde.deserialize);
    this.icing = () => this.decoded.icing as c.ReadonlyIcing | null | undefined;
    return this.icing();
  }
  altersWarpable(): boolean {
    return (
      (this.encoded && this.encoded[61] !== undefined) ||
      this.decoded.warpable !== undefined
    );
  }

  hasWarpable(): boolean {
    return (this.encoded && !!this.encoded[61]) || !!this.decoded.warpable;
  }

  warpable(): c.ReadonlyWarpable | null | undefined {
    this.decode("warpable",
      this.encoded?.[61],
      j.WarpableSerde.deserialize);
    this.warpable = () => this.decoded.warpable as c.ReadonlyWarpable | null | undefined;
    return this.warpable();
  }
  altersPlayerStatus(): boolean {
    return (
      (this.encoded && this.encoded[63] !== undefined) ||
      this.decoded.player_status !== undefined
    );
  }

  hasPlayerStatus(): boolean {
    return (this.encoded && !!this.encoded[63]) || !!this.decoded.player_status;
  }

  playerStatus(): c.ReadonlyPlayerStatus | null | undefined {
    this.decode("player_status",
      this.encoded?.[63],
      j.PlayerStatusSerde.deserialize);
    this.playerStatus = () => this.decoded.player_status as c.ReadonlyPlayerStatus | null | undefined;
    return this.playerStatus();
  }
  altersPlayerBehavior(): boolean {
    return (
      (this.encoded && this.encoded[64] !== undefined) ||
      this.decoded.player_behavior !== undefined
    );
  }

  hasPlayerBehavior(): boolean {
    return (this.encoded && !!this.encoded[64]) || !!this.decoded.player_behavior;
  }

  playerBehavior(): c.ReadonlyPlayerBehavior | null | undefined {
    this.decode("player_behavior",
      this.encoded?.[64],
      j.PlayerBehaviorSerde.deserialize);
    this.playerBehavior = () => this.decoded.player_behavior as c.ReadonlyPlayerBehavior | null | undefined;
    return this.playerBehavior();
  }
  altersWorldMetadata(): boolean {
    return (
      (this.encoded && this.encoded[65] !== undefined) ||
      this.decoded.world_metadata !== undefined
    );
  }

  hasWorldMetadata(): boolean {
    return (this.encoded && !!this.encoded[65]) || !!this.decoded.world_metadata;
  }

  worldMetadata(): c.ReadonlyWorldMetadata | null | undefined {
    this.decode("world_metadata",
      this.encoded?.[65],
      j.WorldMetadataSerde.deserialize);
    this.worldMetadata = () => this.decoded.world_metadata as c.ReadonlyWorldMetadata | null | undefined;
    return this.worldMetadata();
  }
  altersNpcMetadata(): boolean {
    return (
      (this.encoded && this.encoded[66] !== undefined) ||
      this.decoded.npc_metadata !== undefined
    );
  }

  hasNpcMetadata(): boolean {
    return (this.encoded && !!this.encoded[66]) || !!this.decoded.npc_metadata;
  }

  npcMetadata(): c.ReadonlyNpcMetadata | null | undefined {
    this.decode("npc_metadata",
      this.encoded?.[66],
      j.NpcMetadataSerde.deserialize);
    this.npcMetadata = () => this.decoded.npc_metadata as c.ReadonlyNpcMetadata | null | undefined;
    return this.npcMetadata();
  }
  altersNpcState(): boolean {
    return (
      (this.encoded && this.encoded[67] !== undefined) ||
      this.decoded.npc_state !== undefined
    );
  }

  hasNpcState(): boolean {
    return (this.encoded && !!this.encoded[67]) || !!this.decoded.npc_state;
  }

  npcState(): c.ReadonlyNpcState | null | undefined {
    this.decode("npc_state",
      this.encoded?.[67],
      j.NpcStateSerde.deserialize);
    this.npcState = () => this.decoded.npc_state as c.ReadonlyNpcState | null | undefined;
    return this.npcState();
  }
  altersGroupPreviewReference(): boolean {
    return (
      (this.encoded && this.encoded[68] !== undefined) ||
      this.decoded.group_preview_reference !== undefined
    );
  }

  hasGroupPreviewReference(): boolean {
    return (this.encoded && !!this.encoded[68]) || !!this.decoded.group_preview_reference;
  }

  groupPreviewReference(): c.ReadonlyGroupPreviewReference | null | undefined {
    this.decode("group_preview_reference",
      this.encoded?.[68],
      j.GroupPreviewReferenceSerde.deserialize);
    this.groupPreviewReference = () => this.decoded.group_preview_reference as c.ReadonlyGroupPreviewReference | null | undefined;
    return this.groupPreviewReference();
  }
  altersAclComponent(): boolean {
    return (
      (this.encoded && this.encoded[70] !== undefined) ||
      this.decoded.acl_component !== undefined
    );
  }

  hasAclComponent(): boolean {
    return (this.encoded && !!this.encoded[70]) || !!this.decoded.acl_component;
  }

  aclComponent(): c.ReadonlyAclComponent | null | undefined {
    this.decode("acl_component",
      this.encoded?.[70],
      j.AclComponentSerde.deserialize);
    this.aclComponent = () => this.decoded.acl_component as c.ReadonlyAclComponent | null | undefined;
    return this.aclComponent();
  }
  altersDeedComponent(): boolean {
    return (
      (this.encoded && this.encoded[71] !== undefined) ||
      this.decoded.deed_component !== undefined
    );
  }

  hasDeedComponent(): boolean {
    return (this.encoded && !!this.encoded[71]) || !!this.decoded.deed_component;
  }

  deedComponent(): c.ReadonlyDeedComponent | null | undefined {
    this.decode("deed_component",
      this.encoded?.[71],
      j.DeedComponentSerde.deserialize);
    this.deedComponent = () => this.decoded.deed_component as c.ReadonlyDeedComponent | null | undefined;
    return this.deedComponent();
  }
  altersGroupPreviewComponent(): boolean {
    return (
      (this.encoded && this.encoded[72] !== undefined) ||
      this.decoded.group_preview_component !== undefined
    );
  }

  hasGroupPreviewComponent(): boolean {
    return (this.encoded && !!this.encoded[72]) || !!this.decoded.group_preview_component;
  }

  groupPreviewComponent(): c.ReadonlyGroupPreviewComponent | null | undefined {
    this.decode("group_preview_component",
      this.encoded?.[72],
      j.GroupPreviewComponentSerde.deserialize);
    this.groupPreviewComponent = () => this.decoded.group_preview_component as c.ReadonlyGroupPreviewComponent | null | undefined;
    return this.groupPreviewComponent();
  }
  altersBlueprintComponent(): boolean {
    return (
      (this.encoded && this.encoded[87] !== undefined) ||
      this.decoded.blueprint_component !== undefined
    );
  }

  hasBlueprintComponent(): boolean {
    return (this.encoded && !!this.encoded[87]) || !!this.decoded.blueprint_component;
  }

  blueprintComponent(): c.ReadonlyBlueprintComponent | null | undefined {
    this.decode("blueprint_component",
      this.encoded?.[87],
      j.BlueprintComponentSerde.deserialize);
    this.blueprintComponent = () => this.decoded.blueprint_component as c.ReadonlyBlueprintComponent | null | undefined;
    return this.blueprintComponent();
  }
  altersCraftingStationComponent(): boolean {
    return (
      (this.encoded && this.encoded[74] !== undefined) ||
      this.decoded.crafting_station_component !== undefined
    );
  }

  hasCraftingStationComponent(): boolean {
    return (this.encoded && !!this.encoded[74]) || !!this.decoded.crafting_station_component;
  }

  craftingStationComponent(): c.ReadonlyCraftingStationComponent | null | undefined {
    this.decode("crafting_station_component",
      this.encoded?.[74],
      j.CraftingStationComponentSerde.deserialize);
    this.craftingStationComponent = () => this.decoded.crafting_station_component as c.ReadonlyCraftingStationComponent | null | undefined;
    return this.craftingStationComponent();
  }
  altersHealth(): boolean {
    return (
      (this.encoded && this.encoded[75] !== undefined) ||
      this.decoded.health !== undefined
    );
  }

  hasHealth(): boolean {
    return (this.encoded && !!this.encoded[75]) || !!this.decoded.health;
  }

  health(): c.ReadonlyHealth | null | undefined {
    this.decode("health",
      this.encoded?.[75],
      j.HealthSerde.deserialize);
    this.health = () => this.decoded.health as c.ReadonlyHealth | null | undefined;
    return this.health();
  }
  altersBuffsComponent(): boolean {
    return (
      (this.encoded && this.encoded[101] !== undefined) ||
      this.decoded.buffs_component !== undefined
    );
  }

  hasBuffsComponent(): boolean {
    return (this.encoded && !!this.encoded[101]) || !!this.decoded.buffs_component;
  }

  buffsComponent(): c.ReadonlyBuffsComponent | null | undefined {
    this.decode("buffs_component",
      this.encoded?.[101],
      j.BuffsComponentSerde.deserialize);
    this.buffsComponent = () => this.decoded.buffs_component as c.ReadonlyBuffsComponent | null | undefined;
    return this.buffsComponent();
  }
  altersGremlin(): boolean {
    return (
      (this.encoded && this.encoded[77] !== undefined) ||
      this.decoded.gremlin !== undefined
    );
  }

  hasGremlin(): boolean {
    return (this.encoded && !!this.encoded[77]) || !!this.decoded.gremlin;
  }

  gremlin(): c.ReadonlyGremlin | null | undefined {
    this.decode("gremlin",
      this.encoded?.[77],
      j.GremlinSerde.deserialize);
    this.gremlin = () => this.decoded.gremlin as c.ReadonlyGremlin | null | undefined;
    return this.gremlin();
  }
  altersPlaceableComponent(): boolean {
    return (
      (this.encoded && this.encoded[78] !== undefined) ||
      this.decoded.placeable_component !== undefined
    );
  }

  hasPlaceableComponent(): boolean {
    return (this.encoded && !!this.encoded[78]) || !!this.decoded.placeable_component;
  }

  placeableComponent(): c.ReadonlyPlaceableComponent | null | undefined {
    this.decode("placeable_component",
      this.encoded?.[78],
      j.PlaceableComponentSerde.deserialize);
    this.placeableComponent = () => this.decoded.placeable_component as c.ReadonlyPlaceableComponent | null | undefined;
    return this.placeableComponent();
  }
  altersGroupedEntities(): boolean {
    return (
      (this.encoded && this.encoded[83] !== undefined) ||
      this.decoded.grouped_entities !== undefined
    );
  }

  hasGroupedEntities(): boolean {
    return (this.encoded && !!this.encoded[83]) || !!this.decoded.grouped_entities;
  }

  groupedEntities(): c.ReadonlyGroupedEntities | null | undefined {
    this.decode("grouped_entities",
      this.encoded?.[83],
      j.GroupedEntitiesSerde.deserialize);
    this.groupedEntities = () => this.decoded.grouped_entities as c.ReadonlyGroupedEntities | null | undefined;
    return this.groupedEntities();
  }
  altersInGroup(): boolean {
    return (
      (this.encoded && this.encoded[95] !== undefined) ||
      this.decoded.in_group !== undefined
    );
  }

  hasInGroup(): boolean {
    return (this.encoded && !!this.encoded[95]) || !!this.decoded.in_group;
  }

  inGroup(): c.ReadonlyInGroup | null | undefined {
    this.decode("in_group",
      this.encoded?.[95],
      j.InGroupSerde.deserialize);
    this.inGroup = () => this.decoded.in_group as c.ReadonlyInGroup | null | undefined;
    return this.inGroup();
  }
  altersPictureFrameContents(): boolean {
    return (
      (this.encoded && this.encoded[84] !== undefined) ||
      this.decoded.picture_frame_contents !== undefined
    );
  }

  hasPictureFrameContents(): boolean {
    return (this.encoded && !!this.encoded[84]) || !!this.decoded.picture_frame_contents;
  }

  pictureFrameContents(): c.ReadonlyPictureFrameContents | null | undefined {
    this.decode("picture_frame_contents",
      this.encoded?.[84],
      j.PictureFrameContentsSerde.deserialize);
    this.pictureFrameContents = () => this.decoded.picture_frame_contents as c.ReadonlyPictureFrameContents | null | undefined;
    return this.pictureFrameContents();
  }
  altersTriggerState(): boolean {
    return (
      (this.encoded && this.encoded[88] !== undefined) ||
      this.decoded.trigger_state !== undefined
    );
  }

  hasTriggerState(): boolean {
    return (this.encoded && !!this.encoded[88]) || !!this.decoded.trigger_state;
  }

  triggerState(): c.ReadonlyTriggerState | null | undefined {
    this.decode("trigger_state",
      this.encoded?.[88],
      j.TriggerStateSerde.deserialize);
    this.triggerState = () => this.decoded.trigger_state as c.ReadonlyTriggerState | null | undefined;
    return this.triggerState();
  }
  altersLifetimeStats(): boolean {
    return (
      (this.encoded && this.encoded[91] !== undefined) ||
      this.decoded.lifetime_stats !== undefined
    );
  }

  hasLifetimeStats(): boolean {
    return (this.encoded && !!this.encoded[91]) || !!this.decoded.lifetime_stats;
  }

  lifetimeStats(): c.ReadonlyLifetimeStats | null | undefined {
    this.decode("lifetime_stats",
      this.encoded?.[91],
      j.LifetimeStatsSerde.deserialize);
    this.lifetimeStats = () => this.decoded.lifetime_stats as c.ReadonlyLifetimeStats | null | undefined;
    return this.lifetimeStats();
  }
  altersOccupancyComponent(): boolean {
    return (
      (this.encoded && this.encoded[97] !== undefined) ||
      this.decoded.occupancy_component !== undefined
    );
  }

  hasOccupancyComponent(): boolean {
    return (this.encoded && !!this.encoded[97]) || !!this.decoded.occupancy_component;
  }

  occupancyComponent(): c.ReadonlyOccupancyComponent | null | undefined {
    this.decode("occupancy_component",
      this.encoded?.[97],
      j.OccupancyComponentSerde.deserialize);
    this.occupancyComponent = () => this.decoded.occupancy_component as c.ReadonlyOccupancyComponent | null | undefined;
    return this.occupancyComponent();
  }
  altersVideoComponent(): boolean {
    return (
      (this.encoded && this.encoded[92] !== undefined) ||
      this.decoded.video_component !== undefined
    );
  }

  hasVideoComponent(): boolean {
    return (this.encoded && !!this.encoded[92]) || !!this.decoded.video_component;
  }

  videoComponent(): c.ReadonlyVideoComponent | null | undefined {
    this.decode("video_component",
      this.encoded?.[92],
      j.VideoComponentSerde.deserialize);
    this.videoComponent = () => this.decoded.video_component as c.ReadonlyVideoComponent | null | undefined;
    return this.videoComponent();
  }
  altersPlayerSession(): boolean {
    return (
      (this.encoded && this.encoded[98] !== undefined) ||
      this.decoded.player_session !== undefined
    );
  }

  hasPlayerSession(): boolean {
    return (this.encoded && !!this.encoded[98]) || !!this.decoded.player_session;
  }

  playerSession(): c.ReadonlyPlayerSession | null | undefined {
    this.decode("player_session",
      this.encoded?.[98],
      j.PlayerSessionSerde.deserialize);
    this.playerSession = () => this.decoded.player_session as c.ReadonlyPlayerSession | null | undefined;
    return this.playerSession();
  }
  altersPresetApplied(): boolean {
    return (
      (this.encoded && this.encoded[99] !== undefined) ||
      this.decoded.preset_applied !== undefined
    );
  }

  hasPresetApplied(): boolean {
    return (this.encoded && !!this.encoded[99]) || !!this.decoded.preset_applied;
  }

  presetApplied(): c.ReadonlyPresetApplied | null | undefined {
    this.decode("preset_applied",
      this.encoded?.[99],
      j.PresetAppliedSerde.deserialize);
    this.presetApplied = () => this.decoded.preset_applied as c.ReadonlyPresetApplied | null | undefined;
    return this.presetApplied();
  }
  altersPresetPrototype(): boolean {
    return (
      (this.encoded && this.encoded[100] !== undefined) ||
      this.decoded.preset_prototype !== undefined
    );
  }

  hasPresetPrototype(): boolean {
    return (this.encoded && !!this.encoded[100]) || !!this.decoded.preset_prototype;
  }

  presetPrototype(): c.ReadonlyPresetPrototype | null | undefined {
    this.decode("preset_prototype",
      this.encoded?.[100],
      j.PresetPrototypeSerde.deserialize);
    this.presetPrototype = () => this.decoded.preset_prototype as c.ReadonlyPresetPrototype | null | undefined;
    return this.presetPrototype();
  }
  altersFarmingPlantComponent(): boolean {
    return (
      (this.encoded && this.encoded[102] !== undefined) ||
      this.decoded.farming_plant_component !== undefined
    );
  }

  hasFarmingPlantComponent(): boolean {
    return (this.encoded && !!this.encoded[102]) || !!this.decoded.farming_plant_component;
  }

  farmingPlantComponent(): c.ReadonlyFarmingPlantComponent | null | undefined {
    this.decode("farming_plant_component",
      this.encoded?.[102],
      j.FarmingPlantComponentSerde.deserialize);
    this.farmingPlantComponent = () => this.decoded.farming_plant_component as c.ReadonlyFarmingPlantComponent | null | undefined;
    return this.farmingPlantComponent();
  }
  altersShardFarming(): boolean {
    return (
      (this.encoded && this.encoded[103] !== undefined) ||
      this.decoded.shard_farming !== undefined
    );
  }

  hasShardFarming(): boolean {
    return (this.encoded && !!this.encoded[103]) || !!this.decoded.shard_farming;
  }

  shardFarming(): c.ReadonlyShardFarming | null | undefined {
    this.decode("shard_farming",
      this.encoded?.[103],
      j.ShardFarmingSerde.deserialize);
    this.shardFarming = () => this.decoded.shard_farming as c.ReadonlyShardFarming | null | undefined;
    return this.shardFarming();
  }
  altersCreatedBy(): boolean {
    return (
      (this.encoded && this.encoded[104] !== undefined) ||
      this.decoded.created_by !== undefined
    );
  }

  hasCreatedBy(): boolean {
    return (this.encoded && !!this.encoded[104]) || !!this.decoded.created_by;
  }

  createdBy(): c.ReadonlyCreatedBy | null | undefined {
    this.decode("created_by",
      this.encoded?.[104],
      j.CreatedBySerde.deserialize);
    this.createdBy = () => this.decoded.created_by as c.ReadonlyCreatedBy | null | undefined;
    return this.createdBy();
  }
  altersMinigameComponent(): boolean {
    return (
      (this.encoded && this.encoded[105] !== undefined) ||
      this.decoded.minigame_component !== undefined
    );
  }

  hasMinigameComponent(): boolean {
    return (this.encoded && !!this.encoded[105]) || !!this.decoded.minigame_component;
  }

  minigameComponent(): c.ReadonlyMinigameComponent | null | undefined {
    this.decode("minigame_component",
      this.encoded?.[105],
      j.MinigameComponentSerde.deserialize);
    this.minigameComponent = () => this.decoded.minigame_component as c.ReadonlyMinigameComponent | null | undefined;
    return this.minigameComponent();
  }
  altersMinigameInstance(): boolean {
    return (
      (this.encoded && this.encoded[106] !== undefined) ||
      this.decoded.minigame_instance !== undefined
    );
  }

  hasMinigameInstance(): boolean {
    return (this.encoded && !!this.encoded[106]) || !!this.decoded.minigame_instance;
  }

  minigameInstance(): c.ReadonlyMinigameInstance | null | undefined {
    this.decode("minigame_instance",
      this.encoded?.[106],
      j.MinigameInstanceSerde.deserialize);
    this.minigameInstance = () => this.decoded.minigame_instance as c.ReadonlyMinigameInstance | null | undefined;
    return this.minigameInstance();
  }
  altersPlayingMinigame(): boolean {
    return (
      (this.encoded && this.encoded[107] !== undefined) ||
      this.decoded.playing_minigame !== undefined
    );
  }

  hasPlayingMinigame(): boolean {
    return (this.encoded && !!this.encoded[107]) || !!this.decoded.playing_minigame;
  }

  playingMinigame(): c.ReadonlyPlayingMinigame | null | undefined {
    this.decode("playing_minigame",
      this.encoded?.[107],
      j.PlayingMinigameSerde.deserialize);
    this.playingMinigame = () => this.decoded.playing_minigame as c.ReadonlyPlayingMinigame | null | undefined;
    return this.playingMinigame();
  }
  altersMinigameElement(): boolean {
    return (
      (this.encoded && this.encoded[108] !== undefined) ||
      this.decoded.minigame_element !== undefined
    );
  }

  hasMinigameElement(): boolean {
    return (this.encoded && !!this.encoded[108]) || !!this.decoded.minigame_element;
  }

  minigameElement(): c.ReadonlyMinigameElement | null | undefined {
    this.decode("minigame_element",
      this.encoded?.[108],
      j.MinigameElementSerde.deserialize);
    this.minigameElement = () => this.decoded.minigame_element as c.ReadonlyMinigameElement | null | undefined;
    return this.minigameElement();
  }
  altersActiveTray(): boolean {
    return (
      (this.encoded && this.encoded[109] !== undefined) ||
      this.decoded.active_tray !== undefined
    );
  }

  hasActiveTray(): boolean {
    return (this.encoded && !!this.encoded[109]) || !!this.decoded.active_tray;
  }

  activeTray(): c.ReadonlyActiveTray | null | undefined {
    this.decode("active_tray",
      this.encoded?.[109],
      j.ActiveTraySerde.deserialize);
    this.activeTray = () => this.decoded.active_tray as c.ReadonlyActiveTray | null | undefined;
    return this.activeTray();
  }
  altersStashed(): boolean {
    return (
      (this.encoded && this.encoded[115] !== undefined) ||
      this.decoded.stashed !== undefined
    );
  }

  hasStashed(): boolean {
    return (this.encoded && !!this.encoded[115]) || !!this.decoded.stashed;
  }

  stashed(): c.ReadonlyStashed | null | undefined {
    this.decode("stashed",
      this.encoded?.[115],
      j.StashedSerde.deserialize);
    this.stashed = () => this.decoded.stashed as c.ReadonlyStashed | null | undefined;
    return this.stashed();
  }
  altersMinigameInstanceTickInfo(): boolean {
    return (
      (this.encoded && this.encoded[117] !== undefined) ||
      this.decoded.minigame_instance_tick_info !== undefined
    );
  }

  hasMinigameInstanceTickInfo(): boolean {
    return (this.encoded && !!this.encoded[117]) || !!this.decoded.minigame_instance_tick_info;
  }

  minigameInstanceTickInfo(): c.ReadonlyMinigameInstanceTickInfo | null | undefined {
    this.decode("minigame_instance_tick_info",
      this.encoded?.[117],
      j.MinigameInstanceTickInfoSerde.deserialize);
    this.minigameInstanceTickInfo = () => this.decoded.minigame_instance_tick_info as c.ReadonlyMinigameInstanceTickInfo | null | undefined;
    return this.minigameInstanceTickInfo();
  }
  altersWarpingTo(): boolean {
    return (
      (this.encoded && this.encoded[118] !== undefined) ||
      this.decoded.warping_to !== undefined
    );
  }

  hasWarpingTo(): boolean {
    return (this.encoded && !!this.encoded[118]) || !!this.decoded.warping_to;
  }

  warpingTo(): c.ReadonlyWarpingTo | null | undefined {
    this.decode("warping_to",
      this.encoded?.[118],
      j.WarpingToSerde.deserialize);
    this.warpingTo = () => this.decoded.warping_to as c.ReadonlyWarpingTo | null | undefined;
    return this.warpingTo();
  }
  altersMinigameInstanceExpire(): boolean {
    return (
      (this.encoded && this.encoded[119] !== undefined) ||
      this.decoded.minigame_instance_expire !== undefined
    );
  }

  hasMinigameInstanceExpire(): boolean {
    return (this.encoded && !!this.encoded[119]) || !!this.decoded.minigame_instance_expire;
  }

  minigameInstanceExpire(): c.ReadonlyMinigameInstanceExpire | null | undefined {
    this.decode("minigame_instance_expire",
      this.encoded?.[119],
      j.MinigameInstanceExpireSerde.deserialize);
    this.minigameInstanceExpire = () => this.decoded.minigame_instance_expire as c.ReadonlyMinigameInstanceExpire | null | undefined;
    return this.minigameInstanceExpire();
  }
  altersPlacerComponent(): boolean {
    return (
      (this.encoded && this.encoded[121] !== undefined) ||
      this.decoded.placer_component !== undefined
    );
  }

  hasPlacerComponent(): boolean {
    return (this.encoded && !!this.encoded[121]) || !!this.decoded.placer_component;
  }

  placerComponent(): c.ReadonlyPlacerComponent | null | undefined {
    this.decode("placer_component",
      this.encoded?.[121],
      j.PlacerComponentSerde.deserialize);
    this.placerComponent = () => this.decoded.placer_component as c.ReadonlyPlacerComponent | null | undefined;
    return this.placerComponent();
  }
  altersQuestGiver(): boolean {
    return (
      (this.encoded && this.encoded[122] !== undefined) ||
      this.decoded.quest_giver !== undefined
    );
  }

  hasQuestGiver(): boolean {
    return (this.encoded && !!this.encoded[122]) || !!this.decoded.quest_giver;
  }

  questGiver(): c.ReadonlyQuestGiver | null | undefined {
    this.decode("quest_giver",
      this.encoded?.[122],
      j.QuestGiverSerde.deserialize);
    this.questGiver = () => this.decoded.quest_giver as c.ReadonlyQuestGiver | null | undefined;
    return this.questGiver();
  }
  altersDefaultDialog(): boolean {
    return (
      (this.encoded && this.encoded[123] !== undefined) ||
      this.decoded.default_dialog !== undefined
    );
  }

  hasDefaultDialog(): boolean {
    return (this.encoded && !!this.encoded[123]) || !!this.decoded.default_dialog;
  }

  defaultDialog(): c.ReadonlyDefaultDialog | null | undefined {
    this.decode("default_dialog",
      this.encoded?.[123],
      j.DefaultDialogSerde.deserialize);
    this.defaultDialog = () => this.decoded.default_dialog as c.ReadonlyDefaultDialog | null | undefined;
    return this.defaultDialog();
  }
  altersUnmuck(): boolean {
    return (
      (this.encoded && this.encoded[125] !== undefined) ||
      this.decoded.unmuck !== undefined
    );
  }

  hasUnmuck(): boolean {
    return (this.encoded && !!this.encoded[125]) || !!this.decoded.unmuck;
  }

  unmuck(): c.ReadonlyUnmuck | null | undefined {
    this.decode("unmuck",
      this.encoded?.[125],
      j.UnmuckSerde.deserialize);
    this.unmuck = () => this.decoded.unmuck as c.ReadonlyUnmuck | null | undefined;
    return this.unmuck();
  }
  altersRobotComponent(): boolean {
    return (
      (this.encoded && this.encoded[126] !== undefined) ||
      this.decoded.robot_component !== undefined
    );
  }

  hasRobotComponent(): boolean {
    return (this.encoded && !!this.encoded[126]) || !!this.decoded.robot_component;
  }

  robotComponent(): c.ReadonlyRobotComponent | null | undefined {
    this.decode("robot_component",
      this.encoded?.[126],
      j.RobotComponentSerde.deserialize);
    this.robotComponent = () => this.decoded.robot_component as c.ReadonlyRobotComponent | null | undefined;
    return this.robotComponent();
  }
  altersAdminEntity(): boolean {
    return (
      (this.encoded && this.encoded[140] !== undefined) ||
      this.decoded.admin_entity !== undefined
    );
  }

  hasAdminEntity(): boolean {
    return (this.encoded && !!this.encoded[140]) || !!this.decoded.admin_entity;
  }

  adminEntity(): c.ReadonlyAdminEntity | null | undefined {
    this.decode("admin_entity",
      this.encoded?.[140],
      j.AdminEntitySerde.deserialize);
    this.adminEntity = () => this.decoded.admin_entity as c.ReadonlyAdminEntity | null | undefined;
    return this.adminEntity();
  }
  altersProtection(): boolean {
    return (
      (this.encoded && this.encoded[127] !== undefined) ||
      this.decoded.protection !== undefined
    );
  }

  hasProtection(): boolean {
    return (this.encoded && !!this.encoded[127]) || !!this.decoded.protection;
  }

  protection(): c.ReadonlyProtection | null | undefined {
    this.decode("protection",
      this.encoded?.[127],
      j.ProtectionSerde.deserialize);
    this.protection = () => this.decoded.protection as c.ReadonlyProtection | null | undefined;
    return this.protection();
  }
  altersProjectsProtection(): boolean {
    return (
      (this.encoded && this.encoded[128] !== undefined) ||
      this.decoded.projects_protection !== undefined
    );
  }

  hasProjectsProtection(): boolean {
    return (this.encoded && !!this.encoded[128]) || !!this.decoded.projects_protection;
  }

  projectsProtection(): c.ReadonlyProjectsProtection | null | undefined {
    this.decode("projects_protection",
      this.encoded?.[128],
      j.ProjectsProtectionSerde.deserialize);
    this.projectsProtection = () => this.decoded.projects_protection as c.ReadonlyProjectsProtection | null | undefined;
    return this.projectsProtection();
  }
  altersDeletesWith(): boolean {
    return (
      (this.encoded && this.encoded[129] !== undefined) ||
      this.decoded.deletes_with !== undefined
    );
  }

  hasDeletesWith(): boolean {
    return (this.encoded && !!this.encoded[129]) || !!this.decoded.deletes_with;
  }

  deletesWith(): c.ReadonlyDeletesWith | null | undefined {
    this.decode("deletes_with",
      this.encoded?.[129],
      j.DeletesWithSerde.deserialize);
    this.deletesWith = () => this.decoded.deletes_with as c.ReadonlyDeletesWith | null | undefined;
    return this.deletesWith();
  }
  altersItemBuyer(): boolean {
    return (
      (this.encoded && this.encoded[130] !== undefined) ||
      this.decoded.item_buyer !== undefined
    );
  }

  hasItemBuyer(): boolean {
    return (this.encoded && !!this.encoded[130]) || !!this.decoded.item_buyer;
  }

  itemBuyer(): c.ReadonlyItemBuyer | null | undefined {
    this.decode("item_buyer",
      this.encoded?.[130],
      j.ItemBuyerSerde.deserialize);
    this.itemBuyer = () => this.decoded.item_buyer as c.ReadonlyItemBuyer | null | undefined;
    return this.itemBuyer();
  }
  altersInspectionTweaks(): boolean {
    return (
      (this.encoded && this.encoded[131] !== undefined) ||
      this.decoded.inspection_tweaks !== undefined
    );
  }

  hasInspectionTweaks(): boolean {
    return (this.encoded && !!this.encoded[131]) || !!this.decoded.inspection_tweaks;
  }

  inspectionTweaks(): c.ReadonlyInspectionTweaks | null | undefined {
    this.decode("inspection_tweaks",
      this.encoded?.[131],
      j.InspectionTweaksSerde.deserialize);
    this.inspectionTweaks = () => this.decoded.inspection_tweaks as c.ReadonlyInspectionTweaks | null | undefined;
    return this.inspectionTweaks();
  }
  altersProfilePic(): boolean {
    return (
      (this.encoded && this.encoded[132] !== undefined) ||
      this.decoded.profile_pic !== undefined
    );
  }

  hasProfilePic(): boolean {
    return (this.encoded && !!this.encoded[132]) || !!this.decoded.profile_pic;
  }

  profilePic(): c.ReadonlyProfilePic | null | undefined {
    this.decode("profile_pic",
      this.encoded?.[132],
      j.ProfilePicSerde.deserialize);
    this.profilePic = () => this.decoded.profile_pic as c.ReadonlyProfilePic | null | undefined;
    return this.profilePic();
  }
  altersEntityDescription(): boolean {
    return (
      (this.encoded && this.encoded[133] !== undefined) ||
      this.decoded.entity_description !== undefined
    );
  }

  hasEntityDescription(): boolean {
    return (this.encoded && !!this.encoded[133]) || !!this.decoded.entity_description;
  }

  entityDescription(): c.ReadonlyEntityDescription | null | undefined {
    this.decode("entity_description",
      this.encoded?.[133],
      j.EntityDescriptionSerde.deserialize);
    this.entityDescription = () => this.decoded.entity_description as c.ReadonlyEntityDescription | null | undefined;
    return this.entityDescription();
  }
  altersLandmark(): boolean {
    return (
      (this.encoded && this.encoded[134] !== undefined) ||
      this.decoded.landmark !== undefined
    );
  }

  hasLandmark(): boolean {
    return (this.encoded && !!this.encoded[134]) || !!this.decoded.landmark;
  }

  landmark(): c.ReadonlyLandmark | null | undefined {
    this.decode("landmark",
      this.encoded?.[134],
      j.LandmarkSerde.deserialize);
    this.landmark = () => this.decoded.landmark as c.ReadonlyLandmark | null | undefined;
    return this.landmark();
  }
  altersCollideable(): boolean {
    return (
      (this.encoded && this.encoded[135] !== undefined) ||
      this.decoded.collideable !== undefined
    );
  }

  hasCollideable(): boolean {
    return (this.encoded && !!this.encoded[135]) || !!this.decoded.collideable;
  }

  collideable(): c.ReadonlyCollideable | null | undefined {
    this.decode("collideable",
      this.encoded?.[135],
      j.CollideableSerde.deserialize);
    this.collideable = () => this.decoded.collideable as c.ReadonlyCollideable | null | undefined;
    return this.collideable();
  }
  altersRestoration(): boolean {
    return (
      (this.encoded && this.encoded[136] !== undefined) ||
      this.decoded.restoration !== undefined
    );
  }

  hasRestoration(): boolean {
    return (this.encoded && !!this.encoded[136]) || !!this.decoded.restoration;
  }

  restoration(): c.ReadonlyRestoration | null | undefined {
    this.decode("restoration",
      this.encoded?.[136],
      j.RestorationSerde.deserialize);
    this.restoration = () => this.decoded.restoration as c.ReadonlyRestoration | null | undefined;
    return this.restoration();
  }
  altersTerrainRestorationDiff(): boolean {
    return (
      (this.encoded && this.encoded[137] !== undefined) ||
      this.decoded.terrain_restoration_diff !== undefined
    );
  }

  hasTerrainRestorationDiff(): boolean {
    return (this.encoded && !!this.encoded[137]) || !!this.decoded.terrain_restoration_diff;
  }

  terrainRestorationDiff(): c.ReadonlyTerrainRestorationDiff | null | undefined {
    this.decode("terrain_restoration_diff",
      this.encoded?.[137],
      j.TerrainRestorationDiffSerde.deserialize);
    this.terrainRestorationDiff = () => this.decoded.terrain_restoration_diff as c.ReadonlyTerrainRestorationDiff | null | undefined;
    return this.terrainRestorationDiff();
  }
  altersTeam(): boolean {
    return (
      (this.encoded && this.encoded[138] !== undefined) ||
      this.decoded.team !== undefined
    );
  }

  hasTeam(): boolean {
    return (this.encoded && !!this.encoded[138]) || !!this.decoded.team;
  }

  team(): c.ReadonlyTeam | null | undefined {
    this.decode("team",
      this.encoded?.[138],
      j.TeamSerde.deserialize);
    this.team = () => this.decoded.team as c.ReadonlyTeam | null | undefined;
    return this.team();
  }
  altersPlayerCurrentTeam(): boolean {
    return (
      (this.encoded && this.encoded[139] !== undefined) ||
      this.decoded.player_current_team !== undefined
    );
  }

  hasPlayerCurrentTeam(): boolean {
    return (this.encoded && !!this.encoded[139]) || !!this.decoded.player_current_team;
  }

  playerCurrentTeam(): c.ReadonlyPlayerCurrentTeam | null | undefined {
    this.decode("player_current_team",
      this.encoded?.[139],
      j.PlayerCurrentTeamSerde.deserialize);
    this.playerCurrentTeam = () => this.decoded.player_current_team as c.ReadonlyPlayerCurrentTeam | null | undefined;
    return this.playerCurrentTeam();
  }
  altersUserRoles(): boolean {
    return (
      (this.encoded && this.encoded[141] !== undefined) ||
      this.decoded.user_roles !== undefined
    );
  }

  hasUserRoles(): boolean {
    return (this.encoded && !!this.encoded[141]) || !!this.decoded.user_roles;
  }

  userRoles(): c.ReadonlyUserRoles | null | undefined {
    this.decode("user_roles",
      this.encoded?.[141],
      j.UserRolesSerde.deserialize);
    this.userRoles = () => this.decoded.user_roles as c.ReadonlyUserRoles | null | undefined;
    return this.userRoles();
  }
  altersRestoresTo(): boolean {
    return (
      (this.encoded && this.encoded[142] !== undefined) ||
      this.decoded.restores_to !== undefined
    );
  }

  hasRestoresTo(): boolean {
    return (this.encoded && !!this.encoded[142]) || !!this.decoded.restores_to;
  }

  restoresTo(): c.ReadonlyRestoresTo | null | undefined {
    this.decode("restores_to",
      this.encoded?.[142],
      j.RestoresToSerde.deserialize);
    this.restoresTo = () => this.decoded.restores_to as c.ReadonlyRestoresTo | null | undefined;
    return this.restoresTo();
  }
  altersTrade(): boolean {
    return (
      (this.encoded && this.encoded[143] !== undefined) ||
      this.decoded.trade !== undefined
    );
  }

  hasTrade(): boolean {
    return (this.encoded && !!this.encoded[143]) || !!this.decoded.trade;
  }

  trade(): c.ReadonlyTrade | null | undefined {
    this.decode("trade",
      this.encoded?.[143],
      j.TradeSerde.deserialize);
    this.trade = () => this.decoded.trade as c.ReadonlyTrade | null | undefined;
    return this.trade();
  }
  altersActiveTrades(): boolean {
    return (
      (this.encoded && this.encoded[144] !== undefined) ||
      this.decoded.active_trades !== undefined
    );
  }

  hasActiveTrades(): boolean {
    return (this.encoded && !!this.encoded[144]) || !!this.decoded.active_trades;
  }

  activeTrades(): c.ReadonlyActiveTrades | null | undefined {
    this.decode("active_trades",
      this.encoded?.[144],
      j.ActiveTradesSerde.deserialize);
    this.activeTrades = () => this.decoded.active_trades as c.ReadonlyActiveTrades | null | undefined;
    return this.activeTrades();
  }
  altersPlacedBy(): boolean {
    return (
      (this.encoded && this.encoded[145] !== undefined) ||
      this.decoded.placed_by !== undefined
    );
  }

  hasPlacedBy(): boolean {
    return (this.encoded && !!this.encoded[145]) || !!this.decoded.placed_by;
  }

  placedBy(): c.ReadonlyPlacedBy | null | undefined {
    this.decode("placed_by",
      this.encoded?.[145],
      j.PlacedBySerde.deserialize);
    this.placedBy = () => this.decoded.placed_by as c.ReadonlyPlacedBy | null | undefined;
    return this.placedBy();
  }
  altersTextSign(): boolean {
    return (
      (this.encoded && this.encoded[146] !== undefined) ||
      this.decoded.text_sign !== undefined
    );
  }

  hasTextSign(): boolean {
    return (this.encoded && !!this.encoded[146]) || !!this.decoded.text_sign;
  }

  textSign(): c.ReadonlyTextSign | null | undefined {
    this.decode("text_sign",
      this.encoded?.[146],
      j.TextSignSerde.deserialize);
    this.textSign = () => this.decoded.text_sign as c.ReadonlyTextSign | null | undefined;
    return this.textSign();
  }
  altersIrradiance(): boolean {
    return (
      (this.encoded && this.encoded[147] !== undefined) ||
      this.decoded.irradiance !== undefined
    );
  }

  hasIrradiance(): boolean {
    return (this.encoded && !!this.encoded[147]) || !!this.decoded.irradiance;
  }

  irradiance(): c.ReadonlyIrradiance | null | undefined {
    this.decode("irradiance",
      this.encoded?.[147],
      j.IrradianceSerde.deserialize);
    this.irradiance = () => this.decoded.irradiance as c.ReadonlyIrradiance | null | undefined;
    return this.irradiance();
  }
  altersLockedInPlace(): boolean {
    return (
      (this.encoded && this.encoded[148] !== undefined) ||
      this.decoded.locked_in_place !== undefined
    );
  }

  hasLockedInPlace(): boolean {
    return (this.encoded && !!this.encoded[148]) || !!this.decoded.locked_in_place;
  }

  lockedInPlace(): c.ReadonlyLockedInPlace | null | undefined {
    this.decode("locked_in_place",
      this.encoded?.[148],
      j.LockedInPlaceSerde.deserialize);
    this.lockedInPlace = () => this.decoded.locked_in_place as c.ReadonlyLockedInPlace | null | undefined;
    return this.lockedInPlace();
  }
  altersDeathInfo(): boolean {
    return (
      (this.encoded && this.encoded[149] !== undefined) ||
      this.decoded.death_info !== undefined
    );
  }

  hasDeathInfo(): boolean {
    return (this.encoded && !!this.encoded[149]) || !!this.decoded.death_info;
  }

  deathInfo(): c.ReadonlyDeathInfo | null | undefined {
    this.decode("death_info",
      this.encoded?.[149],
      j.DeathInfoSerde.deserialize);
    this.deathInfo = () => this.decoded.death_info as c.ReadonlyDeathInfo | null | undefined;
    return this.deathInfo();
  }
  altersSyntheticStats(): boolean {
    return (
      (this.encoded && this.encoded[150] !== undefined) ||
      this.decoded.synthetic_stats !== undefined
    );
  }

  hasSyntheticStats(): boolean {
    return (this.encoded && !!this.encoded[150]) || !!this.decoded.synthetic_stats;
  }

  syntheticStats(): c.ReadonlySyntheticStats | null | undefined {
    this.decode("synthetic_stats",
      this.encoded?.[150],
      j.SyntheticStatsSerde.deserialize);
    this.syntheticStats = () => this.decoded.synthetic_stats as c.ReadonlySyntheticStats | null | undefined;
    return this.syntheticStats();
  }
  altersIdle(): boolean {
    return (
      (this.encoded && this.encoded[151] !== undefined) ||
      this.decoded.idle !== undefined
    );
  }

  hasIdle(): boolean {
    return (this.encoded && !!this.encoded[151]) || !!this.decoded.idle;
  }

  idle(): c.ReadonlyIdle | null | undefined {
    this.decode("idle",
      this.encoded?.[151],
      j.IdleSerde.deserialize);
    this.idle = () => this.decoded.idle as c.ReadonlyIdle | null | undefined;
    return this.idle();
  }
  altersVoice(): boolean {
    return (
      (this.encoded && this.encoded[152] !== undefined) ||
      this.decoded.voice !== undefined
    );
  }

  hasVoice(): boolean {
    return (this.encoded && !!this.encoded[152]) || !!this.decoded.voice;
  }

  voice(): c.ReadonlyVoice | null | undefined {
    this.decode("voice",
      this.encoded?.[152],
      j.VoiceSerde.deserialize);
    this.voice = () => this.decoded.voice as c.ReadonlyVoice | null | undefined;
    return this.voice();
  }
  altersGiftGiver(): boolean {
    return (
      (this.encoded && this.encoded[153] !== undefined) ||
      this.decoded.gift_giver !== undefined
    );
  }

  hasGiftGiver(): boolean {
    return (this.encoded && !!this.encoded[153]) || !!this.decoded.gift_giver;
  }

  giftGiver(): c.ReadonlyGiftGiver | null | undefined {
    this.decode("gift_giver",
      this.encoded?.[153],
      j.GiftGiverSerde.deserialize);
    this.giftGiver = () => this.decoded.gift_giver as c.ReadonlyGiftGiver | null | undefined;
    return this.giftGiver();
  }
}

export class LazyEntityDelta extends BaseLazyEntityDelta<LazyEntityDelta, LazyEntityDelta> {
  static forEncoded(id: BiomesId, encoded: Record<string, LazyComponentData>): LazyEntityDelta {
    return new LazyEntityDelta(id, encoded, { id });
  }

  static forDecoded(decoded: AsDelta<ReadonlyEntity>): LazyEntityDelta {
    return new LazyEntityDelta(decoded.id, undefined, decoded as AsDelta<Entity>);
  }

  protected make(
    id: BiomesId,
    encoded: Record<string, LazyComponentData> | undefined,
    decoded: AsDelta<Entity>
  ) {
    return new LazyEntityDelta(id, encoded, decoded);
  }
}

export class LazyEntity extends BaseLazyEntityDelta<SuperLazyEntity, LazyEntity> {
  static forEncoded(id: BiomesId, encoded: Record<string, LazyComponentData>): LazyEntity {
    return new LazyEntity(id, encoded, { id });
  }

  static forDecoded(decoded: ReadonlyEntity): LazyEntity {
    return new LazyEntity(decoded.id, undefined, decoded as AsDelta<Entity>);
  }

  static empty(id: BiomesId): LazyEntity {
    return new LazyEntity(id, undefined, { id });
  }

  protected make(
    id: BiomesId,
    encoded: Record<string, LazyComponentData> | undefined,
    decoded: AsDelta<Entity>
  ) {
    return new LazyEntity(id, encoded, decoded);
  }

  protected decode<T>(
    component: Exclude<keyof Entity, "id">,
    encoded: LazyComponentData,
    componentFn: (decoded: unknown) => T
  ): void {
    super.decode(component, encoded, componentFn);
    this.decoded[component] ??= undefined;
  }

  materialize(): ReadonlyEntity {
    super.materialize();
    removeNilishInPlace(this.decoded);
    return this.decoded as ReadonlyEntity;
  }

  merge(other: LazyEntityLike<unknown, unknown>) {
    const result = super.merge(other);
    removeNilishInPlace(result.decoded);
    return result;
  }

  edit(): PatchableLazyEntity {
    return new PatchableLazyEntity(this);
  }

  hasIced(): this is LazyEntityWith<"iced"> {
    return super.hasIced();
  }

  iced(): c.ReadonlyIced | undefined {
    return super.iced() as c.ReadonlyIced | undefined;
  }
  hasRemoteConnection(): this is LazyEntityWith<"remote_connection"> {
    return super.hasRemoteConnection();
  }

  remoteConnection(): c.ReadonlyRemoteConnection | undefined {
    return super.remoteConnection() as c.ReadonlyRemoteConnection | undefined;
  }
  hasPosition(): this is LazyEntityWith<"position"> {
    return super.hasPosition();
  }

  position(): c.ReadonlyPosition | undefined {
    return super.position() as c.ReadonlyPosition | undefined;
  }
  hasOrientation(): this is LazyEntityWith<"orientation"> {
    return super.hasOrientation();
  }

  orientation(): c.ReadonlyOrientation | undefined {
    return super.orientation() as c.ReadonlyOrientation | undefined;
  }
  hasRigidBody(): this is LazyEntityWith<"rigid_body"> {
    return super.hasRigidBody();
  }

  rigidBody(): c.ReadonlyRigidBody | undefined {
    return super.rigidBody() as c.ReadonlyRigidBody | undefined;
  }
  hasSize(): this is LazyEntityWith<"size"> {
    return super.hasSize();
  }

  size(): c.ReadonlySize | undefined {
    return super.size() as c.ReadonlySize | undefined;
  }
  hasBox(): this is LazyEntityWith<"box"> {
    return super.hasBox();
  }

  box(): c.ReadonlyBox | undefined {
    return super.box() as c.ReadonlyBox | undefined;
  }
  hasShardSeed(): this is LazyEntityWith<"shard_seed"> {
    return super.hasShardSeed();
  }

  shardSeed(): c.ReadonlyShardSeed | undefined {
    return super.shardSeed() as c.ReadonlyShardSeed | undefined;
  }
  hasShardDiff(): this is LazyEntityWith<"shard_diff"> {
    return super.hasShardDiff();
  }

  shardDiff(): c.ReadonlyShardDiff | undefined {
    return super.shardDiff() as c.ReadonlyShardDiff | undefined;
  }
  hasShardShapes(): this is LazyEntityWith<"shard_shapes"> {
    return super.hasShardShapes();
  }

  shardShapes(): c.ReadonlyShardShapes | undefined {
    return super.shardShapes() as c.ReadonlyShardShapes | undefined;
  }
  hasShardSkyOcclusion(): this is LazyEntityWith<"shard_sky_occlusion"> {
    return super.hasShardSkyOcclusion();
  }

  shardSkyOcclusion(): c.ReadonlyShardSkyOcclusion | undefined {
    return super.shardSkyOcclusion() as c.ReadonlyShardSkyOcclusion | undefined;
  }
  hasShardIrradiance(): this is LazyEntityWith<"shard_irradiance"> {
    return super.hasShardIrradiance();
  }

  shardIrradiance(): c.ReadonlyShardIrradiance | undefined {
    return super.shardIrradiance() as c.ReadonlyShardIrradiance | undefined;
  }
  hasShardWater(): this is LazyEntityWith<"shard_water"> {
    return super.hasShardWater();
  }

  shardWater(): c.ReadonlyShardWater | undefined {
    return super.shardWater() as c.ReadonlyShardWater | undefined;
  }
  hasShardOccupancy(): this is LazyEntityWith<"shard_occupancy"> {
    return super.hasShardOccupancy();
  }

  shardOccupancy(): c.ReadonlyShardOccupancy | undefined {
    return super.shardOccupancy() as c.ReadonlyShardOccupancy | undefined;
  }
  hasShardDye(): this is LazyEntityWith<"shard_dye"> {
    return super.hasShardDye();
  }

  shardDye(): c.ReadonlyShardDye | undefined {
    return super.shardDye() as c.ReadonlyShardDye | undefined;
  }
  hasShardMoisture(): this is LazyEntityWith<"shard_moisture"> {
    return super.hasShardMoisture();
  }

  shardMoisture(): c.ReadonlyShardMoisture | undefined {
    return super.shardMoisture() as c.ReadonlyShardMoisture | undefined;
  }
  hasShardGrowth(): this is LazyEntityWith<"shard_growth"> {
    return super.hasShardGrowth();
  }

  shardGrowth(): c.ReadonlyShardGrowth | undefined {
    return super.shardGrowth() as c.ReadonlyShardGrowth | undefined;
  }
  hasShardPlacer(): this is LazyEntityWith<"shard_placer"> {
    return super.hasShardPlacer();
  }

  shardPlacer(): c.ReadonlyShardPlacer | undefined {
    return super.shardPlacer() as c.ReadonlyShardPlacer | undefined;
  }
  hasShardMuck(): this is LazyEntityWith<"shard_muck"> {
    return super.hasShardMuck();
  }

  shardMuck(): c.ReadonlyShardMuck | undefined {
    return super.shardMuck() as c.ReadonlyShardMuck | undefined;
  }
  hasLabel(): this is LazyEntityWith<"label"> {
    return super.hasLabel();
  }

  label(): c.ReadonlyLabel | undefined {
    return super.label() as c.ReadonlyLabel | undefined;
  }
  hasGrabBag(): this is LazyEntityWith<"grab_bag"> {
    return super.hasGrabBag();
  }

  grabBag(): c.ReadonlyGrabBag | undefined {
    return super.grabBag() as c.ReadonlyGrabBag | undefined;
  }
  hasAcquisition(): this is LazyEntityWith<"acquisition"> {
    return super.hasAcquisition();
  }

  acquisition(): c.ReadonlyAcquisition | undefined {
    return super.acquisition() as c.ReadonlyAcquisition | undefined;
  }
  hasLooseItem(): this is LazyEntityWith<"loose_item"> {
    return super.hasLooseItem();
  }

  looseItem(): c.ReadonlyLooseItem | undefined {
    return super.looseItem() as c.ReadonlyLooseItem | undefined;
  }
  hasInventory(): this is LazyEntityWith<"inventory"> {
    return super.hasInventory();
  }

  inventory(): c.ReadonlyInventory | undefined {
    return super.inventory() as c.ReadonlyInventory | undefined;
  }
  hasContainerInventory(): this is LazyEntityWith<"container_inventory"> {
    return super.hasContainerInventory();
  }

  containerInventory(): c.ReadonlyContainerInventory | undefined {
    return super.containerInventory() as c.ReadonlyContainerInventory | undefined;
  }
  hasPricedContainerInventory(): this is LazyEntityWith<"priced_container_inventory"> {
    return super.hasPricedContainerInventory();
  }

  pricedContainerInventory(): c.ReadonlyPricedContainerInventory | undefined {
    return super.pricedContainerInventory() as c.ReadonlyPricedContainerInventory | undefined;
  }
  hasSelectedItem(): this is LazyEntityWith<"selected_item"> {
    return super.hasSelectedItem();
  }

  selectedItem(): c.ReadonlySelectedItem | undefined {
    return super.selectedItem() as c.ReadonlySelectedItem | undefined;
  }
  hasWearing(): this is LazyEntityWith<"wearing"> {
    return super.hasWearing();
  }

  wearing(): c.ReadonlyWearing | undefined {
    return super.wearing() as c.ReadonlyWearing | undefined;
  }
  hasEmote(): this is LazyEntityWith<"emote"> {
    return super.hasEmote();
  }

  emote(): c.ReadonlyEmote | undefined {
    return super.emote() as c.ReadonlyEmote | undefined;
  }
  hasAppearanceComponent(): this is LazyEntityWith<"appearance_component"> {
    return super.hasAppearanceComponent();
  }

  appearanceComponent(): c.ReadonlyAppearanceComponent | undefined {
    return super.appearanceComponent() as c.ReadonlyAppearanceComponent | undefined;
  }
  hasGroupComponent(): this is LazyEntityWith<"group_component"> {
    return super.hasGroupComponent();
  }

  groupComponent(): c.ReadonlyGroupComponent | undefined {
    return super.groupComponent() as c.ReadonlyGroupComponent | undefined;
  }
  hasChallenges(): this is LazyEntityWith<"challenges"> {
    return super.hasChallenges();
  }

  challenges(): c.ReadonlyChallenges | undefined {
    return super.challenges() as c.ReadonlyChallenges | undefined;
  }
  hasRecipeBook(): this is LazyEntityWith<"recipe_book"> {
    return super.hasRecipeBook();
  }

  recipeBook(): c.ReadonlyRecipeBook | undefined {
    return super.recipeBook() as c.ReadonlyRecipeBook | undefined;
  }
  hasExpires(): this is LazyEntityWith<"expires"> {
    return super.hasExpires();
  }

  expires(): c.ReadonlyExpires | undefined {
    return super.expires() as c.ReadonlyExpires | undefined;
  }
  hasIcing(): this is LazyEntityWith<"icing"> {
    return super.hasIcing();
  }

  icing(): c.ReadonlyIcing | undefined {
    return super.icing() as c.ReadonlyIcing | undefined;
  }
  hasWarpable(): this is LazyEntityWith<"warpable"> {
    return super.hasWarpable();
  }

  warpable(): c.ReadonlyWarpable | undefined {
    return super.warpable() as c.ReadonlyWarpable | undefined;
  }
  hasPlayerStatus(): this is LazyEntityWith<"player_status"> {
    return super.hasPlayerStatus();
  }

  playerStatus(): c.ReadonlyPlayerStatus | undefined {
    return super.playerStatus() as c.ReadonlyPlayerStatus | undefined;
  }
  hasPlayerBehavior(): this is LazyEntityWith<"player_behavior"> {
    return super.hasPlayerBehavior();
  }

  playerBehavior(): c.ReadonlyPlayerBehavior | undefined {
    return super.playerBehavior() as c.ReadonlyPlayerBehavior | undefined;
  }
  hasWorldMetadata(): this is LazyEntityWith<"world_metadata"> {
    return super.hasWorldMetadata();
  }

  worldMetadata(): c.ReadonlyWorldMetadata | undefined {
    return super.worldMetadata() as c.ReadonlyWorldMetadata | undefined;
  }
  hasNpcMetadata(): this is LazyEntityWith<"npc_metadata"> {
    return super.hasNpcMetadata();
  }

  npcMetadata(): c.ReadonlyNpcMetadata | undefined {
    return super.npcMetadata() as c.ReadonlyNpcMetadata | undefined;
  }
  hasNpcState(): this is LazyEntityWith<"npc_state"> {
    return super.hasNpcState();
  }

  npcState(): c.ReadonlyNpcState | undefined {
    return super.npcState() as c.ReadonlyNpcState | undefined;
  }
  hasGroupPreviewReference(): this is LazyEntityWith<"group_preview_reference"> {
    return super.hasGroupPreviewReference();
  }

  groupPreviewReference(): c.ReadonlyGroupPreviewReference | undefined {
    return super.groupPreviewReference() as c.ReadonlyGroupPreviewReference | undefined;
  }
  hasAclComponent(): this is LazyEntityWith<"acl_component"> {
    return super.hasAclComponent();
  }

  aclComponent(): c.ReadonlyAclComponent | undefined {
    return super.aclComponent() as c.ReadonlyAclComponent | undefined;
  }
  hasDeedComponent(): this is LazyEntityWith<"deed_component"> {
    return super.hasDeedComponent();
  }

  deedComponent(): c.ReadonlyDeedComponent | undefined {
    return super.deedComponent() as c.ReadonlyDeedComponent | undefined;
  }
  hasGroupPreviewComponent(): this is LazyEntityWith<"group_preview_component"> {
    return super.hasGroupPreviewComponent();
  }

  groupPreviewComponent(): c.ReadonlyGroupPreviewComponent | undefined {
    return super.groupPreviewComponent() as c.ReadonlyGroupPreviewComponent | undefined;
  }
  hasBlueprintComponent(): this is LazyEntityWith<"blueprint_component"> {
    return super.hasBlueprintComponent();
  }

  blueprintComponent(): c.ReadonlyBlueprintComponent | undefined {
    return super.blueprintComponent() as c.ReadonlyBlueprintComponent | undefined;
  }
  hasCraftingStationComponent(): this is LazyEntityWith<"crafting_station_component"> {
    return super.hasCraftingStationComponent();
  }

  craftingStationComponent(): c.ReadonlyCraftingStationComponent | undefined {
    return super.craftingStationComponent() as c.ReadonlyCraftingStationComponent | undefined;
  }
  hasHealth(): this is LazyEntityWith<"health"> {
    return super.hasHealth();
  }

  health(): c.ReadonlyHealth | undefined {
    return super.health() as c.ReadonlyHealth | undefined;
  }
  hasBuffsComponent(): this is LazyEntityWith<"buffs_component"> {
    return super.hasBuffsComponent();
  }

  buffsComponent(): c.ReadonlyBuffsComponent | undefined {
    return super.buffsComponent() as c.ReadonlyBuffsComponent | undefined;
  }
  hasGremlin(): this is LazyEntityWith<"gremlin"> {
    return super.hasGremlin();
  }

  gremlin(): c.ReadonlyGremlin | undefined {
    return super.gremlin() as c.ReadonlyGremlin | undefined;
  }
  hasPlaceableComponent(): this is LazyEntityWith<"placeable_component"> {
    return super.hasPlaceableComponent();
  }

  placeableComponent(): c.ReadonlyPlaceableComponent | undefined {
    return super.placeableComponent() as c.ReadonlyPlaceableComponent | undefined;
  }
  hasGroupedEntities(): this is LazyEntityWith<"grouped_entities"> {
    return super.hasGroupedEntities();
  }

  groupedEntities(): c.ReadonlyGroupedEntities | undefined {
    return super.groupedEntities() as c.ReadonlyGroupedEntities | undefined;
  }
  hasInGroup(): this is LazyEntityWith<"in_group"> {
    return super.hasInGroup();
  }

  inGroup(): c.ReadonlyInGroup | undefined {
    return super.inGroup() as c.ReadonlyInGroup | undefined;
  }
  hasPictureFrameContents(): this is LazyEntityWith<"picture_frame_contents"> {
    return super.hasPictureFrameContents();
  }

  pictureFrameContents(): c.ReadonlyPictureFrameContents | undefined {
    return super.pictureFrameContents() as c.ReadonlyPictureFrameContents | undefined;
  }
  hasTriggerState(): this is LazyEntityWith<"trigger_state"> {
    return super.hasTriggerState();
  }

  triggerState(): c.ReadonlyTriggerState | undefined {
    return super.triggerState() as c.ReadonlyTriggerState | undefined;
  }
  hasLifetimeStats(): this is LazyEntityWith<"lifetime_stats"> {
    return super.hasLifetimeStats();
  }

  lifetimeStats(): c.ReadonlyLifetimeStats | undefined {
    return super.lifetimeStats() as c.ReadonlyLifetimeStats | undefined;
  }
  hasOccupancyComponent(): this is LazyEntityWith<"occupancy_component"> {
    return super.hasOccupancyComponent();
  }

  occupancyComponent(): c.ReadonlyOccupancyComponent | undefined {
    return super.occupancyComponent() as c.ReadonlyOccupancyComponent | undefined;
  }
  hasVideoComponent(): this is LazyEntityWith<"video_component"> {
    return super.hasVideoComponent();
  }

  videoComponent(): c.ReadonlyVideoComponent | undefined {
    return super.videoComponent() as c.ReadonlyVideoComponent | undefined;
  }
  hasPlayerSession(): this is LazyEntityWith<"player_session"> {
    return super.hasPlayerSession();
  }

  playerSession(): c.ReadonlyPlayerSession | undefined {
    return super.playerSession() as c.ReadonlyPlayerSession | undefined;
  }
  hasPresetApplied(): this is LazyEntityWith<"preset_applied"> {
    return super.hasPresetApplied();
  }

  presetApplied(): c.ReadonlyPresetApplied | undefined {
    return super.presetApplied() as c.ReadonlyPresetApplied | undefined;
  }
  hasPresetPrototype(): this is LazyEntityWith<"preset_prototype"> {
    return super.hasPresetPrototype();
  }

  presetPrototype(): c.ReadonlyPresetPrototype | undefined {
    return super.presetPrototype() as c.ReadonlyPresetPrototype | undefined;
  }
  hasFarmingPlantComponent(): this is LazyEntityWith<"farming_plant_component"> {
    return super.hasFarmingPlantComponent();
  }

  farmingPlantComponent(): c.ReadonlyFarmingPlantComponent | undefined {
    return super.farmingPlantComponent() as c.ReadonlyFarmingPlantComponent | undefined;
  }
  hasShardFarming(): this is LazyEntityWith<"shard_farming"> {
    return super.hasShardFarming();
  }

  shardFarming(): c.ReadonlyShardFarming | undefined {
    return super.shardFarming() as c.ReadonlyShardFarming | undefined;
  }
  hasCreatedBy(): this is LazyEntityWith<"created_by"> {
    return super.hasCreatedBy();
  }

  createdBy(): c.ReadonlyCreatedBy | undefined {
    return super.createdBy() as c.ReadonlyCreatedBy | undefined;
  }
  hasMinigameComponent(): this is LazyEntityWith<"minigame_component"> {
    return super.hasMinigameComponent();
  }

  minigameComponent(): c.ReadonlyMinigameComponent | undefined {
    return super.minigameComponent() as c.ReadonlyMinigameComponent | undefined;
  }
  hasMinigameInstance(): this is LazyEntityWith<"minigame_instance"> {
    return super.hasMinigameInstance();
  }

  minigameInstance(): c.ReadonlyMinigameInstance | undefined {
    return super.minigameInstance() as c.ReadonlyMinigameInstance | undefined;
  }
  hasPlayingMinigame(): this is LazyEntityWith<"playing_minigame"> {
    return super.hasPlayingMinigame();
  }

  playingMinigame(): c.ReadonlyPlayingMinigame | undefined {
    return super.playingMinigame() as c.ReadonlyPlayingMinigame | undefined;
  }
  hasMinigameElement(): this is LazyEntityWith<"minigame_element"> {
    return super.hasMinigameElement();
  }

  minigameElement(): c.ReadonlyMinigameElement | undefined {
    return super.minigameElement() as c.ReadonlyMinigameElement | undefined;
  }
  hasActiveTray(): this is LazyEntityWith<"active_tray"> {
    return super.hasActiveTray();
  }

  activeTray(): c.ReadonlyActiveTray | undefined {
    return super.activeTray() as c.ReadonlyActiveTray | undefined;
  }
  hasStashed(): this is LazyEntityWith<"stashed"> {
    return super.hasStashed();
  }

  stashed(): c.ReadonlyStashed | undefined {
    return super.stashed() as c.ReadonlyStashed | undefined;
  }
  hasMinigameInstanceTickInfo(): this is LazyEntityWith<"minigame_instance_tick_info"> {
    return super.hasMinigameInstanceTickInfo();
  }

  minigameInstanceTickInfo(): c.ReadonlyMinigameInstanceTickInfo | undefined {
    return super.minigameInstanceTickInfo() as c.ReadonlyMinigameInstanceTickInfo | undefined;
  }
  hasWarpingTo(): this is LazyEntityWith<"warping_to"> {
    return super.hasWarpingTo();
  }

  warpingTo(): c.ReadonlyWarpingTo | undefined {
    return super.warpingTo() as c.ReadonlyWarpingTo | undefined;
  }
  hasMinigameInstanceExpire(): this is LazyEntityWith<"minigame_instance_expire"> {
    return super.hasMinigameInstanceExpire();
  }

  minigameInstanceExpire(): c.ReadonlyMinigameInstanceExpire | undefined {
    return super.minigameInstanceExpire() as c.ReadonlyMinigameInstanceExpire | undefined;
  }
  hasPlacerComponent(): this is LazyEntityWith<"placer_component"> {
    return super.hasPlacerComponent();
  }

  placerComponent(): c.ReadonlyPlacerComponent | undefined {
    return super.placerComponent() as c.ReadonlyPlacerComponent | undefined;
  }
  hasQuestGiver(): this is LazyEntityWith<"quest_giver"> {
    return super.hasQuestGiver();
  }

  questGiver(): c.ReadonlyQuestGiver | undefined {
    return super.questGiver() as c.ReadonlyQuestGiver | undefined;
  }
  hasDefaultDialog(): this is LazyEntityWith<"default_dialog"> {
    return super.hasDefaultDialog();
  }

  defaultDialog(): c.ReadonlyDefaultDialog | undefined {
    return super.defaultDialog() as c.ReadonlyDefaultDialog | undefined;
  }
  hasUnmuck(): this is LazyEntityWith<"unmuck"> {
    return super.hasUnmuck();
  }

  unmuck(): c.ReadonlyUnmuck | undefined {
    return super.unmuck() as c.ReadonlyUnmuck | undefined;
  }
  hasRobotComponent(): this is LazyEntityWith<"robot_component"> {
    return super.hasRobotComponent();
  }

  robotComponent(): c.ReadonlyRobotComponent | undefined {
    return super.robotComponent() as c.ReadonlyRobotComponent | undefined;
  }
  hasAdminEntity(): this is LazyEntityWith<"admin_entity"> {
    return super.hasAdminEntity();
  }

  adminEntity(): c.ReadonlyAdminEntity | undefined {
    return super.adminEntity() as c.ReadonlyAdminEntity | undefined;
  }
  hasProtection(): this is LazyEntityWith<"protection"> {
    return super.hasProtection();
  }

  protection(): c.ReadonlyProtection | undefined {
    return super.protection() as c.ReadonlyProtection | undefined;
  }
  hasProjectsProtection(): this is LazyEntityWith<"projects_protection"> {
    return super.hasProjectsProtection();
  }

  projectsProtection(): c.ReadonlyProjectsProtection | undefined {
    return super.projectsProtection() as c.ReadonlyProjectsProtection | undefined;
  }
  hasDeletesWith(): this is LazyEntityWith<"deletes_with"> {
    return super.hasDeletesWith();
  }

  deletesWith(): c.ReadonlyDeletesWith | undefined {
    return super.deletesWith() as c.ReadonlyDeletesWith | undefined;
  }
  hasItemBuyer(): this is LazyEntityWith<"item_buyer"> {
    return super.hasItemBuyer();
  }

  itemBuyer(): c.ReadonlyItemBuyer | undefined {
    return super.itemBuyer() as c.ReadonlyItemBuyer | undefined;
  }
  hasInspectionTweaks(): this is LazyEntityWith<"inspection_tweaks"> {
    return super.hasInspectionTweaks();
  }

  inspectionTweaks(): c.ReadonlyInspectionTweaks | undefined {
    return super.inspectionTweaks() as c.ReadonlyInspectionTweaks | undefined;
  }
  hasProfilePic(): this is LazyEntityWith<"profile_pic"> {
    return super.hasProfilePic();
  }

  profilePic(): c.ReadonlyProfilePic | undefined {
    return super.profilePic() as c.ReadonlyProfilePic | undefined;
  }
  hasEntityDescription(): this is LazyEntityWith<"entity_description"> {
    return super.hasEntityDescription();
  }

  entityDescription(): c.ReadonlyEntityDescription | undefined {
    return super.entityDescription() as c.ReadonlyEntityDescription | undefined;
  }
  hasLandmark(): this is LazyEntityWith<"landmark"> {
    return super.hasLandmark();
  }

  landmark(): c.ReadonlyLandmark | undefined {
    return super.landmark() as c.ReadonlyLandmark | undefined;
  }
  hasCollideable(): this is LazyEntityWith<"collideable"> {
    return super.hasCollideable();
  }

  collideable(): c.ReadonlyCollideable | undefined {
    return super.collideable() as c.ReadonlyCollideable | undefined;
  }
  hasRestoration(): this is LazyEntityWith<"restoration"> {
    return super.hasRestoration();
  }

  restoration(): c.ReadonlyRestoration | undefined {
    return super.restoration() as c.ReadonlyRestoration | undefined;
  }
  hasTerrainRestorationDiff(): this is LazyEntityWith<"terrain_restoration_diff"> {
    return super.hasTerrainRestorationDiff();
  }

  terrainRestorationDiff(): c.ReadonlyTerrainRestorationDiff | undefined {
    return super.terrainRestorationDiff() as c.ReadonlyTerrainRestorationDiff | undefined;
  }
  hasTeam(): this is LazyEntityWith<"team"> {
    return super.hasTeam();
  }

  team(): c.ReadonlyTeam | undefined {
    return super.team() as c.ReadonlyTeam | undefined;
  }
  hasPlayerCurrentTeam(): this is LazyEntityWith<"player_current_team"> {
    return super.hasPlayerCurrentTeam();
  }

  playerCurrentTeam(): c.ReadonlyPlayerCurrentTeam | undefined {
    return super.playerCurrentTeam() as c.ReadonlyPlayerCurrentTeam | undefined;
  }
  hasUserRoles(): this is LazyEntityWith<"user_roles"> {
    return super.hasUserRoles();
  }

  userRoles(): c.ReadonlyUserRoles | undefined {
    return super.userRoles() as c.ReadonlyUserRoles | undefined;
  }
  hasRestoresTo(): this is LazyEntityWith<"restores_to"> {
    return super.hasRestoresTo();
  }

  restoresTo(): c.ReadonlyRestoresTo | undefined {
    return super.restoresTo() as c.ReadonlyRestoresTo | undefined;
  }
  hasTrade(): this is LazyEntityWith<"trade"> {
    return super.hasTrade();
  }

  trade(): c.ReadonlyTrade | undefined {
    return super.trade() as c.ReadonlyTrade | undefined;
  }
  hasActiveTrades(): this is LazyEntityWith<"active_trades"> {
    return super.hasActiveTrades();
  }

  activeTrades(): c.ReadonlyActiveTrades | undefined {
    return super.activeTrades() as c.ReadonlyActiveTrades | undefined;
  }
  hasPlacedBy(): this is LazyEntityWith<"placed_by"> {
    return super.hasPlacedBy();
  }

  placedBy(): c.ReadonlyPlacedBy | undefined {
    return super.placedBy() as c.ReadonlyPlacedBy | undefined;
  }
  hasTextSign(): this is LazyEntityWith<"text_sign"> {
    return super.hasTextSign();
  }

  textSign(): c.ReadonlyTextSign | undefined {
    return super.textSign() as c.ReadonlyTextSign | undefined;
  }
  hasIrradiance(): this is LazyEntityWith<"irradiance"> {
    return super.hasIrradiance();
  }

  irradiance(): c.ReadonlyIrradiance | undefined {
    return super.irradiance() as c.ReadonlyIrradiance | undefined;
  }
  hasLockedInPlace(): this is LazyEntityWith<"locked_in_place"> {
    return super.hasLockedInPlace();
  }

  lockedInPlace(): c.ReadonlyLockedInPlace | undefined {
    return super.lockedInPlace() as c.ReadonlyLockedInPlace | undefined;
  }
  hasDeathInfo(): this is LazyEntityWith<"death_info"> {
    return super.hasDeathInfo();
  }

  deathInfo(): c.ReadonlyDeathInfo | undefined {
    return super.deathInfo() as c.ReadonlyDeathInfo | undefined;
  }
  hasSyntheticStats(): this is LazyEntityWith<"synthetic_stats"> {
    return super.hasSyntheticStats();
  }

  syntheticStats(): c.ReadonlySyntheticStats | undefined {
    return super.syntheticStats() as c.ReadonlySyntheticStats | undefined;
  }
  hasIdle(): this is LazyEntityWith<"idle"> {
    return super.hasIdle();
  }

  idle(): c.ReadonlyIdle | undefined {
    return super.idle() as c.ReadonlyIdle | undefined;
  }
  hasVoice(): this is LazyEntityWith<"voice"> {
    return super.hasVoice();
  }

  voice(): c.ReadonlyVoice | undefined {
    return super.voice() as c.ReadonlyVoice | undefined;
  }
  hasGiftGiver(): this is LazyEntityWith<"gift_giver"> {
    return super.hasGiftGiver();
  }

  giftGiver(): c.ReadonlyGiftGiver | undefined {
    return super.giftGiver() as c.ReadonlyGiftGiver | undefined;
  }
}

export interface SuperLazyEntity {
  readonly id: BiomesId;
  iced(): c.ReadonlyIced;
  remoteConnection(): c.ReadonlyRemoteConnection;
  position(): c.ReadonlyPosition;
  orientation(): c.ReadonlyOrientation;
  rigidBody(): c.ReadonlyRigidBody;
  size(): c.ReadonlySize;
  box(): c.ReadonlyBox;
  shardSeed(): c.ReadonlyShardSeed;
  shardDiff(): c.ReadonlyShardDiff;
  shardShapes(): c.ReadonlyShardShapes;
  shardSkyOcclusion(): c.ReadonlyShardSkyOcclusion;
  shardIrradiance(): c.ReadonlyShardIrradiance;
  shardWater(): c.ReadonlyShardWater;
  shardOccupancy(): c.ReadonlyShardOccupancy;
  shardDye(): c.ReadonlyShardDye;
  shardMoisture(): c.ReadonlyShardMoisture;
  shardGrowth(): c.ReadonlyShardGrowth;
  shardPlacer(): c.ReadonlyShardPlacer;
  shardMuck(): c.ReadonlyShardMuck;
  label(): c.ReadonlyLabel;
  grabBag(): c.ReadonlyGrabBag;
  acquisition(): c.ReadonlyAcquisition;
  looseItem(): c.ReadonlyLooseItem;
  inventory(): c.ReadonlyInventory;
  containerInventory(): c.ReadonlyContainerInventory;
  pricedContainerInventory(): c.ReadonlyPricedContainerInventory;
  selectedItem(): c.ReadonlySelectedItem;
  wearing(): c.ReadonlyWearing;
  emote(): c.ReadonlyEmote;
  appearanceComponent(): c.ReadonlyAppearanceComponent;
  groupComponent(): c.ReadonlyGroupComponent;
  challenges(): c.ReadonlyChallenges;
  recipeBook(): c.ReadonlyRecipeBook;
  expires(): c.ReadonlyExpires;
  icing(): c.ReadonlyIcing;
  warpable(): c.ReadonlyWarpable;
  playerStatus(): c.ReadonlyPlayerStatus;
  playerBehavior(): c.ReadonlyPlayerBehavior;
  worldMetadata(): c.ReadonlyWorldMetadata;
  npcMetadata(): c.ReadonlyNpcMetadata;
  npcState(): c.ReadonlyNpcState;
  groupPreviewReference(): c.ReadonlyGroupPreviewReference;
  aclComponent(): c.ReadonlyAclComponent;
  deedComponent(): c.ReadonlyDeedComponent;
  groupPreviewComponent(): c.ReadonlyGroupPreviewComponent;
  blueprintComponent(): c.ReadonlyBlueprintComponent;
  craftingStationComponent(): c.ReadonlyCraftingStationComponent;
  health(): c.ReadonlyHealth;
  buffsComponent(): c.ReadonlyBuffsComponent;
  gremlin(): c.ReadonlyGremlin;
  placeableComponent(): c.ReadonlyPlaceableComponent;
  groupedEntities(): c.ReadonlyGroupedEntities;
  inGroup(): c.ReadonlyInGroup;
  pictureFrameContents(): c.ReadonlyPictureFrameContents;
  triggerState(): c.ReadonlyTriggerState;
  lifetimeStats(): c.ReadonlyLifetimeStats;
  occupancyComponent(): c.ReadonlyOccupancyComponent;
  videoComponent(): c.ReadonlyVideoComponent;
  playerSession(): c.ReadonlyPlayerSession;
  presetApplied(): c.ReadonlyPresetApplied;
  presetPrototype(): c.ReadonlyPresetPrototype;
  farmingPlantComponent(): c.ReadonlyFarmingPlantComponent;
  shardFarming(): c.ReadonlyShardFarming;
  createdBy(): c.ReadonlyCreatedBy;
  minigameComponent(): c.ReadonlyMinigameComponent;
  minigameInstance(): c.ReadonlyMinigameInstance;
  playingMinigame(): c.ReadonlyPlayingMinigame;
  minigameElement(): c.ReadonlyMinigameElement;
  activeTray(): c.ReadonlyActiveTray;
  stashed(): c.ReadonlyStashed;
  minigameInstanceTickInfo(): c.ReadonlyMinigameInstanceTickInfo;
  warpingTo(): c.ReadonlyWarpingTo;
  minigameInstanceExpire(): c.ReadonlyMinigameInstanceExpire;
  placerComponent(): c.ReadonlyPlacerComponent;
  questGiver(): c.ReadonlyQuestGiver;
  defaultDialog(): c.ReadonlyDefaultDialog;
  unmuck(): c.ReadonlyUnmuck;
  robotComponent(): c.ReadonlyRobotComponent;
  adminEntity(): c.ReadonlyAdminEntity;
  protection(): c.ReadonlyProtection;
  projectsProtection(): c.ReadonlyProjectsProtection;
  deletesWith(): c.ReadonlyDeletesWith;
  itemBuyer(): c.ReadonlyItemBuyer;
  inspectionTweaks(): c.ReadonlyInspectionTweaks;
  profilePic(): c.ReadonlyProfilePic;
  entityDescription(): c.ReadonlyEntityDescription;
  landmark(): c.ReadonlyLandmark;
  collideable(): c.ReadonlyCollideable;
  restoration(): c.ReadonlyRestoration;
  terrainRestorationDiff(): c.ReadonlyTerrainRestorationDiff;
  team(): c.ReadonlyTeam;
  playerCurrentTeam(): c.ReadonlyPlayerCurrentTeam;
  userRoles(): c.ReadonlyUserRoles;
  restoresTo(): c.ReadonlyRestoresTo;
  trade(): c.ReadonlyTrade;
  activeTrades(): c.ReadonlyActiveTrades;
  placedBy(): c.ReadonlyPlacedBy;
  textSign(): c.ReadonlyTextSign;
  irradiance(): c.ReadonlyIrradiance;
  lockedInPlace(): c.ReadonlyLockedInPlace;
  deathInfo(): c.ReadonlyDeathInfo;
  syntheticStats(): c.ReadonlySyntheticStats;
  idle(): c.ReadonlyIdle;
  voice(): c.ReadonlyVoice;
  giftGiver(): c.ReadonlyGiftGiver;
}

export type LazyEntityWith<C extends keyof ReadonlyEntity> = LazyLikeWith<C, SuperLazyEntity, LazyEntity>;

export class LazyEntityBackedDelta extends Delta {
  constructor(
    private readonly entity: LazyEntity,
    delta?: RawDelta | undefined
  ) {
    super(delta);
  }

  staleOk() {
    return this;
  }

  hasComponent<C extends keyof Entity>(component: C): boolean {
    if (component === "id") {
      return true;
    }
    if (this.delta !== undefined) {
      const delta = this.delta[component as keyof RawDelta];
      if (delta !== undefined) {
        return !!delta;
      }
    }
    return this.entity.has(component);
  }

  get id(): BiomesId {
    return this.entity.id;
  }

  iced(): c.ReadonlyIced | undefined {
    if (this.delta?.iced !== undefined) {
      return this.delta.iced ?? undefined;
    }
    return this.entity.iced();
  }
  remoteConnection(): c.ReadonlyRemoteConnection | undefined {
    if (this.delta?.remote_connection !== undefined) {
      return this.delta.remote_connection ?? undefined;
    }
    return this.entity.remoteConnection();
  }
  position(): c.ReadonlyPosition | undefined {
    if (this.delta?.position !== undefined) {
      return this.delta.position ?? undefined;
    }
    return this.entity.position();
  }
  orientation(): c.ReadonlyOrientation | undefined {
    if (this.delta?.orientation !== undefined) {
      return this.delta.orientation ?? undefined;
    }
    return this.entity.orientation();
  }
  rigidBody(): c.ReadonlyRigidBody | undefined {
    if (this.delta?.rigid_body !== undefined) {
      return this.delta.rigid_body ?? undefined;
    }
    return this.entity.rigidBody();
  }
  size(): c.ReadonlySize | undefined {
    if (this.delta?.size !== undefined) {
      return this.delta.size ?? undefined;
    }
    return this.entity.size();
  }
  box(): c.ReadonlyBox | undefined {
    if (this.delta?.box !== undefined) {
      return this.delta.box ?? undefined;
    }
    return this.entity.box();
  }
  shardSeed(): c.ReadonlyShardSeed | undefined {
    if (this.delta?.shard_seed !== undefined) {
      return this.delta.shard_seed ?? undefined;
    }
    return this.entity.shardSeed();
  }
  shardDiff(): c.ReadonlyShardDiff | undefined {
    if (this.delta?.shard_diff !== undefined) {
      return this.delta.shard_diff ?? undefined;
    }
    return this.entity.shardDiff();
  }
  shardShapes(): c.ReadonlyShardShapes | undefined {
    if (this.delta?.shard_shapes !== undefined) {
      return this.delta.shard_shapes ?? undefined;
    }
    return this.entity.shardShapes();
  }
  shardSkyOcclusion(): c.ReadonlyShardSkyOcclusion | undefined {
    if (this.delta?.shard_sky_occlusion !== undefined) {
      return this.delta.shard_sky_occlusion ?? undefined;
    }
    return this.entity.shardSkyOcclusion();
  }
  shardIrradiance(): c.ReadonlyShardIrradiance | undefined {
    if (this.delta?.shard_irradiance !== undefined) {
      return this.delta.shard_irradiance ?? undefined;
    }
    return this.entity.shardIrradiance();
  }
  shardWater(): c.ReadonlyShardWater | undefined {
    if (this.delta?.shard_water !== undefined) {
      return this.delta.shard_water ?? undefined;
    }
    return this.entity.shardWater();
  }
  shardOccupancy(): c.ReadonlyShardOccupancy | undefined {
    if (this.delta?.shard_occupancy !== undefined) {
      return this.delta.shard_occupancy ?? undefined;
    }
    return this.entity.shardOccupancy();
  }
  shardDye(): c.ReadonlyShardDye | undefined {
    if (this.delta?.shard_dye !== undefined) {
      return this.delta.shard_dye ?? undefined;
    }
    return this.entity.shardDye();
  }
  shardMoisture(): c.ReadonlyShardMoisture | undefined {
    if (this.delta?.shard_moisture !== undefined) {
      return this.delta.shard_moisture ?? undefined;
    }
    return this.entity.shardMoisture();
  }
  shardGrowth(): c.ReadonlyShardGrowth | undefined {
    if (this.delta?.shard_growth !== undefined) {
      return this.delta.shard_growth ?? undefined;
    }
    return this.entity.shardGrowth();
  }
  shardPlacer(): c.ReadonlyShardPlacer | undefined {
    if (this.delta?.shard_placer !== undefined) {
      return this.delta.shard_placer ?? undefined;
    }
    return this.entity.shardPlacer();
  }
  shardMuck(): c.ReadonlyShardMuck | undefined {
    if (this.delta?.shard_muck !== undefined) {
      return this.delta.shard_muck ?? undefined;
    }
    return this.entity.shardMuck();
  }
  label(): c.ReadonlyLabel | undefined {
    if (this.delta?.label !== undefined) {
      return this.delta.label ?? undefined;
    }
    return this.entity.label();
  }
  grabBag(): c.ReadonlyGrabBag | undefined {
    if (this.delta?.grab_bag !== undefined) {
      return this.delta.grab_bag ?? undefined;
    }
    return this.entity.grabBag();
  }
  acquisition(): c.ReadonlyAcquisition | undefined {
    if (this.delta?.acquisition !== undefined) {
      return this.delta.acquisition ?? undefined;
    }
    return this.entity.acquisition();
  }
  looseItem(): c.ReadonlyLooseItem | undefined {
    if (this.delta?.loose_item !== undefined) {
      return this.delta.loose_item ?? undefined;
    }
    return this.entity.looseItem();
  }
  inventory(): c.ReadonlyInventory | undefined {
    if (this.delta?.inventory !== undefined) {
      return this.delta.inventory ?? undefined;
    }
    return this.entity.inventory();
  }
  containerInventory(): c.ReadonlyContainerInventory | undefined {
    if (this.delta?.container_inventory !== undefined) {
      return this.delta.container_inventory ?? undefined;
    }
    return this.entity.containerInventory();
  }
  pricedContainerInventory(): c.ReadonlyPricedContainerInventory | undefined {
    if (this.delta?.priced_container_inventory !== undefined) {
      return this.delta.priced_container_inventory ?? undefined;
    }
    return this.entity.pricedContainerInventory();
  }
  selectedItem(): c.ReadonlySelectedItem | undefined {
    if (this.delta?.selected_item !== undefined) {
      return this.delta.selected_item ?? undefined;
    }
    return this.entity.selectedItem();
  }
  wearing(): c.ReadonlyWearing | undefined {
    if (this.delta?.wearing !== undefined) {
      return this.delta.wearing ?? undefined;
    }
    return this.entity.wearing();
  }
  emote(): c.ReadonlyEmote | undefined {
    if (this.delta?.emote !== undefined) {
      return this.delta.emote ?? undefined;
    }
    return this.entity.emote();
  }
  appearanceComponent(): c.ReadonlyAppearanceComponent | undefined {
    if (this.delta?.appearance_component !== undefined) {
      return this.delta.appearance_component ?? undefined;
    }
    return this.entity.appearanceComponent();
  }
  groupComponent(): c.ReadonlyGroupComponent | undefined {
    if (this.delta?.group_component !== undefined) {
      return this.delta.group_component ?? undefined;
    }
    return this.entity.groupComponent();
  }
  challenges(): c.ReadonlyChallenges | undefined {
    if (this.delta?.challenges !== undefined) {
      return this.delta.challenges ?? undefined;
    }
    return this.entity.challenges();
  }
  recipeBook(): c.ReadonlyRecipeBook | undefined {
    if (this.delta?.recipe_book !== undefined) {
      return this.delta.recipe_book ?? undefined;
    }
    return this.entity.recipeBook();
  }
  expires(): c.ReadonlyExpires | undefined {
    if (this.delta?.expires !== undefined) {
      return this.delta.expires ?? undefined;
    }
    return this.entity.expires();
  }
  icing(): c.ReadonlyIcing | undefined {
    if (this.delta?.icing !== undefined) {
      return this.delta.icing ?? undefined;
    }
    return this.entity.icing();
  }
  warpable(): c.ReadonlyWarpable | undefined {
    if (this.delta?.warpable !== undefined) {
      return this.delta.warpable ?? undefined;
    }
    return this.entity.warpable();
  }
  playerStatus(): c.ReadonlyPlayerStatus | undefined {
    if (this.delta?.player_status !== undefined) {
      return this.delta.player_status ?? undefined;
    }
    return this.entity.playerStatus();
  }
  playerBehavior(): c.ReadonlyPlayerBehavior | undefined {
    if (this.delta?.player_behavior !== undefined) {
      return this.delta.player_behavior ?? undefined;
    }
    return this.entity.playerBehavior();
  }
  worldMetadata(): c.ReadonlyWorldMetadata | undefined {
    if (this.delta?.world_metadata !== undefined) {
      return this.delta.world_metadata ?? undefined;
    }
    return this.entity.worldMetadata();
  }
  npcMetadata(): c.ReadonlyNpcMetadata | undefined {
    if (this.delta?.npc_metadata !== undefined) {
      return this.delta.npc_metadata ?? undefined;
    }
    return this.entity.npcMetadata();
  }
  npcState(): c.ReadonlyNpcState | undefined {
    if (this.delta?.npc_state !== undefined) {
      return this.delta.npc_state ?? undefined;
    }
    return this.entity.npcState();
  }
  groupPreviewReference(): c.ReadonlyGroupPreviewReference | undefined {
    if (this.delta?.group_preview_reference !== undefined) {
      return this.delta.group_preview_reference ?? undefined;
    }
    return this.entity.groupPreviewReference();
  }
  aclComponent(): c.ReadonlyAclComponent | undefined {
    if (this.delta?.acl_component !== undefined) {
      return this.delta.acl_component ?? undefined;
    }
    return this.entity.aclComponent();
  }
  deedComponent(): c.ReadonlyDeedComponent | undefined {
    if (this.delta?.deed_component !== undefined) {
      return this.delta.deed_component ?? undefined;
    }
    return this.entity.deedComponent();
  }
  groupPreviewComponent(): c.ReadonlyGroupPreviewComponent | undefined {
    if (this.delta?.group_preview_component !== undefined) {
      return this.delta.group_preview_component ?? undefined;
    }
    return this.entity.groupPreviewComponent();
  }
  blueprintComponent(): c.ReadonlyBlueprintComponent | undefined {
    if (this.delta?.blueprint_component !== undefined) {
      return this.delta.blueprint_component ?? undefined;
    }
    return this.entity.blueprintComponent();
  }
  craftingStationComponent(): c.ReadonlyCraftingStationComponent | undefined {
    if (this.delta?.crafting_station_component !== undefined) {
      return this.delta.crafting_station_component ?? undefined;
    }
    return this.entity.craftingStationComponent();
  }
  health(): c.ReadonlyHealth | undefined {
    if (this.delta?.health !== undefined) {
      return this.delta.health ?? undefined;
    }
    return this.entity.health();
  }
  buffsComponent(): c.ReadonlyBuffsComponent | undefined {
    if (this.delta?.buffs_component !== undefined) {
      return this.delta.buffs_component ?? undefined;
    }
    return this.entity.buffsComponent();
  }
  gremlin(): c.ReadonlyGremlin | undefined {
    if (this.delta?.gremlin !== undefined) {
      return this.delta.gremlin ?? undefined;
    }
    return this.entity.gremlin();
  }
  placeableComponent(): c.ReadonlyPlaceableComponent | undefined {
    if (this.delta?.placeable_component !== undefined) {
      return this.delta.placeable_component ?? undefined;
    }
    return this.entity.placeableComponent();
  }
  groupedEntities(): c.ReadonlyGroupedEntities | undefined {
    if (this.delta?.grouped_entities !== undefined) {
      return this.delta.grouped_entities ?? undefined;
    }
    return this.entity.groupedEntities();
  }
  inGroup(): c.ReadonlyInGroup | undefined {
    if (this.delta?.in_group !== undefined) {
      return this.delta.in_group ?? undefined;
    }
    return this.entity.inGroup();
  }
  pictureFrameContents(): c.ReadonlyPictureFrameContents | undefined {
    if (this.delta?.picture_frame_contents !== undefined) {
      return this.delta.picture_frame_contents ?? undefined;
    }
    return this.entity.pictureFrameContents();
  }
  triggerState(): c.ReadonlyTriggerState | undefined {
    if (this.delta?.trigger_state !== undefined) {
      return this.delta.trigger_state ?? undefined;
    }
    return this.entity.triggerState();
  }
  lifetimeStats(): c.ReadonlyLifetimeStats | undefined {
    if (this.delta?.lifetime_stats !== undefined) {
      return this.delta.lifetime_stats ?? undefined;
    }
    return this.entity.lifetimeStats();
  }
  occupancyComponent(): c.ReadonlyOccupancyComponent | undefined {
    if (this.delta?.occupancy_component !== undefined) {
      return this.delta.occupancy_component ?? undefined;
    }
    return this.entity.occupancyComponent();
  }
  videoComponent(): c.ReadonlyVideoComponent | undefined {
    if (this.delta?.video_component !== undefined) {
      return this.delta.video_component ?? undefined;
    }
    return this.entity.videoComponent();
  }
  playerSession(): c.ReadonlyPlayerSession | undefined {
    if (this.delta?.player_session !== undefined) {
      return this.delta.player_session ?? undefined;
    }
    return this.entity.playerSession();
  }
  presetApplied(): c.ReadonlyPresetApplied | undefined {
    if (this.delta?.preset_applied !== undefined) {
      return this.delta.preset_applied ?? undefined;
    }
    return this.entity.presetApplied();
  }
  presetPrototype(): c.ReadonlyPresetPrototype | undefined {
    if (this.delta?.preset_prototype !== undefined) {
      return this.delta.preset_prototype ?? undefined;
    }
    return this.entity.presetPrototype();
  }
  farmingPlantComponent(): c.ReadonlyFarmingPlantComponent | undefined {
    if (this.delta?.farming_plant_component !== undefined) {
      return this.delta.farming_plant_component ?? undefined;
    }
    return this.entity.farmingPlantComponent();
  }
  shardFarming(): c.ReadonlyShardFarming | undefined {
    if (this.delta?.shard_farming !== undefined) {
      return this.delta.shard_farming ?? undefined;
    }
    return this.entity.shardFarming();
  }
  createdBy(): c.ReadonlyCreatedBy | undefined {
    if (this.delta?.created_by !== undefined) {
      return this.delta.created_by ?? undefined;
    }
    return this.entity.createdBy();
  }
  minigameComponent(): c.ReadonlyMinigameComponent | undefined {
    if (this.delta?.minigame_component !== undefined) {
      return this.delta.minigame_component ?? undefined;
    }
    return this.entity.minigameComponent();
  }
  minigameInstance(): c.ReadonlyMinigameInstance | undefined {
    if (this.delta?.minigame_instance !== undefined) {
      return this.delta.minigame_instance ?? undefined;
    }
    return this.entity.minigameInstance();
  }
  playingMinigame(): c.ReadonlyPlayingMinigame | undefined {
    if (this.delta?.playing_minigame !== undefined) {
      return this.delta.playing_minigame ?? undefined;
    }
    return this.entity.playingMinigame();
  }
  minigameElement(): c.ReadonlyMinigameElement | undefined {
    if (this.delta?.minigame_element !== undefined) {
      return this.delta.minigame_element ?? undefined;
    }
    return this.entity.minigameElement();
  }
  activeTray(): c.ReadonlyActiveTray | undefined {
    if (this.delta?.active_tray !== undefined) {
      return this.delta.active_tray ?? undefined;
    }
    return this.entity.activeTray();
  }
  stashed(): c.ReadonlyStashed | undefined {
    if (this.delta?.stashed !== undefined) {
      return this.delta.stashed ?? undefined;
    }
    return this.entity.stashed();
  }
  minigameInstanceTickInfo(): c.ReadonlyMinigameInstanceTickInfo | undefined {
    if (this.delta?.minigame_instance_tick_info !== undefined) {
      return this.delta.minigame_instance_tick_info ?? undefined;
    }
    return this.entity.minigameInstanceTickInfo();
  }
  warpingTo(): c.ReadonlyWarpingTo | undefined {
    if (this.delta?.warping_to !== undefined) {
      return this.delta.warping_to ?? undefined;
    }
    return this.entity.warpingTo();
  }
  minigameInstanceExpire(): c.ReadonlyMinigameInstanceExpire | undefined {
    if (this.delta?.minigame_instance_expire !== undefined) {
      return this.delta.minigame_instance_expire ?? undefined;
    }
    return this.entity.minigameInstanceExpire();
  }
  placerComponent(): c.ReadonlyPlacerComponent | undefined {
    if (this.delta?.placer_component !== undefined) {
      return this.delta.placer_component ?? undefined;
    }
    return this.entity.placerComponent();
  }
  questGiver(): c.ReadonlyQuestGiver | undefined {
    if (this.delta?.quest_giver !== undefined) {
      return this.delta.quest_giver ?? undefined;
    }
    return this.entity.questGiver();
  }
  defaultDialog(): c.ReadonlyDefaultDialog | undefined {
    if (this.delta?.default_dialog !== undefined) {
      return this.delta.default_dialog ?? undefined;
    }
    return this.entity.defaultDialog();
  }
  unmuck(): c.ReadonlyUnmuck | undefined {
    if (this.delta?.unmuck !== undefined) {
      return this.delta.unmuck ?? undefined;
    }
    return this.entity.unmuck();
  }
  robotComponent(): c.ReadonlyRobotComponent | undefined {
    if (this.delta?.robot_component !== undefined) {
      return this.delta.robot_component ?? undefined;
    }
    return this.entity.robotComponent();
  }
  adminEntity(): c.ReadonlyAdminEntity | undefined {
    if (this.delta?.admin_entity !== undefined) {
      return this.delta.admin_entity ?? undefined;
    }
    return this.entity.adminEntity();
  }
  protection(): c.ReadonlyProtection | undefined {
    if (this.delta?.protection !== undefined) {
      return this.delta.protection ?? undefined;
    }
    return this.entity.protection();
  }
  projectsProtection(): c.ReadonlyProjectsProtection | undefined {
    if (this.delta?.projects_protection !== undefined) {
      return this.delta.projects_protection ?? undefined;
    }
    return this.entity.projectsProtection();
  }
  deletesWith(): c.ReadonlyDeletesWith | undefined {
    if (this.delta?.deletes_with !== undefined) {
      return this.delta.deletes_with ?? undefined;
    }
    return this.entity.deletesWith();
  }
  itemBuyer(): c.ReadonlyItemBuyer | undefined {
    if (this.delta?.item_buyer !== undefined) {
      return this.delta.item_buyer ?? undefined;
    }
    return this.entity.itemBuyer();
  }
  inspectionTweaks(): c.ReadonlyInspectionTweaks | undefined {
    if (this.delta?.inspection_tweaks !== undefined) {
      return this.delta.inspection_tweaks ?? undefined;
    }
    return this.entity.inspectionTweaks();
  }
  profilePic(): c.ReadonlyProfilePic | undefined {
    if (this.delta?.profile_pic !== undefined) {
      return this.delta.profile_pic ?? undefined;
    }
    return this.entity.profilePic();
  }
  entityDescription(): c.ReadonlyEntityDescription | undefined {
    if (this.delta?.entity_description !== undefined) {
      return this.delta.entity_description ?? undefined;
    }
    return this.entity.entityDescription();
  }
  landmark(): c.ReadonlyLandmark | undefined {
    if (this.delta?.landmark !== undefined) {
      return this.delta.landmark ?? undefined;
    }
    return this.entity.landmark();
  }
  collideable(): c.ReadonlyCollideable | undefined {
    if (this.delta?.collideable !== undefined) {
      return this.delta.collideable ?? undefined;
    }
    return this.entity.collideable();
  }
  restoration(): c.ReadonlyRestoration | undefined {
    if (this.delta?.restoration !== undefined) {
      return this.delta.restoration ?? undefined;
    }
    return this.entity.restoration();
  }
  terrainRestorationDiff(): c.ReadonlyTerrainRestorationDiff | undefined {
    if (this.delta?.terrain_restoration_diff !== undefined) {
      return this.delta.terrain_restoration_diff ?? undefined;
    }
    return this.entity.terrainRestorationDiff();
  }
  team(): c.ReadonlyTeam | undefined {
    if (this.delta?.team !== undefined) {
      return this.delta.team ?? undefined;
    }
    return this.entity.team();
  }
  playerCurrentTeam(): c.ReadonlyPlayerCurrentTeam | undefined {
    if (this.delta?.player_current_team !== undefined) {
      return this.delta.player_current_team ?? undefined;
    }
    return this.entity.playerCurrentTeam();
  }
  userRoles(): c.ReadonlyUserRoles | undefined {
    if (this.delta?.user_roles !== undefined) {
      return this.delta.user_roles ?? undefined;
    }
    return this.entity.userRoles();
  }
  restoresTo(): c.ReadonlyRestoresTo | undefined {
    if (this.delta?.restores_to !== undefined) {
      return this.delta.restores_to ?? undefined;
    }
    return this.entity.restoresTo();
  }
  trade(): c.ReadonlyTrade | undefined {
    if (this.delta?.trade !== undefined) {
      return this.delta.trade ?? undefined;
    }
    return this.entity.trade();
  }
  activeTrades(): c.ReadonlyActiveTrades | undefined {
    if (this.delta?.active_trades !== undefined) {
      return this.delta.active_trades ?? undefined;
    }
    return this.entity.activeTrades();
  }
  placedBy(): c.ReadonlyPlacedBy | undefined {
    if (this.delta?.placed_by !== undefined) {
      return this.delta.placed_by ?? undefined;
    }
    return this.entity.placedBy();
  }
  textSign(): c.ReadonlyTextSign | undefined {
    if (this.delta?.text_sign !== undefined) {
      return this.delta.text_sign ?? undefined;
    }
    return this.entity.textSign();
  }
  irradiance(): c.ReadonlyIrradiance | undefined {
    if (this.delta?.irradiance !== undefined) {
      return this.delta.irradiance ?? undefined;
    }
    return this.entity.irradiance();
  }
  lockedInPlace(): c.ReadonlyLockedInPlace | undefined {
    if (this.delta?.locked_in_place !== undefined) {
      return this.delta.locked_in_place ?? undefined;
    }
    return this.entity.lockedInPlace();
  }
  deathInfo(): c.ReadonlyDeathInfo | undefined {
    if (this.delta?.death_info !== undefined) {
      return this.delta.death_info ?? undefined;
    }
    return this.entity.deathInfo();
  }
  syntheticStats(): c.ReadonlySyntheticStats | undefined {
    if (this.delta?.synthetic_stats !== undefined) {
      return this.delta.synthetic_stats ?? undefined;
    }
    return this.entity.syntheticStats();
  }
  idle(): c.ReadonlyIdle | undefined {
    if (this.delta?.idle !== undefined) {
      return this.delta.idle ?? undefined;
    }
    return this.entity.idle();
  }
  voice(): c.ReadonlyVoice | undefined {
    if (this.delta?.voice !== undefined) {
      return this.delta.voice ?? undefined;
    }
    return this.entity.voice();
  }
  giftGiver(): c.ReadonlyGiftGiver | undefined {
    if (this.delta?.gift_giver !== undefined) {
      return this.delta.gift_giver ?? undefined;
    }
    return this.entity.giftGiver();
  }
}

export class PatchableLazyEntity extends Delta {
  public readonly readComponentIds = new Set<number>();
  private staleVariant?: ReadonlyDelta;

  constructor(private readonly entity: LazyEntity) {
    super();
  }

  staleOk(): ReadonlyDelta {
    return (this.staleVariant ??= new LazyEntityBackedDelta(this.entity, this.delta));
  }

  hasComponent<C extends keyof Entity>(component: C): boolean {
    if (component === "id") {
      return true;
    }
    if (this.delta !== undefined) {
      const delta = this.delta[component as keyof RawDelta];
      if (delta !== undefined) {
        return !!delta;
      }
    }
    this.readComponentIds.add(COMPONENT_PROP_NAME_TO_ID.get(component)!);
    return this.entity.has(component);
  }

  get id(): BiomesId {
    return this.entity.id;
  }

  private markAllComponentsAsRead() {
    for (const id of COMPONENT_PROP_NAME_TO_ID.values()) {
      this.readComponentIds.add(id);
    }
  }

  iced(): c.ReadonlyIced | undefined {
    if (this.delta?.iced !== undefined) {
      return this.delta.iced ?? undefined;
    }
    this.readComponentIds.add(57);
    return this.entity.iced();
  }
  remoteConnection(): c.ReadonlyRemoteConnection | undefined {
    if (this.delta?.remote_connection !== undefined) {
      return this.delta.remote_connection ?? undefined;
    }
    this.readComponentIds.add(31);
    return this.entity.remoteConnection();
  }
  position(): c.ReadonlyPosition | undefined {
    if (this.delta?.position !== undefined) {
      return this.delta.position ?? undefined;
    }
    this.readComponentIds.add(54);
    return this.entity.position();
  }
  orientation(): c.ReadonlyOrientation | undefined {
    if (this.delta?.orientation !== undefined) {
      return this.delta.orientation ?? undefined;
    }
    this.readComponentIds.add(55);
    return this.entity.orientation();
  }
  rigidBody(): c.ReadonlyRigidBody | undefined {
    if (this.delta?.rigid_body !== undefined) {
      return this.delta.rigid_body ?? undefined;
    }
    this.readComponentIds.add(32);
    return this.entity.rigidBody();
  }
  size(): c.ReadonlySize | undefined {
    if (this.delta?.size !== undefined) {
      return this.delta.size ?? undefined;
    }
    this.readComponentIds.add(110);
    return this.entity.size();
  }
  box(): c.ReadonlyBox | undefined {
    if (this.delta?.box !== undefined) {
      return this.delta.box ?? undefined;
    }
    this.readComponentIds.add(33);
    return this.entity.box();
  }
  shardSeed(): c.ReadonlyShardSeed | undefined {
    if (this.delta?.shard_seed !== undefined) {
      return this.delta.shard_seed ?? undefined;
    }
    this.readComponentIds.add(34);
    return this.entity.shardSeed();
  }
  shardDiff(): c.ReadonlyShardDiff | undefined {
    if (this.delta?.shard_diff !== undefined) {
      return this.delta.shard_diff ?? undefined;
    }
    this.readComponentIds.add(35);
    return this.entity.shardDiff();
  }
  shardShapes(): c.ReadonlyShardShapes | undefined {
    if (this.delta?.shard_shapes !== undefined) {
      return this.delta.shard_shapes ?? undefined;
    }
    this.readComponentIds.add(60);
    return this.entity.shardShapes();
  }
  shardSkyOcclusion(): c.ReadonlyShardSkyOcclusion | undefined {
    if (this.delta?.shard_sky_occlusion !== undefined) {
      return this.delta.shard_sky_occlusion ?? undefined;
    }
    this.readComponentIds.add(76);
    return this.entity.shardSkyOcclusion();
  }
  shardIrradiance(): c.ReadonlyShardIrradiance | undefined {
    if (this.delta?.shard_irradiance !== undefined) {
      return this.delta.shard_irradiance ?? undefined;
    }
    this.readComponentIds.add(80);
    return this.entity.shardIrradiance();
  }
  shardWater(): c.ReadonlyShardWater | undefined {
    if (this.delta?.shard_water !== undefined) {
      return this.delta.shard_water ?? undefined;
    }
    this.readComponentIds.add(82);
    return this.entity.shardWater();
  }
  shardOccupancy(): c.ReadonlyShardOccupancy | undefined {
    if (this.delta?.shard_occupancy !== undefined) {
      return this.delta.shard_occupancy ?? undefined;
    }
    this.readComponentIds.add(93);
    return this.entity.shardOccupancy();
  }
  shardDye(): c.ReadonlyShardDye | undefined {
    if (this.delta?.shard_dye !== undefined) {
      return this.delta.shard_dye ?? undefined;
    }
    this.readComponentIds.add(111);
    return this.entity.shardDye();
  }
  shardMoisture(): c.ReadonlyShardMoisture | undefined {
    if (this.delta?.shard_moisture !== undefined) {
      return this.delta.shard_moisture ?? undefined;
    }
    this.readComponentIds.add(112);
    return this.entity.shardMoisture();
  }
  shardGrowth(): c.ReadonlyShardGrowth | undefined {
    if (this.delta?.shard_growth !== undefined) {
      return this.delta.shard_growth ?? undefined;
    }
    this.readComponentIds.add(113);
    return this.entity.shardGrowth();
  }
  shardPlacer(): c.ReadonlyShardPlacer | undefined {
    if (this.delta?.shard_placer !== undefined) {
      return this.delta.shard_placer ?? undefined;
    }
    this.readComponentIds.add(120);
    return this.entity.shardPlacer();
  }
  shardMuck(): c.ReadonlyShardMuck | undefined {
    if (this.delta?.shard_muck !== undefined) {
      return this.delta.shard_muck ?? undefined;
    }
    this.readComponentIds.add(124);
    return this.entity.shardMuck();
  }
  label(): c.ReadonlyLabel | undefined {
    if (this.delta?.label !== undefined) {
      return this.delta.label ?? undefined;
    }
    this.readComponentIds.add(37);
    return this.entity.label();
  }
  grabBag(): c.ReadonlyGrabBag | undefined {
    if (this.delta?.grab_bag !== undefined) {
      return this.delta.grab_bag ?? undefined;
    }
    this.readComponentIds.add(51);
    return this.entity.grabBag();
  }
  acquisition(): c.ReadonlyAcquisition | undefined {
    if (this.delta?.acquisition !== undefined) {
      return this.delta.acquisition ?? undefined;
    }
    this.readComponentIds.add(52);
    return this.entity.acquisition();
  }
  looseItem(): c.ReadonlyLooseItem | undefined {
    if (this.delta?.loose_item !== undefined) {
      return this.delta.loose_item ?? undefined;
    }
    this.readComponentIds.add(53);
    return this.entity.looseItem();
  }
  inventory(): c.ReadonlyInventory | undefined {
    if (this.delta?.inventory !== undefined) {
      return this.delta.inventory ?? undefined;
    }
    this.readComponentIds.add(41);
    return this.entity.inventory();
  }
  containerInventory(): c.ReadonlyContainerInventory | undefined {
    if (this.delta?.container_inventory !== undefined) {
      return this.delta.container_inventory ?? undefined;
    }
    this.readComponentIds.add(79);
    return this.entity.containerInventory();
  }
  pricedContainerInventory(): c.ReadonlyPricedContainerInventory | undefined {
    if (this.delta?.priced_container_inventory !== undefined) {
      return this.delta.priced_container_inventory ?? undefined;
    }
    this.readComponentIds.add(86);
    return this.entity.pricedContainerInventory();
  }
  selectedItem(): c.ReadonlySelectedItem | undefined {
    if (this.delta?.selected_item !== undefined) {
      return this.delta.selected_item ?? undefined;
    }
    this.readComponentIds.add(59);
    return this.entity.selectedItem();
  }
  wearing(): c.ReadonlyWearing | undefined {
    if (this.delta?.wearing !== undefined) {
      return this.delta.wearing ?? undefined;
    }
    this.readComponentIds.add(49);
    return this.entity.wearing();
  }
  emote(): c.ReadonlyEmote | undefined {
    if (this.delta?.emote !== undefined) {
      return this.delta.emote ?? undefined;
    }
    this.readComponentIds.add(43);
    return this.entity.emote();
  }
  appearanceComponent(): c.ReadonlyAppearanceComponent | undefined {
    if (this.delta?.appearance_component !== undefined) {
      return this.delta.appearance_component ?? undefined;
    }
    this.readComponentIds.add(56);
    return this.entity.appearanceComponent();
  }
  groupComponent(): c.ReadonlyGroupComponent | undefined {
    if (this.delta?.group_component !== undefined) {
      return this.delta.group_component ?? undefined;
    }
    this.readComponentIds.add(45);
    return this.entity.groupComponent();
  }
  challenges(): c.ReadonlyChallenges | undefined {
    if (this.delta?.challenges !== undefined) {
      return this.delta.challenges ?? undefined;
    }
    this.readComponentIds.add(46);
    return this.entity.challenges();
  }
  recipeBook(): c.ReadonlyRecipeBook | undefined {
    if (this.delta?.recipe_book !== undefined) {
      return this.delta.recipe_book ?? undefined;
    }
    this.readComponentIds.add(48);
    return this.entity.recipeBook();
  }
  expires(): c.ReadonlyExpires | undefined {
    if (this.delta?.expires !== undefined) {
      return this.delta.expires ?? undefined;
    }
    this.readComponentIds.add(50);
    return this.entity.expires();
  }
  icing(): c.ReadonlyIcing | undefined {
    if (this.delta?.icing !== undefined) {
      return this.delta.icing ?? undefined;
    }
    this.readComponentIds.add(58);
    return this.entity.icing();
  }
  warpable(): c.ReadonlyWarpable | undefined {
    if (this.delta?.warpable !== undefined) {
      return this.delta.warpable ?? undefined;
    }
    this.readComponentIds.add(61);
    return this.entity.warpable();
  }
  playerStatus(): c.ReadonlyPlayerStatus | undefined {
    if (this.delta?.player_status !== undefined) {
      return this.delta.player_status ?? undefined;
    }
    this.readComponentIds.add(63);
    return this.entity.playerStatus();
  }
  playerBehavior(): c.ReadonlyPlayerBehavior | undefined {
    if (this.delta?.player_behavior !== undefined) {
      return this.delta.player_behavior ?? undefined;
    }
    this.readComponentIds.add(64);
    return this.entity.playerBehavior();
  }
  worldMetadata(): c.ReadonlyWorldMetadata | undefined {
    if (this.delta?.world_metadata !== undefined) {
      return this.delta.world_metadata ?? undefined;
    }
    this.readComponentIds.add(65);
    return this.entity.worldMetadata();
  }
  npcMetadata(): c.ReadonlyNpcMetadata | undefined {
    if (this.delta?.npc_metadata !== undefined) {
      return this.delta.npc_metadata ?? undefined;
    }
    this.readComponentIds.add(66);
    return this.entity.npcMetadata();
  }
  npcState(): c.ReadonlyNpcState | undefined {
    if (this.delta?.npc_state !== undefined) {
      return this.delta.npc_state ?? undefined;
    }
    this.readComponentIds.add(67);
    return this.entity.npcState();
  }
  groupPreviewReference(): c.ReadonlyGroupPreviewReference | undefined {
    if (this.delta?.group_preview_reference !== undefined) {
      return this.delta.group_preview_reference ?? undefined;
    }
    this.readComponentIds.add(68);
    return this.entity.groupPreviewReference();
  }
  aclComponent(): c.ReadonlyAclComponent | undefined {
    if (this.delta?.acl_component !== undefined) {
      return this.delta.acl_component ?? undefined;
    }
    this.readComponentIds.add(70);
    return this.entity.aclComponent();
  }
  deedComponent(): c.ReadonlyDeedComponent | undefined {
    if (this.delta?.deed_component !== undefined) {
      return this.delta.deed_component ?? undefined;
    }
    this.readComponentIds.add(71);
    return this.entity.deedComponent();
  }
  groupPreviewComponent(): c.ReadonlyGroupPreviewComponent | undefined {
    if (this.delta?.group_preview_component !== undefined) {
      return this.delta.group_preview_component ?? undefined;
    }
    this.readComponentIds.add(72);
    return this.entity.groupPreviewComponent();
  }
  blueprintComponent(): c.ReadonlyBlueprintComponent | undefined {
    if (this.delta?.blueprint_component !== undefined) {
      return this.delta.blueprint_component ?? undefined;
    }
    this.readComponentIds.add(87);
    return this.entity.blueprintComponent();
  }
  craftingStationComponent(): c.ReadonlyCraftingStationComponent | undefined {
    if (this.delta?.crafting_station_component !== undefined) {
      return this.delta.crafting_station_component ?? undefined;
    }
    this.readComponentIds.add(74);
    return this.entity.craftingStationComponent();
  }
  health(): c.ReadonlyHealth | undefined {
    if (this.delta?.health !== undefined) {
      return this.delta.health ?? undefined;
    }
    this.readComponentIds.add(75);
    return this.entity.health();
  }
  buffsComponent(): c.ReadonlyBuffsComponent | undefined {
    if (this.delta?.buffs_component !== undefined) {
      return this.delta.buffs_component ?? undefined;
    }
    this.readComponentIds.add(101);
    return this.entity.buffsComponent();
  }
  gremlin(): c.ReadonlyGremlin | undefined {
    if (this.delta?.gremlin !== undefined) {
      return this.delta.gremlin ?? undefined;
    }
    this.readComponentIds.add(77);
    return this.entity.gremlin();
  }
  placeableComponent(): c.ReadonlyPlaceableComponent | undefined {
    if (this.delta?.placeable_component !== undefined) {
      return this.delta.placeable_component ?? undefined;
    }
    this.readComponentIds.add(78);
    return this.entity.placeableComponent();
  }
  groupedEntities(): c.ReadonlyGroupedEntities | undefined {
    if (this.delta?.grouped_entities !== undefined) {
      return this.delta.grouped_entities ?? undefined;
    }
    this.readComponentIds.add(83);
    return this.entity.groupedEntities();
  }
  inGroup(): c.ReadonlyInGroup | undefined {
    if (this.delta?.in_group !== undefined) {
      return this.delta.in_group ?? undefined;
    }
    this.readComponentIds.add(95);
    return this.entity.inGroup();
  }
  pictureFrameContents(): c.ReadonlyPictureFrameContents | undefined {
    if (this.delta?.picture_frame_contents !== undefined) {
      return this.delta.picture_frame_contents ?? undefined;
    }
    this.readComponentIds.add(84);
    return this.entity.pictureFrameContents();
  }
  triggerState(): c.ReadonlyTriggerState | undefined {
    if (this.delta?.trigger_state !== undefined) {
      return this.delta.trigger_state ?? undefined;
    }
    this.readComponentIds.add(88);
    return this.entity.triggerState();
  }
  lifetimeStats(): c.ReadonlyLifetimeStats | undefined {
    if (this.delta?.lifetime_stats !== undefined) {
      return this.delta.lifetime_stats ?? undefined;
    }
    this.readComponentIds.add(91);
    return this.entity.lifetimeStats();
  }
  occupancyComponent(): c.ReadonlyOccupancyComponent | undefined {
    if (this.delta?.occupancy_component !== undefined) {
      return this.delta.occupancy_component ?? undefined;
    }
    this.readComponentIds.add(97);
    return this.entity.occupancyComponent();
  }
  videoComponent(): c.ReadonlyVideoComponent | undefined {
    if (this.delta?.video_component !== undefined) {
      return this.delta.video_component ?? undefined;
    }
    this.readComponentIds.add(92);
    return this.entity.videoComponent();
  }
  playerSession(): c.ReadonlyPlayerSession | undefined {
    if (this.delta?.player_session !== undefined) {
      return this.delta.player_session ?? undefined;
    }
    this.readComponentIds.add(98);
    return this.entity.playerSession();
  }
  presetApplied(): c.ReadonlyPresetApplied | undefined {
    if (this.delta?.preset_applied !== undefined) {
      return this.delta.preset_applied ?? undefined;
    }
    this.readComponentIds.add(99);
    return this.entity.presetApplied();
  }
  presetPrototype(): c.ReadonlyPresetPrototype | undefined {
    if (this.delta?.preset_prototype !== undefined) {
      return this.delta.preset_prototype ?? undefined;
    }
    this.readComponentIds.add(100);
    return this.entity.presetPrototype();
  }
  farmingPlantComponent(): c.ReadonlyFarmingPlantComponent | undefined {
    if (this.delta?.farming_plant_component !== undefined) {
      return this.delta.farming_plant_component ?? undefined;
    }
    this.readComponentIds.add(102);
    return this.entity.farmingPlantComponent();
  }
  shardFarming(): c.ReadonlyShardFarming | undefined {
    if (this.delta?.shard_farming !== undefined) {
      return this.delta.shard_farming ?? undefined;
    }
    this.readComponentIds.add(103);
    return this.entity.shardFarming();
  }
  createdBy(): c.ReadonlyCreatedBy | undefined {
    if (this.delta?.created_by !== undefined) {
      return this.delta.created_by ?? undefined;
    }
    this.readComponentIds.add(104);
    return this.entity.createdBy();
  }
  minigameComponent(): c.ReadonlyMinigameComponent | undefined {
    if (this.delta?.minigame_component !== undefined) {
      return this.delta.minigame_component ?? undefined;
    }
    this.readComponentIds.add(105);
    return this.entity.minigameComponent();
  }
  minigameInstance(): c.ReadonlyMinigameInstance | undefined {
    if (this.delta?.minigame_instance !== undefined) {
      return this.delta.minigame_instance ?? undefined;
    }
    this.readComponentIds.add(106);
    return this.entity.minigameInstance();
  }
  playingMinigame(): c.ReadonlyPlayingMinigame | undefined {
    if (this.delta?.playing_minigame !== undefined) {
      return this.delta.playing_minigame ?? undefined;
    }
    this.readComponentIds.add(107);
    return this.entity.playingMinigame();
  }
  minigameElement(): c.ReadonlyMinigameElement | undefined {
    if (this.delta?.minigame_element !== undefined) {
      return this.delta.minigame_element ?? undefined;
    }
    this.readComponentIds.add(108);
    return this.entity.minigameElement();
  }
  activeTray(): c.ReadonlyActiveTray | undefined {
    if (this.delta?.active_tray !== undefined) {
      return this.delta.active_tray ?? undefined;
    }
    this.readComponentIds.add(109);
    return this.entity.activeTray();
  }
  stashed(): c.ReadonlyStashed | undefined {
    if (this.delta?.stashed !== undefined) {
      return this.delta.stashed ?? undefined;
    }
    this.readComponentIds.add(115);
    return this.entity.stashed();
  }
  minigameInstanceTickInfo(): c.ReadonlyMinigameInstanceTickInfo | undefined {
    if (this.delta?.minigame_instance_tick_info !== undefined) {
      return this.delta.minigame_instance_tick_info ?? undefined;
    }
    this.readComponentIds.add(117);
    return this.entity.minigameInstanceTickInfo();
  }
  warpingTo(): c.ReadonlyWarpingTo | undefined {
    if (this.delta?.warping_to !== undefined) {
      return this.delta.warping_to ?? undefined;
    }
    this.readComponentIds.add(118);
    return this.entity.warpingTo();
  }
  minigameInstanceExpire(): c.ReadonlyMinigameInstanceExpire | undefined {
    if (this.delta?.minigame_instance_expire !== undefined) {
      return this.delta.minigame_instance_expire ?? undefined;
    }
    this.readComponentIds.add(119);
    return this.entity.minigameInstanceExpire();
  }
  placerComponent(): c.ReadonlyPlacerComponent | undefined {
    if (this.delta?.placer_component !== undefined) {
      return this.delta.placer_component ?? undefined;
    }
    this.readComponentIds.add(121);
    return this.entity.placerComponent();
  }
  questGiver(): c.ReadonlyQuestGiver | undefined {
    if (this.delta?.quest_giver !== undefined) {
      return this.delta.quest_giver ?? undefined;
    }
    this.readComponentIds.add(122);
    return this.entity.questGiver();
  }
  defaultDialog(): c.ReadonlyDefaultDialog | undefined {
    if (this.delta?.default_dialog !== undefined) {
      return this.delta.default_dialog ?? undefined;
    }
    this.readComponentIds.add(123);
    return this.entity.defaultDialog();
  }
  unmuck(): c.ReadonlyUnmuck | undefined {
    if (this.delta?.unmuck !== undefined) {
      return this.delta.unmuck ?? undefined;
    }
    this.readComponentIds.add(125);
    return this.entity.unmuck();
  }
  robotComponent(): c.ReadonlyRobotComponent | undefined {
    if (this.delta?.robot_component !== undefined) {
      return this.delta.robot_component ?? undefined;
    }
    this.readComponentIds.add(126);
    return this.entity.robotComponent();
  }
  adminEntity(): c.ReadonlyAdminEntity | undefined {
    if (this.delta?.admin_entity !== undefined) {
      return this.delta.admin_entity ?? undefined;
    }
    this.readComponentIds.add(140);
    return this.entity.adminEntity();
  }
  protection(): c.ReadonlyProtection | undefined {
    if (this.delta?.protection !== undefined) {
      return this.delta.protection ?? undefined;
    }
    this.readComponentIds.add(127);
    return this.entity.protection();
  }
  projectsProtection(): c.ReadonlyProjectsProtection | undefined {
    if (this.delta?.projects_protection !== undefined) {
      return this.delta.projects_protection ?? undefined;
    }
    this.readComponentIds.add(128);
    return this.entity.projectsProtection();
  }
  deletesWith(): c.ReadonlyDeletesWith | undefined {
    if (this.delta?.deletes_with !== undefined) {
      return this.delta.deletes_with ?? undefined;
    }
    this.readComponentIds.add(129);
    return this.entity.deletesWith();
  }
  itemBuyer(): c.ReadonlyItemBuyer | undefined {
    if (this.delta?.item_buyer !== undefined) {
      return this.delta.item_buyer ?? undefined;
    }
    this.readComponentIds.add(130);
    return this.entity.itemBuyer();
  }
  inspectionTweaks(): c.ReadonlyInspectionTweaks | undefined {
    if (this.delta?.inspection_tweaks !== undefined) {
      return this.delta.inspection_tweaks ?? undefined;
    }
    this.readComponentIds.add(131);
    return this.entity.inspectionTweaks();
  }
  profilePic(): c.ReadonlyProfilePic | undefined {
    if (this.delta?.profile_pic !== undefined) {
      return this.delta.profile_pic ?? undefined;
    }
    this.readComponentIds.add(132);
    return this.entity.profilePic();
  }
  entityDescription(): c.ReadonlyEntityDescription | undefined {
    if (this.delta?.entity_description !== undefined) {
      return this.delta.entity_description ?? undefined;
    }
    this.readComponentIds.add(133);
    return this.entity.entityDescription();
  }
  landmark(): c.ReadonlyLandmark | undefined {
    if (this.delta?.landmark !== undefined) {
      return this.delta.landmark ?? undefined;
    }
    this.readComponentIds.add(134);
    return this.entity.landmark();
  }
  collideable(): c.ReadonlyCollideable | undefined {
    if (this.delta?.collideable !== undefined) {
      return this.delta.collideable ?? undefined;
    }
    this.readComponentIds.add(135);
    return this.entity.collideable();
  }
  restoration(): c.ReadonlyRestoration | undefined {
    if (this.delta?.restoration !== undefined) {
      return this.delta.restoration ?? undefined;
    }
    this.readComponentIds.add(136);
    return this.entity.restoration();
  }
  terrainRestorationDiff(): c.ReadonlyTerrainRestorationDiff | undefined {
    if (this.delta?.terrain_restoration_diff !== undefined) {
      return this.delta.terrain_restoration_diff ?? undefined;
    }
    this.readComponentIds.add(137);
    return this.entity.terrainRestorationDiff();
  }
  team(): c.ReadonlyTeam | undefined {
    if (this.delta?.team !== undefined) {
      return this.delta.team ?? undefined;
    }
    this.readComponentIds.add(138);
    return this.entity.team();
  }
  playerCurrentTeam(): c.ReadonlyPlayerCurrentTeam | undefined {
    if (this.delta?.player_current_team !== undefined) {
      return this.delta.player_current_team ?? undefined;
    }
    this.readComponentIds.add(139);
    return this.entity.playerCurrentTeam();
  }
  userRoles(): c.ReadonlyUserRoles | undefined {
    if (this.delta?.user_roles !== undefined) {
      return this.delta.user_roles ?? undefined;
    }
    this.readComponentIds.add(141);
    return this.entity.userRoles();
  }
  restoresTo(): c.ReadonlyRestoresTo | undefined {
    if (this.delta?.restores_to !== undefined) {
      return this.delta.restores_to ?? undefined;
    }
    this.readComponentIds.add(142);
    return this.entity.restoresTo();
  }
  trade(): c.ReadonlyTrade | undefined {
    if (this.delta?.trade !== undefined) {
      return this.delta.trade ?? undefined;
    }
    this.readComponentIds.add(143);
    return this.entity.trade();
  }
  activeTrades(): c.ReadonlyActiveTrades | undefined {
    if (this.delta?.active_trades !== undefined) {
      return this.delta.active_trades ?? undefined;
    }
    this.readComponentIds.add(144);
    return this.entity.activeTrades();
  }
  placedBy(): c.ReadonlyPlacedBy | undefined {
    if (this.delta?.placed_by !== undefined) {
      return this.delta.placed_by ?? undefined;
    }
    this.readComponentIds.add(145);
    return this.entity.placedBy();
  }
  textSign(): c.ReadonlyTextSign | undefined {
    if (this.delta?.text_sign !== undefined) {
      return this.delta.text_sign ?? undefined;
    }
    this.readComponentIds.add(146);
    return this.entity.textSign();
  }
  irradiance(): c.ReadonlyIrradiance | undefined {
    if (this.delta?.irradiance !== undefined) {
      return this.delta.irradiance ?? undefined;
    }
    this.readComponentIds.add(147);
    return this.entity.irradiance();
  }
  lockedInPlace(): c.ReadonlyLockedInPlace | undefined {
    if (this.delta?.locked_in_place !== undefined) {
      return this.delta.locked_in_place ?? undefined;
    }
    this.readComponentIds.add(148);
    return this.entity.lockedInPlace();
  }
  deathInfo(): c.ReadonlyDeathInfo | undefined {
    if (this.delta?.death_info !== undefined) {
      return this.delta.death_info ?? undefined;
    }
    this.readComponentIds.add(149);
    return this.entity.deathInfo();
  }
  syntheticStats(): c.ReadonlySyntheticStats | undefined {
    if (this.delta?.synthetic_stats !== undefined) {
      return this.delta.synthetic_stats ?? undefined;
    }
    this.readComponentIds.add(150);
    return this.entity.syntheticStats();
  }
  idle(): c.ReadonlyIdle | undefined {
    if (this.delta?.idle !== undefined) {
      return this.delta.idle ?? undefined;
    }
    this.readComponentIds.add(151);
    return this.entity.idle();
  }
  voice(): c.ReadonlyVoice | undefined {
    if (this.delta?.voice !== undefined) {
      return this.delta.voice ?? undefined;
    }
    this.readComponentIds.add(152);
    return this.entity.voice();
  }
  giftGiver(): c.ReadonlyGiftGiver | undefined {
    if (this.delta?.gift_giver !== undefined) {
      return this.delta.gift_giver ?? undefined;
    }
    this.readComponentIds.add(153);
    return this.entity.giftGiver();
  }

  finish(): AsDelta<Entity> | undefined {
    this.runHooks();
    if (this.delta === undefined) {
      return;
    }
    const delta = {
      ...this.delta,
      id: this.id,
    };
    this.delta = undefined;
    return delta;
  }

  finishAsNew(): Entity {
    const delta = this.finish();
    if (delta === undefined) {
      return {
        id: this.id,
      };
    }
    removeNilishInPlace(delta);
    return delta as Entity;
  }
}