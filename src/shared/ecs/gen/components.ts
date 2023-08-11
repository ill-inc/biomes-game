// GENERATED: This file is generated from components.ts.j2. Do not modify directly.
// Content Hash: a56cf5c56038634189cb82f444855a75

import * as t from "@/shared/ecs/gen/types";
import { cloneDeepWithItems } from "@/shared/game/item";
import { BiomesId } from "@/shared/ids";
import { PathDef } from "@/shared/resources/path_map";

// =====================
// Component definitions
// =====================

export const DEPRECATED_COMPONENT_IDS: Set<number> = new Set([
  96, 36, 69, 73, 42, 44, 81, 114, 116, 85, 94, 89, 90, 62,
]);

export const HFC_COMPONENT_IDS: Set<number> = new Set([54, 55, 32, 43, 67]);

export type HfcComponentName =
  | "position"
  | "orientation"
  | "rigid_body"
  | "emote"
  | "npc_state";

export const COMPONENT_SERIALIZATION_MODE: Record<number, "server" | "self"> = {
  [41]: "self",
  [46]: "self",
  [48]: "self",
  [50]: "server",
  [58]: "server",
  [67]: "server",
  [88]: "self",
  [91]: "self",
  [97]: "server",
  [98]: "self",
  [99]: "self",
  [100]: "self",
  [115]: "server",
  [117]: "server",
  [118]: "self",
  [121]: "server",
  [129]: "server",
  [141]: "self",
  [149]: "self",
  [153]: "self",
};

export interface Iced {}

export interface ReadonlyIced {}

export class Iced {
  static ID = 57;

  static create(_unused?: any): Iced {
    return {};
  }

  static clone(_unused?: any): Iced {
    return {};
  }
}
export interface RemoteConnection {}

export interface ReadonlyRemoteConnection {}

export class RemoteConnection {
  static ID = 31;

  static create(_unused?: any): RemoteConnection {
    return {};
  }

  static clone(_unused?: any): RemoteConnection {
    return {};
  }
}
export interface Position {
  v: t.Vec3f;
}

export interface ReadonlyPosition {
  readonly v: t.ReadonlyVec3f;
}

export class Position {
  static ID = 54;

  static create(fields: Partial<Position> = {}): Position {
    if (fields.v === undefined) {
      fields.v = t.defaultVec3f();
    }
    return fields as Position;
  }

  static clone(value?: ReadonlyPosition): Position {
    return value === undefined
      ? Position.create()
      : (cloneDeepWithItems(value) as unknown as Position);
  }
}
export interface Orientation {
  v: t.Vec2f;
}

export interface ReadonlyOrientation {
  readonly v: t.ReadonlyVec2f;
}

export class Orientation {
  static ID = 55;

  static create(fields: Partial<Orientation> = {}): Orientation {
    if (fields.v === undefined) {
      fields.v = t.defaultVec2f();
    }
    return fields as Orientation;
  }

  static clone(value?: ReadonlyOrientation): Orientation {
    return value === undefined
      ? Orientation.create()
      : (cloneDeepWithItems(value) as unknown as Orientation);
  }
}
export interface RigidBody {
  velocity: t.Vec3f;
}

export interface ReadonlyRigidBody {
  readonly velocity: t.ReadonlyVec3f;
}

export class RigidBody {
  static ID = 32;

  static create(fields: Partial<RigidBody> = {}): RigidBody {
    if (fields.velocity === undefined) {
      fields.velocity = t.defaultVec3f();
    }
    return fields as RigidBody;
  }

  static clone(value?: ReadonlyRigidBody): RigidBody {
    return value === undefined
      ? RigidBody.create()
      : (cloneDeepWithItems(value) as unknown as RigidBody);
  }
}
export interface Size {
  v: t.Vec3f;
}

export interface ReadonlySize {
  readonly v: t.ReadonlyVec3f;
}

export class Size {
  static ID = 110;

  static create(fields: Partial<Size> = {}): Size {
    if (fields.v === undefined) {
      fields.v = t.defaultVec3f();
    }
    return fields as Size;
  }

  static clone(value?: ReadonlySize): Size {
    return value === undefined
      ? Size.create()
      : (cloneDeepWithItems(value) as unknown as Size);
  }
}
export interface Box {
  v0: t.Vec3i;
  v1: t.Vec3i;
}

export interface ReadonlyBox {
  readonly v0: t.ReadonlyVec3i;
  readonly v1: t.ReadonlyVec3i;
}

export class Box {
  static ID = 33;

  static create(fields: Partial<Box> = {}): Box {
    if (fields.v0 === undefined) {
      fields.v0 = t.defaultVec3i();
    }
    if (fields.v1 === undefined) {
      fields.v1 = t.defaultVec3i();
    }
    return fields as Box;
  }

  static clone(value?: ReadonlyBox): Box {
    return value === undefined
      ? Box.create()
      : (cloneDeepWithItems(value) as unknown as Box);
  }
}
export interface ShardSeed {
  buffer: t.Buffer;
}

export interface ReadonlyShardSeed {
  readonly buffer: t.ReadonlyBuffer;
}

export class ShardSeed {
  static ID = 34;

  static create(fields: Partial<ShardSeed> = {}): ShardSeed {
    if (fields.buffer === undefined) {
      fields.buffer = t.defaultBuffer();
    }
    return fields as ShardSeed;
  }

  static clone(value?: ReadonlyShardSeed): ShardSeed {
    return value === undefined
      ? ShardSeed.create()
      : (cloneDeepWithItems(value) as unknown as ShardSeed);
  }
}
export interface ShardDiff {
  buffer: t.Buffer;
}

export interface ReadonlyShardDiff {
  readonly buffer: t.ReadonlyBuffer;
}

export class ShardDiff {
  static ID = 35;

  static create(fields: Partial<ShardDiff> = {}): ShardDiff {
    if (fields.buffer === undefined) {
      fields.buffer = t.defaultBuffer();
    }
    return fields as ShardDiff;
  }

  static clone(value?: ReadonlyShardDiff): ShardDiff {
    return value === undefined
      ? ShardDiff.create()
      : (cloneDeepWithItems(value) as unknown as ShardDiff);
  }
}
export interface ShardShapes {
  buffer: t.Buffer;
}

export interface ReadonlyShardShapes {
  readonly buffer: t.ReadonlyBuffer;
}

export class ShardShapes {
  static ID = 60;

  static create(fields: Partial<ShardShapes> = {}): ShardShapes {
    if (fields.buffer === undefined) {
      fields.buffer = t.defaultBuffer();
    }
    return fields as ShardShapes;
  }

  static clone(value?: ReadonlyShardShapes): ShardShapes {
    return value === undefined
      ? ShardShapes.create()
      : (cloneDeepWithItems(value) as unknown as ShardShapes);
  }
}
export interface ShardSkyOcclusion {
  buffer: t.Buffer;
}

export interface ReadonlyShardSkyOcclusion {
  readonly buffer: t.ReadonlyBuffer;
}

export class ShardSkyOcclusion {
  static ID = 76;

  static create(fields: Partial<ShardSkyOcclusion> = {}): ShardSkyOcclusion {
    if (fields.buffer === undefined) {
      fields.buffer = t.defaultBuffer();
    }
    return fields as ShardSkyOcclusion;
  }

  static clone(value?: ReadonlyShardSkyOcclusion): ShardSkyOcclusion {
    return value === undefined
      ? ShardSkyOcclusion.create()
      : (cloneDeepWithItems(value) as unknown as ShardSkyOcclusion);
  }
}
export interface ShardIrradiance {
  buffer: t.Buffer;
}

export interface ReadonlyShardIrradiance {
  readonly buffer: t.ReadonlyBuffer;
}

export class ShardIrradiance {
  static ID = 80;

  static create(fields: Partial<ShardIrradiance> = {}): ShardIrradiance {
    if (fields.buffer === undefined) {
      fields.buffer = t.defaultBuffer();
    }
    return fields as ShardIrradiance;
  }

  static clone(value?: ReadonlyShardIrradiance): ShardIrradiance {
    return value === undefined
      ? ShardIrradiance.create()
      : (cloneDeepWithItems(value) as unknown as ShardIrradiance);
  }
}
export interface ShardWater {
  buffer: t.Buffer;
}

export interface ReadonlyShardWater {
  readonly buffer: t.ReadonlyBuffer;
}

export class ShardWater {
  static ID = 82;

  static create(fields: Partial<ShardWater> = {}): ShardWater {
    if (fields.buffer === undefined) {
      fields.buffer = t.defaultBuffer();
    }
    return fields as ShardWater;
  }

  static clone(value?: ReadonlyShardWater): ShardWater {
    return value === undefined
      ? ShardWater.create()
      : (cloneDeepWithItems(value) as unknown as ShardWater);
  }
}
export interface ShardOccupancy {
  buffer: t.Buffer;
}

export interface ReadonlyShardOccupancy {
  readonly buffer: t.ReadonlyBuffer;
}

export class ShardOccupancy {
  static ID = 93;

  static create(fields: Partial<ShardOccupancy> = {}): ShardOccupancy {
    if (fields.buffer === undefined) {
      fields.buffer = t.defaultBuffer();
    }
    return fields as ShardOccupancy;
  }

  static clone(value?: ReadonlyShardOccupancy): ShardOccupancy {
    return value === undefined
      ? ShardOccupancy.create()
      : (cloneDeepWithItems(value) as unknown as ShardOccupancy);
  }
}
export interface ShardDye {
  buffer: t.Buffer;
}

export interface ReadonlyShardDye {
  readonly buffer: t.ReadonlyBuffer;
}

export class ShardDye {
  static ID = 111;

  static create(fields: Partial<ShardDye> = {}): ShardDye {
    if (fields.buffer === undefined) {
      fields.buffer = t.defaultBuffer();
    }
    return fields as ShardDye;
  }

  static clone(value?: ReadonlyShardDye): ShardDye {
    return value === undefined
      ? ShardDye.create()
      : (cloneDeepWithItems(value) as unknown as ShardDye);
  }
}
export interface ShardMoisture {
  buffer: t.Buffer;
}

export interface ReadonlyShardMoisture {
  readonly buffer: t.ReadonlyBuffer;
}

export class ShardMoisture {
  static ID = 112;

  static create(fields: Partial<ShardMoisture> = {}): ShardMoisture {
    if (fields.buffer === undefined) {
      fields.buffer = t.defaultBuffer();
    }
    return fields as ShardMoisture;
  }

  static clone(value?: ReadonlyShardMoisture): ShardMoisture {
    return value === undefined
      ? ShardMoisture.create()
      : (cloneDeepWithItems(value) as unknown as ShardMoisture);
  }
}
export interface ShardGrowth {
  buffer: t.Buffer;
}

export interface ReadonlyShardGrowth {
  readonly buffer: t.ReadonlyBuffer;
}

export class ShardGrowth {
  static ID = 113;

  static create(fields: Partial<ShardGrowth> = {}): ShardGrowth {
    if (fields.buffer === undefined) {
      fields.buffer = t.defaultBuffer();
    }
    return fields as ShardGrowth;
  }

  static clone(value?: ReadonlyShardGrowth): ShardGrowth {
    return value === undefined
      ? ShardGrowth.create()
      : (cloneDeepWithItems(value) as unknown as ShardGrowth);
  }
}
export interface ShardPlacer {
  buffer: t.Buffer;
}

export interface ReadonlyShardPlacer {
  readonly buffer: t.ReadonlyBuffer;
}

export class ShardPlacer {
  static ID = 120;

  static create(fields: Partial<ShardPlacer> = {}): ShardPlacer {
    if (fields.buffer === undefined) {
      fields.buffer = t.defaultBuffer();
    }
    return fields as ShardPlacer;
  }

  static clone(value?: ReadonlyShardPlacer): ShardPlacer {
    return value === undefined
      ? ShardPlacer.create()
      : (cloneDeepWithItems(value) as unknown as ShardPlacer);
  }
}
export interface ShardMuck {
  buffer: t.Buffer;
}

export interface ReadonlyShardMuck {
  readonly buffer: t.ReadonlyBuffer;
}

export class ShardMuck {
  static ID = 124;

  static create(fields: Partial<ShardMuck> = {}): ShardMuck {
    if (fields.buffer === undefined) {
      fields.buffer = t.defaultBuffer();
    }
    return fields as ShardMuck;
  }

  static clone(value?: ReadonlyShardMuck): ShardMuck {
    return value === undefined
      ? ShardMuck.create()
      : (cloneDeepWithItems(value) as unknown as ShardMuck);
  }
}
export interface Label {
  text: t.String;
}

