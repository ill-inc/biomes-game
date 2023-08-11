// GENERATED: This file is generated from delta.ts.j2. Do not modify directly.
// Content Hash: 15fdd94f6dc13b117b0832f1108b78d3

import * as c from "@/shared/ecs/gen/components";
import {
  AsDelta,
  COMPONENT_PROP_NAME_TO_ID,
  Entity,
  ReadonlyEntity,
} from "@/shared/ecs/gen/entities";
import { BiomesId } from "@/shared/ids";
import { removeNilishInPlace } from "@/shared/util/object";
import { entriesIn } from "lodash";

export type RawDelta = Omit<AsDelta<Entity>, "id">;

export abstract class ReadonlyDelta {
  abstract get id(): BiomesId;
  abstract hasComponent<C extends keyof Entity>(component: C): boolean;
  abstract staleOk(): ReadonlyDelta;

  has<C extends keyof Entity>(...components: C[]): this is DeltaWith<C> {
    for (const component of components) {
      if (!this.hasComponent(component)) {
        return false;
      }
    }
    return true;
  }

  asReadonlyEntity(): ReadonlyEntity {
    const entity: any = { id: this.id };
    {
      const component = this.iced();
      if (component !== undefined) {
        entity.iced = component;
      }
    }
    {
      const component = this.remoteConnection();
      if (component !== undefined) {
        entity.remote_connection = component;
      }
    }
    {
      const component = this.position();
      if (component !== undefined) {
        entity.position = component;
      }
    }
    {
      const component = this.orientation();
      if (component !== undefined) {
        entity.orientation = component;
      }
    }
    {
      const component = this.rigidBody();
      if (component !== undefined) {
        entity.rigid_body = component;
      }
    }
    {
      const component = this.size();
      if (component !== undefined) {
        entity.size = component;
      }
    }
    {
      const component = this.box();
      if (component !== undefined) {
        entity.box = component;
      }
    }
    {
      const component = this.shardSeed();
      if (component !== undefined) {
        entity.shard_seed = component;
      }
    }
    {
      const component = this.shardDiff();
      if (component !== undefined) {
        entity.shard_diff = component;
      }
    }
    {
      const component = this.shardShapes();
      if (component !== undefined) {
        entity.shard_shapes = component;
      }
    }
    {
      const component = this.shardSkyOcclusion();
      if (component !== undefined) {
        entity.shard_sky_occlusion = component;
      }
    }
    {
      const component = this.shardIrradiance();
      if (component !== undefined) {
        entity.shard_irradiance = component;
      }
    }
    {
      const component = this.shardWater();
      if (component !== undefined) {
        entity.shard_water = component;
      }
    }
    {
      const component = this.shardOccupancy();
      if (component !== undefined) {
        entity.shard_occupancy = component;
      }
    }
    {
      const component = this.shardDye();
      if (component !== undefined) {
        entity.shard_dye = component;
      }
    }
    {
      const component = this.shardMoisture();
      if (component !== undefined) {
        entity.shard_moisture = component;
      }
    }
    {
      const component = this.shardGrowth();
      if (component !== undefined) {
        entity.shard_growth = component;
      }
    }
    {
      const component = this.shardPlacer();
      if (component !== undefined) {
        entity.shard_placer = component;
      }
    }
    {
      const component = this.shardMuck();
      if (component !== undefined) {
        entity.shard_muck = component;
      }
    }
    {
      const component = this.label();
      if (component !== undefined) {
        entity.label = component;
      }
    }
    {
      const component = this.grabBag();
      if (component !== undefined) {
        entity.grab_bag = component;
      }
    }
    {
      const component = this.acquisition();
      if (component !== undefined) {
        entity.acquisition = component;
      }
    }
    {
      const component = this.looseItem();
      if (component !== undefined) {
        entity.loose_item = component;
      }
    }
    {
      const component = this.inventory();
      if (component !== undefined) {
        entity.inventory = component;
      }
    }
    {
      const component = this.containerInventory();
      if (component !== undefined) {
        entity.container_inventory = component;
      }
    }
    {
      const component = this.pricedContainerInventory();
      if (component !== undefined) {
        entity.priced_container_inventory = component;
      }
    }
    {
      const component = this.selectedItem();
      if (component !== undefined) {
        entity.selected_item = component;
      }
    }
    {
      const component = this.wearing();
      if (component !== undefined) {
        entity.wearing = component;
      }
    }
    {
      const component = this.emote();
      if (component !== undefined) {
        entity.emote = component;
      }
    }
    {
      const component = this.appearanceComponent();
      if (component !== undefined) {
        entity.appearance_component = component;
      }
    }
    {
      const component = this.groupComponent();
      if (component !== undefined) {
        entity.group_component = component;
      }
    }
    {
      const component = this.challenges();
      if (component !== undefined) {
        entity.challenges = component;
      }
    }
    {
      const component = this.recipeBook();
      if (component !== undefined) {
        entity.recipe_book = component;
      }
    }
    {
      const component = this.expires();
      if (component !== undefined) {
        entity.expires = component;
      }
    }
    {
      const component = this.icing();
      if (component !== undefined) {
        entity.icing = component;
      }
    }
    {
      const component = this.warpable();
      if (component !== undefined) {
        entity.warpable = component;
      }
    }
    {
      const component = this.playerStatus();
      if (component !== undefined) {
        entity.player_status = component;
      }
    }
    {
      const component = this.playerBehavior();
      if (component !== undefined) {
        entity.player_behavior = component;
      }
    }
    {
      const component = this.worldMetadata();
      if (component !== undefined) {
        entity.world_metadata = component;
      }
    }
    {
      const component = this.npcMetadata();
      if (component !== undefined) {
        entity.npc_metadata = component;
      }
    }
    {
      const component = this.npcState();
      if (component !== undefined) {
        entity.npc_state = component;
      }
    }
    {
      const component = this.groupPreviewReference();
      if (component !== undefined) {
        entity.group_preview_reference = component;
      }
    }
    {
      const component = this.aclComponent();
      if (component !== undefined) {
        entity.acl_component = component;
      }
    }
    {
      const component = this.deedComponent();
      if (component !== undefined) {
        entity.deed_component = component;
      }
    }
    {
      const component = this.groupPreviewComponent();
      if (component !== undefined) {
        entity.group_preview_component = component;
      }
    }
    {
      const component = this.blueprintComponent();
      if (component !== undefined) {
        entity.blueprint_component = component;
      }
    }
    {
      const component = this.craftingStationComponent();
      if (component !== undefined) {
        entity.crafting_station_component = component;
      }
    }
    {
      const component = this.health();
      if (component !== undefined) {
        entity.health = component;
      }
    }
    {
      const component = this.buffsComponent();
      if (component !== undefined) {
        entity.buffs_component = component;
      }
    }
    {
      const component = this.gremlin();
      if (component !== undefined) {
        entity.gremlin = component;
      }
    }
    {
      const component = this.placeableComponent();
      if (component !== undefined) {
        entity.placeable_component = component;
      }
    }
    {
      const component = this.groupedEntities();
      if (component !== undefined) {
        entity.grouped_entities = component;
      }
    }
    {
      const component = this.inGroup();
      if (component !== undefined) {
        entity.in_group = component;
      }
    }
    {
      const component = this.pictureFrameContents();
      if (component !== undefined) {
        entity.picture_frame_contents = component;
      }
    }
    {
      const component = this.triggerState();
      if (component !== undefined) {
        entity.trigger_state = component;
      }
    }
    {
      const component = this.lifetimeStats();
      if (component !== undefined) {
        entity.lifetime_stats = component;
      }
    }
    {
      const component = this.occupancyComponent();
      if (component !== undefined) {
        entity.occupancy_component = component;
      }
    }
    {
      const component = this.videoComponent();
      if (component !== undefined) {
        entity.video_component = component;
      }
    }
    {
      const component = this.playerSession();
      if (component !== undefined) {
        entity.player_session = component;
      }
    }
    {
      const component = this.presetApplied();
      if (component !== undefined) {
        entity.preset_applied = component;
      }
    }
    {
      const component = this.presetPrototype();
      if (component !== undefined) {
        entity.preset_prototype = component;
      }
    }
    {
      const component = this.farmingPlantComponent();
      if (component !== undefined) {
        entity.farming_plant_component = component;
      }
    }
    {
      const component = this.shardFarming();
      if (component !== undefined) {
        entity.shard_farming = component;
      }
    }
    {
      const component = this.createdBy();
      if (component !== undefined) {
        entity.created_by = component;
      }
    }
    {
      const component = this.minigameComponent();
      if (component !== undefined) {
        entity.minigame_component = component;
      }
    }
    {
      const component = this.minigameInstance();
      if (component !== undefined) {
        entity.minigame_instance = component;
      }
    }
    {
      const component = this.playingMinigame();
      if (component !== undefined) {
        entity.playing_minigame = component;
      }
    }
    {
      const component = this.minigameElement();
      if (component !== undefined) {
        entity.minigame_element = component;
      }
    }
    {
      const component = this.activeTray();
      if (component !== undefined) {
        entity.active_tray = component;
      }
    }
    {
      const component = this.stashed();
      if (component !== undefined) {
        entity.stashed = component;
      }
    }
    {
      const component = this.minigameInstanceTickInfo();
      if (component !== undefined) {
        entity.minigame_instance_tick_info = component;
      }
    }
    {
      const component = this.warpingTo();
      if (component !== undefined) {
        entity.warping_to = component;
      }
    }
    {
      const component = this.minigameInstanceExpire();
      if (component !== undefined) {
        entity.minigame_instance_expire = component;
      }
    }
    {
      const component = this.placerComponent();
      if (component !== undefined) {
        entity.placer_component = component;
      }
    }
    {
      const component = this.questGiver();
      if (component !== undefined) {
        entity.quest_giver = component;
      }
    }
    {
      const component = this.defaultDialog();
      if (component !== undefined) {
        entity.default_dialog = component;
      }
    }
    {
      const component = this.unmuck();
      if (component !== undefined) {
        entity.unmuck = component;
      }
    }
    {
      const component = this.robotComponent();
      if (component !== undefined) {
        entity.robot_component = component;
      }
    }
    {
      const component = this.adminEntity();
      if (component !== undefined) {
        entity.admin_entity = component;
      }
    }
    {
      const component = this.protection();
      if (component !== undefined) {
        entity.protection = component;
      }
    }
    {
      const component = this.projectsProtection();
      if (component !== undefined) {
        entity.projects_protection = component;
      }
    }
    {
      const component = this.deletesWith();
      if (component !== undefined) {
        entity.deletes_with = component;
      }
    }
    {
      const component = this.itemBuyer();
      if (component !== undefined) {
        entity.item_buyer = component;
      }
    }
    {
      const component = this.inspectionTweaks();
      if (component !== undefined) {
        entity.inspection_tweaks = component;
      }
    }
    {
      const component = this.profilePic();
      if (component !== undefined) {
        entity.profile_pic = component;
      }
    }
    {
      const component = this.entityDescription();
      if (component !== undefined) {
        entity.entity_description = component;
      }
    }
    {
      const component = this.landmark();
      if (component !== undefined) {
        entity.landmark = component;
      }
    }
    {
      const component = this.collideable();
      if (component !== undefined) {
        entity.collideable = component;
      }
    }
    {
      const component = this.restoration();
      if (component !== undefined) {
        entity.restoration = component;
      }
    }
    {
      const component = this.terrainRestorationDiff();
      if (component !== undefined) {
        entity.terrain_restoration_diff = component;
      }
    }
    {
      const component = this.team();
      if (component !== undefined) {
        entity.team = component;
      }
    }
    {
      const component = this.playerCurrentTeam();
      if (component !== undefined) {
        entity.player_current_team = component;
      }
    }
    {
      const component = this.userRoles();
      if (component !== undefined) {
        entity.user_roles = component;
      }
    }
    {
      const component = this.restoresTo();
      if (component !== undefined) {
        entity.restores_to = component;
      }
    }
    {
      const component = this.trade();
      if (component !== undefined) {
        entity.trade = component;
      }
    }
    {
      const component = this.activeTrades();
      if (component !== undefined) {
        entity.active_trades = component;
      }
    }
    {
      const component = this.placedBy();
      if (component !== undefined) {
        entity.placed_by = component;
      }
    }
    {
      const component = this.textSign();
      if (component !== undefined) {
        entity.text_sign = component;
      }
    }
    {
      const component = this.irradiance();
      if (component !== undefined) {
        entity.irradiance = component;
      }
    }
    {
      const component = this.lockedInPlace();
      if (component !== undefined) {
        entity.locked_in_place = component;
      }
    }
    {
      const component = this.deathInfo();
      if (component !== undefined) {
        entity.death_info = component;
      }
    }
    {
      const component = this.syntheticStats();
      if (component !== undefined) {
        entity.synthetic_stats = component;
      }
    }
    {
      const component = this.idle();
      if (component !== undefined) {
        entity.idle = component;
      }
    }
    {
      const component = this.voice();
      if (component !== undefined) {
        entity.voice = component;
      }
    }
    {
      const component = this.giftGiver();
      if (component !== undefined) {
        entity.gift_giver = component;
      }
    }
    return entity;
  }

  abstract iced(): c.ReadonlyIced | undefined;
  abstract remoteConnection(): c.ReadonlyRemoteConnection | undefined;
  abstract position(): c.ReadonlyPosition | undefined;
  abstract orientation(): c.ReadonlyOrientation | undefined;
  abstract rigidBody(): c.ReadonlyRigidBody | undefined;
  abstract size(): c.ReadonlySize | undefined;
  abstract box(): c.ReadonlyBox | undefined;
  abstract shardSeed(): c.ReadonlyShardSeed | undefined;
  abstract shardDiff(): c.ReadonlyShardDiff | undefined;
  abstract shardShapes(): c.ReadonlyShardShapes | undefined;
  abstract shardSkyOcclusion(): c.ReadonlyShardSkyOcclusion | undefined;
  abstract shardIrradiance(): c.ReadonlyShardIrradiance | undefined;
  abstract shardWater(): c.ReadonlyShardWater | undefined;
  abstract shardOccupancy(): c.ReadonlyShardOccupancy | undefined;
  abstract shardDye(): c.ReadonlyShardDye | undefined;
  abstract shardMoisture(): c.ReadonlyShardMoisture | undefined;
  abstract shardGrowth(): c.ReadonlyShardGrowth | undefined;
  abstract shardPlacer(): c.ReadonlyShardPlacer | undefined;
  abstract shardMuck(): c.ReadonlyShardMuck | undefined;
  abstract label(): c.ReadonlyLabel | undefined;
  abstract grabBag(): c.ReadonlyGrabBag | undefined;
  abstract acquisition(): c.ReadonlyAcquisition | undefined;
  abstract looseItem(): c.ReadonlyLooseItem | undefined;
  abstract inventory(): c.ReadonlyInventory | undefined;
  abstract containerInventory(): c.ReadonlyContainerInventory | undefined;
  abstract pricedContainerInventory():
    | c.ReadonlyPricedContainerInventory
    | undefined;
  abstract selectedItem(): c.ReadonlySelectedItem | undefined;
  abstract wearing(): c.ReadonlyWearing | undefined;
  abstract emote(): c.ReadonlyEmote | undefined;
  abstract appearanceComponent(): c.ReadonlyAppearanceComponent | undefined;
  abstract groupComponent(): c.ReadonlyGroupComponent | undefined;
  abstract challenges(): c.ReadonlyChallenges | undefined;
  abstract recipeBook(): c.ReadonlyRecipeBook | undefined;
  abstract expires(): c.ReadonlyExpires | undefined;
  abstract icing(): c.ReadonlyIcing | undefined;
  abstract warpable(): c.ReadonlyWarpable | undefined;
  abstract playerStatus(): c.ReadonlyPlayerStatus | undefined;
  abstract playerBehavior(): c.ReadonlyPlayerBehavior | undefined;
  abstract worldMetadata(): c.ReadonlyWorldMetadata | undefined;
  abstract npcMetadata(): c.ReadonlyNpcMetadata | undefined;
  abstract npcState(): c.ReadonlyNpcState | undefined;
  abstract groupPreviewReference(): c.ReadonlyGroupPreviewReference | undefined;
  abstract aclComponent(): c.ReadonlyAclComponent | undefined;
  abstract deedComponent(): c.ReadonlyDeedComponent | undefined;
  abstract groupPreviewComponent(): c.ReadonlyGroupPreviewComponent | undefined;
  abstract blueprintComponent(): c.ReadonlyBlueprintComponent | undefined;
  abstract craftingStationComponent():
    | c.ReadonlyCraftingStationComponent
    | undefined;
  abstract health(): c.ReadonlyHealth | undefined;
  abstract buffsComponent(): c.ReadonlyBuffsComponent | undefined;
  abstract gremlin(): c.ReadonlyGremlin | undefined;
  abstract placeableComponent(): c.ReadonlyPlaceableComponent | undefined;
  abstract groupedEntities(): c.ReadonlyGroupedEntities | undefined;
  abstract inGroup(): c.ReadonlyInGroup | undefined;
  abstract pictureFrameContents(): c.ReadonlyPictureFrameContents | undefined;
  abstract triggerState(): c.ReadonlyTriggerState | undefined;
  abstract lifetimeStats(): c.ReadonlyLifetimeStats | undefined;
  abstract occupancyComponent(): c.ReadonlyOccupancyComponent | undefined;
  abstract videoComponent(): c.ReadonlyVideoComponent | undefined;
  abstract playerSession(): c.ReadonlyPlayerSession | undefined;
  abstract presetApplied(): c.ReadonlyPresetApplied | undefined;
  abstract presetPrototype(): c.ReadonlyPresetPrototype | undefined;
  abstract farmingPlantComponent(): c.ReadonlyFarmingPlantComponent | undefined;
  abstract shardFarming(): c.ReadonlyShardFarming | undefined;
  abstract createdBy(): c.ReadonlyCreatedBy | undefined;
  abstract minigameComponent(): c.ReadonlyMinigameComponent | undefined;
  abstract minigameInstance(): c.ReadonlyMinigameInstance | undefined;
  abstract playingMinigame(): c.ReadonlyPlayingMinigame | undefined;
  abstract minigameElement(): c.ReadonlyMinigameElement | undefined;
  abstract activeTray(): c.ReadonlyActiveTray | undefined;
  abstract stashed(): c.ReadonlyStashed | undefined;
  abstract minigameInstanceTickInfo():
    | c.ReadonlyMinigameInstanceTickInfo
    | undefined;
  abstract warpingTo(): c.ReadonlyWarpingTo | undefined;
  abstract minigameInstanceExpire():
    | c.ReadonlyMinigameInstanceExpire
    | undefined;
  abstract placerComponent(): c.ReadonlyPlacerComponent | undefined;
  abstract questGiver(): c.ReadonlyQuestGiver | undefined;
  abstract defaultDialog(): c.ReadonlyDefaultDialog | undefined;
  abstract unmuck(): c.ReadonlyUnmuck | undefined;
  abstract robotComponent(): c.ReadonlyRobotComponent | undefined;
  abstract adminEntity(): c.ReadonlyAdminEntity | undefined;
  abstract protection(): c.ReadonlyProtection | undefined;
  abstract projectsProtection(): c.ReadonlyProjectsProtection | undefined;
  abstract deletesWith(): c.ReadonlyDeletesWith | undefined;
  abstract itemBuyer(): c.ReadonlyItemBuyer | undefined;
  abstract inspectionTweaks(): c.ReadonlyInspectionTweaks | undefined;
  abstract profilePic(): c.ReadonlyProfilePic | undefined;
  abstract entityDescription(): c.ReadonlyEntityDescription | undefined;
  abstract landmark(): c.ReadonlyLandmark | undefined;
  abstract collideable(): c.ReadonlyCollideable | undefined;
  abstract restoration(): c.ReadonlyRestoration | undefined;
  abstract terrainRestorationDiff():
    | c.ReadonlyTerrainRestorationDiff
    | undefined;
  abstract team(): c.ReadonlyTeam | undefined;
  abstract playerCurrentTeam(): c.ReadonlyPlayerCurrentTeam | undefined;
  abstract userRoles(): c.ReadonlyUserRoles | undefined;
  abstract restoresTo(): c.ReadonlyRestoresTo | undefined;
  abstract trade(): c.ReadonlyTrade | undefined;
  abstract activeTrades(): c.ReadonlyActiveTrades | undefined;
  abstract placedBy(): c.ReadonlyPlacedBy | undefined;
  abstract textSign(): c.ReadonlyTextSign | undefined;
  abstract irradiance(): c.ReadonlyIrradiance | undefined;
  abstract lockedInPlace(): c.ReadonlyLockedInPlace | undefined;
  abstract deathInfo(): c.ReadonlyDeathInfo | undefined;
  abstract syntheticStats(): c.ReadonlySyntheticStats | undefined;
  abstract idle(): c.ReadonlyIdle | undefined;
  abstract voice(): c.ReadonlyVoice | undefined;
  abstract giftGiver(): c.ReadonlyGiftGiver | undefined;
}