export interface ReadonlyLabel {
  readonly text: t.ReadonlyString;
}

export class Label {
  static ID = 37;

  static create(fields: Partial<Label> = {}): Label {
    if (fields.text === undefined) {
      fields.text = t.defaultString;
    }
    return fields as Label;
  }

  static clone(value?: ReadonlyLabel): Label {
    return value === undefined
      ? Label.create()
      : (cloneDeepWithItems(value) as unknown as Label);
  }
}
export interface GrabBag {
  slots: t.ItemBag;
  filter: t.GrabBagFilter;
  mined: t.Bool;
}

export interface ReadonlyGrabBag {
  readonly slots: t.ReadonlyItemBag;
  readonly filter: t.ReadonlyGrabBagFilter;
  readonly mined: t.ReadonlyBool;
}

export class GrabBag {
  static ID = 51;

  static create(fields: Partial<GrabBag> = {}): GrabBag {
    if (fields.slots === undefined) {
      fields.slots = t.defaultItemBag();
    }
    if (fields.filter === undefined) {
      fields.filter = t.defaultGrabBagFilter();
    }
    if (fields.mined === undefined) {
      fields.mined = t.defaultBool;
    }
    return fields as GrabBag;
  }

  static clone(value?: ReadonlyGrabBag): GrabBag {
    return value === undefined
      ? GrabBag.create()
      : (cloneDeepWithItems(value) as unknown as GrabBag);
  }
}
export interface Acquisition {
  acquired_by: BiomesId;
  items: t.ItemBag;
}

export interface ReadonlyAcquisition {
  readonly acquired_by: BiomesId;
  readonly items: t.ReadonlyItemBag;
}

export class Acquisition {
  static ID = 52;

  static create(fields: Partial<Acquisition> = {}): Acquisition {
    if (fields.acquired_by === undefined) {
      fields.acquired_by = t.defaultBiomesId;
    }
    if (fields.items === undefined) {
      fields.items = t.defaultItemBag();
    }
    return fields as Acquisition;
  }

  static clone(value?: ReadonlyAcquisition): Acquisition {
    return value === undefined
      ? Acquisition.create()
      : (cloneDeepWithItems(value) as unknown as Acquisition);
  }
}
export interface LooseItem {
  item: t.Item;
}

export interface ReadonlyLooseItem {
  readonly item: t.ReadonlyItem;
}

export class LooseItem {
  static ID = 53;

  static create(fields: Partial<LooseItem> = {}): LooseItem {
    if (fields.item === undefined) {
      fields.item = t.defaultItem();
    }
    return fields as LooseItem;
  }

  static clone(value?: ReadonlyLooseItem): LooseItem {
    return value === undefined
      ? LooseItem.create()
      : (cloneDeepWithItems(value) as unknown as LooseItem);
  }
}
export interface Inventory {
  items: t.ItemContainer;
  currencies: t.ItemBag;
  hotbar: t.ItemContainer;
  selected: t.OwnedItemReference;
  overflow: t.ItemBag;
}

export interface ReadonlyInventory {
  readonly items: t.ReadonlyItemContainer;
  readonly currencies: t.ReadonlyItemBag;
  readonly hotbar: t.ReadonlyItemContainer;
  readonly selected: t.ReadonlyOwnedItemReference;
  readonly overflow: t.ReadonlyItemBag;
}

export class Inventory {
  static ID = 41;

  static create(fields: Partial<Inventory> = {}): Inventory {
    if (fields.items === undefined) {
      fields.items = t.defaultItemContainer();
    }
    if (fields.currencies === undefined) {
      fields.currencies = t.defaultItemBag();
    }
    if (fields.hotbar === undefined) {
      fields.hotbar = t.defaultItemContainer();
    }
    if (fields.selected === undefined) {
      fields.selected = t.defaultOwnedItemReference();
    }
    if (fields.overflow === undefined) {
      fields.overflow = t.defaultItemBag();
    }
    return fields as Inventory;
  }

  static clone(value?: ReadonlyInventory): Inventory {
    return value === undefined
      ? Inventory.create()
      : (cloneDeepWithItems(value) as unknown as Inventory);
  }
}
export interface ContainerInventory {
  items: t.ItemContainer;
}

export interface ReadonlyContainerInventory {
  readonly items: t.ReadonlyItemContainer;
}

export class ContainerInventory {
  static ID = 79;

  static create(fields: Partial<ContainerInventory> = {}): ContainerInventory {
    if (fields.items === undefined) {
      fields.items = t.defaultItemContainer();
    }
    return fields as ContainerInventory;
  }

  static clone(value?: ReadonlyContainerInventory): ContainerInventory {
    return value === undefined
      ? ContainerInventory.create()
      : (cloneDeepWithItems(value) as unknown as ContainerInventory);
  }
}
export interface PricedContainerInventory {
  items: t.PricedItemContainer;
  infinite_capacity: t.Bool;
}

export interface ReadonlyPricedContainerInventory {
  readonly items: t.ReadonlyPricedItemContainer;
  readonly infinite_capacity: t.ReadonlyBool;
}

export class PricedContainerInventory {
  static ID = 86;

  static create(
    fields: Partial<PricedContainerInventory> = {}
  ): PricedContainerInventory {
    if (fields.items === undefined) {
      fields.items = t.defaultPricedItemContainer();
    }
    if (fields.infinite_capacity === undefined) {
      fields.infinite_capacity = t.defaultBool;
    }
    return fields as PricedContainerInventory;
  }

  static clone(
    value?: ReadonlyPricedContainerInventory
  ): PricedContainerInventory {
    return value === undefined
      ? PricedContainerInventory.create()
      : (cloneDeepWithItems(value) as unknown as PricedContainerInventory);
  }
}
export interface SelectedItem {
  item: t.ItemSlot;
}

export interface ReadonlySelectedItem {
  readonly item: t.ReadonlyItemSlot;
}

export class SelectedItem {
  static ID = 59;

  static create(fields: Partial<SelectedItem> = {}): SelectedItem {
    if (fields.item === undefined) {
      fields.item = t.defaultItemSlot;
    }
    return fields as SelectedItem;
  }

  static clone(value?: ReadonlySelectedItem): SelectedItem {
    return value === undefined
      ? SelectedItem.create()
      : (cloneDeepWithItems(value) as unknown as SelectedItem);
  }
}
export interface Wearing {
  items: t.ItemAssignment;
}

export interface ReadonlyWearing {
  readonly items: t.ReadonlyItemAssignment;
}

export class Wearing {
  static ID = 49;

  static create(fields: Partial<Wearing> = {}): Wearing {
    if (fields.items === undefined) {
      fields.items = t.defaultItemAssignment();
    }
    return fields as Wearing;
  }

  static clone(value?: ReadonlyWearing): Wearing {
    return value === undefined
      ? Wearing.create()
      : (cloneDeepWithItems(value) as unknown as Wearing);
  }
}
export interface Emote {
  emote_type: t.OptionalEmoteType;
  emote_start_time: t.F64;
  emote_expiry_time: t.F64;
  rich_emote_components: t.OptionalRichEmoteComponents;
  emote_nonce: t.OptionalF64;
}

export interface ReadonlyEmote {
  readonly emote_type: t.ReadonlyOptionalEmoteType;
  readonly emote_start_time: t.ReadonlyF64;
  readonly emote_expiry_time: t.ReadonlyF64;
  readonly rich_emote_components: t.ReadonlyOptionalRichEmoteComponents;
  readonly emote_nonce: t.ReadonlyOptionalF64;
}

export class Emote {
  static ID = 43;

  static create(fields: Partial<Emote> = {}): Emote {
    if (fields.emote_type === undefined) {
      fields.emote_type = t.defaultOptionalEmoteType;
    }
    if (fields.emote_start_time === undefined) {
      fields.emote_start_time = t.defaultF64;
    }
    if (fields.emote_expiry_time === undefined) {
      fields.emote_expiry_time = t.defaultF64;
    }
    if (fields.rich_emote_components === undefined) {
      fields.rich_emote_components = t.defaultOptionalRichEmoteComponents;
    }
    if (fields.emote_nonce === undefined) {
      fields.emote_nonce = t.defaultOptionalF64;
    }
    return fields as Emote;
  }

  static clone(value?: ReadonlyEmote): Emote {
    return value === undefined
      ? Emote.create()
      : (cloneDeepWithItems(value) as unknown as Emote);
  }
}
export interface AppearanceComponent {
  appearance: t.Appearance;
}

export interface ReadonlyAppearanceComponent {
  readonly appearance: t.ReadonlyAppearance;
}

export class AppearanceComponent {
  static ID = 56;

  static create(
    fields: Partial<AppearanceComponent> = {}
  ): AppearanceComponent {
    if (fields.appearance === undefined) {
      fields.appearance = t.defaultAppearance();
    }
    return fields as AppearanceComponent;
  }

  static clone(value?: ReadonlyAppearanceComponent): AppearanceComponent {
    return value === undefined
      ? AppearanceComponent.create()
      : (cloneDeepWithItems(value) as unknown as AppearanceComponent);
  }
}
export interface GroupComponent {
  tensor: t.TensorBlob;
}

export interface ReadonlyGroupComponent {
  readonly tensor: t.ReadonlyTensorBlob;
}

export class GroupComponent {
  static ID = 45;

  static create(fields: Partial<GroupComponent> = {}): GroupComponent {
    if (fields.tensor === undefined) {
      fields.tensor = t.defaultTensorBlob;
    }
    return fields as GroupComponent;
  }

  static clone(value?: ReadonlyGroupComponent): GroupComponent {
    return value === undefined
      ? GroupComponent.create()
      : (cloneDeepWithItems(value) as unknown as GroupComponent);
  }
}
export interface Challenges {
  in_progress: t.BiomesIdSet;
  complete: t.BiomesIdSet;
  available: t.BiomesIdSet;
  started_at: t.ChallengeTime;
  finished_at: t.ChallengeTime;
}

export interface ReadonlyChallenges {
  readonly in_progress: t.ReadonlyBiomesIdSet;
  readonly complete: t.ReadonlyBiomesIdSet;
  readonly available: t.ReadonlyBiomesIdSet;
  readonly started_at: t.ReadonlyChallengeTime;
  readonly finished_at: t.ReadonlyChallengeTime;
}

export class Challenges {
  static ID = 46;

  static create(fields: Partial<Challenges> = {}): Challenges {
    if (fields.in_progress === undefined) {
      fields.in_progress = t.defaultBiomesIdSet();
    }
    if (fields.complete === undefined) {
      fields.complete = t.defaultBiomesIdSet();
    }
    if (fields.available === undefined) {
      fields.available = t.defaultBiomesIdSet();
    }
    if (fields.started_at === undefined) {
      fields.started_at = t.defaultChallengeTime();
    }
    if (fields.finished_at === undefined) {
      fields.finished_at = t.defaultChallengeTime();
    }
    return fields as Challenges;
  }

  static clone(value?: ReadonlyChallenges): Challenges {
    return value === undefined
      ? Challenges.create()
      : (cloneDeepWithItems(value) as unknown as Challenges);
  }
}
export interface RecipeBook {
  recipes: t.ItemSet;
}

export interface ReadonlyRecipeBook {
  readonly recipes: t.ReadonlyItemSet;
}

export class RecipeBook {
  static ID = 48;

  static create(fields: Partial<RecipeBook> = {}): RecipeBook {
    if (fields.recipes === undefined) {
      fields.recipes = t.defaultItemSet();
    }
    return fields as RecipeBook;
  }

  static clone(value?: ReadonlyRecipeBook): RecipeBook {
    return value === undefined
      ? RecipeBook.create()
      : (cloneDeepWithItems(value) as unknown as RecipeBook);
  }
}
export interface Expires {
  trigger_at: t.F64;
}

export interface ReadonlyExpires {
  readonly trigger_at: t.ReadonlyF64;
}

export class Expires {
  static ID = 50;

  static create(fields: Partial<Expires> = {}): Expires {
    if (fields.trigger_at === undefined) {
      fields.trigger_at = t.defaultF64;
    }
    return fields as Expires;
  }

  static clone(value?: ReadonlyExpires): Expires {
    return value === undefined
      ? Expires.create()
      : (cloneDeepWithItems(value) as unknown as Expires);
  }
}
export interface Icing {
  trigger_at: t.F64;
}

export interface ReadonlyIcing {
  readonly trigger_at: t.ReadonlyF64;
}

export class Icing {
  static ID = 58;

  static create(fields: Partial<Icing> = {}): Icing {
    if (fields.trigger_at === undefined) {
      fields.trigger_at = t.defaultF64;
    }
    return fields as Icing;
  }

  static clone(value?: ReadonlyIcing): Icing {
    return value === undefined
      ? Icing.create()
      : (cloneDeepWithItems(value) as unknown as Icing);
  }
}
export interface Warpable {
  trigger_at: t.F64;
  warp_to: t.Vec3f;
  orientation: t.Vec2f;
  owner: BiomesId;
}

export interface ReadonlyWarpable {
  readonly trigger_at: t.ReadonlyF64;
  readonly warp_to: t.ReadonlyVec3f;
  readonly orientation: t.ReadonlyVec2f;
  readonly owner: BiomesId;
}

export class Warpable {
  static ID = 61;

  static create(fields: Partial<Warpable> = {}): Warpable {
    if (fields.trigger_at === undefined) {
      fields.trigger_at = t.defaultF64;
    }
    if (fields.warp_to === undefined) {
      fields.warp_to = t.defaultVec3f();
    }
    if (fields.orientation === undefined) {
      fields.orientation = t.defaultVec2f();
    }
    if (fields.owner === undefined) {
      fields.owner = t.defaultBiomesId;
    }
    return fields as Warpable;
  }

  static clone(value?: ReadonlyWarpable): Warpable {
    return value === undefined
      ? Warpable.create()
      : (cloneDeepWithItems(value) as unknown as Warpable);
  }
}
export interface PlayerStatus {
  init: t.Bool;
  nux_status: t.AllNUXStatus;
}

export interface ReadonlyPlayerStatus {
  readonly init: t.ReadonlyBool;
  readonly nux_status: t.ReadonlyAllNUXStatus;
}

export class PlayerStatus {
  static ID = 63;

  static create(fields: Partial<PlayerStatus> = {}): PlayerStatus {
    if (fields.init === undefined) {
      fields.init = t.defaultBool;
    }
    if (fields.nux_status === undefined) {
      fields.nux_status = t.defaultAllNUXStatus();
    }
    return fields as PlayerStatus;
  }

  static clone(value?: ReadonlyPlayerStatus): PlayerStatus {
    return value === undefined
      ? PlayerStatus.create()
      : (cloneDeepWithItems(value) as unknown as PlayerStatus);
  }
}
export interface PlayerBehavior {
  camera_mode: t.CameraMode;
  place_event_info: t.OptionalPlaceEventInfo;
}

export interface ReadonlyPlayerBehavior {
  readonly camera_mode: t.ReadonlyCameraMode;
  readonly place_event_info: t.ReadonlyOptionalPlaceEventInfo;
}

export class PlayerBehavior {
  static ID = 64;

  static create(fields: Partial<PlayerBehavior> = {}): PlayerBehavior {
    if (fields.camera_mode === undefined) {
      fields.camera_mode = t.defaultCameraMode;
    }
    if (fields.place_event_info === undefined) {
      fields.place_event_info = t.defaultOptionalPlaceEventInfo;
    }
    return fields as PlayerBehavior;
  }

  static clone(value?: ReadonlyPlayerBehavior): PlayerBehavior {
    return value === undefined
      ? PlayerBehavior.create()
      : (cloneDeepWithItems(value) as unknown as PlayerBehavior);
  }
}
export interface WorldMetadata {
  aabb: t.Box2;
}

export interface ReadonlyWorldMetadata {
  readonly aabb: t.ReadonlyBox2;
}

export class WorldMetadata {
  static ID = 65;

  static create(fields: Partial<WorldMetadata> = {}): WorldMetadata {
    if (fields.aabb === undefined) {
      fields.aabb = t.defaultBox2();
    }
    return fields as WorldMetadata;
  }

  static clone(value?: ReadonlyWorldMetadata): WorldMetadata {
    return value === undefined
      ? WorldMetadata.create()
      : (cloneDeepWithItems(value) as unknown as WorldMetadata);
  }
}
export interface NpcMetadata {
  type_id: BiomesId;
  created_time: t.F64;
  spawn_event_type_id: t.OptionalBiomesId;
  spawn_event_id: t.OptionalBiomesId;
  spawn_position: t.Vec3f;
  spawn_orientation: t.Vec2f;
}

export interface ReadonlyNpcMetadata {
  readonly type_id: BiomesId;
  readonly created_time: t.ReadonlyF64;
  readonly spawn_event_type_id: t.ReadonlyOptionalBiomesId;
  readonly spawn_event_id: t.ReadonlyOptionalBiomesId;
  readonly spawn_position: t.ReadonlyVec3f;
  readonly spawn_orientation: t.ReadonlyVec2f;
}

export class NpcMetadata {
  static ID = 66;

  static create(fields: Partial<NpcMetadata> = {}): NpcMetadata {
    if (fields.type_id === undefined) {
      fields.type_id = t.defaultBiomesId;
    }
    if (fields.created_time === undefined) {
      fields.created_time = t.defaultF64;
    }
    if (fields.spawn_event_type_id === undefined) {
      fields.spawn_event_type_id = t.defaultOptionalBiomesId;
    }
    if (fields.spawn_event_id === undefined) {
      fields.spawn_event_id = t.defaultOptionalBiomesId;
    }
    if (fields.spawn_position === undefined) {
      fields.spawn_position = t.defaultVec3f();
    }
    if (fields.spawn_orientation === undefined) {
      fields.spawn_orientation = t.defaultVec2f();
    }
    return fields as NpcMetadata;
  }

  static clone(value?: ReadonlyNpcMetadata): NpcMetadata {
    return value === undefined
      ? NpcMetadata.create()
      : (cloneDeepWithItems(value) as unknown as NpcMetadata);
  }
}
export interface NpcState {
  data: t.Buffer;
}

export interface ReadonlyNpcState {
  readonly data: t.ReadonlyBuffer;
}

export class NpcState {
  static ID = 67;

  static create(fields: Partial<NpcState> = {}): NpcState {
    if (fields.data === undefined) {
      fields.data = t.defaultBuffer();
    }
    return fields as NpcState;
  }

  static clone(value?: ReadonlyNpcState): NpcState {
    return value === undefined
      ? NpcState.create()
      : (cloneDeepWithItems(value) as unknown as NpcState);
  }
}
export interface GroupPreviewReference {
  ref: t.OptionalBiomesId;
}

export interface ReadonlyGroupPreviewReference {
  readonly ref: t.ReadonlyOptionalBiomesId;
}

export class GroupPreviewReference {
  static ID = 68;

  static create(
    fields: Partial<GroupPreviewReference> = {}
  ): GroupPreviewReference {
    if (fields.ref === undefined) {
      fields.ref = t.defaultOptionalBiomesId;
    }
    return fields as GroupPreviewReference;
  }

  static clone(value?: ReadonlyGroupPreviewReference): GroupPreviewReference {
    return value === undefined
      ? GroupPreviewReference.create()
      : (cloneDeepWithItems(value) as unknown as GroupPreviewReference);
  }
}
export interface AclComponent {
  acl: t.Acl;
}

export interface ReadonlyAclComponent {
  readonly acl: t.ReadonlyAcl;
}

export class AclComponent {
  static ID = 70;

  static create(fields: Partial<AclComponent> = {}): AclComponent {
    if (fields.acl === undefined) {
      fields.acl = t.defaultAcl();
    }
    return fields as AclComponent;
  }

  static clone(value?: ReadonlyAclComponent): AclComponent {
    return value === undefined
      ? AclComponent.create()
      : (cloneDeepWithItems(value) as unknown as AclComponent);
  }
}
export interface DeedComponent {
  owner: BiomesId;
  description: t.String;
  plots: t.BiomesIdList;
  custom_owner_name: t.OptionalString;
  map_display_size: t.OptionalU32;
}

export interface ReadonlyDeedComponent {
  readonly owner: BiomesId;
  readonly description: t.ReadonlyString;
  readonly plots: t.ReadonlyBiomesIdList;
  readonly custom_owner_name: t.ReadonlyOptionalString;
  readonly map_display_size: t.ReadonlyOptionalU32;
}

export class DeedComponent {
  static ID = 71;

  static create(fields: Partial<DeedComponent> = {}): DeedComponent {
    if (fields.owner === undefined) {
      fields.owner = t.defaultBiomesId;
    }
    if (fields.description === undefined) {
      fields.description = t.defaultString;
    }
    if (fields.plots === undefined) {
      fields.plots = t.defaultBiomesIdList();
    }
    if (fields.custom_owner_name === undefined) {
      fields.custom_owner_name = t.defaultOptionalString;
    }
    if (fields.map_display_size === undefined) {
      fields.map_display_size = t.defaultOptionalU32;
    }
    return fields as DeedComponent;
  }

  static clone(value?: ReadonlyDeedComponent): DeedComponent {
    return value === undefined
      ? DeedComponent.create()
      : (cloneDeepWithItems(value) as unknown as DeedComponent);
  }
}
export interface GroupPreviewComponent {
  owner_id: BiomesId;
  blueprint_id: t.OptionalBiomesId;
}

export interface ReadonlyGroupPreviewComponent {
  readonly owner_id: BiomesId;
  readonly blueprint_id: t.ReadonlyOptionalBiomesId;
}

export class GroupPreviewComponent {
  static ID = 72;

  static create(
    fields: Partial<GroupPreviewComponent> = {}
  ): GroupPreviewComponent {
    if (fields.owner_id === undefined) {
      fields.owner_id = t.defaultBiomesId;
    }
    if (fields.blueprint_id === undefined) {
      fields.blueprint_id = t.defaultOptionalBiomesId;
    }
    return fields as GroupPreviewComponent;
  }

  static clone(value?: ReadonlyGroupPreviewComponent): GroupPreviewComponent {
    return value === undefined
      ? GroupPreviewComponent.create()
      : (cloneDeepWithItems(value) as unknown as GroupPreviewComponent);
  }
}
export interface BlueprintComponent {
  owner_id: BiomesId;
  blueprint_id: BiomesId;
}

export interface ReadonlyBlueprintComponent {
  readonly owner_id: BiomesId;
  readonly blueprint_id: BiomesId;
}

export class BlueprintComponent {
  static ID = 87;

  static create(fields: Partial<BlueprintComponent> = {}): BlueprintComponent {
    if (fields.owner_id === undefined) {
      fields.owner_id = t.defaultBiomesId;
    }
    if (fields.blueprint_id === undefined) {
      fields.blueprint_id = t.defaultBiomesId;
    }
    return fields as BlueprintComponent;
  }

  static clone(value?: ReadonlyBlueprintComponent): BlueprintComponent {
    return value === undefined
      ? BlueprintComponent.create()
      : (cloneDeepWithItems(value) as unknown as BlueprintComponent);
  }
}
export interface CraftingStationComponent {}

export interface ReadonlyCraftingStationComponent {}

export class CraftingStationComponent {
  static ID = 74;

  static create(_unused?: any): CraftingStationComponent {
    return {};
  }

  static clone(_unused?: any): CraftingStationComponent {
    return {};
  }
}
export interface Health {
  hp: t.I32;
  maxHp: t.I32;
  lastDamageSource: t.OptionalDamageSource;
  lastDamageTime: t.OptionalF64;
  lastDamageInventoryConsequence: t.OptionalItemBag;
  lastDamageAmount: t.OptionalI32;
}

export interface ReadonlyHealth {
  readonly hp: t.ReadonlyI32;
  readonly maxHp: t.ReadonlyI32;
  readonly lastDamageSource: t.ReadonlyOptionalDamageSource;
  readonly lastDamageTime: t.ReadonlyOptionalF64;
  readonly lastDamageInventoryConsequence: t.ReadonlyOptionalItemBag;
  readonly lastDamageAmount: t.ReadonlyOptionalI32;
}

export class Health {
  static ID = 75;

  static create(fields: Partial<Health> = {}): Health {
    if (fields.hp === undefined) {
      fields.hp = t.defaultI32;
    }
    if (fields.maxHp === undefined) {
      fields.maxHp = t.defaultI32;
    }
    if (fields.lastDamageSource === undefined) {
      fields.lastDamageSource = t.defaultOptionalDamageSource;
    }
    if (fields.lastDamageTime === undefined) {
      fields.lastDamageTime = t.defaultOptionalF64;
    }
    if (fields.lastDamageInventoryConsequence === undefined) {
      fields.lastDamageInventoryConsequence = t.defaultOptionalItemBag;
    }
    if (fields.lastDamageAmount === undefined) {
      fields.lastDamageAmount = t.defaultOptionalI32;
    }
    return fields as Health;
  }