export abstract class Delta extends ReadonlyDelta {
  private readonly hooks: (() => void)[] = [];

  constructor(protected delta?: RawDelta | undefined) {
    super();
  }

  addHook(hook: () => void) {
    this.hooks.push(hook);
  }

  protected runHooks() {
    for (const hook of this.hooks) {
      hook();
    }
  }

  has<C extends keyof Entity>(...components: C[]): this is DeltaWith<C> {
    for (const component of components) {
      if (!this.hasComponent(component)) {
        return false;
      }
    }
    return true;
  }

  fork(): DeltaPatch {
    return new DeltaPatch(this);
  }

  copyFrom(other: ReadonlyEntity) {
    this.delta ??= {};
    if (other.iced !== undefined) {
      this.delta.iced = c.Iced.clone(other.iced);
    }
    if (other.remote_connection !== undefined) {
      this.delta.remote_connection = c.RemoteConnection.clone(
        other.remote_connection
      );
    }
    if (other.position !== undefined) {
      this.delta.position = c.Position.clone(other.position);
    }
    if (other.orientation !== undefined) {
      this.delta.orientation = c.Orientation.clone(other.orientation);
    }
    if (other.rigid_body !== undefined) {
      this.delta.rigid_body = c.RigidBody.clone(other.rigid_body);
    }
    if (other.size !== undefined) {
      this.delta.size = c.Size.clone(other.size);
    }
    if (other.box !== undefined) {
      this.delta.box = c.Box.clone(other.box);
    }
    if (other.shard_seed !== undefined) {
      this.delta.shard_seed = c.ShardSeed.clone(other.shard_seed);
    }
    if (other.shard_diff !== undefined) {
      this.delta.shard_diff = c.ShardDiff.clone(other.shard_diff);
    }
    if (other.shard_shapes !== undefined) {
      this.delta.shard_shapes = c.ShardShapes.clone(other.shard_shapes);
    }
    if (other.shard_sky_occlusion !== undefined) {
      this.delta.shard_sky_occlusion = c.ShardSkyOcclusion.clone(
        other.shard_sky_occlusion
      );
    }
    if (other.shard_irradiance !== undefined) {
      this.delta.shard_irradiance = c.ShardIrradiance.clone(
        other.shard_irradiance
      );
    }
    if (other.shard_water !== undefined) {
      this.delta.shard_water = c.ShardWater.clone(other.shard_water);
    }
    if (other.shard_occupancy !== undefined) {
      this.delta.shard_occupancy = c.ShardOccupancy.clone(
        other.shard_occupancy
      );
    }
    if (other.shard_dye !== undefined) {
      this.delta.shard_dye = c.ShardDye.clone(other.shard_dye);
    }
    if (other.shard_moisture !== undefined) {
      this.delta.shard_moisture = c.ShardMoisture.clone(other.shard_moisture);
    }
    if (other.shard_growth !== undefined) {
      this.delta.shard_growth = c.ShardGrowth.clone(other.shard_growth);
    }
    if (other.shard_placer !== undefined) {
      this.delta.shard_placer = c.ShardPlacer.clone(other.shard_placer);
    }
    if (other.shard_muck !== undefined) {
      this.delta.shard_muck = c.ShardMuck.clone(other.shard_muck);
    }
    if (other.label !== undefined) {
      this.delta.label = c.Label.clone(other.label);
    }
    if (other.grab_bag !== undefined) {
      this.delta.grab_bag = c.GrabBag.clone(other.grab_bag);
    }
    if (other.acquisition !== undefined) {
      this.delta.acquisition = c.Acquisition.clone(other.acquisition);
    }
    if (other.loose_item !== undefined) {
      this.delta.loose_item = c.LooseItem.clone(other.loose_item);
    }
    if (other.inventory !== undefined) {
      this.delta.inventory = c.Inventory.clone(other.inventory);
    }
    if (other.container_inventory !== undefined) {
      this.delta.container_inventory = c.ContainerInventory.clone(
        other.container_inventory
      );
    }
    if (other.priced_container_inventory !== undefined) {
      this.delta.priced_container_inventory = c.PricedContainerInventory.clone(
        other.priced_container_inventory
      );
    }
    if (other.selected_item !== undefined) {
      this.delta.selected_item = c.SelectedItem.clone(other.selected_item);
    }
    if (other.wearing !== undefined) {
      this.delta.wearing = c.Wearing.clone(other.wearing);
    }
    if (other.emote !== undefined) {
      this.delta.emote = c.Emote.clone(other.emote);
    }
    if (other.appearance_component !== undefined) {
      this.delta.appearance_component = c.AppearanceComponent.clone(
        other.appearance_component
      );
    }
    if (other.group_component !== undefined) {
      this.delta.group_component = c.GroupComponent.clone(
        other.group_component
      );
    }
    if (other.challenges !== undefined) {
      this.delta.challenges = c.Challenges.clone(other.challenges);
    }
    if (other.recipe_book !== undefined) {
      this.delta.recipe_book = c.RecipeBook.clone(other.recipe_book);
    }
    if (other.expires !== undefined) {
      this.delta.expires = c.Expires.clone(other.expires);
    }
    if (other.icing !== undefined) {
      this.delta.icing = c.Icing.clone(other.icing);
    }
    if (other.warpable !== undefined) {
      this.delta.warpable = c.Warpable.clone(other.warpable);
    }
    if (other.player_status !== undefined) {
      this.delta.player_status = c.PlayerStatus.clone(other.player_status);
    }
    if (other.player_behavior !== undefined) {
      this.delta.player_behavior = c.PlayerBehavior.clone(
        other.player_behavior
      );
    }
    if (other.world_metadata !== undefined) {
      this.delta.world_metadata = c.WorldMetadata.clone(other.world_metadata);
    }
    if (other.npc_metadata !== undefined) {
      this.delta.npc_metadata = c.NpcMetadata.clone(other.npc_metadata);
    }
    if (other.npc_state !== undefined) {
      this.delta.npc_state = c.NpcState.clone(other.npc_state);
    }
    if (other.group_preview_reference !== undefined) {
      this.delta.group_preview_reference = c.GroupPreviewReference.clone(
        other.group_preview_reference
      );
    }
    if (other.acl_component !== undefined) {
      this.delta.acl_component = c.AclComponent.clone(other.acl_component);
    }
    if (other.deed_component !== undefined) {
      this.delta.deed_component = c.DeedComponent.clone(other.deed_component);
    }
    if (other.group_preview_component !== undefined) {
      this.delta.group_preview_component = c.GroupPreviewComponent.clone(
        other.group_preview_component
      );
    }
    if (other.blueprint_component !== undefined) {
      this.delta.blueprint_component = c.BlueprintComponent.clone(
        other.blueprint_component
      );
    }
    if (other.crafting_station_component !== undefined) {
      this.delta.crafting_station_component = c.CraftingStationComponent.clone(
        other.crafting_station_component
      );
    }
    if (other.health !== undefined) {
      this.delta.health = c.Health.clone(other.health);
    }
    if (other.buffs_component !== undefined) {
      this.delta.buffs_component = c.BuffsComponent.clone(
        other.buffs_component
      );
    }
    if (other.gremlin !== undefined) {
      this.delta.gremlin = c.Gremlin.clone(other.gremlin);
    }
    if (other.placeable_component !== undefined) {
      this.delta.placeable_component = c.PlaceableComponent.clone(
        other.placeable_component
      );
    }
    if (other.grouped_entities !== undefined) {
      this.delta.grouped_entities = c.GroupedEntities.clone(
        other.grouped_entities
      );
    }
    if (other.in_group !== undefined) {
      this.delta.in_group = c.InGroup.clone(other.in_group);
    }
    if (other.picture_frame_contents !== undefined) {
      this.delta.picture_frame_contents = c.PictureFrameContents.clone(
        other.picture_frame_contents
      );
    }
    if (other.trigger_state !== undefined) {
      this.delta.trigger_state = c.TriggerState.clone(other.trigger_state);
    }
    if (other.lifetime_stats !== undefined) {
      this.delta.lifetime_stats = c.LifetimeStats.clone(other.lifetime_stats);
    }
    if (other.occupancy_component !== undefined) {
      this.delta.occupancy_component = c.OccupancyComponent.clone(
        other.occupancy_component
      );
    }
    if (other.video_component !== undefined) {
      this.delta.video_component = c.VideoComponent.clone(
        other.video_component
      );
    }
    if (other.player_session !== undefined) {
      this.delta.player_session = c.PlayerSession.clone(other.player_session);
    }
    if (other.preset_applied !== undefined) {
      this.delta.preset_applied = c.PresetApplied.clone(other.preset_applied);
    }
    if (other.preset_prototype !== undefined) {
      this.delta.preset_prototype = c.PresetPrototype.clone(
        other.preset_prototype
      );
    }
    if (other.farming_plant_component !== undefined) {
      this.delta.farming_plant_component = c.FarmingPlantComponent.clone(
        other.farming_plant_component
      );
    }
    if (other.shard_farming !== undefined) {
      this.delta.shard_farming = c.ShardFarming.clone(other.shard_farming);
    }
    if (other.created_by !== undefined) {
      this.delta.created_by = c.CreatedBy.clone(other.created_by);
    }
    if (other.minigame_component !== undefined) {
      this.delta.minigame_component = c.MinigameComponent.clone(
        other.minigame_component
      );
    }
    if (other.minigame_instance !== undefined) {
      this.delta.minigame_instance = c.MinigameInstance.clone(
        other.minigame_instance
      );
    }
    if (other.playing_minigame !== undefined) {
      this.delta.playing_minigame = c.PlayingMinigame.clone(
        other.playing_minigame
      );
    }
    if (other.minigame_element !== undefined) {
      this.delta.minigame_element = c.MinigameElement.clone(
        other.minigame_element
      );
    }
    if (other.active_tray !== undefined) {
      this.delta.active_tray = c.ActiveTray.clone(other.active_tray);
    }
    if (other.stashed !== undefined) {
      this.delta.stashed = c.Stashed.clone(other.stashed);
    }
    if (other.minigame_instance_tick_info !== undefined) {
      this.delta.minigame_instance_tick_info = c.MinigameInstanceTickInfo.clone(
        other.minigame_instance_tick_info
      );
    }
    if (other.warping_to !== undefined) {
      this.delta.warping_to = c.WarpingTo.clone(other.warping_to);
    }
    if (other.minigame_instance_expire !== undefined) {
      this.delta.minigame_instance_expire = c.MinigameInstanceExpire.clone(
        other.minigame_instance_expire
      );
    }
    if (other.placer_component !== undefined) {
      this.delta.placer_component = c.PlacerComponent.clone(
        other.placer_component
      );
    }
    if (other.quest_giver !== undefined) {
      this.delta.quest_giver = c.QuestGiver.clone(other.quest_giver);
    }
    if (other.default_dialog !== undefined) {
      this.delta.default_dialog = c.DefaultDialog.clone(other.default_dialog);
    }
    if (other.unmuck !== undefined) {
      this.delta.unmuck = c.Unmuck.clone(other.unmuck);
    }
    if (other.robot_component !== undefined) {
      this.delta.robot_component = c.RobotComponent.clone(
        other.robot_component
      );
    }
    if (other.admin_entity !== undefined) {
      this.delta.admin_entity = c.AdminEntity.clone(other.admin_entity);
    }
    if (other.protection !== undefined) {
      this.delta.protection = c.Protection.clone(other.protection);
    }
    if (other.projects_protection !== undefined) {
      this.delta.projects_protection = c.ProjectsProtection.clone(
        other.projects_protection
      );
    }
    if (other.deletes_with !== undefined) {
      this.delta.deletes_with = c.DeletesWith.clone(other.deletes_with);
    }
    if (other.item_buyer !== undefined) {
      this.delta.item_buyer = c.ItemBuyer.clone(other.item_buyer);
    }
    if (other.inspection_tweaks !== undefined) {
      this.delta.inspection_tweaks = c.InspectionTweaks.clone(
        other.inspection_tweaks
      );
    }
    if (other.profile_pic !== undefined) {
      this.delta.profile_pic = c.ProfilePic.clone(other.profile_pic);
    }
    if (other.entity_description !== undefined) {
      this.delta.entity_description = c.EntityDescription.clone(
        other.entity_description
      );
    }
    if (other.landmark !== undefined) {
      this.delta.landmark = c.Landmark.clone(other.landmark);
    }
    if (other.collideable !== undefined) {
      this.delta.collideable = c.Collideable.clone(other.collideable);
    }
    if (other.restoration !== undefined) {
      this.delta.restoration = c.Restoration.clone(other.restoration);
    }
    if (other.terrain_restoration_diff !== undefined) {
      this.delta.terrain_restoration_diff = c.TerrainRestorationDiff.clone(
        other.terrain_restoration_diff
      );
    }
    if (other.team !== undefined) {
      this.delta.team = c.Team.clone(other.team);
    }
    if (other.player_current_team !== undefined) {
      this.delta.player_current_team = c.PlayerCurrentTeam.clone(
        other.player_current_team
      );
    }
    if (other.user_roles !== undefined) {
      this.delta.user_roles = c.UserRoles.clone(other.user_roles);
    }
    if (other.restores_to !== undefined) {
      this.delta.restores_to = c.RestoresTo.clone(other.restores_to);
    }
    if (other.trade !== undefined) {
      this.delta.trade = c.Trade.clone(other.trade);
    }
    if (other.active_trades !== undefined) {
      this.delta.active_trades = c.ActiveTrades.clone(other.active_trades);
    }
    if (other.placed_by !== undefined) {
      this.delta.placed_by = c.PlacedBy.clone(other.placed_by);
    }
    if (other.text_sign !== undefined) {
      this.delta.text_sign = c.TextSign.clone(other.text_sign);
    }
    if (other.irradiance !== undefined) {
      this.delta.irradiance = c.Irradiance.clone(other.irradiance);
    }
    if (other.locked_in_place !== undefined) {
      this.delta.locked_in_place = c.LockedInPlace.clone(other.locked_in_place);
    }
    if (other.death_info !== undefined) {
      this.delta.death_info = c.DeathInfo.clone(other.death_info);
    }
    if (other.synthetic_stats !== undefined) {
      this.delta.synthetic_stats = c.SyntheticStats.clone(
        other.synthetic_stats
      );
    }
    if (other.idle !== undefined) {
      this.delta.idle = c.Idle.clone(other.idle);
    }
    if (other.voice !== undefined) {
      this.delta.voice = c.Voice.clone(other.voice);
    }
    if (other.gift_giver !== undefined) {
      this.delta.gift_giver = c.GiftGiver.clone(other.gift_giver);
    }
  }

  setIced() {
    (this.delta ??= {}).iced = c.Iced.create();
  }

  clearIced() {
    (this.delta ??= {}).iced = null;
  }
  setRemoteConnection() {
    (this.delta ??= {}).remote_connection = c.RemoteConnection.create();
  }

  clearRemoteConnection() {
    (this.delta ??= {}).remote_connection = null;
  }

  setPosition(x: c.Position) {
    (this.delta ??= {}).position = x;
  }

  clearPosition() {
    (this.delta ??= {}).position = null;
  }

  setOrientation(x: c.Orientation) {
    (this.delta ??= {}).orientation = x;
  }

  clearOrientation() {
    (this.delta ??= {}).orientation = null;
  }

  setRigidBody(x: c.RigidBody) {
    (this.delta ??= {}).rigid_body = x;
  }

  clearRigidBody() {
    (this.delta ??= {}).rigid_body = null;
  }
  mutableSize(): c.Size {
    this.delta ??= {};
    if (this.delta.size === undefined) {
      this.delta.size = c.Size.clone(this.size());
    }
    return this.delta.size!;
  }

  setSize(x: c.Size) {
    (this.delta ??= {}).size = x;
  }

  clearSize() {
    (this.delta ??= {}).size = null;
  }
  mutableBox(): c.Box {
    this.delta ??= {};
    if (this.delta.box === undefined) {
      this.delta.box = c.Box.clone(this.box());
    }
    return this.delta.box!;
  }

  setBox(x: c.Box) {
    (this.delta ??= {}).box = x;
  }

  clearBox() {
    (this.delta ??= {}).box = null;
  }
  mutableShardSeed(): c.ShardSeed {
    this.delta ??= {};
    if (this.delta.shard_seed === undefined) {
      this.delta.shard_seed = c.ShardSeed.clone(this.shardSeed());
    }
    return this.delta.shard_seed!;
  }

  setShardSeed(x: c.ShardSeed) {
    (this.delta ??= {}).shard_seed = x;
  }

  clearShardSeed() {
    (this.delta ??= {}).shard_seed = null;
  }
  mutableShardDiff(): c.ShardDiff {
    this.delta ??= {};
    if (this.delta.shard_diff === undefined) {
      this.delta.shard_diff = c.ShardDiff.clone(this.shardDiff());
    }
    return this.delta.shard_diff!;
  }

  setShardDiff(x: c.ShardDiff) {
    (this.delta ??= {}).shard_diff = x;
  }

  clearShardDiff() {
    (this.delta ??= {}).shard_diff = null;
  }
  mutableShardShapes(): c.ShardShapes {
    this.delta ??= {};
    if (this.delta.shard_shapes === undefined) {
      this.delta.shard_shapes = c.ShardShapes.clone(this.shardShapes());
    }
    return this.delta.shard_shapes!;
  }

  setShardShapes(x: c.ShardShapes) {
    (this.delta ??= {}).shard_shapes = x;
  }

  clearShardShapes() {
    (this.delta ??= {}).shard_shapes = null;
  }
  mutableShardSkyOcclusion(): c.ShardSkyOcclusion {
    this.delta ??= {};
    if (this.delta.shard_sky_occlusion === undefined) {
      this.delta.shard_sky_occlusion = c.ShardSkyOcclusion.clone(
        this.shardSkyOcclusion()
      );
    }
    return this.delta.shard_sky_occlusion!;
  }

  setShardSkyOcclusion(x: c.ShardSkyOcclusion) {
    (this.delta ??= {}).shard_sky_occlusion = x;
  }

  clearShardSkyOcclusion() {
    (this.delta ??= {}).shard_sky_occlusion = null;
  }
  mutableShardIrradiance(): c.ShardIrradiance {
    this.delta ??= {};
    if (this.delta.shard_irradiance === undefined) {
      this.delta.shard_irradiance = c.ShardIrradiance.clone(
        this.shardIrradiance()
      );
    }
    return this.delta.shard_irradiance!;
  }

  setShardIrradiance(x: c.ShardIrradiance) {
    (this.delta ??= {}).shard_irradiance = x;
  }

  clearShardIrradiance() {
    (this.delta ??= {}).shard_irradiance = null;
  }
  mutableShardWater(): c.ShardWater {
    this.delta ??= {};
    if (this.delta.shard_water === undefined) {
      this.delta.shard_water = c.ShardWater.clone(this.shardWater());
    }
    return this.delta.shard_water!;
  }

  setShardWater(x: c.ShardWater) {
    (this.delta ??= {}).shard_water = x;
  }

  clearShardWater() {
    (this.delta ??= {}).shard_water = null;
  }
  mutableShardOccupancy(): c.ShardOccupancy {
    this.delta ??= {};
    if (this.delta.shard_occupancy === undefined) {
      this.delta.shard_occupancy = c.ShardOccupancy.clone(
        this.shardOccupancy()
      );
    }
    return this.delta.shard_occupancy!;
  }

  setShardOccupancy(x: c.ShardOccupancy) {
    (this.delta ??= {}).shard_occupancy = x;
  }

  clearShardOccupancy() {
    (this.delta ??= {}).shard_occupancy = null;
  }
  mutableShardDye(): c.ShardDye {
    this.delta ??= {};
    if (this.delta.shard_dye === undefined) {
      this.delta.shard_dye = c.ShardDye.clone(this.shardDye());
    }
    return this.delta.shard_dye!;
  }

  setShardDye(x: c.ShardDye) {
    (this.delta ??= {}).shard_dye = x;
  }