  static clone(value?: ReadonlyHealth): Health {
    return value === undefined
      ? Health.create()
      : (cloneDeepWithItems(value) as unknown as Health);
  }
}
export interface BuffsComponent {
  buffs: t.BuffsList;
  trigger_at: t.OptionalF64;
}

export interface ReadonlyBuffsComponent {
  readonly buffs: t.ReadonlyBuffsList;
  readonly trigger_at: t.ReadonlyOptionalF64;
}

export class BuffsComponent {
  static ID = 101;

  static create(fields: Partial<BuffsComponent> = {}): BuffsComponent {
    if (fields.buffs === undefined) {
      fields.buffs = t.defaultBuffsList();
    }
    if (fields.trigger_at === undefined) {
      fields.trigger_at = t.defaultOptionalF64;
    }
    return fields as BuffsComponent;
  }

  static clone(value?: ReadonlyBuffsComponent): BuffsComponent {
    return value === undefined
      ? BuffsComponent.create()
      : (cloneDeepWithItems(value) as unknown as BuffsComponent);
  }
}
export interface Gremlin {}

export interface ReadonlyGremlin {}

export class Gremlin {
  static ID = 77;

  static create(_unused?: any): Gremlin {
    return {};
  }

  static clone(_unused?: any): Gremlin {
    return {};
  }
}
export interface PlaceableComponent {
  item_id: BiomesId;
  animation: t.OptionalPlaceableAnimation;
}

export interface ReadonlyPlaceableComponent {
  readonly item_id: BiomesId;
  readonly animation: t.ReadonlyOptionalPlaceableAnimation;
}

export class PlaceableComponent {
  static ID = 78;

  static create(fields: Partial<PlaceableComponent> = {}): PlaceableComponent {
    if (fields.item_id === undefined) {
      fields.item_id = t.defaultBiomesId;
    }
    if (fields.animation === undefined) {
      fields.animation = t.defaultOptionalPlaceableAnimation;
    }
    return fields as PlaceableComponent;
  }

  static clone(value?: ReadonlyPlaceableComponent): PlaceableComponent {
    return value === undefined
      ? PlaceableComponent.create()
      : (cloneDeepWithItems(value) as unknown as PlaceableComponent);
  }
}
export interface GroupedEntities {
  ids: t.BiomesIdList;
}

export interface ReadonlyGroupedEntities {
  readonly ids: t.ReadonlyBiomesIdList;
}

export class GroupedEntities {
  static ID = 83;

  static create(fields: Partial<GroupedEntities> = {}): GroupedEntities {
    if (fields.ids === undefined) {
      fields.ids = t.defaultBiomesIdList();
    }
    return fields as GroupedEntities;
  }

  static clone(value?: ReadonlyGroupedEntities): GroupedEntities {
    return value === undefined
      ? GroupedEntities.create()
      : (cloneDeepWithItems(value) as unknown as GroupedEntities);
  }
}
export interface InGroup {
  id: BiomesId;
}

export interface ReadonlyInGroup {
  readonly id: BiomesId;
}

export class InGroup {
  static ID = 95;

  static create(fields: Partial<InGroup> = {}): InGroup {
    if (fields.id === undefined) {
      fields.id = t.defaultBiomesId;
    }
    return fields as InGroup;
  }

  static clone(value?: ReadonlyInGroup): InGroup {
    return value === undefined
      ? InGroup.create()
      : (cloneDeepWithItems(value) as unknown as InGroup);
  }
}
export interface PictureFrameContents {
  placer_id: BiomesId;
  photo_id: t.OptionalBiomesId;
  minigame_id: t.OptionalBiomesId;
}

export interface ReadonlyPictureFrameContents {
  readonly placer_id: BiomesId;
  readonly photo_id: t.ReadonlyOptionalBiomesId;
  readonly minigame_id: t.ReadonlyOptionalBiomesId;
}

export class PictureFrameContents {
  static ID = 84;

  static create(
    fields: Partial<PictureFrameContents> = {}
  ): PictureFrameContents {
    if (fields.placer_id === undefined) {
      fields.placer_id = t.defaultBiomesId;
    }
    if (fields.photo_id === undefined) {
      fields.photo_id = t.defaultOptionalBiomesId;
    }
    if (fields.minigame_id === undefined) {
      fields.minigame_id = t.defaultOptionalBiomesId;
    }
    return fields as PictureFrameContents;
  }

  static clone(value?: ReadonlyPictureFrameContents): PictureFrameContents {
    return value === undefined
      ? PictureFrameContents.create()
      : (cloneDeepWithItems(value) as unknown as PictureFrameContents);
  }
}
export interface TriggerState {
  by_root: t.TriggerTrees;
}

export interface ReadonlyTriggerState {
  readonly by_root: t.ReadonlyTriggerTrees;
}

export class TriggerState {
  static ID = 88;

  static create(fields: Partial<TriggerState> = {}): TriggerState {
    if (fields.by_root === undefined) {
      fields.by_root = t.defaultTriggerTrees();
    }
    return fields as TriggerState;
  }

  static clone(value?: ReadonlyTriggerState): TriggerState {
    return value === undefined
      ? TriggerState.create()
      : (cloneDeepWithItems(value) as unknown as TriggerState);
  }
}
export interface LifetimeStats {
  stats: t.LifetimeStatsMap;
}

export interface ReadonlyLifetimeStats {
  readonly stats: t.ReadonlyLifetimeStatsMap;
}

export class LifetimeStats {
  static ID = 91;

  static create(fields: Partial<LifetimeStats> = {}): LifetimeStats {
    if (fields.stats === undefined) {
      fields.stats = t.defaultLifetimeStatsMap();
    }
    return fields as LifetimeStats;
  }

  static clone(value?: ReadonlyLifetimeStats): LifetimeStats {
    return value === undefined
      ? LifetimeStats.create()
      : (cloneDeepWithItems(value) as unknown as LifetimeStats);
  }
}
export interface OccupancyComponent {
  buffer: t.OptionalBuffer;
}

export interface ReadonlyOccupancyComponent {
  readonly buffer: t.ReadonlyOptionalBuffer;
}

export class OccupancyComponent {
  static ID = 97;

  static create(fields: Partial<OccupancyComponent> = {}): OccupancyComponent {
    if (fields.buffer === undefined) {
      fields.buffer = t.defaultOptionalBuffer;
    }
    return fields as OccupancyComponent;
  }

  static clone(value?: ReadonlyOccupancyComponent): OccupancyComponent {
    return value === undefined
      ? OccupancyComponent.create()
      : (cloneDeepWithItems(value) as unknown as OccupancyComponent);
  }
}
export interface VideoComponent {
  video_url: t.OptionalString;
  video_start_time: t.OptionalF64;
  muted: t.OptionalBool;
}

export interface ReadonlyVideoComponent {
  readonly video_url: t.ReadonlyOptionalString;
  readonly video_start_time: t.ReadonlyOptionalF64;
  readonly muted: t.ReadonlyOptionalBool;
}

export class VideoComponent {
  static ID = 92;

  static create(fields: Partial<VideoComponent> = {}): VideoComponent {
    if (fields.video_url === undefined) {
      fields.video_url = t.defaultOptionalString;
    }
    if (fields.video_start_time === undefined) {
      fields.video_start_time = t.defaultOptionalF64;
    }
    if (fields.muted === undefined) {
      fields.muted = t.defaultOptionalBool;
    }
    return fields as VideoComponent;
  }

  static clone(value?: ReadonlyVideoComponent): VideoComponent {
    return value === undefined
      ? VideoComponent.create()
      : (cloneDeepWithItems(value) as unknown as VideoComponent);
  }
}
export interface PlayerSession {
  id: t.String;
}

export interface ReadonlyPlayerSession {
  readonly id: t.ReadonlyString;
}

export class PlayerSession {
  static ID = 98;

  static create(fields: Partial<PlayerSession> = {}): PlayerSession {
    if (fields.id === undefined) {
      fields.id = t.defaultString;
    }
    return fields as PlayerSession;
  }

  static clone(value?: ReadonlyPlayerSession): PlayerSession {
    return value === undefined
      ? PlayerSession.create()
      : (cloneDeepWithItems(value) as unknown as PlayerSession);
  }
}
export interface PresetApplied {
  preset_id: BiomesId;
  applier_id: BiomesId;
  applied_at: t.F64;
}

export interface ReadonlyPresetApplied {
  readonly preset_id: BiomesId;
  readonly applier_id: BiomesId;
  readonly applied_at: t.ReadonlyF64;
}

export class PresetApplied {
  static ID = 99;

  static create(fields: Partial<PresetApplied> = {}): PresetApplied {
    if (fields.preset_id === undefined) {
      fields.preset_id = t.defaultBiomesId;
    }
    if (fields.applier_id === undefined) {
      fields.applier_id = t.defaultBiomesId;
    }
    if (fields.applied_at === undefined) {
      fields.applied_at = t.defaultF64;
    }
    return fields as PresetApplied;
  }

  static clone(value?: ReadonlyPresetApplied): PresetApplied {
    return value === undefined
      ? PresetApplied.create()
      : (cloneDeepWithItems(value) as unknown as PresetApplied);
  }
}
export interface PresetPrototype {
  last_updated: t.F64;
  last_updated_by: BiomesId;
}

export interface ReadonlyPresetPrototype {
  readonly last_updated: t.ReadonlyF64;
  readonly last_updated_by: BiomesId;
}

export class PresetPrototype {
  static ID = 100;

  static create(fields: Partial<PresetPrototype> = {}): PresetPrototype {
    if (fields.last_updated === undefined) {
      fields.last_updated = t.defaultF64;
    }
    if (fields.last_updated_by === undefined) {
      fields.last_updated_by = t.defaultBiomesId;
    }
    return fields as PresetPrototype;
  }

  static clone(value?: ReadonlyPresetPrototype): PresetPrototype {
    return value === undefined
      ? PresetPrototype.create()
      : (cloneDeepWithItems(value) as unknown as PresetPrototype);
  }
}
export interface FarmingPlantComponent {
  planter: BiomesId;
  seed: BiomesId;
  plant_time: t.F64;
  last_tick: t.F64;
  stage: t.I32;
  stage_progress: t.F64;
  water_level: t.F64;
  wilt: t.F64;
  expected_blocks: t.OptionalTensorBlob;
  status: t.PlantStatus;
  variant: t.OptionalI32;
  buffs: t.BiomesIdList;
  water_at: t.OptionalF64;
  player_actions: t.FarmingPlayerActionList;
  fully_grown_at: t.OptionalF64;
  next_stage_at: t.OptionalF64;
}

export interface ReadonlyFarmingPlantComponent {
  readonly planter: BiomesId;
  readonly seed: BiomesId;
  readonly plant_time: t.ReadonlyF64;
  readonly last_tick: t.ReadonlyF64;
  readonly stage: t.ReadonlyI32;
  readonly stage_progress: t.ReadonlyF64;
  readonly water_level: t.ReadonlyF64;
  readonly wilt: t.ReadonlyF64;
  readonly expected_blocks: t.ReadonlyOptionalTensorBlob;
  readonly status: t.ReadonlyPlantStatus;
  readonly variant: t.ReadonlyOptionalI32;
  readonly buffs: t.ReadonlyBiomesIdList;
  readonly water_at: t.ReadonlyOptionalF64;
  readonly player_actions: t.ReadonlyFarmingPlayerActionList;
  readonly fully_grown_at: t.ReadonlyOptionalF64;
  readonly next_stage_at: t.ReadonlyOptionalF64;
}

export class FarmingPlantComponent {
  static ID = 102;

  static create(
    fields: Partial<FarmingPlantComponent> = {}
  ): FarmingPlantComponent {
    if (fields.planter === undefined) {
      fields.planter = t.defaultBiomesId;
    }
    if (fields.seed === undefined) {
      fields.seed = t.defaultBiomesId;
    }
    if (fields.plant_time === undefined) {
      fields.plant_time = t.defaultF64;
    }
    if (fields.last_tick === undefined) {
      fields.last_tick = t.defaultF64;
    }
    if (fields.stage === undefined) {
      fields.stage = t.defaultI32;
    }
    if (fields.stage_progress === undefined) {
      fields.stage_progress = t.defaultF64;
    }
    if (fields.water_level === undefined) {
      fields.water_level = t.defaultF64;
    }
    if (fields.wilt === undefined) {
      fields.wilt = t.defaultF64;
    }
    if (fields.expected_blocks === undefined) {
      fields.expected_blocks = t.defaultOptionalTensorBlob;
    }
    if (fields.status === undefined) {
      fields.status = t.defaultPlantStatus;
    }
    if (fields.variant === undefined) {
      fields.variant = t.defaultOptionalI32;
    }
    if (fields.buffs === undefined) {
      fields.buffs = t.defaultBiomesIdList();
    }
    if (fields.water_at === undefined) {
      fields.water_at = t.defaultOptionalF64;
    }
    if (fields.player_actions === undefined) {
      fields.player_actions = t.defaultFarmingPlayerActionList();
    }
    if (fields.fully_grown_at === undefined) {
      fields.fully_grown_at = t.defaultOptionalF64;
    }
    if (fields.next_stage_at === undefined) {
      fields.next_stage_at = t.defaultOptionalF64;
    }
    return fields as FarmingPlantComponent;
  }