  clearShardDye() {
    (this.delta ??= {}).shard_dye = null;
  }
  mutableShardMoisture(): c.ShardMoisture {
    this.delta ??= {};
    if (this.delta.shard_moisture === undefined) {
      this.delta.shard_moisture = c.ShardMoisture.clone(this.shardMoisture());
    }
    return this.delta.shard_moisture!;
  }

  setShardMoisture(x: c.ShardMoisture) {
    (this.delta ??= {}).shard_moisture = x;
  }

  clearShardMoisture() {
    (this.delta ??= {}).shard_moisture = null;
  }
  mutableShardGrowth(): c.ShardGrowth {
    this.delta ??= {};
    if (this.delta.shard_growth === undefined) {
      this.delta.shard_growth = c.ShardGrowth.clone(this.shardGrowth());
    }
    return this.delta.shard_growth!;
  }

  setShardGrowth(x: c.ShardGrowth) {
    (this.delta ??= {}).shard_growth = x;
  }

  clearShardGrowth() {
    (this.delta ??= {}).shard_growth = null;
  }
  mutableShardPlacer(): c.ShardPlacer {
    this.delta ??= {};
    if (this.delta.shard_placer === undefined) {
      this.delta.shard_placer = c.ShardPlacer.clone(this.shardPlacer());
    }
    return this.delta.shard_placer!;
  }

  setShardPlacer(x: c.ShardPlacer) {
    (this.delta ??= {}).shard_placer = x;
  }

  clearShardPlacer() {
    (this.delta ??= {}).shard_placer = null;
  }
  mutableShardMuck(): c.ShardMuck {
    this.delta ??= {};
    if (this.delta.shard_muck === undefined) {
      this.delta.shard_muck = c.ShardMuck.clone(this.shardMuck());
    }
    return this.delta.shard_muck!;
  }

  setShardMuck(x: c.ShardMuck) {
    (this.delta ??= {}).shard_muck = x;
  }

  clearShardMuck() {
    (this.delta ??= {}).shard_muck = null;
  }
  mutableLabel(): c.Label {
    this.delta ??= {};
    if (this.delta.label === undefined) {
      this.delta.label = c.Label.clone(this.label());
    }
    return this.delta.label!;
  }

  setLabel(x: c.Label) {
    (this.delta ??= {}).label = x;
  }

  clearLabel() {
    (this.delta ??= {}).label = null;
  }
  mutableGrabBag(): c.GrabBag {
    this.delta ??= {};
    if (this.delta.grab_bag === undefined) {
      this.delta.grab_bag = c.GrabBag.clone(this.grabBag());
    }
    return this.delta.grab_bag!;
  }

  setGrabBag(x: c.GrabBag) {
    (this.delta ??= {}).grab_bag = x;
  }

  clearGrabBag() {
    (this.delta ??= {}).grab_bag = null;
  }
  mutableAcquisition(): c.Acquisition {
    this.delta ??= {};
    if (this.delta.acquisition === undefined) {
      this.delta.acquisition = c.Acquisition.clone(this.acquisition());
    }
    return this.delta.acquisition!;
  }

  setAcquisition(x: c.Acquisition) {
    (this.delta ??= {}).acquisition = x;
  }

  clearAcquisition() {
    (this.delta ??= {}).acquisition = null;
  }
  mutableLooseItem(): c.LooseItem {
    this.delta ??= {};
    if (this.delta.loose_item === undefined) {
      this.delta.loose_item = c.LooseItem.clone(this.looseItem());
    }
    return this.delta.loose_item!;
  }

  setLooseItem(x: c.LooseItem) {
    (this.delta ??= {}).loose_item = x;
  }

  clearLooseItem() {
    (this.delta ??= {}).loose_item = null;
  }
  mutableInventory(): c.Inventory {
    this.delta ??= {};
    if (this.delta.inventory === undefined) {
      this.delta.inventory = c.Inventory.clone(this.inventory());
    }
    return this.delta.inventory!;
  }

  setInventory(x: c.Inventory) {
    (this.delta ??= {}).inventory = x;
  }

  clearInventory() {
    (this.delta ??= {}).inventory = null;
  }
  mutableContainerInventory(): c.ContainerInventory {
    this.delta ??= {};
    if (this.delta.container_inventory === undefined) {
      this.delta.container_inventory = c.ContainerInventory.clone(
        this.containerInventory()
      );
    }
    return this.delta.container_inventory!;
  }

  setContainerInventory(x: c.ContainerInventory) {
    (this.delta ??= {}).container_inventory = x;
  }

  clearContainerInventory() {
    (this.delta ??= {}).container_inventory = null;
  }
  mutablePricedContainerInventory(): c.PricedContainerInventory {
    this.delta ??= {};
    if (this.delta.priced_container_inventory === undefined) {
      this.delta.priced_container_inventory = c.PricedContainerInventory.clone(
        this.pricedContainerInventory()
      );
    }
    return this.delta.priced_container_inventory!;
  }

  setPricedContainerInventory(x: c.PricedContainerInventory) {
    (this.delta ??= {}).priced_container_inventory = x;
  }

  clearPricedContainerInventory() {
    (this.delta ??= {}).priced_container_inventory = null;
  }
  mutableSelectedItem(): c.SelectedItem {
    this.delta ??= {};
    if (this.delta.selected_item === undefined) {
      this.delta.selected_item = c.SelectedItem.clone(this.selectedItem());
    }
    return this.delta.selected_item!;
  }

  setSelectedItem(x: c.SelectedItem) {
    (this.delta ??= {}).selected_item = x;
  }

  clearSelectedItem() {
    (this.delta ??= {}).selected_item = null;
  }
  mutableWearing(): c.Wearing {
    this.delta ??= {};
    if (this.delta.wearing === undefined) {
      this.delta.wearing = c.Wearing.clone(this.wearing());
    }
    return this.delta.wearing!;
  }

  setWearing(x: c.Wearing) {
    (this.delta ??= {}).wearing = x;
  }

  clearWearing() {
    (this.delta ??= {}).wearing = null;
  }

  setEmote(x: c.Emote) {
    (this.delta ??= {}).emote = x;
  }

  clearEmote() {
    (this.delta ??= {}).emote = null;
  }
  mutableAppearanceComponent(): c.AppearanceComponent {
    this.delta ??= {};
    if (this.delta.appearance_component === undefined) {
      this.delta.appearance_component = c.AppearanceComponent.clone(
        this.appearanceComponent()
      );
    }
    return this.delta.appearance_component!;
  }

  setAppearanceComponent(x: c.AppearanceComponent) {
    (this.delta ??= {}).appearance_component = x;
  }

  clearAppearanceComponent() {
    (this.delta ??= {}).appearance_component = null;
  }
  mutableGroupComponent(): c.GroupComponent {
    this.delta ??= {};
    if (this.delta.group_component === undefined) {
      this.delta.group_component = c.GroupComponent.clone(
        this.groupComponent()
      );
    }
    return this.delta.group_component!;
  }

  setGroupComponent(x: c.GroupComponent) {
    (this.delta ??= {}).group_component = x;
  }

  clearGroupComponent() {
    (this.delta ??= {}).group_component = null;
  }
  mutableChallenges(): c.Challenges {
    this.delta ??= {};
    if (this.delta.challenges === undefined) {
      this.delta.challenges = c.Challenges.clone(this.challenges());
    }
    return this.delta.challenges!;
  }

  setChallenges(x: c.Challenges) {
    (this.delta ??= {}).challenges = x;
  }

  clearChallenges() {
    (this.delta ??= {}).challenges = null;
  }
  mutableRecipeBook(): c.RecipeBook {
    this.delta ??= {};
    if (this.delta.recipe_book === undefined) {
      this.delta.recipe_book = c.RecipeBook.clone(this.recipeBook());
    }
    return this.delta.recipe_book!;
  }

  setRecipeBook(x: c.RecipeBook) {
    (this.delta ??= {}).recipe_book = x;
  }

  clearRecipeBook() {
    (this.delta ??= {}).recipe_book = null;
  }
  mutableExpires(): c.Expires {
    this.delta ??= {};
    if (this.delta.expires === undefined) {
      this.delta.expires = c.Expires.clone(this.expires());
    }
    return this.delta.expires!;
  }

  setExpires(x: c.Expires) {
    (this.delta ??= {}).expires = x;
  }

  clearExpires() {
    (this.delta ??= {}).expires = null;
  }
  mutableIcing(): c.Icing {
    this.delta ??= {};
    if (this.delta.icing === undefined) {
      this.delta.icing = c.Icing.clone(this.icing());
    }
    return this.delta.icing!;
  }

  setIcing(x: c.Icing) {
    (this.delta ??= {}).icing = x;
  }

  clearIcing() {
    (this.delta ??= {}).icing = null;
  }
  mutableWarpable(): c.Warpable {
    this.delta ??= {};
    if (this.delta.warpable === undefined) {
      this.delta.warpable = c.Warpable.clone(this.warpable());
    }
    return this.delta.warpable!;
  }

  setWarpable(x: c.Warpable) {
    (this.delta ??= {}).warpable = x;
  }

  clearWarpable() {
    (this.delta ??= {}).warpable = null;
  }
  mutablePlayerStatus(): c.PlayerStatus {
    this.delta ??= {};
    if (this.delta.player_status === undefined) {
      this.delta.player_status = c.PlayerStatus.clone(this.playerStatus());
    }
    return this.delta.player_status!;
  }

  setPlayerStatus(x: c.PlayerStatus) {
    (this.delta ??= {}).player_status = x;
  }

  clearPlayerStatus() {
    (this.delta ??= {}).player_status = null;
  }
  mutablePlayerBehavior(): c.PlayerBehavior {
    this.delta ??= {};
    if (this.delta.player_behavior === undefined) {
      this.delta.player_behavior = c.PlayerBehavior.clone(
        this.playerBehavior()
      );
    }
    return this.delta.player_behavior!;
  }

  setPlayerBehavior(x: c.PlayerBehavior) {
    (this.delta ??= {}).player_behavior = x;
  }

  clearPlayerBehavior() {
    (this.delta ??= {}).player_behavior = null;
  }
  mutableWorldMetadata(): c.WorldMetadata {
    this.delta ??= {};
    if (this.delta.world_metadata === undefined) {
      this.delta.world_metadata = c.WorldMetadata.clone(this.worldMetadata());
    }
    return this.delta.world_metadata!;
  }

  setWorldMetadata(x: c.WorldMetadata) {
    (this.delta ??= {}).world_metadata = x;
  }

  clearWorldMetadata() {
    (this.delta ??= {}).world_metadata = null;
  }
  mutableNpcMetadata(): c.NpcMetadata {
    this.delta ??= {};
    if (this.delta.npc_metadata === undefined) {
      this.delta.npc_metadata = c.NpcMetadata.clone(this.npcMetadata());
    }
    return this.delta.npc_metadata!;
  }

  setNpcMetadata(x: c.NpcMetadata) {
    (this.delta ??= {}).npc_metadata = x;
  }

  clearNpcMetadata() {
    (this.delta ??= {}).npc_metadata = null;
  }

  setNpcState(x: c.NpcState) {
    (this.delta ??= {}).npc_state = x;
  }

  clearNpcState() {
    (this.delta ??= {}).npc_state = null;
  }
  mutableGroupPreviewReference(): c.GroupPreviewReference {
    this.delta ??= {};
    if (this.delta.group_preview_reference === undefined) {
      this.delta.group_preview_reference = c.GroupPreviewReference.clone(
        this.groupPreviewReference()
      );
    }
    return this.delta.group_preview_reference!;
  }

  setGroupPreviewReference(x: c.GroupPreviewReference) {
    (this.delta ??= {}).group_preview_reference = x;
  }

  clearGroupPreviewReference() {
    (this.delta ??= {}).group_preview_reference = null;
  }
  mutableAclComponent(): c.AclComponent {
    this.delta ??= {};
    if (this.delta.acl_component === undefined) {
      this.delta.acl_component = c.AclComponent.clone(this.aclComponent());
    }
    return this.delta.acl_component!;
  }

  setAclComponent(x: c.AclComponent) {
    (this.delta ??= {}).acl_component = x;
  }

  clearAclComponent() {
    (this.delta ??= {}).acl_component = null;
  }
  mutableDeedComponent(): c.DeedComponent {
    this.delta ??= {};
    if (this.delta.deed_component === undefined) {
      this.delta.deed_component = c.DeedComponent.clone(this.deedComponent());
    }
    return this.delta.deed_component!;
  }

  setDeedComponent(x: c.DeedComponent) {
    (this.delta ??= {}).deed_component = x;
  }

  clearDeedComponent() {
    (this.delta ??= {}).deed_component = null;
  }
  mutableGroupPreviewComponent(): c.GroupPreviewComponent {
    this.delta ??= {};
    if (this.delta.group_preview_component === undefined) {
      this.delta.group_preview_component = c.GroupPreviewComponent.clone(
        this.groupPreviewComponent()
      );
    }
    return this.delta.group_preview_component!;
  }

  setGroupPreviewComponent(x: c.GroupPreviewComponent) {
    (this.delta ??= {}).group_preview_component = x;
  }

  clearGroupPreviewComponent() {
    (this.delta ??= {}).group_preview_component = null;
  }
  mutableBlueprintComponent(): c.BlueprintComponent {
    this.delta ??= {};
    if (this.delta.blueprint_component === undefined) {
      this.delta.blueprint_component = c.BlueprintComponent.clone(
        this.blueprintComponent()
      );
    }
    return this.delta.blueprint_component!;
  }

  setBlueprintComponent(x: c.BlueprintComponent) {
    (this.delta ??= {}).blueprint_component = x;
  }

  clearBlueprintComponent() {
    (this.delta ??= {}).blueprint_component = null;
  }
  setCraftingStationComponent() {
    (this.delta ??= {}).crafting_station_component =
      c.CraftingStationComponent.create();
  }

  clearCraftingStationComponent() {
    (this.delta ??= {}).crafting_station_component = null;
  }
  mutableHealth(): c.Health {
    this.delta ??= {};
    if (this.delta.health === undefined) {
      this.delta.health = c.Health.clone(this.health());
    }
    return this.delta.health!;
  }

  setHealth(x: c.Health) {
    (this.delta ??= {}).health = x;
  }

  clearHealth() {
    (this.delta ??= {}).health = null;
  }
  mutableBuffsComponent(): c.BuffsComponent {
    this.delta ??= {};
    if (this.delta.buffs_component === undefined) {
      this.delta.buffs_component = c.BuffsComponent.clone(
        this.buffsComponent()
      );
    }
    return this.delta.buffs_component!;
  }

  setBuffsComponent(x: c.BuffsComponent) {
    (this.delta ??= {}).buffs_component = x;
  }

  clearBuffsComponent() {
    (this.delta ??= {}).buffs_component = null;
  }
  setGremlin() {
    (this.delta ??= {}).gremlin = c.Gremlin.create();
  }

  clearGremlin() {
    (this.delta ??= {}).gremlin = null;
  }
  mutablePlaceableComponent(): c.PlaceableComponent {
    this.delta ??= {};
    if (this.delta.placeable_component === undefined) {
      this.delta.placeable_component = c.PlaceableComponent.clone(
        this.placeableComponent()
      );
    }
    return this.delta.placeable_component!;
  }

  setPlaceableComponent(x: c.PlaceableComponent) {
    (this.delta ??= {}).placeable_component = x;
  }

  clearPlaceableComponent() {
    (this.delta ??= {}).placeable_component = null;
  }
  mutableGroupedEntities(): c.GroupedEntities {
    this.delta ??= {};
    if (this.delta.grouped_entities === undefined) {
      this.delta.grouped_entities = c.GroupedEntities.clone(
        this.groupedEntities()
      );
    }
    return this.delta.grouped_entities!;
  }

  setGroupedEntities(x: c.GroupedEntities) {
    (this.delta ??= {}).grouped_entities = x;
  }

  clearGroupedEntities() {
    (this.delta ??= {}).grouped_entities = null;
  }
  mutableInGroup(): c.InGroup {
    this.delta ??= {};
    if (this.delta.in_group === undefined) {
      this.delta.in_group = c.InGroup.clone(this.inGroup());
    }
    return this.delta.in_group!;
  }

  setInGroup(x: c.InGroup) {
    (this.delta ??= {}).in_group = x;
  }

  clearInGroup() {
    (this.delta ??= {}).in_group = null;
  }
  mutablePictureFrameContents(): c.PictureFrameContents {
    this.delta ??= {};
    if (this.delta.picture_frame_contents === undefined) {
      this.delta.picture_frame_contents = c.PictureFrameContents.clone(
        this.pictureFrameContents()
      );
    }
    return this.delta.picture_frame_contents!;
  }

  setPictureFrameContents(x: c.PictureFrameContents) {
    (this.delta ??= {}).picture_frame_contents = x;
  }

  clearPictureFrameContents() {
    (this.delta ??= {}).picture_frame_contents = null;
  }
  mutableTriggerState(): c.TriggerState {
    this.delta ??= {};
    if (this.delta.trigger_state === undefined) {
      this.delta.trigger_state = c.TriggerState.clone(this.triggerState());
    }
    return this.delta.trigger_state!;
  }

  setTriggerState(x: c.TriggerState) {
    (this.delta ??= {}).trigger_state = x;
  }

  clearTriggerState() {
    (this.delta ??= {}).trigger_state = null;
  }
  mutableLifetimeStats(): c.LifetimeStats {
    this.delta ??= {};
    if (this.delta.lifetime_stats === undefined) {
      this.delta.lifetime_stats = c.LifetimeStats.clone(this.lifetimeStats());
    }
    return this.delta.lifetime_stats!;
  }

  setLifetimeStats(x: c.LifetimeStats) {
    (this.delta ??= {}).lifetime_stats = x;
  }

  clearLifetimeStats() {
    (this.delta ??= {}).lifetime_stats = null;
  }
  mutableOccupancyComponent(): c.OccupancyComponent {
    this.delta ??= {};
    if (this.delta.occupancy_component === undefined) {
      this.delta.occupancy_component = c.OccupancyComponent.clone(
        this.occupancyComponent()
      );
    }
    return this.delta.occupancy_component!;
  }

  setOccupancyComponent(x: c.OccupancyComponent) {
    (this.delta ??= {}).occupancy_component = x;
  }

  clearOccupancyComponent() {
    (this.delta ??= {}).occupancy_component = null;
  }
  mutableVideoComponent(): c.VideoComponent {
    this.delta ??= {};
    if (this.delta.video_component === undefined) {
      this.delta.video_component = c.VideoComponent.clone(
        this.videoComponent()
      );
    }
    return this.delta.video_component!;
  }

  setVideoComponent(x: c.VideoComponent) {
    (this.delta ??= {}).video_component = x;
  }

  clearVideoComponent() {
    (this.delta ??= {}).video_component = null;
  }
  mutablePlayerSession(): c.PlayerSession {
    this.delta ??= {};
    if (this.delta.player_session === undefined) {
      this.delta.player_session = c.PlayerSession.clone(this.playerSession());
    }
    return this.delta.player_session!;
  }

  setPlayerSession(x: c.PlayerSession) {
    (this.delta ??= {}).player_session = x;
  }

  clearPlayerSession() {
    (this.delta ??= {}).player_session = null;
  }
  mutablePresetApplied(): c.PresetApplied {
    this.delta ??= {};
    if (this.delta.preset_applied === undefined) {
      this.delta.preset_applied = c.PresetApplied.clone(this.presetApplied());
    }
    return this.delta.preset_applied!;
  }

  setPresetApplied(x: c.PresetApplied) {
    (this.delta ??= {}).preset_applied = x;
  }

  clearPresetApplied() {
    (this.delta ??= {}).preset_applied = null;
  }
  mutablePresetPrototype(): c.PresetPrototype {
    this.delta ??= {};
    if (this.delta.preset_prototype === undefined) {
      this.delta.preset_prototype = c.PresetPrototype.clone(
        this.presetPrototype()
      );
    }
    return this.delta.preset_prototype!;
  }

  setPresetPrototype(x: c.PresetPrototype) {
    (this.delta ??= {}).preset_prototype = x;
  }

  clearPresetPrototype() {
    (this.delta ??= {}).preset_prototype = null;
  }
  mutableFarmingPlantComponent(): c.FarmingPlantComponent {
    this.delta ??= {};
    if (this.delta.farming_plant_component === undefined) {
      this.delta.farming_plant_component = c.FarmingPlantComponent.clone(
        this.farmingPlantComponent()
      );
    }
    return this.delta.farming_plant_component!;
  }

  setFarmingPlantComponent(x: c.FarmingPlantComponent) {
    (this.delta ??= {}).farming_plant_component = x;
  }