  static clone(value?: ReadonlyFarmingPlantComponent): FarmingPlantComponent {
    return value === undefined
      ? FarmingPlantComponent.create()
      : (cloneDeepWithItems(value) as unknown as FarmingPlantComponent);
  }
}
export interface ShardFarming {
  buffer: t.Buffer;
}

export interface ReadonlyShardFarming {
  readonly buffer: t.ReadonlyBuffer;
}

export class ShardFarming {
  static ID = 103;

  static create(fields: Partial<ShardFarming> = {}): ShardFarming {
    if (fields.buffer === undefined) {
      fields.buffer = t.defaultBuffer();
    }
    return fields as ShardFarming;
  }

  static clone(value?: ReadonlyShardFarming): ShardFarming {
    return value === undefined
      ? ShardFarming.create()
      : (cloneDeepWithItems(value) as unknown as ShardFarming);
  }
}
export interface CreatedBy {
  id: BiomesId;
  created_at: t.F64;
}

export interface ReadonlyCreatedBy {
  readonly id: BiomesId;
  readonly created_at: t.ReadonlyF64;
}

export class CreatedBy {
  static ID = 104;

  static create(fields: Partial<CreatedBy> = {}): CreatedBy {
    if (fields.id === undefined) {
      fields.id = t.defaultBiomesId;
    }
    if (fields.created_at === undefined) {
      fields.created_at = t.defaultF64;
    }
    return fields as CreatedBy;
  }

  static clone(value?: ReadonlyCreatedBy): CreatedBy {
    return value === undefined
      ? CreatedBy.create()
      : (cloneDeepWithItems(value) as unknown as CreatedBy);
  }
}
export interface MinigameComponent {
  metadata: t.MinigameMetadata;
  stats_changed_at: t.OptionalF64;
  ready: t.Bool;
  minigame_element_ids: t.BiomesIdSet;
  active_instance_ids: t.BiomesIdSet;
  hero_photo_id: t.OptionalBiomesId;
  minigame_settings: t.OptionalBuffer;
  entry_price: t.OptionalF64;
  game_modified_at: t.OptionalF64;
}

export interface ReadonlyMinigameComponent {
  readonly metadata: t.ReadonlyMinigameMetadata;
  readonly stats_changed_at: t.ReadonlyOptionalF64;
  readonly ready: t.ReadonlyBool;
  readonly minigame_element_ids: t.ReadonlyBiomesIdSet;
  readonly active_instance_ids: t.ReadonlyBiomesIdSet;
  readonly hero_photo_id: t.ReadonlyOptionalBiomesId;
  readonly minigame_settings: t.ReadonlyOptionalBuffer;
  readonly entry_price: t.ReadonlyOptionalF64;
  readonly game_modified_at: t.ReadonlyOptionalF64;
}

export class MinigameComponent {
  static ID = 105;

  static create(fields: Partial<MinigameComponent> = {}): MinigameComponent {
    if (fields.metadata === undefined) {
      fields.metadata = t.defaultMinigameMetadata();
    }
    if (fields.stats_changed_at === undefined) {
      fields.stats_changed_at = t.defaultOptionalF64;
    }
    if (fields.ready === undefined) {
      fields.ready = t.defaultBool;
    }
    if (fields.minigame_element_ids === undefined) {
      fields.minigame_element_ids = t.defaultBiomesIdSet();
    }
    if (fields.active_instance_ids === undefined) {
      fields.active_instance_ids = t.defaultBiomesIdSet();
    }
    if (fields.hero_photo_id === undefined) {
      fields.hero_photo_id = t.defaultOptionalBiomesId;
    }
    if (fields.minigame_settings === undefined) {
      fields.minigame_settings = t.defaultOptionalBuffer;
    }
    if (fields.entry_price === undefined) {
      fields.entry_price = t.defaultOptionalF64;
    }
    if (fields.game_modified_at === undefined) {
      fields.game_modified_at = t.defaultOptionalF64;
    }
    return fields as MinigameComponent;
  }

  static clone(value?: ReadonlyMinigameComponent): MinigameComponent {
    return value === undefined
      ? MinigameComponent.create()
      : (cloneDeepWithItems(value) as unknown as MinigameComponent);
  }
}
export interface MinigameInstance {
  state: t.MinigameInstanceState;
  minigame_id: BiomesId;
  finished: t.Bool;
  active_players: t.MinigameInstanceActivePlayerMap;
  space_clipboard: t.OptionalMinigameInstanceSpaceClipboardInfo;
  instance_element_ids: t.BiomesIdSet;
}

export interface ReadonlyMinigameInstance {
  readonly state: t.ReadonlyMinigameInstanceState;
  readonly minigame_id: BiomesId;
  readonly finished: t.ReadonlyBool;
  readonly active_players: t.ReadonlyMinigameInstanceActivePlayerMap;
  readonly space_clipboard: t.ReadonlyOptionalMinigameInstanceSpaceClipboardInfo;
  readonly instance_element_ids: t.ReadonlyBiomesIdSet;
}

export class MinigameInstance {
  static ID = 106;

  static create(fields: Partial<MinigameInstance> = {}): MinigameInstance {
    if (fields.state === undefined) {
      fields.state = t.defaultMinigameInstanceState();
    }
    if (fields.minigame_id === undefined) {
      fields.minigame_id = t.defaultBiomesId;
    }
    if (fields.finished === undefined) {
      fields.finished = t.defaultBool;
    }
    if (fields.active_players === undefined) {
      fields.active_players = t.defaultMinigameInstanceActivePlayerMap();
    }
    if (fields.space_clipboard === undefined) {
      fields.space_clipboard =
        t.defaultOptionalMinigameInstanceSpaceClipboardInfo;
    }
    if (fields.instance_element_ids === undefined) {
      fields.instance_element_ids = t.defaultBiomesIdSet();
    }
    return fields as MinigameInstance;
  }

  static clone(value?: ReadonlyMinigameInstance): MinigameInstance {
    return value === undefined
      ? MinigameInstance.create()
      : (cloneDeepWithItems(value) as unknown as MinigameInstance);
  }
}
export interface PlayingMinigame {
  minigame_id: BiomesId;
  minigame_instance_id: BiomesId;
  minigame_type: t.MinigameType;
}

export interface ReadonlyPlayingMinigame {
  readonly minigame_id: BiomesId;
  readonly minigame_instance_id: BiomesId;
  readonly minigame_type: t.ReadonlyMinigameType;
}

export class PlayingMinigame {
  static ID = 107;

  static create(fields: Partial<PlayingMinigame> = {}): PlayingMinigame {
    if (fields.minigame_id === undefined) {
      fields.minigame_id = t.defaultBiomesId;
    }
    if (fields.minigame_instance_id === undefined) {
      fields.minigame_instance_id = t.defaultBiomesId;
    }
    if (fields.minigame_type === undefined) {
      fields.minigame_type = t.defaultMinigameType;
    }
    return fields as PlayingMinigame;
  }

  static clone(value?: ReadonlyPlayingMinigame): PlayingMinigame {
    return value === undefined
      ? PlayingMinigame.create()
      : (cloneDeepWithItems(value) as unknown as PlayingMinigame);
  }
}
export interface MinigameElement {
  minigame_id: BiomesId;
}

export interface ReadonlyMinigameElement {
  readonly minigame_id: BiomesId;
}

export class MinigameElement {
  static ID = 108;

  static create(fields: Partial<MinigameElement> = {}): MinigameElement {
    if (fields.minigame_id === undefined) {
      fields.minigame_id = t.defaultBiomesId;
    }
    return fields as MinigameElement;
  }

  static clone(value?: ReadonlyMinigameElement): MinigameElement {
    return value === undefined
      ? MinigameElement.create()
      : (cloneDeepWithItems(value) as unknown as MinigameElement);
  }
}
export interface ActiveTray {
  id: BiomesId;
}

export interface ReadonlyActiveTray {
  readonly id: BiomesId;
}

export class ActiveTray {
  static ID = 109;

  static create(fields: Partial<ActiveTray> = {}): ActiveTray {
    if (fields.id === undefined) {
      fields.id = t.defaultBiomesId;
    }
    return fields as ActiveTray;
  }

  static clone(value?: ReadonlyActiveTray): ActiveTray {
    return value === undefined
      ? ActiveTray.create()
      : (cloneDeepWithItems(value) as unknown as ActiveTray);
  }
}
export interface Stashed {
  stashed_at: t.F64;
  stashed_by: BiomesId;
  original_entity_id: BiomesId;
}

export interface ReadonlyStashed {
  readonly stashed_at: t.ReadonlyF64;
  readonly stashed_by: BiomesId;
  readonly original_entity_id: BiomesId;
}

export class Stashed {
  static ID = 115;

  static create(fields: Partial<Stashed> = {}): Stashed {
    if (fields.stashed_at === undefined) {
      fields.stashed_at = t.defaultF64;
    }
    if (fields.stashed_by === undefined) {
      fields.stashed_by = t.defaultBiomesId;
    }
    if (fields.original_entity_id === undefined) {
      fields.original_entity_id = t.defaultBiomesId;
    }
    return fields as Stashed;
  }

  static clone(value?: ReadonlyStashed): Stashed {
    return value === undefined
      ? Stashed.create()
      : (cloneDeepWithItems(value) as unknown as Stashed);
  }
}
export interface MinigameInstanceTickInfo {
  last_tick: t.F64;
  trigger_at: t.F64;
}

export interface ReadonlyMinigameInstanceTickInfo {
  readonly last_tick: t.ReadonlyF64;
  readonly trigger_at: t.ReadonlyF64;
}

export class MinigameInstanceTickInfo {
  static ID = 117;

  static create(
    fields: Partial<MinigameInstanceTickInfo> = {}
  ): MinigameInstanceTickInfo {
    if (fields.last_tick === undefined) {
      fields.last_tick = t.defaultF64;
    }
    if (fields.trigger_at === undefined) {
      fields.trigger_at = t.defaultF64;
    }
    return fields as MinigameInstanceTickInfo;
  }

  static clone(
    value?: ReadonlyMinigameInstanceTickInfo
  ): MinigameInstanceTickInfo {
    return value === undefined
      ? MinigameInstanceTickInfo.create()
      : (cloneDeepWithItems(value) as unknown as MinigameInstanceTickInfo);
  }
}
export interface WarpingTo {
  position: t.Vec3f;
  orientation: t.OptionalVec2f;
  set_at: t.F64;
}

export interface ReadonlyWarpingTo {
  readonly position: t.ReadonlyVec3f;
  readonly orientation: t.ReadonlyOptionalVec2f;
  readonly set_at: t.ReadonlyF64;
}

export class WarpingTo {
  static ID = 118;

  static create(fields: Partial<WarpingTo> = {}): WarpingTo {
    if (fields.position === undefined) {
      fields.position = t.defaultVec3f();
    }
    if (fields.orientation === undefined) {
      fields.orientation = t.defaultOptionalVec2f;
    }
    if (fields.set_at === undefined) {
      fields.set_at = t.defaultF64;
    }
    return fields as WarpingTo;
  }

  static clone(value?: ReadonlyWarpingTo): WarpingTo {
    return value === undefined
      ? WarpingTo.create()
      : (cloneDeepWithItems(value) as unknown as WarpingTo);
  }
}
export interface MinigameInstanceExpire {
  trigger_at: t.F64;
}

export interface ReadonlyMinigameInstanceExpire {
  readonly trigger_at: t.ReadonlyF64;
}

export class MinigameInstanceExpire {
  static ID = 119;

  static create(
    fields: Partial<MinigameInstanceExpire> = {}
  ): MinigameInstanceExpire {
    if (fields.trigger_at === undefined) {
      fields.trigger_at = t.defaultF64;
    }
    return fields as MinigameInstanceExpire;
  }

  static clone(value?: ReadonlyMinigameInstanceExpire): MinigameInstanceExpire {
    return value === undefined
      ? MinigameInstanceExpire.create()
      : (cloneDeepWithItems(value) as unknown as MinigameInstanceExpire);
  }
}
export interface PlacerComponent {
  buffer: t.OptionalBuffer;
}

export interface ReadonlyPlacerComponent {
  readonly buffer: t.ReadonlyOptionalBuffer;
}

export class PlacerComponent {
  static ID = 121;

  static create(fields: Partial<PlacerComponent> = {}): PlacerComponent {
    if (fields.buffer === undefined) {
      fields.buffer = t.defaultOptionalBuffer;
    }
    return fields as PlacerComponent;
  }

  static clone(value?: ReadonlyPlacerComponent): PlacerComponent {
    return value === undefined
      ? PlacerComponent.create()
      : (cloneDeepWithItems(value) as unknown as PlacerComponent);
  }
}
export interface QuestGiver {
  concurrent_quests: t.OptionalI32;
  concurrent_quest_dialog: t.OptionalString;
}

export interface ReadonlyQuestGiver {
  readonly concurrent_quests: t.ReadonlyOptionalI32;
  readonly concurrent_quest_dialog: t.ReadonlyOptionalString;
}

export class QuestGiver {
  static ID = 122;

  static create(fields: Partial<QuestGiver> = {}): QuestGiver {
    if (fields.concurrent_quests === undefined) {
      fields.concurrent_quests = t.defaultOptionalI32;
    }
    if (fields.concurrent_quest_dialog === undefined) {
      fields.concurrent_quest_dialog = t.defaultOptionalString;
    }
    return fields as QuestGiver;
  }

  static clone(value?: ReadonlyQuestGiver): QuestGiver {
    return value === undefined
      ? QuestGiver.create()
      : (cloneDeepWithItems(value) as unknown as QuestGiver);
  }
}
export interface DefaultDialog {
  text: t.String;
  modified_at: t.OptionalF64;
  modified_by: t.OptionalBiomesId;
}

export interface ReadonlyDefaultDialog {
  readonly text: t.ReadonlyString;
  readonly modified_at: t.ReadonlyOptionalF64;
  readonly modified_by: t.ReadonlyOptionalBiomesId;
}

export class DefaultDialog {
  static ID = 123;

  static create(fields: Partial<DefaultDialog> = {}): DefaultDialog {
    if (fields.text === undefined) {
      fields.text = t.defaultString;
    }
    if (fields.modified_at === undefined) {
      fields.modified_at = t.defaultOptionalF64;
    }
    if (fields.modified_by === undefined) {
      fields.modified_by = t.defaultOptionalBiomesId;
    }
    return fields as DefaultDialog;
  }

  static clone(value?: ReadonlyDefaultDialog): DefaultDialog {
    return value === undefined
      ? DefaultDialog.create()
      : (cloneDeepWithItems(value) as unknown as DefaultDialog);
  }
}
export interface Unmuck {
  volume: t.Volume;
  snapToGrid: t.OptionalU32;
}

export interface ReadonlyUnmuck {
  readonly volume: t.ReadonlyVolume;
  readonly snapToGrid: t.ReadonlyOptionalU32;
}

export class Unmuck {
  static ID = 125;

  static create(fields: Partial<Unmuck> = {}): Unmuck {
    if (fields.volume === undefined) {
      fields.volume = t.defaultVolume();
    }
    if (fields.snapToGrid === undefined) {
      fields.snapToGrid = t.defaultOptionalU32;
    }
    return fields as Unmuck;
  }

  static clone(value?: ReadonlyUnmuck): Unmuck {
    return value === undefined
      ? Unmuck.create()
      : (cloneDeepWithItems(value) as unknown as Unmuck);
  }
}
export interface RobotComponent {
  trigger_at: t.OptionalF64;
  internal_battery_charge: t.OptionalF64;
  internal_battery_capacity: t.OptionalF64;
  last_update: t.OptionalF64;
}

export interface ReadonlyRobotComponent {
  readonly trigger_at: t.ReadonlyOptionalF64;
  readonly internal_battery_charge: t.ReadonlyOptionalF64;
  readonly internal_battery_capacity: t.ReadonlyOptionalF64;
  readonly last_update: t.ReadonlyOptionalF64;
}

export class RobotComponent {
  static ID = 126;

  static create(fields: Partial<RobotComponent> = {}): RobotComponent {
    if (fields.trigger_at === undefined) {
      fields.trigger_at = t.defaultOptionalF64;
    }
    if (fields.internal_battery_charge === undefined) {
      fields.internal_battery_charge = t.defaultOptionalF64;
    }
    if (fields.internal_battery_capacity === undefined) {
      fields.internal_battery_capacity = t.defaultOptionalF64;
    }
    if (fields.last_update === undefined) {
      fields.last_update = t.defaultOptionalF64;
    }
    return fields as RobotComponent;
  }

  static clone(value?: ReadonlyRobotComponent): RobotComponent {
    return value === undefined
      ? RobotComponent.create()
      : (cloneDeepWithItems(value) as unknown as RobotComponent);
  }
}
export interface AdminEntity {}

export interface ReadonlyAdminEntity {}

export class AdminEntity {
  static ID = 140;

  static create(_unused?: any): AdminEntity {
    return {};
  }

  static clone(_unused?: any): AdminEntity {
    return {};
  }
}
export interface Protection {
  timestamp: t.OptionalF64;
}

export interface ReadonlyProtection {
  readonly timestamp: t.ReadonlyOptionalF64;
}

export class Protection {
  static ID = 127;

  static create(fields: Partial<Protection> = {}): Protection {
    if (fields.timestamp === undefined) {
      fields.timestamp = t.defaultOptionalF64;
    }
    return fields as Protection;
  }

  static clone(value?: ReadonlyProtection): Protection {
    return value === undefined
      ? Protection.create()
      : (cloneDeepWithItems(value) as unknown as Protection);
  }
}
export interface ProjectsProtection {
  protectionChildId: t.OptionalBiomesId;
  restorationChildId: t.OptionalBiomesId;
  size: t.Vec3f;
  protection: t.OptionalProtectionParams;
  restoration: t.OptionalRestorationParams;
  timestamp: t.OptionalF64;
  snapToGrid: t.OptionalU32;
}

export interface ReadonlyProjectsProtection {
  readonly protectionChildId: t.ReadonlyOptionalBiomesId;
  readonly restorationChildId: t.ReadonlyOptionalBiomesId;
  readonly size: t.ReadonlyVec3f;
  readonly protection: t.ReadonlyOptionalProtectionParams;
  readonly restoration: t.ReadonlyOptionalRestorationParams;
  readonly timestamp: t.ReadonlyOptionalF64;
  readonly snapToGrid: t.ReadonlyOptionalU32;
}

export class ProjectsProtection {
  static ID = 128;

  static create(fields: Partial<ProjectsProtection> = {}): ProjectsProtection {
    if (fields.protectionChildId === undefined) {
      fields.protectionChildId = t.defaultOptionalBiomesId;
    }
    if (fields.restorationChildId === undefined) {
      fields.restorationChildId = t.defaultOptionalBiomesId;
    }
    if (fields.size === undefined) {
      fields.size = t.defaultVec3f();
    }
    if (fields.protection === undefined) {
      fields.protection = t.defaultOptionalProtectionParams;
    }
    if (fields.restoration === undefined) {
      fields.restoration = t.defaultOptionalRestorationParams;
    }
    if (fields.timestamp === undefined) {
      fields.timestamp = t.defaultOptionalF64;
    }
    if (fields.snapToGrid === undefined) {
      fields.snapToGrid = t.defaultOptionalU32;
    }
    return fields as ProjectsProtection;
  }

  static clone(value?: ReadonlyProjectsProtection): ProjectsProtection {
    return value === undefined
      ? ProjectsProtection.create()
      : (cloneDeepWithItems(value) as unknown as ProjectsProtection);
  }
}
export interface DeletesWith {
  id: BiomesId;
}

export interface ReadonlyDeletesWith {
  readonly id: BiomesId;
}

export class DeletesWith {
  static ID = 129;

  static create(fields: Partial<DeletesWith> = {}): DeletesWith {
    if (fields.id === undefined) {
      fields.id = t.defaultBiomesId;
    }
    return fields as DeletesWith;
  }

  static clone(value?: ReadonlyDeletesWith): DeletesWith {
    return value === undefined
      ? DeletesWith.create()
      : (cloneDeepWithItems(value) as unknown as DeletesWith);
  }
}
export interface ItemBuyer {
  attribute_ids: t.BiomesIdList;
  buy_description: t.OptionalString;
}

export interface ReadonlyItemBuyer {
  readonly attribute_ids: t.ReadonlyBiomesIdList;
  readonly buy_description: t.ReadonlyOptionalString;
}

export class ItemBuyer {
  static ID = 130;

  static create(fields: Partial<ItemBuyer> = {}): ItemBuyer {
    if (fields.attribute_ids === undefined) {
      fields.attribute_ids = t.defaultBiomesIdList();
    }
    if (fields.buy_description === undefined) {
      fields.buy_description = t.defaultOptionalString;
    }
    return fields as ItemBuyer;
  }

  static clone(value?: ReadonlyItemBuyer): ItemBuyer {
    return value === undefined
      ? ItemBuyer.create()
      : (cloneDeepWithItems(value) as unknown as ItemBuyer);
  }
}
export interface InspectionTweaks {
  hidden: t.OptionalBool;
}

export interface ReadonlyInspectionTweaks {
  readonly hidden: t.ReadonlyOptionalBool;
}

export class InspectionTweaks {
  static ID = 131;

  static create(fields: Partial<InspectionTweaks> = {}): InspectionTweaks {
    if (fields.hidden === undefined) {
      fields.hidden = t.defaultOptionalBool;
    }
    return fields as InspectionTweaks;
  }

  static clone(value?: ReadonlyInspectionTweaks): InspectionTweaks {
    return value === undefined
      ? InspectionTweaks.create()
      : (cloneDeepWithItems(value) as unknown as InspectionTweaks);
  }
}
export interface ProfilePic {
  cloud_bundle: t.BucketedImageCloudBundle;
  hash: t.OptionalString;
}

export interface ReadonlyProfilePic {
  readonly cloud_bundle: t.ReadonlyBucketedImageCloudBundle;
  readonly hash: t.ReadonlyOptionalString;
}

export class ProfilePic {
  static ID = 132;

  static create(fields: Partial<ProfilePic> = {}): ProfilePic {
    if (fields.cloud_bundle === undefined) {
      fields.cloud_bundle = t.defaultBucketedImageCloudBundle();
    }
    if (fields.hash === undefined) {
      fields.hash = t.defaultOptionalString;
    }
    return fields as ProfilePic;
  }

  static clone(value?: ReadonlyProfilePic): ProfilePic {
    return value === undefined
      ? ProfilePic.create()
      : (cloneDeepWithItems(value) as unknown as ProfilePic);
  }
}
export interface EntityDescription {
  text: t.String;
}

export interface ReadonlyEntityDescription {
  readonly text: t.ReadonlyString;
}

export class EntityDescription {
  static ID = 133;

  static create(fields: Partial<EntityDescription> = {}): EntityDescription {
    if (fields.text === undefined) {
      fields.text = t.defaultString;
    }
    return fields as EntityDescription;
  }

  static clone(value?: ReadonlyEntityDescription): EntityDescription {
    return value === undefined
      ? EntityDescription.create()
      : (cloneDeepWithItems(value) as unknown as EntityDescription);
  }
}
export interface Landmark {
  override_name: t.OptionalString;
  importance: t.OptionalU32;
}

export interface ReadonlyLandmark {
  readonly override_name: t.ReadonlyOptionalString;
  readonly importance: t.ReadonlyOptionalU32;
}

export class Landmark {
  static ID = 134;

  static create(fields: Partial<Landmark> = {}): Landmark {
    if (fields.override_name === undefined) {
      fields.override_name = t.defaultOptionalString;
    }
    if (fields.importance === undefined) {
      fields.importance = t.defaultOptionalU32;
    }
    return fields as Landmark;
  }

  static clone(value?: ReadonlyLandmark): Landmark {
    return value === undefined
      ? Landmark.create()
      : (cloneDeepWithItems(value) as unknown as Landmark);
  }
}
export interface Collideable {}

export interface ReadonlyCollideable {}

export class Collideable {
  static ID = 135;

  static create(_unused?: any): Collideable {
    return {};
  }

  static clone(_unused?: any): Collideable {
    return {};
  }
}
export interface Restoration {
  timestamp: t.OptionalF64;
  restore_delay_s: t.F64;
}