  clearFarmingPlantComponent() {
    (this.delta ??= {}).farming_plant_component = null;
  }
  mutableShardFarming(): c.ShardFarming {
    this.delta ??= {};
    if (this.delta.shard_farming === undefined) {
      this.delta.shard_farming = c.ShardFarming.clone(this.shardFarming());
    }
    return this.delta.shard_farming!;
  }

  setShardFarming(x: c.ShardFarming) {
    (this.delta ??= {}).shard_farming = x;
  }

  clearShardFarming() {
    (this.delta ??= {}).shard_farming = null;
  }
  mutableCreatedBy(): c.CreatedBy {
    this.delta ??= {};
    if (this.delta.created_by === undefined) {
      this.delta.created_by = c.CreatedBy.clone(this.createdBy());
    }
    return this.delta.created_by!;
  }

  setCreatedBy(x: c.CreatedBy) {
    (this.delta ??= {}).created_by = x;
  }

  clearCreatedBy() {
    (this.delta ??= {}).created_by = null;
  }
  mutableMinigameComponent(): c.MinigameComponent {
    this.delta ??= {};
    if (this.delta.minigame_component === undefined) {
      this.delta.minigame_component = c.MinigameComponent.clone(
        this.minigameComponent()
      );
    }
    return this.delta.minigame_component!;
  }

  setMinigameComponent(x: c.MinigameComponent) {
    (this.delta ??= {}).minigame_component = x;
  }

  clearMinigameComponent() {
    (this.delta ??= {}).minigame_component = null;
  }
  mutableMinigameInstance(): c.MinigameInstance {
    this.delta ??= {};
    if (this.delta.minigame_instance === undefined) {
      this.delta.minigame_instance = c.MinigameInstance.clone(
        this.minigameInstance()
      );
    }
    return this.delta.minigame_instance!;
  }

  setMinigameInstance(x: c.MinigameInstance) {
    (this.delta ??= {}).minigame_instance = x;
  }

  clearMinigameInstance() {
    (this.delta ??= {}).minigame_instance = null;
  }
  mutablePlayingMinigame(): c.PlayingMinigame {
    this.delta ??= {};
    if (this.delta.playing_minigame === undefined) {
      this.delta.playing_minigame = c.PlayingMinigame.clone(
        this.playingMinigame()
      );
    }
    return this.delta.playing_minigame!;
  }

  setPlayingMinigame(x: c.PlayingMinigame) {
    (this.delta ??= {}).playing_minigame = x;
  }

  clearPlayingMinigame() {
    (this.delta ??= {}).playing_minigame = null;
  }
  mutableMinigameElement(): c.MinigameElement {
    this.delta ??= {};
    if (this.delta.minigame_element === undefined) {
      this.delta.minigame_element = c.MinigameElement.clone(
        this.minigameElement()
      );
    }
    return this.delta.minigame_element!;
  }

  setMinigameElement(x: c.MinigameElement) {
    (this.delta ??= {}).minigame_element = x;
  }

  clearMinigameElement() {
    (this.delta ??= {}).minigame_element = null;
  }
  mutableActiveTray(): c.ActiveTray {
    this.delta ??= {};
    if (this.delta.active_tray === undefined) {
      this.delta.active_tray = c.ActiveTray.clone(this.activeTray());
    }
    return this.delta.active_tray!;
  }

  setActiveTray(x: c.ActiveTray) {
    (this.delta ??= {}).active_tray = x;
  }

  clearActiveTray() {
    (this.delta ??= {}).active_tray = null;
  }
  mutableStashed(): c.Stashed {
    this.delta ??= {};
    if (this.delta.stashed === undefined) {
      this.delta.stashed = c.Stashed.clone(this.stashed());
    }
    return this.delta.stashed!;
  }

  setStashed(x: c.Stashed) {
    (this.delta ??= {}).stashed = x;
  }

  clearStashed() {
    (this.delta ??= {}).stashed = null;
  }
  mutableMinigameInstanceTickInfo(): c.MinigameInstanceTickInfo {
    this.delta ??= {};
    if (this.delta.minigame_instance_tick_info === undefined) {
      this.delta.minigame_instance_tick_info = c.MinigameInstanceTickInfo.clone(
        this.minigameInstanceTickInfo()
      );
    }
    return this.delta.minigame_instance_tick_info!;
  }

  setMinigameInstanceTickInfo(x: c.MinigameInstanceTickInfo) {
    (this.delta ??= {}).minigame_instance_tick_info = x;
  }

  clearMinigameInstanceTickInfo() {
    (this.delta ??= {}).minigame_instance_tick_info = null;
  }
  mutableWarpingTo(): c.WarpingTo {
    this.delta ??= {};
    if (this.delta.warping_to === undefined) {
      this.delta.warping_to = c.WarpingTo.clone(this.warpingTo());
    }
    return this.delta.warping_to!;
  }

  setWarpingTo(x: c.WarpingTo) {
    (this.delta ??= {}).warping_to = x;
  }

  clearWarpingTo() {
    (this.delta ??= {}).warping_to = null;
  }
  mutableMinigameInstanceExpire(): c.MinigameInstanceExpire {
    this.delta ??= {};
    if (this.delta.minigame_instance_expire === undefined) {
      this.delta.minigame_instance_expire = c.MinigameInstanceExpire.clone(
        this.minigameInstanceExpire()
      );
    }
    return this.delta.minigame_instance_expire!;
  }

  setMinigameInstanceExpire(x: c.MinigameInstanceExpire) {
    (this.delta ??= {}).minigame_instance_expire = x;
  }

  clearMinigameInstanceExpire() {
    (this.delta ??= {}).minigame_instance_expire = null;
  }
  mutablePlacerComponent(): c.PlacerComponent {
    this.delta ??= {};
    if (this.delta.placer_component === undefined) {
      this.delta.placer_component = c.PlacerComponent.clone(
        this.placerComponent()
      );
    }
    return this.delta.placer_component!;
  }

  setPlacerComponent(x: c.PlacerComponent) {
    (this.delta ??= {}).placer_component = x;
  }

  clearPlacerComponent() {
    (this.delta ??= {}).placer_component = null;
  }
  mutableQuestGiver(): c.QuestGiver {
    this.delta ??= {};
    if (this.delta.quest_giver === undefined) {
      this.delta.quest_giver = c.QuestGiver.clone(this.questGiver());
    }
    return this.delta.quest_giver!;
  }

  setQuestGiver(x: c.QuestGiver) {
    (this.delta ??= {}).quest_giver = x;
  }

  clearQuestGiver() {
    (this.delta ??= {}).quest_giver = null;
  }
  mutableDefaultDialog(): c.DefaultDialog {
    this.delta ??= {};
    if (this.delta.default_dialog === undefined) {
      this.delta.default_dialog = c.DefaultDialog.clone(this.defaultDialog());
    }
    return this.delta.default_dialog!;
  }

  setDefaultDialog(x: c.DefaultDialog) {
    (this.delta ??= {}).default_dialog = x;
  }

  clearDefaultDialog() {
    (this.delta ??= {}).default_dialog = null;
  }
  mutableUnmuck(): c.Unmuck {
    this.delta ??= {};
    if (this.delta.unmuck === undefined) {
      this.delta.unmuck = c.Unmuck.clone(this.unmuck());
    }
    return this.delta.unmuck!;
  }

  setUnmuck(x: c.Unmuck) {
    (this.delta ??= {}).unmuck = x;
  }

  clearUnmuck() {
    (this.delta ??= {}).unmuck = null;
  }
  mutableRobotComponent(): c.RobotComponent {
    this.delta ??= {};
    if (this.delta.robot_component === undefined) {
      this.delta.robot_component = c.RobotComponent.clone(
        this.robotComponent()
      );
    }
    return this.delta.robot_component!;
  }

  setRobotComponent(x: c.RobotComponent) {
    (this.delta ??= {}).robot_component = x;
  }

  clearRobotComponent() {
    (this.delta ??= {}).robot_component = null;
  }
  setAdminEntity() {
    (this.delta ??= {}).admin_entity = c.AdminEntity.create();
  }

  clearAdminEntity() {
    (this.delta ??= {}).admin_entity = null;
  }
  mutableProtection(): c.Protection {
    this.delta ??= {};
    if (this.delta.protection === undefined) {
      this.delta.protection = c.Protection.clone(this.protection());
    }
    return this.delta.protection!;
  }

  setProtection(x: c.Protection) {
    (this.delta ??= {}).protection = x;
  }

  clearProtection() {
    (this.delta ??= {}).protection = null;
  }
  mutableProjectsProtection(): c.ProjectsProtection {
    this.delta ??= {};
    if (this.delta.projects_protection === undefined) {
      this.delta.projects_protection = c.ProjectsProtection.clone(
        this.projectsProtection()
      );
    }
    return this.delta.projects_protection!;
  }

  setProjectsProtection(x: c.ProjectsProtection) {
    (this.delta ??= {}).projects_protection = x;
  }

  clearProjectsProtection() {
    (this.delta ??= {}).projects_protection = null;
  }
  mutableDeletesWith(): c.DeletesWith {
    this.delta ??= {};
    if (this.delta.deletes_with === undefined) {
      this.delta.deletes_with = c.DeletesWith.clone(this.deletesWith());
    }
    return this.delta.deletes_with!;
  }

  setDeletesWith(x: c.DeletesWith) {
    (this.delta ??= {}).deletes_with = x;
  }

  clearDeletesWith() {
    (this.delta ??= {}).deletes_with = null;
  }
  mutableItemBuyer(): c.ItemBuyer {
    this.delta ??= {};
    if (this.delta.item_buyer === undefined) {
      this.delta.item_buyer = c.ItemBuyer.clone(this.itemBuyer());
    }
    return this.delta.item_buyer!;
  }

  setItemBuyer(x: c.ItemBuyer) {
    (this.delta ??= {}).item_buyer = x;
  }

  clearItemBuyer() {
    (this.delta ??= {}).item_buyer = null;
  }
  mutableInspectionTweaks(): c.InspectionTweaks {
    this.delta ??= {};
    if (this.delta.inspection_tweaks === undefined) {
      this.delta.inspection_tweaks = c.InspectionTweaks.clone(
        this.inspectionTweaks()
      );
    }
    return this.delta.inspection_tweaks!;
  }

  setInspectionTweaks(x: c.InspectionTweaks) {
    (this.delta ??= {}).inspection_tweaks = x;
  }

  clearInspectionTweaks() {
    (this.delta ??= {}).inspection_tweaks = null;
  }
  mutableProfilePic(): c.ProfilePic {
    this.delta ??= {};
    if (this.delta.profile_pic === undefined) {
      this.delta.profile_pic = c.ProfilePic.clone(this.profilePic());
    }
    return this.delta.profile_pic!;
  }

  setProfilePic(x: c.ProfilePic) {
    (this.delta ??= {}).profile_pic = x;
  }

  clearProfilePic() {
    (this.delta ??= {}).profile_pic = null;
  }
  mutableEntityDescription(): c.EntityDescription {
    this.delta ??= {};
    if (this.delta.entity_description === undefined) {
      this.delta.entity_description = c.EntityDescription.clone(
        this.entityDescription()
      );
    }
    return this.delta.entity_description!;
  }

  setEntityDescription(x: c.EntityDescription) {
    (this.delta ??= {}).entity_description = x;
  }

  clearEntityDescription() {
    (this.delta ??= {}).entity_description = null;
  }
  mutableLandmark(): c.Landmark {
    this.delta ??= {};
    if (this.delta.landmark === undefined) {
      this.delta.landmark = c.Landmark.clone(this.landmark());
    }
    return this.delta.landmark!;
  }

  setLandmark(x: c.Landmark) {
    (this.delta ??= {}).landmark = x;
  }

  clearLandmark() {
    (this.delta ??= {}).landmark = null;
  }
  setCollideable() {
    (this.delta ??= {}).collideable = c.Collideable.create();
  }

  clearCollideable() {
    (this.delta ??= {}).collideable = null;
  }
  mutableRestoration(): c.Restoration {
    this.delta ??= {};
    if (this.delta.restoration === undefined) {
      this.delta.restoration = c.Restoration.clone(this.restoration());
    }
    return this.delta.restoration!;
  }

  setRestoration(x: c.Restoration) {
    (this.delta ??= {}).restoration = x;
  }

  clearRestoration() {
    (this.delta ??= {}).restoration = null;
  }
  mutableTerrainRestorationDiff(): c.TerrainRestorationDiff {
    this.delta ??= {};
    if (this.delta.terrain_restoration_diff === undefined) {
      this.delta.terrain_restoration_diff = c.TerrainRestorationDiff.clone(
        this.terrainRestorationDiff()
      );
    }
    return this.delta.terrain_restoration_diff!;
  }

  setTerrainRestorationDiff(x: c.TerrainRestorationDiff) {
    (this.delta ??= {}).terrain_restoration_diff = x;
  }

  clearTerrainRestorationDiff() {
    (this.delta ??= {}).terrain_restoration_diff = null;
  }
  mutableTeam(): c.Team {
    this.delta ??= {};
    if (this.delta.team === undefined) {
      this.delta.team = c.Team.clone(this.team());
    }
    return this.delta.team!;
  }

  setTeam(x: c.Team) {
    (this.delta ??= {}).team = x;
  }

  clearTeam() {
    (this.delta ??= {}).team = null;
  }
  mutablePlayerCurrentTeam(): c.PlayerCurrentTeam {
    this.delta ??= {};
    if (this.delta.player_current_team === undefined) {
      this.delta.player_current_team = c.PlayerCurrentTeam.clone(
        this.playerCurrentTeam()
      );
    }
    return this.delta.player_current_team!;
  }

  setPlayerCurrentTeam(x: c.PlayerCurrentTeam) {
    (this.delta ??= {}).player_current_team = x;
  }

  clearPlayerCurrentTeam() {
    (this.delta ??= {}).player_current_team = null;
  }
  mutableUserRoles(): c.UserRoles {
    this.delta ??= {};
    if (this.delta.user_roles === undefined) {
      this.delta.user_roles = c.UserRoles.clone(this.userRoles());
    }
    return this.delta.user_roles!;
  }

  setUserRoles(x: c.UserRoles) {
    (this.delta ??= {}).user_roles = x;
  }

  clearUserRoles() {
    (this.delta ??= {}).user_roles = null;
  }
  mutableRestoresTo(): c.RestoresTo {
    this.delta ??= {};
    if (this.delta.restores_to === undefined) {
      this.delta.restores_to = c.RestoresTo.clone(this.restoresTo());
    }
    return this.delta.restores_to!;
  }

  setRestoresTo(x: c.RestoresTo) {
    (this.delta ??= {}).restores_to = x;
  }

  clearRestoresTo() {
    (this.delta ??= {}).restores_to = null;
  }
  mutableTrade(): c.Trade {
    this.delta ??= {};
    if (this.delta.trade === undefined) {
      this.delta.trade = c.Trade.clone(this.trade());
    }
    return this.delta.trade!;
  }

  setTrade(x: c.Trade) {
    (this.delta ??= {}).trade = x;
  }

  clearTrade() {
    (this.delta ??= {}).trade = null;
  }
  mutableActiveTrades(): c.ActiveTrades {
    this.delta ??= {};
    if (this.delta.active_trades === undefined) {
      this.delta.active_trades = c.ActiveTrades.clone(this.activeTrades());
    }
    return this.delta.active_trades!;
  }

  setActiveTrades(x: c.ActiveTrades) {
    (this.delta ??= {}).active_trades = x;
  }

  clearActiveTrades() {
    (this.delta ??= {}).active_trades = null;
  }
  mutablePlacedBy(): c.PlacedBy {
    this.delta ??= {};
    if (this.delta.placed_by === undefined) {
      this.delta.placed_by = c.PlacedBy.clone(this.placedBy());
    }
    return this.delta.placed_by!;
  }

  setPlacedBy(x: c.PlacedBy) {
    (this.delta ??= {}).placed_by = x;
  }

  clearPlacedBy() {
    (this.delta ??= {}).placed_by = null;
  }
  mutableTextSign(): c.TextSign {
    this.delta ??= {};
    if (this.delta.text_sign === undefined) {
      this.delta.text_sign = c.TextSign.clone(this.textSign());
    }
    return this.delta.text_sign!;
  }

  setTextSign(x: c.TextSign) {
    (this.delta ??= {}).text_sign = x;
  }

  clearTextSign() {
    (this.delta ??= {}).text_sign = null;
  }
  mutableIrradiance(): c.Irradiance {
    this.delta ??= {};
    if (this.delta.irradiance === undefined) {
      this.delta.irradiance = c.Irradiance.clone(this.irradiance());
    }
    return this.delta.irradiance!;
  }

  setIrradiance(x: c.Irradiance) {
    (this.delta ??= {}).irradiance = x;
  }

  clearIrradiance() {
    (this.delta ??= {}).irradiance = null;
  }
  setLockedInPlace() {
    (this.delta ??= {}).locked_in_place = c.LockedInPlace.create();
  }

  clearLockedInPlace() {
    (this.delta ??= {}).locked_in_place = null;
  }
  mutableDeathInfo(): c.DeathInfo {
    this.delta ??= {};
    if (this.delta.death_info === undefined) {
      this.delta.death_info = c.DeathInfo.clone(this.deathInfo());
    }
    return this.delta.death_info!;
  }

  setDeathInfo(x: c.DeathInfo) {
    (this.delta ??= {}).death_info = x;
  }

  clearDeathInfo() {
    (this.delta ??= {}).death_info = null;
  }
  mutableSyntheticStats(): c.SyntheticStats {
    this.delta ??= {};
    if (this.delta.synthetic_stats === undefined) {
      this.delta.synthetic_stats = c.SyntheticStats.clone(
        this.syntheticStats()
      );
    }
    return this.delta.synthetic_stats!;
  }

  setSyntheticStats(x: c.SyntheticStats) {
    (this.delta ??= {}).synthetic_stats = x;
  }

  clearSyntheticStats() {
    (this.delta ??= {}).synthetic_stats = null;
  }
  setIdle() {
    (this.delta ??= {}).idle = c.Idle.create();
  }

  clearIdle() {
    (this.delta ??= {}).idle = null;
  }
  mutableVoice(): c.Voice {
    this.delta ??= {};
    if (this.delta.voice === undefined) {
      this.delta.voice = c.Voice.clone(this.voice());
    }
    return this.delta.voice!;
  }

  setVoice(x: c.Voice) {
    (this.delta ??= {}).voice = x;
  }

  clearVoice() {
    (this.delta ??= {}).voice = null;
  }
  mutableGiftGiver(): c.GiftGiver {
    this.delta ??= {};
    if (this.delta.gift_giver === undefined) {
      this.delta.gift_giver = c.GiftGiver.clone(this.giftGiver());
    }
    return this.delta.gift_giver!;
  }

  setGiftGiver(x: c.GiftGiver) {
    (this.delta ??= {}).gift_giver = x;
  }

  clearGiftGiver() {
    (this.delta ??= {}).gift_giver = null;
  }

  apply(delta: RawDelta) {
    if (this.delta === undefined) {
      this.delta = delta;
    } else {
      this.delta = {
        ...this.delta,
        ...delta,
      };
    }
  }
}