export interface ReadonlyRestoration {
  readonly timestamp: t.ReadonlyOptionalF64;
  readonly restore_delay_s: t.ReadonlyF64;
}

export class Restoration {
  static ID = 136;

  static create(fields: Partial<Restoration> = {}): Restoration {
    if (fields.timestamp === undefined) {
      fields.timestamp = t.defaultOptionalF64;
    }
    if (fields.restore_delay_s === undefined) {
      fields.restore_delay_s = t.defaultF64;
    }
    return fields as Restoration;
  }

  static clone(value?: ReadonlyRestoration): Restoration {
    return value === undefined
      ? Restoration.create()
      : (cloneDeepWithItems(value) as unknown as Restoration);
  }
}
export interface TerrainRestorationDiff {
  restores: t.TerrainRestorationEntryList;
}

export interface ReadonlyTerrainRestorationDiff {
  readonly restores: t.ReadonlyTerrainRestorationEntryList;
}

export class TerrainRestorationDiff {
  static ID = 137;

  static create(
    fields: Partial<TerrainRestorationDiff> = {}
  ): TerrainRestorationDiff {
    if (fields.restores === undefined) {
      fields.restores = t.defaultTerrainRestorationEntryList();
    }
    return fields as TerrainRestorationDiff;
  }

  static clone(value?: ReadonlyTerrainRestorationDiff): TerrainRestorationDiff {
    return value === undefined
      ? TerrainRestorationDiff.create()
      : (cloneDeepWithItems(value) as unknown as TerrainRestorationDiff);
  }
}
export interface Team {
  members: t.TeamMembers;
  pending_invites: t.TeamPendingInvites;
  icon: t.OptionalString;
  color: t.OptionalI32;
  hero_photo_id: t.OptionalBiomesId;
  pending_requests: t.TeamPendingRequests;
}

export interface ReadonlyTeam {
  readonly members: t.ReadonlyTeamMembers;
  readonly pending_invites: t.ReadonlyTeamPendingInvites;
  readonly icon: t.ReadonlyOptionalString;
  readonly color: t.ReadonlyOptionalI32;
  readonly hero_photo_id: t.ReadonlyOptionalBiomesId;
  readonly pending_requests: t.ReadonlyTeamPendingRequests;
}

export class Team {
  static ID = 138;

  static create(fields: Partial<Team> = {}): Team {
    if (fields.members === undefined) {
      fields.members = t.defaultTeamMembers();
    }
    if (fields.pending_invites === undefined) {
      fields.pending_invites = t.defaultTeamPendingInvites();
    }
    if (fields.icon === undefined) {
      fields.icon = t.defaultOptionalString;
    }
    if (fields.color === undefined) {
      fields.color = t.defaultOptionalI32;
    }
    if (fields.hero_photo_id === undefined) {
      fields.hero_photo_id = t.defaultOptionalBiomesId;
    }
    if (fields.pending_requests === undefined) {
      fields.pending_requests = t.defaultTeamPendingRequests();
    }
    return fields as Team;
  }

  static clone(value?: ReadonlyTeam): Team {
    return value === undefined
      ? Team.create()
      : (cloneDeepWithItems(value) as unknown as Team);
  }
}
export interface PlayerCurrentTeam {
  team_id: BiomesId;
}

export interface ReadonlyPlayerCurrentTeam {
  readonly team_id: BiomesId;
}

export class PlayerCurrentTeam {
  static ID = 139;

  static create(fields: Partial<PlayerCurrentTeam> = {}): PlayerCurrentTeam {
    if (fields.team_id === undefined) {
      fields.team_id = t.defaultBiomesId;
    }
    return fields as PlayerCurrentTeam;
  }

  static clone(value?: ReadonlyPlayerCurrentTeam): PlayerCurrentTeam {
    return value === undefined
      ? PlayerCurrentTeam.create()
      : (cloneDeepWithItems(value) as unknown as PlayerCurrentTeam);
  }
}
export interface UserRoles {
  roles: t.UserRoleSet;
}

export interface ReadonlyUserRoles {
  readonly roles: t.ReadonlyUserRoleSet;
}

export class UserRoles {
  static ID = 141;

  static create(fields: Partial<UserRoles> = {}): UserRoles {
    if (fields.roles === undefined) {
      fields.roles = t.defaultUserRoleSet();
    }
    return fields as UserRoles;
  }

  static clone(value?: ReadonlyUserRoles): UserRoles {
    return value === undefined
      ? UserRoles.create()
      : (cloneDeepWithItems(value) as unknown as UserRoles);
  }
}
export interface RestoresTo {
  trigger_at: t.F64;
  restore_to_state: t.EntityRestoreToState;
  expire: t.OptionalBool;
}

export interface ReadonlyRestoresTo {
  readonly trigger_at: t.ReadonlyF64;
  readonly restore_to_state: t.ReadonlyEntityRestoreToState;
  readonly expire: t.ReadonlyOptionalBool;
}

export class RestoresTo {
  static ID = 142;

  static create(fields: Partial<RestoresTo> = {}): RestoresTo {
    if (fields.trigger_at === undefined) {
      fields.trigger_at = t.defaultF64;
    }
    if (fields.restore_to_state === undefined) {
      fields.restore_to_state = t.defaultEntityRestoreToState;
    }
    if (fields.expire === undefined) {
      fields.expire = t.defaultOptionalBool;
    }
    return fields as RestoresTo;
  }

  static clone(value?: ReadonlyRestoresTo): RestoresTo {
    return value === undefined
      ? RestoresTo.create()
      : (cloneDeepWithItems(value) as unknown as RestoresTo);
  }
}
export interface Trade {
  trader1: t.Trader;
  trader2: t.Trader;
  trigger_at: t.OptionalF64;
}

export interface ReadonlyTrade {
  readonly trader1: t.ReadonlyTrader;
  readonly trader2: t.ReadonlyTrader;
  readonly trigger_at: t.ReadonlyOptionalF64;
}

export class Trade {
  static ID = 143;

  static create(fields: Partial<Trade> = {}): Trade {
    if (fields.trader1 === undefined) {
      fields.trader1 = t.defaultTrader();
    }
    if (fields.trader2 === undefined) {
      fields.trader2 = t.defaultTrader();
    }
    if (fields.trigger_at === undefined) {
      fields.trigger_at = t.defaultOptionalF64;
    }
    return fields as Trade;
  }

  static clone(value?: ReadonlyTrade): Trade {
    return value === undefined
      ? Trade.create()
      : (cloneDeepWithItems(value) as unknown as Trade);
  }
}
export interface ActiveTrades {
  trades: t.TradeSpecList;
}

export interface ReadonlyActiveTrades {
  readonly trades: t.ReadonlyTradeSpecList;
}

export class ActiveTrades {
  static ID = 144;

  static create(fields: Partial<ActiveTrades> = {}): ActiveTrades {
    if (fields.trades === undefined) {
      fields.trades = t.defaultTradeSpecList();
    }
    return fields as ActiveTrades;
  }

  static clone(value?: ReadonlyActiveTrades): ActiveTrades {
    return value === undefined
      ? ActiveTrades.create()
      : (cloneDeepWithItems(value) as unknown as ActiveTrades);
  }
}
export interface PlacedBy {
  id: BiomesId;
  placed_at: t.F64;
}

export interface ReadonlyPlacedBy {
  readonly id: BiomesId;
  readonly placed_at: t.ReadonlyF64;
}

export class PlacedBy {
  static ID = 145;

  static create(fields: Partial<PlacedBy> = {}): PlacedBy {
    if (fields.id === undefined) {
      fields.id = t.defaultBiomesId;
    }
    if (fields.placed_at === undefined) {
      fields.placed_at = t.defaultF64;
    }
    return fields as PlacedBy;
  }

  static clone(value?: ReadonlyPlacedBy): PlacedBy {
    return value === undefined
      ? PlacedBy.create()
      : (cloneDeepWithItems(value) as unknown as PlacedBy);
  }
}
export interface TextSign {
  text: t.Strings;
}

export interface ReadonlyTextSign {
  readonly text: t.ReadonlyStrings;
}

export class TextSign {
  static ID = 146;

  static create(fields: Partial<TextSign> = {}): TextSign {
    if (fields.text === undefined) {
      fields.text = t.defaultStrings();
    }
    return fields as TextSign;
  }

  static clone(value?: ReadonlyTextSign): TextSign {
    return value === undefined
      ? TextSign.create()
      : (cloneDeepWithItems(value) as unknown as TextSign);
  }
}
export interface Irradiance {
  intensity: t.U8;
  color: t.Vec3f;
}

export interface ReadonlyIrradiance {
  readonly intensity: t.ReadonlyU8;
  readonly color: t.ReadonlyVec3f;
}

export class Irradiance {
  static ID = 147;

  static create(fields: Partial<Irradiance> = {}): Irradiance {
    if (fields.intensity === undefined) {
      fields.intensity = t.defaultU8;
    }
    if (fields.color === undefined) {
      fields.color = t.defaultVec3f();
    }
    return fields as Irradiance;
  }

  static clone(value?: ReadonlyIrradiance): Irradiance {
    return value === undefined
      ? Irradiance.create()
      : (cloneDeepWithItems(value) as unknown as Irradiance);
  }
}
export interface LockedInPlace {}

export interface ReadonlyLockedInPlace {}

export class LockedInPlace {
  static ID = 148;

  static create(_unused?: any): LockedInPlace {
    return {};
  }

  static clone(_unused?: any): LockedInPlace {
    return {};
  }
}
export interface DeathInfo {
  last_death_pos: t.OptionalVec3f;
  last_death_time: t.OptionalF64;
}

export interface ReadonlyDeathInfo {
  readonly last_death_pos: t.ReadonlyOptionalVec3f;
  readonly last_death_time: t.ReadonlyOptionalF64;
}

export class DeathInfo {
  static ID = 149;

  static create(fields: Partial<DeathInfo> = {}): DeathInfo {
    if (fields.last_death_pos === undefined) {
      fields.last_death_pos = t.defaultOptionalVec3f;
    }
    if (fields.last_death_time === undefined) {
      fields.last_death_time = t.defaultOptionalF64;
    }
    return fields as DeathInfo;
  }

  static clone(value?: ReadonlyDeathInfo): DeathInfo {
    return value === undefined
      ? DeathInfo.create()
      : (cloneDeepWithItems(value) as unknown as DeathInfo);
  }
}
export interface SyntheticStats {
  online_players: t.U32;
}

export interface ReadonlySyntheticStats {
  readonly online_players: t.ReadonlyU32;
}

export class SyntheticStats {
  static ID = 150;

  static create(fields: Partial<SyntheticStats> = {}): SyntheticStats {
    if (fields.online_players === undefined) {
      fields.online_players = t.defaultU32;
    }
    return fields as SyntheticStats;
  }

  static clone(value?: ReadonlySyntheticStats): SyntheticStats {
    return value === undefined
      ? SyntheticStats.create()
      : (cloneDeepWithItems(value) as unknown as SyntheticStats);
  }
}
export interface Idle {}

export interface ReadonlyIdle {}

export class Idle {
  static ID = 151;

  static create(_unused?: any): Idle {
    return {};
  }

  static clone(_unused?: any): Idle {
    return {};
  }
}
export interface Voice {
  voice: t.String;
}

export interface ReadonlyVoice {
  readonly voice: t.ReadonlyString;
}

export class Voice {
  static ID = 152;

  static create(fields: Partial<Voice> = {}): Voice {
    if (fields.voice === undefined) {
      fields.voice = t.defaultString;
    }
    return fields as Voice;
  }

  static clone(value?: ReadonlyVoice): Voice {
    return value === undefined
      ? Voice.create()
      : (cloneDeepWithItems(value) as unknown as Voice);
  }
}
export interface GiftGiver {
  last_gift_time: t.OptionalF64;
  gift_targets: t.BiomesIdList;
}

export interface ReadonlyGiftGiver {
  readonly last_gift_time: t.ReadonlyOptionalF64;
  readonly gift_targets: t.ReadonlyBiomesIdList;
}

export class GiftGiver {
  static ID = 153;

  static create(fields: Partial<GiftGiver> = {}): GiftGiver {
    if (fields.last_gift_time === undefined) {
      fields.last_gift_time = t.defaultOptionalF64;
    }
    if (fields.gift_targets === undefined) {
      fields.gift_targets = t.defaultBiomesIdList();
    }
    return fields as GiftGiver;
  }