type SnakeToCamelCase<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamelCase<U>>}`
  : S;

export interface SuperReadonlyDelta extends ReadonlyDelta {
  readonly id: BiomesId;
  iced(): c.Iced;
  remoteConnection(): c.RemoteConnection;
  position(): c.Position;
  orientation(): c.Orientation;
  rigidBody(): c.RigidBody;
  size(): c.Size;
  box(): c.Box;
  shardSeed(): c.ShardSeed;
  shardDiff(): c.ShardDiff;
  shardShapes(): c.ShardShapes;
  shardSkyOcclusion(): c.ShardSkyOcclusion;
  shardIrradiance(): c.ShardIrradiance;
  shardWater(): c.ShardWater;
  shardOccupancy(): c.ShardOccupancy;
  shardDye(): c.ShardDye;
  shardMoisture(): c.ShardMoisture;
  shardGrowth(): c.ShardGrowth;
  shardPlacer(): c.ShardPlacer;
  shardMuck(): c.ShardMuck;
  label(): c.Label;
  grabBag(): c.GrabBag;
  acquisition(): c.Acquisition;
  looseItem(): c.LooseItem;
  inventory(): c.Inventory;
  containerInventory(): c.ContainerInventory;
  pricedContainerInventory(): c.PricedContainerInventory;
  selectedItem(): c.SelectedItem;
  wearing(): c.Wearing;
  emote(): c.Emote;
  appearanceComponent(): c.AppearanceComponent;
  groupComponent(): c.GroupComponent;
  challenges(): c.Challenges;
  recipeBook(): c.RecipeBook;
  expires(): c.Expires;
  icing(): c.Icing;
  warpable(): c.Warpable;
  playerStatus(): c.PlayerStatus;
  playerBehavior(): c.PlayerBehavior;
  worldMetadata(): c.WorldMetadata;
  npcMetadata(): c.NpcMetadata;
  npcState(): c.NpcState;
  groupPreviewReference(): c.GroupPreviewReference;
  aclComponent(): c.AclComponent;
  deedComponent(): c.DeedComponent;
  groupPreviewComponent(): c.GroupPreviewComponent;
  blueprintComponent(): c.BlueprintComponent;
  craftingStationComponent(): c.CraftingStationComponent;
  health(): c.Health;
  buffsComponent(): c.BuffsComponent;
  gremlin(): c.Gremlin;
  placeableComponent(): c.PlaceableComponent;
  groupedEntities(): c.GroupedEntities;
  inGroup(): c.InGroup;
  pictureFrameContents(): c.PictureFrameContents;
  triggerState(): c.TriggerState;
  lifetimeStats(): c.LifetimeStats;
  occupancyComponent(): c.OccupancyComponent;
  videoComponent(): c.VideoComponent;
  playerSession(): c.PlayerSession;
  presetApplied(): c.PresetApplied;
  presetPrototype(): c.PresetPrototype;
  farmingPlantComponent(): c.FarmingPlantComponent;
  shardFarming(): c.ShardFarming;
  createdBy(): c.CreatedBy;
  minigameComponent(): c.MinigameComponent;
  minigameInstance(): c.MinigameInstance;
  playingMinigame(): c.PlayingMinigame;
  minigameElement(): c.MinigameElement;
  activeTray(): c.ActiveTray;
  stashed(): c.Stashed;
  minigameInstanceTickInfo(): c.MinigameInstanceTickInfo;
  warpingTo(): c.WarpingTo;
  minigameInstanceExpire(): c.MinigameInstanceExpire;
  placerComponent(): c.PlacerComponent;
  questGiver(): c.QuestGiver;
  defaultDialog(): c.DefaultDialog;
  unmuck(): c.Unmuck;
  robotComponent(): c.RobotComponent;
  adminEntity(): c.AdminEntity;
  protection(): c.Protection;
  projectsProtection(): c.ProjectsProtection;
  deletesWith(): c.DeletesWith;
  itemBuyer(): c.ItemBuyer;
  inspectionTweaks(): c.InspectionTweaks;
  profilePic(): c.ProfilePic;
  entityDescription(): c.EntityDescription;
  landmark(): c.Landmark;
  collideable(): c.Collideable;
  restoration(): c.Restoration;
  terrainRestorationDiff(): c.TerrainRestorationDiff;
  team(): c.Team;
  playerCurrentTeam(): c.PlayerCurrentTeam;
  userRoles(): c.UserRoles;
  restoresTo(): c.RestoresTo;
  trade(): c.Trade;
  activeTrades(): c.ActiveTrades;
  placedBy(): c.PlacedBy;
  textSign(): c.TextSign;
  irradiance(): c.Irradiance;
  lockedInPlace(): c.LockedInPlace;
  deathInfo(): c.DeathInfo;
  syntheticStats(): c.SyntheticStats;
  idle(): c.Idle;
  voice(): c.Voice;
  giftGiver(): c.GiftGiver;
}

export type ReadonlyDeltaWith<C extends keyof ReadonlyEntity> = (Pick<
  SuperDelta,
  SnakeToCamelCase<C> & keyof SuperDelta
> & { staleOk(): ReadonlyDeltaWith<C> } & Omit<
    ReadonlyDelta,
    SnakeToCamelCase<C>
  >) &
  ReadonlyDelta;

export interface SuperDelta extends Delta {
  readonly id: BiomesId;
  iced(): c.Iced;
  remoteConnection(): c.RemoteConnection;
  position(): c.Position;
  orientation(): c.Orientation;
  rigidBody(): c.RigidBody;
  size(): c.Size;
  box(): c.Box;
  shardSeed(): c.ShardSeed;
  shardDiff(): c.ShardDiff;
  shardShapes(): c.ShardShapes;
  shardSkyOcclusion(): c.ShardSkyOcclusion;
  shardIrradiance(): c.ShardIrradiance;
  shardWater(): c.ShardWater;
  shardOccupancy(): c.ShardOccupancy;
  shardDye(): c.ShardDye;
  shardMoisture(): c.ShardMoisture;
  shardGrowth(): c.ShardGrowth;
  shardPlacer(): c.ShardPlacer;
  shardMuck(): c.ShardMuck;
  label(): c.Label;
  grabBag(): c.GrabBag;
  acquisition(): c.Acquisition;
  looseItem(): c.LooseItem;
  inventory(): c.Inventory;
  containerInventory(): c.ContainerInventory;
  pricedContainerInventory(): c.PricedContainerInventory;
  selectedItem(): c.SelectedItem;
  wearing(): c.Wearing;
  emote(): c.Emote;
  appearanceComponent(): c.AppearanceComponent;
  groupComponent(): c.GroupComponent;
  challenges(): c.Challenges;
  recipeBook(): c.RecipeBook;
  expires(): c.Expires;
  icing(): c.Icing;
  warpable(): c.Warpable;
  playerStatus(): c.PlayerStatus;
  playerBehavior(): c.PlayerBehavior;
  worldMetadata(): c.WorldMetadata;
  npcMetadata(): c.NpcMetadata;
  npcState(): c.NpcState;
  groupPreviewReference(): c.GroupPreviewReference;
  aclComponent(): c.AclComponent;
  deedComponent(): c.DeedComponent;
  groupPreviewComponent(): c.GroupPreviewComponent;
  blueprintComponent(): c.BlueprintComponent;
  craftingStationComponent(): c.CraftingStationComponent;
  health(): c.Health;
  buffsComponent(): c.BuffsComponent;
  gremlin(): c.Gremlin;
  placeableComponent(): c.PlaceableComponent;
  groupedEntities(): c.GroupedEntities;
  inGroup(): c.InGroup;
  pictureFrameContents(): c.PictureFrameContents;
  triggerState(): c.TriggerState;
  lifetimeStats(): c.LifetimeStats;
  occupancyComponent(): c.OccupancyComponent;
  videoComponent(): c.VideoComponent;
  playerSession(): c.PlayerSession;
  presetApplied(): c.PresetApplied;
  presetPrototype(): c.PresetPrototype;
  farmingPlantComponent(): c.FarmingPlantComponent;
  shardFarming(): c.ShardFarming;
  createdBy(): c.CreatedBy;
  minigameComponent(): c.MinigameComponent;
  minigameInstance(): c.MinigameInstance;
  playingMinigame(): c.PlayingMinigame;
  minigameElement(): c.MinigameElement;
  activeTray(): c.ActiveTray;
  stashed(): c.Stashed;
  minigameInstanceTickInfo(): c.MinigameInstanceTickInfo;
  warpingTo(): c.WarpingTo;
  minigameInstanceExpire(): c.MinigameInstanceExpire;
  placerComponent(): c.PlacerComponent;
  questGiver(): c.QuestGiver;
  defaultDialog(): c.DefaultDialog;
  unmuck(): c.Unmuck;
  robotComponent(): c.RobotComponent;
  adminEntity(): c.AdminEntity;
  protection(): c.Protection;
  projectsProtection(): c.ProjectsProtection;
  deletesWith(): c.DeletesWith;
  itemBuyer(): c.ItemBuyer;
  inspectionTweaks(): c.InspectionTweaks;
  profilePic(): c.ProfilePic;
  entityDescription(): c.EntityDescription;
  landmark(): c.Landmark;
  collideable(): c.Collideable;
  restoration(): c.Restoration;
  terrainRestorationDiff(): c.TerrainRestorationDiff;
  team(): c.Team;
  playerCurrentTeam(): c.PlayerCurrentTeam;
  userRoles(): c.UserRoles;
  restoresTo(): c.RestoresTo;
  trade(): c.Trade;
  activeTrades(): c.ActiveTrades;
  placedBy(): c.PlacedBy;
  textSign(): c.TextSign;
  irradiance(): c.Irradiance;
  lockedInPlace(): c.LockedInPlace;
  deathInfo(): c.DeathInfo;
  syntheticStats(): c.SyntheticStats;
  idle(): c.Idle;
  voice(): c.Voice;
  giftGiver(): c.GiftGiver;
}

export type DeltaWith<C extends keyof ReadonlyEntity> = (Pick<
  SuperDelta,
  SnakeToCamelCase<C> & keyof SuperDelta
> & { staleOk(): ReadonlyDeltaWith<C> } & Omit<Delta, SnakeToCamelCase<C>>) &
  Delta;

export class EntityBackedDelta extends Delta {
  constructor(
    private readonly entity: ReadonlyEntity,
    delta?: RawDelta | undefined
  ) {
    super(delta);
  }

  staleOk(): ReadonlyDelta {
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
    return this.entity[component] !== undefined;
  }

  get id(): BiomesId {
    return this.entity.id;
  }

  iced(): c.ReadonlyIced | undefined {
    if (this.delta?.iced !== undefined) {
      return this.delta.iced ?? undefined;
    }
    return this.entity.iced;
  }
  remoteConnection(): c.ReadonlyRemoteConnection | undefined {
    if (this.delta?.remote_connection !== undefined) {
      return this.delta.remote_connection ?? undefined;
    }
    return this.entity.remote_connection;
  }
  position(): c.ReadonlyPosition | undefined {
    if (this.delta?.position !== undefined) {
      return this.delta.position ?? undefined;
    }
    return this.entity.position;
  }
  orientation(): c.ReadonlyOrientation | undefined {
    if (this.delta?.orientation !== undefined) {
      return this.delta.orientation ?? undefined;
    }
    return this.entity.orientation;
  }
  rigidBody(): c.ReadonlyRigidBody | undefined {
    if (this.delta?.rigid_body !== undefined) {
      return this.delta.rigid_body ?? undefined;
    }
    return this.entity.rigid_body;
  }
  size(): c.ReadonlySize | undefined {
    if (this.delta?.size !== undefined) {
      return this.delta.size ?? undefined;
    }
    return this.entity.size;
  }
  box(): c.ReadonlyBox | undefined {
    if (this.delta?.box !== undefined) {
      return this.delta.box ?? undefined;
    }
    return this.entity.box;
  }
  shardSeed(): c.ReadonlyShardSeed | undefined {
    if (this.delta?.shard_seed !== undefined) {
      return this.delta.shard_seed ?? undefined;
    }
    return this.entity.shard_seed;
  }
  shardDiff(): c.ReadonlyShardDiff | undefined {
    if (this.delta?.shard_diff !== undefined) {
      return this.delta.shard_diff ?? undefined;
    }
    return this.entity.shard_diff;
  }
  shardShapes(): c.ReadonlyShardShapes | undefined {
    if (this.delta?.shard_shapes !== undefined) {
      return this.delta.shard_shapes ?? undefined;
    }
    return this.entity.shard_shapes;
  }
  shardSkyOcclusion(): c.ReadonlyShardSkyOcclusion | undefined {
    if (this.delta?.shard_sky_occlusion !== undefined) {
      return this.delta.shard_sky_occlusion ?? undefined;
    }
    return this.entity.shard_sky_occlusion;
  }
  shardIrradiance(): c.ReadonlyShardIrradiance | undefined {
    if (this.delta?.shard_irradiance !== undefined) {
      return this.delta.shard_irradiance ?? undefined;
    }
    return this.entity.shard_irradiance;
  }
  shardWater(): c.ReadonlyShardWater | undefined {
    if (this.delta?.shard_water !== undefined) {
      return this.delta.shard_water ?? undefined;
    }
    return this.entity.shard_water;
  }
  shardOccupancy(): c.ReadonlyShardOccupancy | undefined {
    if (this.delta?.shard_occupancy !== undefined) {
      return this.delta.shard_occupancy ?? undefined;
    }
    return this.entity.shard_occupancy;
  }
  shardDye(): c.ReadonlyShardDye | undefined {
    if (this.delta?.shard_dye !== undefined) {
      return this.delta.shard_dye ?? undefined;
    }
    return this.entity.shard_dye;
  }
  shardMoisture(): c.ReadonlyShardMoisture | undefined {
    if (this.delta?.shard_moisture !== undefined) {
      return this.delta.shard_moisture ?? undefined;
    }
    return this.entity.shard_moisture;
  }
  shardGrowth(): c.ReadonlyShardGrowth | undefined {
    if (this.delta?.shard_growth !== undefined) {
      return this.delta.shard_growth ?? undefined;
    }
    return this.entity.shard_growth;
  }
  shardPlacer(): c.ReadonlyShardPlacer | undefined {
    if (this.delta?.shard_placer !== undefined) {
      return this.delta.shard_placer ?? undefined;
    }
    return this.entity.shard_placer;
  }
  shardMuck(): c.ReadonlyShardMuck | undefined {
    if (this.delta?.shard_muck !== undefined) {
      return this.delta.shard_muck ?? undefined;
    }
    return this.entity.shard_muck;
  }
  label(): c.ReadonlyLabel | undefined {
    if (this.delta?.label !== undefined) {
      return this.delta.label ?? undefined;
    }
    return this.entity.label;
  }
  grabBag(): c.ReadonlyGrabBag | undefined {
    if (this.delta?.grab_bag !== undefined) {
      return this.delta.grab_bag ?? undefined;
    }
    return this.entity.grab_bag;
  }
  acquisition(): c.ReadonlyAcquisition | undefined {
    if (this.delta?.acquisition !== undefined) {
      return this.delta.acquisition ?? undefined;
    }
    return this.entity.acquisition;
  }
  looseItem(): c.ReadonlyLooseItem | undefined {
    if (this.delta?.loose_item !== undefined) {
      return this.delta.loose_item ?? undefined;
    }
    return this.entity.loose_item;
  }
  inventory(): c.ReadonlyInventory | undefined {
    if (this.delta?.inventory !== undefined) {
      return this.delta.inventory ?? undefined;
    }
    return this.entity.inventory;
  }
  containerInventory(): c.ReadonlyContainerInventory | undefined {
    if (this.delta?.container_inventory !== undefined) {
      return this.delta.container_inventory ?? undefined;
    }
    return this.entity.container_inventory;
  }
  pricedContainerInventory(): c.ReadonlyPricedContainerInventory | undefined {
    if (this.delta?.priced_container_inventory !== undefined) {
      return this.delta.priced_container_inventory ?? undefined;
    }
    return this.entity.priced_container_inventory;
  }
  selectedItem(): c.ReadonlySelectedItem | undefined {
    if (this.delta?.selected_item !== undefined) {
      return this.delta.selected_item ?? undefined;
    }
    return this.entity.selected_item;
  }
  wearing(): c.ReadonlyWearing | undefined {
    if (this.delta?.wearing !== undefined) {
      return this.delta.wearing ?? undefined;
    }
    return this.entity.wearing;
  }
  emote(): c.ReadonlyEmote | undefined {
    if (this.delta?.emote !== undefined) {
      return this.delta.emote ?? undefined;
    }
    return this.entity.emote;
  }
  appearanceComponent(): c.ReadonlyAppearanceComponent | undefined {
    if (this.delta?.appearance_component !== undefined) {
      return this.delta.appearance_component ?? undefined;
    }
    return this.entity.appearance_component;
  }
  groupComponent(): c.ReadonlyGroupComponent | undefined {
    if (this.delta?.group_component !== undefined) {
      return this.delta.group_component ?? undefined;
    }
    return this.entity.group_component;
  }
  challenges(): c.ReadonlyChallenges | undefined {
    if (this.delta?.challenges !== undefined) {
      return this.delta.challenges ?? undefined;
    }
    return this.entity.challenges;
  }
  recipeBook(): c.ReadonlyRecipeBook | undefined {
    if (this.delta?.recipe_book !== undefined) {
      return this.delta.recipe_book ?? undefined;
    }
    return this.entity.recipe_book;
  }
  expires(): c.ReadonlyExpires | undefined {
    if (this.delta?.expires !== undefined) {
      return this.delta.expires ?? undefined;
    }
    return this.entity.expires;
  }
  icing(): c.ReadonlyIcing | undefined {
    if (this.delta?.icing !== undefined) {
      return this.delta.icing ?? undefined;
    }
    return this.entity.icing;
  }
  warpable(): c.ReadonlyWarpable | undefined {
    if (this.delta?.warpable !== undefined) {
      return this.delta.warpable ?? undefined;
    }
    return this.entity.warpable;
  }
  playerStatus(): c.ReadonlyPlayerStatus | undefined {
    if (this.delta?.player_status !== undefined) {
      return this.delta.player_status ?? undefined;
    }
    return this.entity.player_status;
  }
  playerBehavior(): c.ReadonlyPlayerBehavior | undefined {
    if (this.delta?.player_behavior !== undefined) {
      return this.delta.player_behavior ?? undefined;
    }
    return this.entity.player_behavior;
  }
  worldMetadata(): c.ReadonlyWorldMetadata | undefined {
    if (this.delta?.world_metadata !== undefined) {
      return this.delta.world_metadata ?? undefined;
    }
    return this.entity.world_metadata;
  }
  npcMetadata(): c.ReadonlyNpcMetadata | undefined {
    if (this.delta?.npc_metadata !== undefined) {
      return this.delta.npc_metadata ?? undefined;
    }
    return this.entity.npc_metadata;
  }
  npcState(): c.ReadonlyNpcState | undefined {
    if (this.delta?.npc_state !== undefined) {
      return this.delta.npc_state ?? undefined;
    }
    return this.entity.npc_state;
  }
  groupPreviewReference(): c.ReadonlyGroupPreviewReference | undefined {
    if (this.delta?.group_preview_reference !== undefined) {
      return this.delta.group_preview_reference ?? undefined;
    }
    return this.entity.group_preview_reference;
  }
  aclComponent(): c.ReadonlyAclComponent | undefined {
    if (this.delta?.acl_component !== undefined) {
      return this.delta.acl_component ?? undefined;
    }
    return this.entity.acl_component;
  }
  deedComponent(): c.ReadonlyDeedComponent | undefined {
    if (this.delta?.deed_component !== undefined) {
      return this.delta.deed_component ?? undefined;
    }
    return this.entity.deed_component;
  }
  groupPreviewComponent(): c.ReadonlyGroupPreviewComponent | undefined {
    if (this.delta?.group_preview_component !== undefined) {
      return this.delta.group_preview_component ?? undefined;
    }
    return this.entity.group_preview_component;
  }
  blueprintComponent(): c.ReadonlyBlueprintComponent | undefined {
    if (this.delta?.blueprint_component !== undefined) {
      return this.delta.blueprint_component ?? undefined;
    }
    return this.entity.blueprint_component;
  }
  craftingStationComponent(): c.ReadonlyCraftingStationComponent | undefined {
    if (this.delta?.crafting_station_component !== undefined) {
      return this.delta.crafting_station_component ?? undefined;
    }
    return this.entity.crafting_station_component;
  }
  health(): c.ReadonlyHealth | undefined {
    if (this.delta?.health !== undefined) {
      return this.delta.health ?? undefined;
    }
    return this.entity.health;
  }
  buffsComponent(): c.ReadonlyBuffsComponent | undefined {
    if (this.delta?.buffs_component !== undefined) {
      return this.delta.buffs_component ?? undefined;
    }
    return this.entity.buffs_component;
  }
  gremlin(): c.ReadonlyGremlin | undefined {
    if (this.delta?.gremlin !== undefined) {
      return this.delta.gremlin ?? undefined;
    }
    return this.entity.gremlin;
  }
  placeableComponent(): c.ReadonlyPlaceableComponent | undefined {
    if (this.delta?.placeable_component !== undefined) {
      return this.delta.placeable_component ?? undefined;
    }
    return this.entity.placeable_component;
  }
  groupedEntities(): c.ReadonlyGroupedEntities | undefined {
    if (this.delta?.grouped_entities !== undefined) {
      return this.delta.grouped_entities ?? undefined;
    }
    return this.entity.grouped_entities;
  }
  inGroup(): c.ReadonlyInGroup | undefined {
    if (this.delta?.in_group !== undefined) {
      return this.delta.in_group ?? undefined;
    }
    return this.entity.in_group;
  }
  pictureFrameContents(): c.ReadonlyPictureFrameContents | undefined {
    if (this.delta?.picture_frame_contents !== undefined) {
      return this.delta.picture_frame_contents ?? undefined;
    }
    return this.entity.picture_frame_contents;
  }
  triggerState(): c.ReadonlyTriggerState | undefined {
    if (this.delta?.trigger_state !== undefined) {
      return this.delta.trigger_state ?? undefined;
    }
    return this.entity.trigger_state;
  }
  lifetimeStats(): c.ReadonlyLifetimeStats | undefined {
    if (this.delta?.lifetime_stats !== undefined) {
      return this.delta.lifetime_stats ?? undefined;
    }
    return this.entity.lifetime_stats;
  }
  occupancyComponent(): c.ReadonlyOccupancyComponent | undefined {
    if (this.delta?.occupancy_component !== undefined) {
      return this.delta.occupancy_component ?? undefined;
    }
    return this.entity.occupancy_component;
  }
  videoComponent(): c.ReadonlyVideoComponent | undefined {
    if (this.delta?.video_component !== undefined) {
      return this.delta.video_component ?? undefined;
    }
    return this.entity.video_component;
  }
  playerSession(): c.ReadonlyPlayerSession | undefined {
    if (this.delta?.player_session !== undefined) {
      return this.delta.player_session ?? undefined;
    }
    return this.entity.player_session;
  }
  presetApplied(): c.ReadonlyPresetApplied | undefined {
    if (this.delta?.preset_applied !== undefined) {
      return this.delta.preset_applied ?? undefined;
    }
    return this.entity.preset_applied;
  }
  presetPrototype(): c.ReadonlyPresetPrototype | undefined {
    if (this.delta?.preset_prototype !== undefined) {
      return this.delta.preset_prototype ?? undefined;
    }
    return this.entity.preset_prototype;
  }
  farmingPlantComponent(): c.ReadonlyFarmingPlantComponent | undefined {
    if (this.delta?.farming_plant_component !== undefined) {
      return this.delta.farming_plant_component ?? undefined;
    }
    return this.entity.farming_plant_component;
  }
  shardFarming(): c.ReadonlyShardFarming | undefined {
    if (this.delta?.shard_farming !== undefined) {
      return this.delta.shard_farming ?? undefined;
    }
    return this.entity.shard_farming;
  }
  createdBy(): c.ReadonlyCreatedBy | undefined {
    if (this.delta?.created_by !== undefined) {
      return this.delta.created_by ?? undefined;
    }
    return this.entity.created_by;
  }
  minigameComponent(): c.ReadonlyMinigameComponent | undefined {
    if (this.delta?.minigame_component !== undefined) {
      return this.delta.minigame_component ?? undefined;
    }
    return this.entity.minigame_component;
  }
  minigameInstance(): c.ReadonlyMinigameInstance | undefined {
    if (this.delta?.minigame_instance !== undefined) {
      return this.delta.minigame_instance ?? undefined;
    }
    return this.entity.minigame_instance;
  }
  playingMinigame(): c.ReadonlyPlayingMinigame | undefined {
    if (this.delta?.playing_minigame !== undefined) {
      return this.delta.playing_minigame ?? undefined;
    }
    return this.entity.playing_minigame;
  }
  minigameElement(): c.ReadonlyMinigameElement | undefined {
    if (this.delta?.minigame_element !== undefined) {
      return this.delta.minigame_element ?? undefined;
    }
    return this.entity.minigame_element;
  }
  activeTray(): c.ReadonlyActiveTray | undefined {
    if (this.delta?.active_tray !== undefined) {
      return this.delta.active_tray ?? undefined;
    }
    return this.entity.active_tray;
  }
  stashed(): c.ReadonlyStashed | undefined {
    if (this.delta?.stashed !== undefined) {
      return this.delta.stashed ?? undefined;
    }
    return this.entity.stashed;
  }
  minigameInstanceTickInfo(): c.ReadonlyMinigameInstanceTickInfo | undefined {
    if (this.delta?.minigame_instance_tick_info !== undefined) {
      return this.delta.minigame_instance_tick_info ?? undefined;
    }
    return this.entity.minigame_instance_tick_info;
  }
  warpingTo(): c.ReadonlyWarpingTo | undefined {
    if (this.delta?.warping_to !== undefined) {
      return this.delta.warping_to ?? undefined;
    }
    return this.entity.warping_to;
  }
  minigameInstanceExpire(): c.ReadonlyMinigameInstanceExpire | undefined {
    if (this.delta?.minigame_instance_expire !== undefined) {
      return this.delta.minigame_instance_expire ?? undefined;
    }
    return this.entity.minigame_instance_expire;
  }
  placerComponent(): c.ReadonlyPlacerComponent | undefined {
    if (this.delta?.placer_component !== undefined) {
      return this.delta.placer_component ?? undefined;
    }
    return this.entity.placer_component;
  }
  questGiver(): c.ReadonlyQuestGiver | undefined {
    if (this.delta?.quest_giver !== undefined) {
      return this.delta.quest_giver ?? undefined;
    }
    return this.entity.quest_giver;
  }
  defaultDialog(): c.ReadonlyDefaultDialog | undefined {
    if (this.delta?.default_dialog !== undefined) {
      return this.delta.default_dialog ?? undefined;
    }
    return this.entity.default_dialog;
  }
  unmuck(): c.ReadonlyUnmuck | undefined {
    if (this.delta?.unmuck !== undefined) {
      return this.delta.unmuck ?? undefined;
    }
    return this.entity.unmuck;
  }
  robotComponent(): c.ReadonlyRobotComponent | undefined {
    if (this.delta?.robot_component !== undefined) {
      return this.delta.robot_component ?? undefined;
    }
    return this.entity.robot_component;
  }
  adminEntity(): c.ReadonlyAdminEntity | undefined {
    if (this.delta?.admin_entity !== undefined) {
      return this.delta.admin_entity ?? undefined;
    }
    return this.entity.admin_entity;
  }
  protection(): c.ReadonlyProtection | undefined {
    if (this.delta?.protection !== undefined) {
      return this.delta.protection ?? undefined;
    }
    return this.entity.protection;
  }
  projectsProtection(): c.ReadonlyProjectsProtection | undefined {
    if (this.delta?.projects_protection !== undefined) {
      return this.delta.projects_protection ?? undefined;
    }
    return this.entity.projects_protection;
  }
  deletesWith(): c.ReadonlyDeletesWith | undefined {
    if (this.delta?.deletes_with !== undefined) {
      return this.delta.deletes_with ?? undefined;
    }
    return this.entity.deletes_with;
  }
  itemBuyer(): c.ReadonlyItemBuyer | undefined {
    if (this.delta?.item_buyer !== undefined) {
      return this.delta.item_buyer ?? undefined;
    }
    return this.entity.item_buyer;
  }
  inspectionTweaks(): c.ReadonlyInspectionTweaks | undefined {
    if (this.delta?.inspection_tweaks !== undefined) {
      return this.delta.inspection_tweaks ?? undefined;
    }
    return this.entity.inspection_tweaks;
  }
  profilePic(): c.ReadonlyProfilePic | undefined {
    if (this.delta?.profile_pic !== undefined) {
      return this.delta.profile_pic ?? undefined;
    }
    return this.entity.profile_pic;
  }
  entityDescription(): c.ReadonlyEntityDescription | undefined {
    if (this.delta?.entity_description !== undefined) {
      return this.delta.entity_description ?? undefined;
    }
    return this.entity.entity_description;
  }
  landmark(): c.ReadonlyLandmark | undefined {
    if (this.delta?.landmark !== undefined) {
      return this.delta.landmark ?? undefined;
    }
    return this.entity.landmark;
  }
  collideable(): c.ReadonlyCollideable | undefined {
    if (this.delta?.collideable !== undefined) {
      return this.delta.collideable ?? undefined;
    }
    return this.entity.collideable;
  }
  restoration(): c.ReadonlyRestoration | undefined {
    if (this.delta?.restoration !== undefined) {
      return this.delta.restoration ?? undefined;
    }
    return this.entity.restoration;
  }
  terrainRestorationDiff(): c.ReadonlyTerrainRestorationDiff | undefined {
    if (this.delta?.terrain_restoration_diff !== undefined) {
      return this.delta.terrain_restoration_diff ?? undefined;
    }
    return this.entity.terrain_restoration_diff;
  }
  team(): c.ReadonlyTeam | undefined {
    if (this.delta?.team !== undefined) {
      return this.delta.team ?? undefined;
    }
    return this.entity.team;
  }
  playerCurrentTeam(): c.ReadonlyPlayerCurrentTeam | undefined {
    if (this.delta?.player_current_team !== undefined) {
      return this.delta.player_current_team ?? undefined;
    }
    return this.entity.player_current_team;
  }
  userRoles(): c.ReadonlyUserRoles | undefined {
    if (this.delta?.user_roles !== undefined) {
      return this.delta.user_roles ?? undefined;
    }
    return this.entity.user_roles;
  }
  restoresTo(): c.ReadonlyRestoresTo | undefined {
    if (this.delta?.restores_to !== undefined) {
      return this.delta.restores_to ?? undefined;
    }
    return this.entity.restores_to;
  }
  trade(): c.ReadonlyTrade | undefined {
    if (this.delta?.trade !== undefined) {
      return this.delta.trade ?? undefined;
    }
    return this.entity.trade;
  }
  activeTrades(): c.ReadonlyActiveTrades | undefined {
    if (this.delta?.active_trades !== undefined) {
      return this.delta.active_trades ?? undefined;
    }
    return this.entity.active_trades;
  }
  placedBy(): c.ReadonlyPlacedBy | undefined {
    if (this.delta?.placed_by !== undefined) {
      return this.delta.placed_by ?? undefined;
    }
    return this.entity.placed_by;
  }
  textSign(): c.ReadonlyTextSign | undefined {
    if (this.delta?.text_sign !== undefined) {
      return this.delta.text_sign ?? undefined;
    }
    return this.entity.text_sign;
  }
  irradiance(): c.ReadonlyIrradiance | undefined {
    if (this.delta?.irradiance !== undefined) {
      return this.delta.irradiance ?? undefined;
    }
    return this.entity.irradiance;
  }
  lockedInPlace(): c.ReadonlyLockedInPlace | undefined {
    if (this.delta?.locked_in_place !== undefined) {
      return this.delta.locked_in_place ?? undefined;
    }
    return this.entity.locked_in_place;
  }
  deathInfo(): c.ReadonlyDeathInfo | undefined {
    if (this.delta?.death_info !== undefined) {
      return this.delta.death_info ?? undefined;
    }
    return this.entity.death_info;
  }
  syntheticStats(): c.ReadonlySyntheticStats | undefined {
    if (this.delta?.synthetic_stats !== undefined) {
      return this.delta.synthetic_stats ?? undefined;
    }
    return this.entity.synthetic_stats;
  }
  idle(): c.ReadonlyIdle | undefined {
    if (this.delta?.idle !== undefined) {
      return this.delta.idle ?? undefined;
    }
    return this.entity.idle;
  }
  voice(): c.ReadonlyVoice | undefined {
    if (this.delta?.voice !== undefined) {
      return this.delta.voice ?? undefined;
    }
    return this.entity.voice;
  }
  giftGiver(): c.ReadonlyGiftGiver | undefined {
    if (this.delta?.gift_giver !== undefined) {
      return this.delta.gift_giver ?? undefined;
    }
    return this.entity.gift_giver;
  }
}

export class PatchableEntity extends Delta {
  public readonly readComponentIds = new Set<number>();
  private staleVariant?: ReadonlyDelta;

  constructor(private readonly entity: ReadonlyEntity) {
    super();
  }

  staleOk(): ReadonlyDelta {
    return (this.staleVariant ??= new EntityBackedDelta(
      this.entity,
      this.delta
    ));
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
    return this.entity[component] !== undefined;
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
    return this.entity.iced;
  }
  remoteConnection(): c.ReadonlyRemoteConnection | undefined {
    if (this.delta?.remote_connection !== undefined) {
      return this.delta.remote_connection ?? undefined;
    }
    this.readComponentIds.add(31);
    return this.entity.remote_connection;
  }
  position(): c.ReadonlyPosition | undefined {
    if (this.delta?.position !== undefined) {
      return this.delta.position ?? undefined;
    }
    this.readComponentIds.add(54);
    return this.entity.position;
  }
  orientation(): c.ReadonlyOrientation | undefined {
    if (this.delta?.orientation !== undefined) {
      return this.delta.orientation ?? undefined;
    }
    this.readComponentIds.add(55);
    return this.entity.orientation;
  }
  rigidBody(): c.ReadonlyRigidBody | undefined {
    if (this.delta?.rigid_body !== undefined) {
      return this.delta.rigid_body ?? undefined;
    }
    this.readComponentIds.add(32);
    return this.entity.rigid_body;
  }
  size(): c.ReadonlySize | undefined {
    if (this.delta?.size !== undefined) {
      return this.delta.size ?? undefined;
    }
    this.readComponentIds.add(110);
    return this.entity.size;
  }
  box(): c.ReadonlyBox | undefined {
    if (this.delta?.box !== undefined) {
      return this.delta.box ?? undefined;
    }
    this.readComponentIds.add(33);
    return this.entity.box;
  }
  shardSeed(): c.ReadonlyShardSeed | undefined {
    if (this.delta?.shard_seed !== undefined) {
      return this.delta.shard_seed ?? undefined;
    }
    this.readComponentIds.add(34);
    return this.entity.shard_seed;
  }
  shardDiff(): c.ReadonlyShardDiff | undefined {
    if (this.delta?.shard_diff !== undefined) {
      return this.delta.shard_diff ?? undefined;
    }
    this.readComponentIds.add(35);
    return this.entity.shard_diff;
  }
  shardShapes(): c.ReadonlyShardShapes | undefined {
    if (this.delta?.shard_shapes !== undefined) {
      return this.delta.shard_shapes ?? undefined;
    }
    this.readComponentIds.add(60);
    return this.entity.shard_shapes;
  }
  shardSkyOcclusion(): c.ReadonlyShardSkyOcclusion | undefined {
    if (this.delta?.shard_sky_occlusion !== undefined) {
      return this.delta.shard_sky_occlusion ?? undefined;
    }
    this.readComponentIds.add(76);
    return this.entity.shard_sky_occlusion;
  }
  shardIrradiance(): c.ReadonlyShardIrradiance | undefined {
    if (this.delta?.shard_irradiance !== undefined) {
      return this.delta.shard_irradiance ?? undefined;
    }
    this.readComponentIds.add(80);
    return this.entity.shard_irradiance;
  }
  shardWater(): c.ReadonlyShardWater | undefined {
    if (this.delta?.shard_water !== undefined) {
      return this.delta.shard_water ?? undefined;
    }
    this.readComponentIds.add(82);
    return this.entity.shard_water;
  }
  shardOccupancy(): c.ReadonlyShardOccupancy | undefined {
    if (this.delta?.shard_occupancy !== undefined) {
      return this.delta.shard_occupancy ?? undefined;
    }
    this.readComponentIds.add(93);
    return this.entity.shard_occupancy;
  }
  shardDye(): c.ReadonlyShardDye | undefined {
    if (this.delta?.shard_dye !== undefined) {
      return this.delta.shard_dye ?? undefined;
    }
    this.readComponentIds.add(111);
    return this.entity.shard_dye;
  }
  shardMoisture(): c.ReadonlyShardMoisture | undefined {
    if (this.delta?.shard_moisture !== undefined) {
      return this.delta.shard_moisture ?? undefined;
    }
    this.readComponentIds.add(112);
    return this.entity.shard_moisture;
  }
  shardGrowth(): c.ReadonlyShardGrowth | undefined {
    if (this.delta?.shard_growth !== undefined) {
      return this.delta.shard_growth ?? undefined;
    }
    this.readComponentIds.add(113);
    return this.entity.shard_growth;
  }
  shardPlacer(): c.ReadonlyShardPlacer | undefined {
    if (this.delta?.shard_placer !== undefined) {
      return this.delta.shard_placer ?? undefined;
    }
    this.readComponentIds.add(120);
    return this.entity.shard_placer;
  }
  shardMuck(): c.ReadonlyShardMuck | undefined {
    if (this.delta?.shard_muck !== undefined) {
      return this.delta.shard_muck ?? undefined;
    }
    this.readComponentIds.add(124);
    return this.entity.shard_muck;
  }
  label(): c.ReadonlyLabel | undefined {
    if (this.delta?.label !== undefined) {
      return this.delta.label ?? undefined;
    }
    this.readComponentIds.add(37);
    return this.entity.label;
  }
  grabBag(): c.ReadonlyGrabBag | undefined {
    if (this.delta?.grab_bag !== undefined) {
      return this.delta.grab_bag ?? undefined;
    }
    this.readComponentIds.add(51);
    return this.entity.grab_bag;
  }
  acquisition(): c.ReadonlyAcquisition | undefined {
    if (this.delta?.acquisition !== undefined) {
      return this.delta.acquisition ?? undefined;
    }
    this.readComponentIds.add(52);
    return this.entity.acquisition;
  }
  looseItem(): c.ReadonlyLooseItem | undefined {
    if (this.delta?.loose_item !== undefined) {
      return this.delta.loose_item ?? undefined;
    }
    this.readComponentIds.add(53);
    return this.entity.loose_item;
  }
  inventory(): c.ReadonlyInventory | undefined {
    if (this.delta?.inventory !== undefined) {
      return this.delta.inventory ?? undefined;
    }
    this.readComponentIds.add(41);
    return this.entity.inventory;
  }
  containerInventory(): c.ReadonlyContainerInventory | undefined {
    if (this.delta?.container_inventory !== undefined) {
      return this.delta.container_inventory ?? undefined;
    }
    this.readComponentIds.add(79);
    return this.entity.container_inventory;
  }
  pricedContainerInventory(): c.ReadonlyPricedContainerInventory | undefined {
    if (this.delta?.priced_container_inventory !== undefined) {
      return this.delta.priced_container_inventory ?? undefined;
    }
    this.readComponentIds.add(86);
    return this.entity.priced_container_inventory;
  }
  selectedItem(): c.ReadonlySelectedItem | undefined {
    if (this.delta?.selected_item !== undefined) {
      return this.delta.selected_item ?? undefined;
    }
    this.readComponentIds.add(59);
    return this.entity.selected_item;
  }
  wearing(): c.ReadonlyWearing | undefined {
    if (this.delta?.wearing !== undefined) {
      return this.delta.wearing ?? undefined;
    }
    this.readComponentIds.add(49);
    return this.entity.wearing;
  }
  emote(): c.ReadonlyEmote | undefined {
    if (this.delta?.emote !== undefined) {
      return this.delta.emote ?? undefined;
    }
    this.readComponentIds.add(43);
    return this.entity.emote;
  }
  appearanceComponent(): c.ReadonlyAppearanceComponent | undefined {
    if (this.delta?.appearance_component !== undefined) {
      return this.delta.appearance_component ?? undefined;
    }
    this.readComponentIds.add(56);
    return this.entity.appearance_component;
  }
  groupComponent(): c.ReadonlyGroupComponent | undefined {
    if (this.delta?.group_component !== undefined) {
      return this.delta.group_component ?? undefined;
    }
    this.readComponentIds.add(45);
    return this.entity.group_component;
  }
  challenges(): c.ReadonlyChallenges | undefined {
    if (this.delta?.challenges !== undefined) {
      return this.delta.challenges ?? undefined;
    }
    this.readComponentIds.add(46);
    return this.entity.challenges;
  }
  recipeBook(): c.ReadonlyRecipeBook | undefined {
    if (this.delta?.recipe_book !== undefined) {
      return this.delta.recipe_book ?? undefined;
    }
    this.readComponentIds.add(48);
    return this.entity.recipe_book;
  }
  expires(): c.ReadonlyExpires | undefined {
    if (this.delta?.expires !== undefined) {
      return this.delta.expires ?? undefined;
    }
    this.readComponentIds.add(50);
    return this.entity.expires;
  }
  icing(): c.ReadonlyIcing | undefined {
    if (this.delta?.icing !== undefined) {
      return this.delta.icing ?? undefined;
    }
    this.readComponentIds.add(58);
    return this.entity.icing;
  }
  warpable(): c.ReadonlyWarpable | undefined {
    if (this.delta?.warpable !== undefined) {
      return this.delta.warpable ?? undefined;
    }
    this.readComponentIds.add(61);
    return this.entity.warpable;
  }
  playerStatus(): c.ReadonlyPlayerStatus | undefined {
    if (this.delta?.player_status !== undefined) {
      return this.delta.player_status ?? undefined;
    }
    this.readComponentIds.add(63);
    return this.entity.player_status;
  }
  playerBehavior(): c.ReadonlyPlayerBehavior | undefined {
    if (this.delta?.player_behavior !== undefined) {
      return this.delta.player_behavior ?? undefined;
    }
    this.readComponentIds.add(64);
    return this.entity.player_behavior;
  }
  worldMetadata(): c.ReadonlyWorldMetadata | undefined {
    if (this.delta?.world_metadata !== undefined) {
      return this.delta.world_metadata ?? undefined;
    }
    this.readComponentIds.add(65);
    return this.entity.world_metadata;
  }
  npcMetadata(): c.ReadonlyNpcMetadata | undefined {
    if (this.delta?.npc_metadata !== undefined) {
      return this.delta.npc_metadata ?? undefined;
    }
    this.readComponentIds.add(66);
    return this.entity.npc_metadata;
  }
  npcState(): c.ReadonlyNpcState | undefined {
    if (this.delta?.npc_state !== undefined) {
      return this.delta.npc_state ?? undefined;
    }
    this.readComponentIds.add(67);
    return this.entity.npc_state;
  }
  groupPreviewReference(): c.ReadonlyGroupPreviewReference | undefined {
    if (this.delta?.group_preview_reference !== undefined) {
      return this.delta.group_preview_reference ?? undefined;
    }
    this.readComponentIds.add(68);
    return this.entity.group_preview_reference;
  }
  aclComponent(): c.ReadonlyAclComponent | undefined {
    if (this.delta?.acl_component !== undefined) {
      return this.delta.acl_component ?? undefined;
    }
    this.readComponentIds.add(70);
    return this.entity.acl_component;
  }
  deedComponent(): c.ReadonlyDeedComponent | undefined {
    if (this.delta?.deed_component !== undefined) {
      return this.delta.deed_component ?? undefined;
    }
    this.readComponentIds.add(71);
    return this.entity.deed_component;
  }
  groupPreviewComponent(): c.ReadonlyGroupPreviewComponent | undefined {
    if (this.delta?.group_preview_component !== undefined) {
      return this.delta.group_preview_component ?? undefined;
    }
    this.readComponentIds.add(72);
    return this.entity.group_preview_component;
  }
  blueprintComponent(): c.ReadonlyBlueprintComponent | undefined {
    if (this.delta?.blueprint_component !== undefined) {
      return this.delta.blueprint_component ?? undefined;
    }
    this.readComponentIds.add(87);
    return this.entity.blueprint_component;
  }
  craftingStationComponent(): c.ReadonlyCraftingStationComponent | undefined {
    if (this.delta?.crafting_station_component !== undefined) {
      return this.delta.crafting_station_component ?? undefined;
    }
    this.readComponentIds.add(74);
    return this.entity.crafting_station_component;
  }
  health(): c.ReadonlyHealth | undefined {
    if (this.delta?.health !== undefined) {
      return this.delta.health ?? undefined;
    }
    this.readComponentIds.add(75);
    return this.entity.health;
  }
  buffsComponent(): c.ReadonlyBuffsComponent | undefined {
    if (this.delta?.buffs_component !== undefined) {
      return this.delta.buffs_component ?? undefined;
    }
    this.readComponentIds.add(101);
    return this.entity.buffs_component;
  }
  gremlin(): c.ReadonlyGremlin | undefined {
    if (this.delta?.gremlin !== undefined) {
      return this.delta.gremlin ?? undefined;
    }
    this.readComponentIds.add(77);
    return this.entity.gremlin;
  }
  placeableComponent(): c.ReadonlyPlaceableComponent | undefined {
    if (this.delta?.placeable_component !== undefined) {
      return this.delta.placeable_component ?? undefined;
    }
    this.readComponentIds.add(78);
    return this.entity.placeable_component;
  }
  groupedEntities(): c.ReadonlyGroupedEntities | undefined {
    if (this.delta?.grouped_entities !== undefined) {
      return this.delta.grouped_entities ?? undefined;
    }
    this.readComponentIds.add(83);
    return this.entity.grouped_entities;
  }
  inGroup(): c.ReadonlyInGroup | undefined {
    if (this.delta?.in_group !== undefined) {
      return this.delta.in_group ?? undefined;
    }
    this.readComponentIds.add(95);
    return this.entity.in_group;
  }
  pictureFrameContents(): c.ReadonlyPictureFrameContents | undefined {
    if (this.delta?.picture_frame_contents !== undefined) {
      return this.delta.picture_frame_contents ?? undefined;
    }
    this.readComponentIds.add(84);
    return this.entity.picture_frame_contents;
  }
  triggerState(): c.ReadonlyTriggerState | undefined {
    if (this.delta?.trigger_state !== undefined) {
      return this.delta.trigger_state ?? undefined;
    }
    this.readComponentIds.add(88);
    return this.entity.trigger_state;
  }
  lifetimeStats(): c.ReadonlyLifetimeStats | undefined {
    if (this.delta?.lifetime_stats !== undefined) {
      return this.delta.lifetime_stats ?? undefined;
    }
    this.readComponentIds.add(91);
    return this.entity.lifetime_stats;
  }
  occupancyComponent(): c.ReadonlyOccupancyComponent | undefined {
    if (this.delta?.occupancy_component !== undefined) {
      return this.delta.occupancy_component ?? undefined;
    }
    this.readComponentIds.add(97);
    return this.entity.occupancy_component;
  }
  videoComponent(): c.ReadonlyVideoComponent | undefined {
    if (this.delta?.video_component !== undefined) {
      return this.delta.video_component ?? undefined;
    }
    this.readComponentIds.add(92);
    return this.entity.video_component;
  }
  playerSession(): c.ReadonlyPlayerSession | undefined {
    if (this.delta?.player_session !== undefined) {
      return this.delta.player_session ?? undefined;
    }
    this.readComponentIds.add(98);
    return this.entity.player_session;
  }
  presetApplied(): c.ReadonlyPresetApplied | undefined {
    if (this.delta?.preset_applied !== undefined) {
      return this.delta.preset_applied ?? undefined;
    }
    this.readComponentIds.add(99);
    return this.entity.preset_applied;
  }
  presetPrototype(): c.ReadonlyPresetPrototype | undefined {
    if (this.delta?.preset_prototype !== undefined) {
      return this.delta.preset_prototype ?? undefined;
    }
    this.readComponentIds.add(100);
    return this.entity.preset_prototype;
  }
  farmingPlantComponent(): c.ReadonlyFarmingPlantComponent | undefined {
    if (this.delta?.farming_plant_component !== undefined) {
      return this.delta.farming_plant_component ?? undefined;
    }
    this.readComponentIds.add(102);
    return this.entity.farming_plant_component;
  }
  shardFarming(): c.ReadonlyShardFarming | undefined {
    if (this.delta?.shard_farming !== undefined) {
      return this.delta.shard_farming ?? undefined;
    }
    this.readComponentIds.add(103);
    return this.entity.shard_farming;
  }
  createdBy(): c.ReadonlyCreatedBy | undefined {
    if (this.delta?.created_by !== undefined) {
      return this.delta.created_by ?? undefined;
    }
    this.readComponentIds.add(104);
    return this.entity.created_by;
  }
  minigameComponent(): c.ReadonlyMinigameComponent | undefined {
    if (this.delta?.minigame_component !== undefined) {
      return this.delta.minigame_component ?? undefined;
    }
    this.readComponentIds.add(105);
    return this.entity.minigame_component;
  }
  minigameInstance(): c.ReadonlyMinigameInstance | undefined {
    if (this.delta?.minigame_instance !== undefined) {
      return this.delta.minigame_instance ?? undefined;
    }
    this.readComponentIds.add(106);
    return this.entity.minigame_instance;
  }
  playingMinigame(): c.ReadonlyPlayingMinigame | undefined {
    if (this.delta?.playing_minigame !== undefined) {
      return this.delta.playing_minigame ?? undefined;
    }
    this.readComponentIds.add(107);
    return this.entity.playing_minigame;
  }
  minigameElement(): c.ReadonlyMinigameElement | undefined {
    if (this.delta?.minigame_element !== undefined) {
      return this.delta.minigame_element ?? undefined;
    }
    this.readComponentIds.add(108);
    return this.entity.minigame_element;
  }
  activeTray(): c.ReadonlyActiveTray | undefined {
    if (this.delta?.active_tray !== undefined) {
      return this.delta.active_tray ?? undefined;
    }
    this.readComponentIds.add(109);
    return this.entity.active_tray;
  }
  stashed(): c.ReadonlyStashed | undefined {
    if (this.delta?.stashed !== undefined) {
      return this.delta.stashed ?? undefined;
    }
    this.readComponentIds.add(115);
    return this.entity.stashed;
  }
  minigameInstanceTickInfo(): c.ReadonlyMinigameInstanceTickInfo | undefined {
    if (this.delta?.minigame_instance_tick_info !== undefined) {
      return this.delta.minigame_instance_tick_info ?? undefined;
    }
    this.readComponentIds.add(117);
    return this.entity.minigame_instance_tick_info;
  }
  warpingTo(): c.ReadonlyWarpingTo | undefined {
    if (this.delta?.warping_to !== undefined) {
      return this.delta.warping_to ?? undefined;
    }
    this.readComponentIds.add(118);
    return this.entity.warping_to;
  }
  minigameInstanceExpire(): c.ReadonlyMinigameInstanceExpire | undefined {
    if (this.delta?.minigame_instance_expire !== undefined) {
      return this.delta.minigame_instance_expire ?? undefined;
    }
    this.readComponentIds.add(119);
    return this.entity.minigame_instance_expire;
  }
  placerComponent(): c.ReadonlyPlacerComponent | undefined {
    if (this.delta?.placer_component !== undefined) {
      return this.delta.placer_component ?? undefined;
    }
    this.readComponentIds.add(121);
    return this.entity.placer_component;
  }
  questGiver(): c.ReadonlyQuestGiver | undefined {
    if (this.delta?.quest_giver !== undefined) {
      return this.delta.quest_giver ?? undefined;
    }
    this.readComponentIds.add(122);
    return this.entity.quest_giver;
  }
  defaultDialog(): c.ReadonlyDefaultDialog | undefined {
    if (this.delta?.default_dialog !== undefined) {
      return this.delta.default_dialog ?? undefined;
    }
    this.readComponentIds.add(123);
    return this.entity.default_dialog;
  }
  unmuck(): c.ReadonlyUnmuck | undefined {
    if (this.delta?.unmuck !== undefined) {
      return this.delta.unmuck ?? undefined;
    }
    this.readComponentIds.add(125);
    return this.entity.unmuck;
  }
  robotComponent(): c.ReadonlyRobotComponent | undefined {
    if (this.delta?.robot_component !== undefined) {
      return this.delta.robot_component ?? undefined;
    }
    this.readComponentIds.add(126);
    return this.entity.robot_component;
  }
  adminEntity(): c.ReadonlyAdminEntity | undefined {
    if (this.delta?.admin_entity !== undefined) {
      return this.delta.admin_entity ?? undefined;
    }
    this.readComponentIds.add(140);
    return this.entity.admin_entity;
  }
  protection(): c.ReadonlyProtection | undefined {
    if (this.delta?.protection !== undefined) {
      return this.delta.protection ?? undefined;
    }
    this.readComponentIds.add(127);
    return this.entity.protection;
  }
  projectsProtection(): c.ReadonlyProjectsProtection | undefined {
    if (this.delta?.projects_protection !== undefined) {
      return this.delta.projects_protection ?? undefined;
    }
    this.readComponentIds.add(128);
    return this.entity.projects_protection;
  }
  deletesWith(): c.ReadonlyDeletesWith | undefined {
    if (this.delta?.deletes_with !== undefined) {
      return this.delta.deletes_with ?? undefined;
    }
    this.readComponentIds.add(129);
    return this.entity.deletes_with;
  }
  itemBuyer(): c.ReadonlyItemBuyer | undefined {
    if (this.delta?.item_buyer !== undefined) {
      return this.delta.item_buyer ?? undefined;
    }
    this.readComponentIds.add(130);
    return this.entity.item_buyer;
  }
  inspectionTweaks(): c.ReadonlyInspectionTweaks | undefined {
    if (this.delta?.inspection_tweaks !== undefined) {
      return this.delta.inspection_tweaks ?? undefined;
    }
    this.readComponentIds.add(131);
    return this.entity.inspection_tweaks;
  }
  profilePic(): c.ReadonlyProfilePic | undefined {
    if (this.delta?.profile_pic !== undefined) {
      return this.delta.profile_pic ?? undefined;
    }
    this.readComponentIds.add(132);
    return this.entity.profile_pic;
  }
  entityDescription(): c.ReadonlyEntityDescription | undefined {
    if (this.delta?.entity_description !== undefined) {
      return this.delta.entity_description ?? undefined;
    }
    this.readComponentIds.add(133);
    return this.entity.entity_description;
  }
  landmark(): c.ReadonlyLandmark | undefined {
    if (this.delta?.landmark !== undefined) {
      return this.delta.landmark ?? undefined;
    }
    this.readComponentIds.add(134);
    return this.entity.landmark;
  }
  collideable(): c.ReadonlyCollideable | undefined {
    if (this.delta?.collideable !== undefined) {
      return this.delta.collideable ?? undefined;
    }
    this.readComponentIds.add(135);
    return this.entity.collideable;
  }
  restoration(): c.ReadonlyRestoration | undefined {
    if (this.delta?.restoration !== undefined) {
      return this.delta.restoration ?? undefined;
    }
    this.readComponentIds.add(136);
    return this.entity.restoration;
  }
  terrainRestorationDiff(): c.ReadonlyTerrainRestorationDiff | undefined {
    if (this.delta?.terrain_restoration_diff !== undefined) {
      return this.delta.terrain_restoration_diff ?? undefined;
    }
    this.readComponentIds.add(137);
    return this.entity.terrain_restoration_diff;
  }
  team(): c.ReadonlyTeam | undefined {
    if (this.delta?.team !== undefined) {
      return this.delta.team ?? undefined;
    }
    this.readComponentIds.add(138);
    return this.entity.team;
  }
  playerCurrentTeam(): c.ReadonlyPlayerCurrentTeam | undefined {
    if (this.delta?.player_current_team !== undefined) {
      return this.delta.player_current_team ?? undefined;
    }
    this.readComponentIds.add(139);
    return this.entity.player_current_team;
  }
  userRoles(): c.ReadonlyUserRoles | undefined {
    if (this.delta?.user_roles !== undefined) {
      return this.delta.user_roles ?? undefined;
    }
    this.readComponentIds.add(141);
    return this.entity.user_roles;
  }
  restoresTo(): c.ReadonlyRestoresTo | undefined {
    if (this.delta?.restores_to !== undefined) {
      return this.delta.restores_to ?? undefined;
    }
    this.readComponentIds.add(142);
    return this.entity.restores_to;
  }
  trade(): c.ReadonlyTrade | undefined {
    if (this.delta?.trade !== undefined) {
      return this.delta.trade ?? undefined;
    }
    this.readComponentIds.add(143);
    return this.entity.trade;
  }
  activeTrades(): c.ReadonlyActiveTrades | undefined {
    if (this.delta?.active_trades !== undefined) {
      return this.delta.active_trades ?? undefined;
    }
    this.readComponentIds.add(144);
    return this.entity.active_trades;
  }
  placedBy(): c.ReadonlyPlacedBy | undefined {
    if (this.delta?.placed_by !== undefined) {
      return this.delta.placed_by ?? undefined;
    }
    this.readComponentIds.add(145);
    return this.entity.placed_by;
  }
  textSign(): c.ReadonlyTextSign | undefined {
    if (this.delta?.text_sign !== undefined) {
      return this.delta.text_sign ?? undefined;
    }
    this.readComponentIds.add(146);
    return this.entity.text_sign;
  }
  irradiance(): c.ReadonlyIrradiance | undefined {
    if (this.delta?.irradiance !== undefined) {
      return this.delta.irradiance ?? undefined;
    }
    this.readComponentIds.add(147);
    return this.entity.irradiance;
  }
  lockedInPlace(): c.ReadonlyLockedInPlace | undefined {
    if (this.delta?.locked_in_place !== undefined) {
      return this.delta.locked_in_place ?? undefined;
    }
    this.readComponentIds.add(148);
    return this.entity.locked_in_place;
  }
  deathInfo(): c.ReadonlyDeathInfo | undefined {
    if (this.delta?.death_info !== undefined) {
      return this.delta.death_info ?? undefined;
    }
    this.readComponentIds.add(149);
    return this.entity.death_info;
  }
  syntheticStats(): c.ReadonlySyntheticStats | undefined {
    if (this.delta?.synthetic_stats !== undefined) {
      return this.delta.synthetic_stats ?? undefined;
    }
    this.readComponentIds.add(150);
    return this.entity.synthetic_stats;
  }
  idle(): c.ReadonlyIdle | undefined {
    if (this.delta?.idle !== undefined) {
      return this.delta.idle ?? undefined;
    }
    this.readComponentIds.add(151);
    return this.entity.idle;
  }
  voice(): c.ReadonlyVoice | undefined {
    if (this.delta?.voice !== undefined) {
      return this.delta.voice ?? undefined;
    }
    this.readComponentIds.add(152);
    return this.entity.voice;
  }
  giftGiver(): c.ReadonlyGiftGiver | undefined {
    if (this.delta?.gift_giver !== undefined) {
      return this.delta.gift_giver ?? undefined;
    }
    this.readComponentIds.add(153);
    return this.entity.gift_giver;
  }

  clear() {
    this.delta = {};
    for (const [key, value] of entriesIn(this.entity)) {
      if (key === "id" || !value) {
        continue;
      }
      this.delta[key as keyof RawDelta] = null;
    }
    this.markAllComponentsAsRead();
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

export class DeltaPatch extends Delta {
  constructor(private readonly parent: Delta) {
    super();
  }

  staleOk() {
    return this.parent.staleOk();
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
    return this.parent.hasComponent(component);
  }

  get id(): BiomesId {
    return this.parent.id;
  }

  iced(): c.ReadonlyIced | undefined {
    if (this.delta?.iced !== undefined) {
      return this.delta.iced ?? undefined;
    }
    return this.parent.iced();
  }
  remoteConnection(): c.ReadonlyRemoteConnection | undefined {
    if (this.delta?.remote_connection !== undefined) {
      return this.delta.remote_connection ?? undefined;
    }
    return this.parent.remoteConnection();
  }
  position(): c.ReadonlyPosition | undefined {
    if (this.delta?.position !== undefined) {
      return this.delta.position ?? undefined;
    }
    return this.parent.position();
  }
  orientation(): c.ReadonlyOrientation | undefined {
    if (this.delta?.orientation !== undefined) {
      return this.delta.orientation ?? undefined;
    }
    return this.parent.orientation();
  }
  rigidBody(): c.ReadonlyRigidBody | undefined {
    if (this.delta?.rigid_body !== undefined) {
      return this.delta.rigid_body ?? undefined;
    }
    return this.parent.rigidBody();
  }
  size(): c.ReadonlySize | undefined {
    if (this.delta?.size !== undefined) {
      return this.delta.size ?? undefined;
    }
    return this.parent.size();
  }
  box(): c.ReadonlyBox | undefined {
    if (this.delta?.box !== undefined) {
      return this.delta.box ?? undefined;
    }
    return this.parent.box();
  }
  shardSeed(): c.ReadonlyShardSeed | undefined {
    if (this.delta?.shard_seed !== undefined) {
      return this.delta.shard_seed ?? undefined;
    }
    return this.parent.shardSeed();
  }
  shardDiff(): c.ReadonlyShardDiff | undefined {
    if (this.delta?.shard_diff !== undefined) {
      return this.delta.shard_diff ?? undefined;
    }
    return this.parent.shardDiff();
  }
  shardShapes(): c.ReadonlyShardShapes | undefined {
    if (this.delta?.shard_shapes !== undefined) {
      return this.delta.shard_shapes ?? undefined;
    }
    return this.parent.shardShapes();
  }
  shardSkyOcclusion(): c.ReadonlyShardSkyOcclusion | undefined {
    if (this.delta?.shard_sky_occlusion !== undefined) {
      return this.delta.shard_sky_occlusion ?? undefined;
    }
    return this.parent.shardSkyOcclusion();
  }
  shardIrradiance(): c.ReadonlyShardIrradiance | undefined {
    if (this.delta?.shard_irradiance !== undefined) {
      return this.delta.shard_irradiance ?? undefined;
    }
    return this.parent.shardIrradiance();
  }
  shardWater(): c.ReadonlyShardWater | undefined {
    if (this.delta?.shard_water !== undefined) {
      return this.delta.shard_water ?? undefined;
    }
    return this.parent.shardWater();
  }
  shardOccupancy(): c.ReadonlyShardOccupancy | undefined {
    if (this.delta?.shard_occupancy !== undefined) {
      return this.delta.shard_occupancy ?? undefined;
    }
    return this.parent.shardOccupancy();
  }
  shardDye(): c.ReadonlyShardDye | undefined {
    if (this.delta?.shard_dye !== undefined) {
      return this.delta.shard_dye ?? undefined;
    }
    return this.parent.shardDye();
  }
  shardMoisture(): c.ReadonlyShardMoisture | undefined {
    if (this.delta?.shard_moisture !== undefined) {
      return this.delta.shard_moisture ?? undefined;
    }
    return this.parent.shardMoisture();
  }
  shardGrowth(): c.ReadonlyShardGrowth | undefined {
    if (this.delta?.shard_growth !== undefined) {
      return this.delta.shard_growth ?? undefined;
    }
    return this.parent.shardGrowth();
  }
  shardPlacer(): c.ReadonlyShardPlacer | undefined {
    if (this.delta?.shard_placer !== undefined) {
      return this.delta.shard_placer ?? undefined;
    }
    return this.parent.shardPlacer();
  }
  shardMuck(): c.ReadonlyShardMuck | undefined {
    if (this.delta?.shard_muck !== undefined) {
      return this.delta.shard_muck ?? undefined;
    }
    return this.parent.shardMuck();
  }
  label(): c.ReadonlyLabel | undefined {
    if (this.delta?.label !== undefined) {
      return this.delta.label ?? undefined;
    }
    return this.parent.label();
  }
  grabBag(): c.ReadonlyGrabBag | undefined {
    if (this.delta?.grab_bag !== undefined) {
      return this.delta.grab_bag ?? undefined;
    }
    return this.parent.grabBag();
  }
  acquisition(): c.ReadonlyAcquisition | undefined {
    if (this.delta?.acquisition !== undefined) {
      return this.delta.acquisition ?? undefined;
    }
    return this.parent.acquisition();
  }
  looseItem(): c.ReadonlyLooseItem | undefined {
    if (this.delta?.loose_item !== undefined) {
      return this.delta.loose_item ?? undefined;
    }
    return this.parent.looseItem();
  }
  inventory(): c.ReadonlyInventory | undefined {
    if (this.delta?.inventory !== undefined) {
      return this.delta.inventory ?? undefined;
    }
    return this.parent.inventory();
  }
  containerInventory(): c.ReadonlyContainerInventory | undefined {
    if (this.delta?.container_inventory !== undefined) {
      return this.delta.container_inventory ?? undefined;
    }
    return this.parent.containerInventory();
  }
  pricedContainerInventory(): c.ReadonlyPricedContainerInventory | undefined {
    if (this.delta?.priced_container_inventory !== undefined) {
      return this.delta.priced_container_inventory ?? undefined;
    }
    return this.parent.pricedContainerInventory();
  }
  selectedItem(): c.ReadonlySelectedItem | undefined {
    if (this.delta?.selected_item !== undefined) {
      return this.delta.selected_item ?? undefined;
    }
    return this.parent.selectedItem();
  }
  wearing(): c.ReadonlyWearing | undefined {
    if (this.delta?.wearing !== undefined) {
      return this.delta.wearing ?? undefined;
    }
    return this.parent.wearing();
  }
  emote(): c.ReadonlyEmote | undefined {
    if (this.delta?.emote !== undefined) {
      return this.delta.emote ?? undefined;
    }
    return this.parent.emote();
  }
  appearanceComponent(): c.ReadonlyAppearanceComponent | undefined {
    if (this.delta?.appearance_component !== undefined) {
      return this.delta.appearance_component ?? undefined;
    }
    return this.parent.appearanceComponent();
  }
  groupComponent(): c.ReadonlyGroupComponent | undefined {
    if (this.delta?.group_component !== undefined) {
      return this.delta.group_component ?? undefined;
    }
    return this.parent.groupComponent();
  }
  challenges(): c.ReadonlyChallenges | undefined {
    if (this.delta?.challenges !== undefined) {
      return this.delta.challenges ?? undefined;
    }
    return this.parent.challenges();
  }
  recipeBook(): c.ReadonlyRecipeBook | undefined {
    if (this.delta?.recipe_book !== undefined) {
      return this.delta.recipe_book ?? undefined;
    }
    return this.parent.recipeBook();
  }
  expires(): c.ReadonlyExpires | undefined {
    if (this.delta?.expires !== undefined) {
      return this.delta.expires ?? undefined;
    }
    return this.parent.expires();
  }
  icing(): c.ReadonlyIcing | undefined {
    if (this.delta?.icing !== undefined) {
      return this.delta.icing ?? undefined;
    }
    return this.parent.icing();
  }
  warpable(): c.ReadonlyWarpable | undefined {
    if (this.delta?.warpable !== undefined) {
      return this.delta.warpable ?? undefined;
    }
    return this.parent.warpable();
  }
  playerStatus(): c.ReadonlyPlayerStatus | undefined {
    if (this.delta?.player_status !== undefined) {
      return this.delta.player_status ?? undefined;
    }
    return this.parent.playerStatus();
  }
  playerBehavior(): c.ReadonlyPlayerBehavior | undefined {
    if (this.delta?.player_behavior !== undefined) {
      return this.delta.player_behavior ?? undefined;
    }
    return this.parent.playerBehavior();
  }
  worldMetadata(): c.ReadonlyWorldMetadata | undefined {
    if (this.delta?.world_metadata !== undefined) {
      return this.delta.world_metadata ?? undefined;
    }
    return this.parent.worldMetadata();
  }
  npcMetadata(): c.ReadonlyNpcMetadata | undefined {
    if (this.delta?.npc_metadata !== undefined) {
      return this.delta.npc_metadata ?? undefined;
    }
    return this.parent.npcMetadata();
  }
  npcState(): c.ReadonlyNpcState | undefined {
    if (this.delta?.npc_state !== undefined) {
      return this.delta.npc_state ?? undefined;
    }
    return this.parent.npcState();
  }
  groupPreviewReference(): c.ReadonlyGroupPreviewReference | undefined {
    if (this.delta?.group_preview_reference !== undefined) {
      return this.delta.group_preview_reference ?? undefined;
    }
    return this.parent.groupPreviewReference();
  }
  aclComponent(): c.ReadonlyAclComponent | undefined {
    if (this.delta?.acl_component !== undefined) {
      return this.delta.acl_component ?? undefined;
    }
    return this.parent.aclComponent();
  }
  deedComponent(): c.ReadonlyDeedComponent | undefined {
    if (this.delta?.deed_component !== undefined) {
      return this.delta.deed_component ?? undefined;
    }
    return this.parent.deedComponent();
  }
  groupPreviewComponent(): c.ReadonlyGroupPreviewComponent | undefined {
    if (this.delta?.group_preview_component !== undefined) {
      return this.delta.group_preview_component ?? undefined;
    }
    return this.parent.groupPreviewComponent();
  }
  blueprintComponent(): c.ReadonlyBlueprintComponent | undefined {
    if (this.delta?.blueprint_component !== undefined) {
      return this.delta.blueprint_component ?? undefined;
    }
    return this.parent.blueprintComponent();
  }
  craftingStationComponent(): c.ReadonlyCraftingStationComponent | undefined {
    if (this.delta?.crafting_station_component !== undefined) {
      return this.delta.crafting_station_component ?? undefined;
    }
    return this.parent.craftingStationComponent();
  }
  health(): c.ReadonlyHealth | undefined {
    if (this.delta?.health !== undefined) {
      return this.delta.health ?? undefined;
    }
    return this.parent.health();
  }
  buffsComponent(): c.ReadonlyBuffsComponent | undefined {
    if (this.delta?.buffs_component !== undefined) {
      return this.delta.buffs_component ?? undefined;
    }
    return this.parent.buffsComponent();
  }
  gremlin(): c.ReadonlyGremlin | undefined {
    if (this.delta?.gremlin !== undefined) {
      return this.delta.gremlin ?? undefined;
    }
    return this.parent.gremlin();
  }
  placeableComponent(): c.ReadonlyPlaceableComponent | undefined {
    if (this.delta?.placeable_component !== undefined) {
      return this.delta.placeable_component ?? undefined;
    }
    return this.parent.placeableComponent();
  }
  groupedEntities(): c.ReadonlyGroupedEntities | undefined {
    if (this.delta?.grouped_entities !== undefined) {
      return this.delta.grouped_entities ?? undefined;
    }
    return this.parent.groupedEntities();
  }
  inGroup(): c.ReadonlyInGroup | undefined {
    if (this.delta?.in_group !== undefined) {
      return this.delta.in_group ?? undefined;
    }
    return this.parent.inGroup();
  }
  pictureFrameContents(): c.ReadonlyPictureFrameContents | undefined {
    if (this.delta?.picture_frame_contents !== undefined) {
      return this.delta.picture_frame_contents ?? undefined;
    }
    return this.parent.pictureFrameContents();
  }
  triggerState(): c.ReadonlyTriggerState | undefined {
    if (this.delta?.trigger_state !== undefined) {
      return this.delta.trigger_state ?? undefined;
    }
    return this.parent.triggerState();
  }
  lifetimeStats(): c.ReadonlyLifetimeStats | undefined {
    if (this.delta?.lifetime_stats !== undefined) {
      return this.delta.lifetime_stats ?? undefined;
    }
    return this.parent.lifetimeStats();
  }
  occupancyComponent(): c.ReadonlyOccupancyComponent | undefined {
    if (this.delta?.occupancy_component !== undefined) {
      return this.delta.occupancy_component ?? undefined;
    }
    return this.parent.occupancyComponent();
  }
  videoComponent(): c.ReadonlyVideoComponent | undefined {
    if (this.delta?.video_component !== undefined) {
      return this.delta.video_component ?? undefined;
    }
    return this.parent.videoComponent();
  }
  playerSession(): c.ReadonlyPlayerSession | undefined {
    if (this.delta?.player_session !== undefined) {
      return this.delta.player_session ?? undefined;
    }
    return this.parent.playerSession();
  }
  presetApplied(): c.ReadonlyPresetApplied | undefined {
    if (this.delta?.preset_applied !== undefined) {
      return this.delta.preset_applied ?? undefined;
    }
    return this.parent.presetApplied();
  }
  presetPrototype(): c.ReadonlyPresetPrototype | undefined {
    if (this.delta?.preset_prototype !== undefined) {
      return this.delta.preset_prototype ?? undefined;
    }
    return this.parent.presetPrototype();
  }
  farmingPlantComponent(): c.ReadonlyFarmingPlantComponent | undefined {
    if (this.delta?.farming_plant_component !== undefined) {
      return this.delta.farming_plant_component ?? undefined;
    }
    return this.parent.farmingPlantComponent();
  }
  shardFarming(): c.ReadonlyShardFarming | undefined {
    if (this.delta?.shard_farming !== undefined) {
      return this.delta.shard_farming ?? undefined;
    }
    return this.parent.shardFarming();
  }
  createdBy(): c.ReadonlyCreatedBy | undefined {
    if (this.delta?.created_by !== undefined) {
      return this.delta.created_by ?? undefined;
    }
    return this.parent.createdBy();
  }
  minigameComponent(): c.ReadonlyMinigameComponent | undefined {
    if (this.delta?.minigame_component !== undefined) {
      return this.delta.minigame_component ?? undefined;
    }
    return this.parent.minigameComponent();
  }
  minigameInstance(): c.ReadonlyMinigameInstance | undefined {
    if (this.delta?.minigame_instance !== undefined) {
      return this.delta.minigame_instance ?? undefined;
    }
    return this.parent.minigameInstance();
  }
  playingMinigame(): c.ReadonlyPlayingMinigame | undefined {
    if (this.delta?.playing_minigame !== undefined) {
      return this.delta.playing_minigame ?? undefined;
    }
    return this.parent.playingMinigame();
  }
  minigameElement(): c.ReadonlyMinigameElement | undefined {
    if (this.delta?.minigame_element !== undefined) {
      return this.delta.minigame_element ?? undefined;
    }
    return this.parent.minigameElement();
  }
  activeTray(): c.ReadonlyActiveTray | undefined {
    if (this.delta?.active_tray !== undefined) {
      return this.delta.active_tray ?? undefined;
    }
    return this.parent.activeTray();
  }
  stashed(): c.ReadonlyStashed | undefined {
    if (this.delta?.stashed !== undefined) {
      return this.delta.stashed ?? undefined;
    }
    return this.parent.stashed();
  }
  minigameInstanceTickInfo(): c.ReadonlyMinigameInstanceTickInfo | undefined {
    if (this.delta?.minigame_instance_tick_info !== undefined) {
      return this.delta.minigame_instance_tick_info ?? undefined;
    }
    return this.parent.minigameInstanceTickInfo();
  }
  warpingTo(): c.ReadonlyWarpingTo | undefined {
    if (this.delta?.warping_to !== undefined) {
      return this.delta.warping_to ?? undefined;
    }
    return this.parent.warpingTo();
  }
  minigameInstanceExpire(): c.ReadonlyMinigameInstanceExpire | undefined {
    if (this.delta?.minigame_instance_expire !== undefined) {
      return this.delta.minigame_instance_expire ?? undefined;
    }
    return this.parent.minigameInstanceExpire();
  }
  placerComponent(): c.ReadonlyPlacerComponent | undefined {
    if (this.delta?.placer_component !== undefined) {
      return this.delta.placer_component ?? undefined;
    }
    return this.parent.placerComponent();
  }
  questGiver(): c.ReadonlyQuestGiver | undefined {
    if (this.delta?.quest_giver !== undefined) {
      return this.delta.quest_giver ?? undefined;
    }
    return this.parent.questGiver();
  }
  defaultDialog(): c.ReadonlyDefaultDialog | undefined {
    if (this.delta?.default_dialog !== undefined) {
      return this.delta.default_dialog ?? undefined;
    }
    return this.parent.defaultDialog();
  }
  unmuck(): c.ReadonlyUnmuck | undefined {
    if (this.delta?.unmuck !== undefined) {
      return this.delta.unmuck ?? undefined;
    }
    return this.parent.unmuck();
  }
  robotComponent(): c.ReadonlyRobotComponent | undefined {
    if (this.delta?.robot_component !== undefined) {
      return this.delta.robot_component ?? undefined;
    }
    return this.parent.robotComponent();
  }
  adminEntity(): c.ReadonlyAdminEntity | undefined {
    if (this.delta?.admin_entity !== undefined) {
      return this.delta.admin_entity ?? undefined;
    }
    return this.parent.adminEntity();
  }
  protection(): c.ReadonlyProtection | undefined {
    if (this.delta?.protection !== undefined) {
      return this.delta.protection ?? undefined;
    }
    return this.parent.protection();
  }
  projectsProtection(): c.ReadonlyProjectsProtection | undefined {
    if (this.delta?.projects_protection !== undefined) {
      return this.delta.projects_protection ?? undefined;
    }
    return this.parent.projectsProtection();
  }
  deletesWith(): c.ReadonlyDeletesWith | undefined {
    if (this.delta?.deletes_with !== undefined) {
      return this.delta.deletes_with ?? undefined;
    }
    return this.parent.deletesWith();
  }
  itemBuyer(): c.ReadonlyItemBuyer | undefined {
    if (this.delta?.item_buyer !== undefined) {
      return this.delta.item_buyer ?? undefined;
    }
    return this.parent.itemBuyer();
  }
  inspectionTweaks(): c.ReadonlyInspectionTweaks | undefined {
    if (this.delta?.inspection_tweaks !== undefined) {
      return this.delta.inspection_tweaks ?? undefined;
    }
    return this.parent.inspectionTweaks();
  }
  profilePic(): c.ReadonlyProfilePic | undefined {
    if (this.delta?.profile_pic !== undefined) {
      return this.delta.profile_pic ?? undefined;
    }
    return this.parent.profilePic();
  }
  entityDescription(): c.ReadonlyEntityDescription | undefined {
    if (this.delta?.entity_description !== undefined) {
      return this.delta.entity_description ?? undefined;
    }
    return this.parent.entityDescription();
  }
  landmark(): c.ReadonlyLandmark | undefined {
    if (this.delta?.landmark !== undefined) {
      return this.delta.landmark ?? undefined;
    }
    return this.parent.landmark();
  }
  collideable(): c.ReadonlyCollideable | undefined {
    if (this.delta?.collideable !== undefined) {
      return this.delta.collideable ?? undefined;
    }
    return this.parent.collideable();
  }
  restoration(): c.ReadonlyRestoration | undefined {
    if (this.delta?.restoration !== undefined) {
      return this.delta.restoration ?? undefined;
    }
    return this.parent.restoration();
  }
  terrainRestorationDiff(): c.ReadonlyTerrainRestorationDiff | undefined {
    if (this.delta?.terrain_restoration_diff !== undefined) {
      return this.delta.terrain_restoration_diff ?? undefined;
    }
    return this.parent.terrainRestorationDiff();
  }
  team(): c.ReadonlyTeam | undefined {
    if (this.delta?.team !== undefined) {
      return this.delta.team ?? undefined;
    }
    return this.parent.team();
  }
  playerCurrentTeam(): c.ReadonlyPlayerCurrentTeam | undefined {
    if (this.delta?.player_current_team !== undefined) {
      return this.delta.player_current_team ?? undefined;
    }
    return this.parent.playerCurrentTeam();
  }
  userRoles(): c.ReadonlyUserRoles | undefined {
    if (this.delta?.user_roles !== undefined) {
      return this.delta.user_roles ?? undefined;
    }
    return this.parent.userRoles();
  }
  restoresTo(): c.ReadonlyRestoresTo | undefined {
    if (this.delta?.restores_to !== undefined) {
      return this.delta.restores_to ?? undefined;
    }
    return this.parent.restoresTo();
  }
  trade(): c.ReadonlyTrade | undefined {
    if (this.delta?.trade !== undefined) {
      return this.delta.trade ?? undefined;
    }
    return this.parent.trade();
  }
  activeTrades(): c.ReadonlyActiveTrades | undefined {
    if (this.delta?.active_trades !== undefined) {
      return this.delta.active_trades ?? undefined;
    }
    return this.parent.activeTrades();
  }
  placedBy(): c.ReadonlyPlacedBy | undefined {
    if (this.delta?.placed_by !== undefined) {
      return this.delta.placed_by ?? undefined;
    }
    return this.parent.placedBy();
  }
  textSign(): c.ReadonlyTextSign | undefined {
    if (this.delta?.text_sign !== undefined) {
      return this.delta.text_sign ?? undefined;
    }
    return this.parent.textSign();
  }
  irradiance(): c.ReadonlyIrradiance | undefined {
    if (this.delta?.irradiance !== undefined) {
      return this.delta.irradiance ?? undefined;
    }
    return this.parent.irradiance();
  }
  lockedInPlace(): c.ReadonlyLockedInPlace | undefined {
    if (this.delta?.locked_in_place !== undefined) {
      return this.delta.locked_in_place ?? undefined;
    }
    return this.parent.lockedInPlace();
  }
  deathInfo(): c.ReadonlyDeathInfo | undefined {
    if (this.delta?.death_info !== undefined) {
      return this.delta.death_info ?? undefined;
    }
    return this.parent.deathInfo();
  }
  syntheticStats(): c.ReadonlySyntheticStats | undefined {
    if (this.delta?.synthetic_stats !== undefined) {
      return this.delta.synthetic_stats ?? undefined;
    }
    return this.parent.syntheticStats();
  }
  idle(): c.ReadonlyIdle | undefined {
    if (this.delta?.idle !== undefined) {
      return this.delta.idle ?? undefined;
    }
    return this.parent.idle();
  }
  voice(): c.ReadonlyVoice | undefined {
    if (this.delta?.voice !== undefined) {
      return this.delta.voice ?? undefined;
    }
    return this.parent.voice();
  }
  giftGiver(): c.ReadonlyGiftGiver | undefined {
    if (this.delta?.gift_giver !== undefined) {
      return this.delta.gift_giver ?? undefined;
    }
    return this.parent.giftGiver();
  }

  commit() {
    const hadDelta = this.delta !== undefined;
    this.runHooks();
    if (hadDelta) {
      this.parent.apply(this.delta!);
    }
    this.delta = undefined;
    return hadDelta;
  }
}