  static clone(value?: ReadonlyGiftGiver): GiftGiver {
    return value === undefined
      ? GiftGiver.create()
      : (cloneDeepWithItems(value) as unknown as GiftGiver);
  }
}
export interface ComponentResourcePaths {
  "/ecs/c/iced": PathDef<[BiomesId], ReadonlyIced | undefined>;
  "/ecs/c/remote_connection": PathDef<
    [BiomesId],
    ReadonlyRemoteConnection | undefined
  >;
  "/ecs/c/position": PathDef<[BiomesId], ReadonlyPosition | undefined>;
  "/ecs/c/orientation": PathDef<[BiomesId], ReadonlyOrientation | undefined>;
  "/ecs/c/rigid_body": PathDef<[BiomesId], ReadonlyRigidBody | undefined>;
  "/ecs/c/size": PathDef<[BiomesId], ReadonlySize | undefined>;
  "/ecs/c/box": PathDef<[BiomesId], ReadonlyBox | undefined>;
  "/ecs/c/shard_seed": PathDef<[BiomesId], ReadonlyShardSeed | undefined>;
  "/ecs/c/shard_diff": PathDef<[BiomesId], ReadonlyShardDiff | undefined>;
  "/ecs/c/shard_shapes": PathDef<[BiomesId], ReadonlyShardShapes | undefined>;
  "/ecs/c/shard_sky_occlusion": PathDef<
    [BiomesId],
    ReadonlyShardSkyOcclusion | undefined
  >;
  "/ecs/c/shard_irradiance": PathDef<
    [BiomesId],
    ReadonlyShardIrradiance | undefined
  >;
  "/ecs/c/shard_water": PathDef<[BiomesId], ReadonlyShardWater | undefined>;
  "/ecs/c/shard_occupancy": PathDef<
    [BiomesId],
    ReadonlyShardOccupancy | undefined
  >;
  "/ecs/c/shard_dye": PathDef<[BiomesId], ReadonlyShardDye | undefined>;
  "/ecs/c/shard_moisture": PathDef<
    [BiomesId],
    ReadonlyShardMoisture | undefined
  >;
  "/ecs/c/shard_growth": PathDef<[BiomesId], ReadonlyShardGrowth | undefined>;
  "/ecs/c/shard_placer": PathDef<[BiomesId], ReadonlyShardPlacer | undefined>;
  "/ecs/c/shard_muck": PathDef<[BiomesId], ReadonlyShardMuck | undefined>;
  "/ecs/c/label": PathDef<[BiomesId], ReadonlyLabel | undefined>;
  "/ecs/c/grab_bag": PathDef<[BiomesId], ReadonlyGrabBag | undefined>;
  "/ecs/c/acquisition": PathDef<[BiomesId], ReadonlyAcquisition | undefined>;
  "/ecs/c/loose_item": PathDef<[BiomesId], ReadonlyLooseItem | undefined>;
  "/ecs/c/inventory": PathDef<[BiomesId], ReadonlyInventory | undefined>;
  "/ecs/c/container_inventory": PathDef<
    [BiomesId],
    ReadonlyContainerInventory | undefined
  >;
  "/ecs/c/priced_container_inventory": PathDef<
    [BiomesId],
    ReadonlyPricedContainerInventory | undefined
  >;
  "/ecs/c/selected_item": PathDef<[BiomesId], ReadonlySelectedItem | undefined>;
  "/ecs/c/wearing": PathDef<[BiomesId], ReadonlyWearing | undefined>;
  "/ecs/c/emote": PathDef<[BiomesId], ReadonlyEmote | undefined>;
  "/ecs/c/appearance_component": PathDef<
    [BiomesId],
    ReadonlyAppearanceComponent | undefined
  >;
  "/ecs/c/group_component": PathDef<
    [BiomesId],
    ReadonlyGroupComponent | undefined
  >;
  "/ecs/c/challenges": PathDef<[BiomesId], ReadonlyChallenges | undefined>;
  "/ecs/c/recipe_book": PathDef<[BiomesId], ReadonlyRecipeBook | undefined>;
  "/ecs/c/expires": PathDef<[BiomesId], ReadonlyExpires | undefined>;
  "/ecs/c/icing": PathDef<[BiomesId], ReadonlyIcing | undefined>;
  "/ecs/c/warpable": PathDef<[BiomesId], ReadonlyWarpable | undefined>;
  "/ecs/c/player_status": PathDef<[BiomesId], ReadonlyPlayerStatus | undefined>;
  "/ecs/c/player_behavior": PathDef<
    [BiomesId],
    ReadonlyPlayerBehavior | undefined
  >;
  "/ecs/c/world_metadata": PathDef<
    [BiomesId],
    ReadonlyWorldMetadata | undefined
  >;
  "/ecs/c/npc_metadata": PathDef<[BiomesId], ReadonlyNpcMetadata | undefined>;
  "/ecs/c/npc_state": PathDef<[BiomesId], ReadonlyNpcState | undefined>;
  "/ecs/c/group_preview_reference": PathDef<
    [BiomesId],
    ReadonlyGroupPreviewReference | undefined
  >;
  "/ecs/c/acl_component": PathDef<[BiomesId], ReadonlyAclComponent | undefined>;
  "/ecs/c/deed_component": PathDef<
    [BiomesId],
    ReadonlyDeedComponent | undefined
  >;
  "/ecs/c/group_preview_component": PathDef<
    [BiomesId],
    ReadonlyGroupPreviewComponent | undefined
  >;
  "/ecs/c/blueprint_component": PathDef<
    [BiomesId],
    ReadonlyBlueprintComponent | undefined
  >;
  "/ecs/c/crafting_station_component": PathDef<
    [BiomesId],
    ReadonlyCraftingStationComponent | undefined
  >;
  "/ecs/c/health": PathDef<[BiomesId], ReadonlyHealth | undefined>;
  "/ecs/c/buffs_component": PathDef<
    [BiomesId],
    ReadonlyBuffsComponent | undefined
  >;
  "/ecs/c/gremlin": PathDef<[BiomesId], ReadonlyGremlin | undefined>;
  "/ecs/c/placeable_component": PathDef<
    [BiomesId],
    ReadonlyPlaceableComponent | undefined
  >;
  "/ecs/c/grouped_entities": PathDef<
    [BiomesId],
    ReadonlyGroupedEntities | undefined
  >;
  "/ecs/c/in_group": PathDef<[BiomesId], ReadonlyInGroup | undefined>;
  "/ecs/c/picture_frame_contents": PathDef<
    [BiomesId],
    ReadonlyPictureFrameContents | undefined
  >;
  "/ecs/c/trigger_state": PathDef<[BiomesId], ReadonlyTriggerState | undefined>;
  "/ecs/c/lifetime_stats": PathDef<
    [BiomesId],
    ReadonlyLifetimeStats | undefined
  >;
  "/ecs/c/occupancy_component": PathDef<
    [BiomesId],
    ReadonlyOccupancyComponent | undefined
  >;
  "/ecs/c/video_component": PathDef<
    [BiomesId],
    ReadonlyVideoComponent | undefined
  >;
  "/ecs/c/player_session": PathDef<
    [BiomesId],
    ReadonlyPlayerSession | undefined
  >;
  "/ecs/c/preset_applied": PathDef<
    [BiomesId],
    ReadonlyPresetApplied | undefined
  >;
  "/ecs/c/preset_prototype": PathDef<
    [BiomesId],
    ReadonlyPresetPrototype | undefined
  >;
  "/ecs/c/farming_plant_component": PathDef<
    [BiomesId],
    ReadonlyFarmingPlantComponent | undefined
  >;
  "/ecs/c/shard_farming": PathDef<[BiomesId], ReadonlyShardFarming | undefined>;
  "/ecs/c/created_by": PathDef<[BiomesId], ReadonlyCreatedBy | undefined>;
  "/ecs/c/minigame_component": PathDef<
    [BiomesId],
    ReadonlyMinigameComponent | undefined
  >;
  "/ecs/c/minigame_instance": PathDef<
    [BiomesId],
    ReadonlyMinigameInstance | undefined
  >;
  "/ecs/c/playing_minigame": PathDef<
    [BiomesId],
    ReadonlyPlayingMinigame | undefined
  >;
  "/ecs/c/minigame_element": PathDef<
    [BiomesId],
    ReadonlyMinigameElement | undefined
  >;
  "/ecs/c/active_tray": PathDef<[BiomesId], ReadonlyActiveTray | undefined>;
  "/ecs/c/stashed": PathDef<[BiomesId], ReadonlyStashed | undefined>;
  "/ecs/c/minigame_instance_tick_info": PathDef<
    [BiomesId],
    ReadonlyMinigameInstanceTickInfo | undefined
  >;
  "/ecs/c/warping_to": PathDef<[BiomesId], ReadonlyWarpingTo | undefined>;
  "/ecs/c/minigame_instance_expire": PathDef<
    [BiomesId],
    ReadonlyMinigameInstanceExpire | undefined
  >;
  "/ecs/c/placer_component": PathDef<
    [BiomesId],
    ReadonlyPlacerComponent | undefined
  >;
  "/ecs/c/quest_giver": PathDef<[BiomesId], ReadonlyQuestGiver | undefined>;
  "/ecs/c/default_dialog": PathDef<
    [BiomesId],
    ReadonlyDefaultDialog | undefined
  >;
  "/ecs/c/unmuck": PathDef<[BiomesId], ReadonlyUnmuck | undefined>;
  "/ecs/c/robot_component": PathDef<
    [BiomesId],
    ReadonlyRobotComponent | undefined
  >;
  "/ecs/c/admin_entity": PathDef<[BiomesId], ReadonlyAdminEntity | undefined>;
  "/ecs/c/protection": PathDef<[BiomesId], ReadonlyProtection | undefined>;
  "/ecs/c/projects_protection": PathDef<
    [BiomesId],
    ReadonlyProjectsProtection | undefined
  >;
  "/ecs/c/deletes_with": PathDef<[BiomesId], ReadonlyDeletesWith | undefined>;
  "/ecs/c/item_buyer": PathDef<[BiomesId], ReadonlyItemBuyer | undefined>;
  "/ecs/c/inspection_tweaks": PathDef<
    [BiomesId],
    ReadonlyInspectionTweaks | undefined
  >;
  "/ecs/c/profile_pic": PathDef<[BiomesId], ReadonlyProfilePic | undefined>;
  "/ecs/c/entity_description": PathDef<
    [BiomesId],
    ReadonlyEntityDescription | undefined
  >;
  "/ecs/c/landmark": PathDef<[BiomesId], ReadonlyLandmark | undefined>;
  "/ecs/c/collideable": PathDef<[BiomesId], ReadonlyCollideable | undefined>;
  "/ecs/c/restoration": PathDef<[BiomesId], ReadonlyRestoration | undefined>;
  "/ecs/c/terrain_restoration_diff": PathDef<
    [BiomesId],
    ReadonlyTerrainRestorationDiff | undefined
  >;
  "/ecs/c/team": PathDef<[BiomesId], ReadonlyTeam | undefined>;
  "/ecs/c/player_current_team": PathDef<
    [BiomesId],
    ReadonlyPlayerCurrentTeam | undefined
  >;
  "/ecs/c/user_roles": PathDef<[BiomesId], ReadonlyUserRoles | undefined>;
  "/ecs/c/restores_to": PathDef<[BiomesId], ReadonlyRestoresTo | undefined>;
  "/ecs/c/trade": PathDef<[BiomesId], ReadonlyTrade | undefined>;
  "/ecs/c/active_trades": PathDef<[BiomesId], ReadonlyActiveTrades | undefined>;
  "/ecs/c/placed_by": PathDef<[BiomesId], ReadonlyPlacedBy | undefined>;
  "/ecs/c/text_sign": PathDef<[BiomesId], ReadonlyTextSign | undefined>;
  "/ecs/c/irradiance": PathDef<[BiomesId], ReadonlyIrradiance | undefined>;
  "/ecs/c/locked_in_place": PathDef<
    [BiomesId],
    ReadonlyLockedInPlace | undefined
  >;
  "/ecs/c/death_info": PathDef<[BiomesId], ReadonlyDeathInfo | undefined>;
  "/ecs/c/synthetic_stats": PathDef<
    [BiomesId],
    ReadonlySyntheticStats | undefined
  >;
  "/ecs/c/idle": PathDef<[BiomesId], ReadonlyIdle | undefined>;
  "/ecs/c/voice": PathDef<[BiomesId], ReadonlyVoice | undefined>;
  "/ecs/c/gift_giver": PathDef<[BiomesId], ReadonlyGiftGiver | undefined>;
}
