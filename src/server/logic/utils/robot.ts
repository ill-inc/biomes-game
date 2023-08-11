import type {
  InventoryEditor,
  WithInventory,
} from "@/server/logic/events/with_inventory";
import type { ContainerInventoryEditor } from "@/server/logic/inventory/container_inventory_editor";
import type { PlayerInventoryEditor } from "@/server/logic/inventory/player_inventory_editor";
import { placeableItemProperties } from "@/server/logic/utils/placeables";
import { npcEntity } from "@/server/spawn/spawn_npc";
import { attribs } from "@/shared/bikkie/schema/attributes";
import {
  DEFAULT_ROBOT_EXPIRATION_S,
  ROBOT_EXPIRATION_S,
  ROBOT_ITEM_SLOTS,
  ROBOT_SECONDS_PER_BLING,
} from "@/shared/constants";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import {
  AdminEntity,
  ContainerInventory,
  CreatedBy,
  RobotComponent,
} from "@/shared/ecs/gen/components";
import type { Delta } from "@/shared/ecs/gen/delta";
import type {
  Item,
  OwnedItemReference,
  Vec2f,
  Vec3f,
} from "@/shared/ecs/gen/types";
import { countOf, createBag } from "@/shared/game/items";
import type { Battery } from "@/shared/game/robot";
import { BatteryItemBuilder, inventoryAsBattery } from "@/shared/game/robot";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { ok } from "assert";

export function isAdminRobot(delta: Delta): boolean {
  const owner = delta.createdBy();
  return owner === undefined;
}

export class RobotHelper {
  static buildFromQueriedRobotInventory(
    inventory: WithInventory<InventoryEditor>
  ): Robot | undefined {
    const delta = inventory.delta();
    if (delta.robotComponent() === undefined) {
      return undefined;
    }
    return isAdminRobot(delta)
      ? new AdminRobot(delta)
      : new UserRobot(inventory, delta);
  }
}

export interface BaseRobotParams {
  id: BiomesId;
  position: Vec3f;
  orientation: Vec2f;
  item: Item;
}

export type AdminRobotParams = {} & BaseRobotParams;
export type UserRobotParams = {
  creator: BiomesId;
} & BaseRobotParams;

export interface Robot {
  isAdminRobot(): boolean;
  totalBattery(): Battery;
  updateTriggerTime(): void;
  feedBling(bling: number): void;
  place(position: Vec3f, orientation: Vec2f, creator?: BiomesId): void;
  placeInInventory(inventory: PlayerInventoryEditor): void;
  id(): BiomesId;
}

export class AdminRobot implements Robot {
  constructor(private readonly delta: Delta) {
    ok(this.delta.robotComponent());
  }

  static createNew(context: any, params: AdminRobotParams) {
    const timestamp = secondsSinceEpoch();
    const robotNpc = npcEntity(
      {
        id: params.id,
        position: params.position,
        typeId: params.item.id,
        orientation: params.orientation,
      },
      timestamp
    );

    context.create({
      ...robotNpc,
      ...placeableItemProperties(params.item, undefined, timestamp),
      robot_component: RobotComponent.create({}),
      container_inventory: ContainerInventory.create({
        items: new Array(ROBOT_ITEM_SLOTS),
      }),
      isAdminRobot: true,
      admin_entity: AdminEntity.create(),
    });
  }

  id(): BiomesId {
    return this.delta.id;
  }

  placeInInventory(inventory: PlayerInventoryEditor) {
    this.delta.setIced();
    const item = countOf(
      this.delta.npcMetadata()!.type_id,
      { [attribs.entityId.id]: this.id() },
      1n
    );
    inventory.giveWithInventoryOverflow(createBag(item));
  }

  place(position: Vec3f, orientation: Vec2f) {
    this.delta.clearIced();
    this.delta.setPosition({ v: position });
    this.delta.setOrientation({ v: orientation });
  }

  isAdminRobot() {
    return true;
  }

  totalBattery(): Battery {
    return {
      capacity: Infinity,
      charge: Infinity,
    };
  }

  feedBling(_bling: number) {
    log.warn("Feeding admin robot but admin robots never expire");
  }

  updateTriggerTime() {
    log.warn("Updating admin robot but admin robots never expire.");
  }
}

export class UserRobot implements Robot {
  private inventory: ContainerInventoryEditor;
  constructor(
    _inventory: WithInventory<InventoryEditor>,
    private readonly delta: Delta
  ) {
    ok(this.delta.robotComponent());
    this.inventory = _inventory.inventory as ContainerInventoryEditor;
    ok(this.delta.robotComponent()?.internal_battery_charge);
    ok(this.delta.robotComponent()?.internal_battery_capacity);
    ok(this.delta.robotComponent()?.trigger_at);
    ok(this.delta.robotComponent()?.last_update);

    const timeSinceLastUpdate =
      secondsSinceEpoch() - this.delta.robotComponent()!.last_update!;

    // Add or pull charged when on where the robot was since the last update.
    if (this.insideInventory()) {
      this.addCharge(timeSinceLastUpdate);
    } else {
      this.pullCharge(timeSinceLastUpdate);
    }
  }

  static createNew(context: any, params: UserRobotParams) {
    const timestamp = secondsSinceEpoch();
    const robotNpc = npcEntity(
      {
        id: params.id,
        position: params.position,
        typeId: params.item.id,
        orientation: params.orientation,
      },
      timestamp
    );

    context.create({
      ...robotNpc,
      ...placeableItemProperties(params.item, params.creator, timestamp),
      created_by: CreatedBy.create({
        created_at: timestamp,
        id: params.creator,
      }),
      robot_component: RobotComponent.create({
        trigger_at: timestamp + DEFAULT_ROBOT_EXPIRATION_S,
        internal_battery_charge: DEFAULT_ROBOT_EXPIRATION_S,
        internal_battery_capacity: ROBOT_EXPIRATION_S,
        last_update: timestamp,
      }),
      container_inventory: ContainerInventory.create({
        items: new Array(ROBOT_ITEM_SLOTS),
      }),
    });
  }

  private setLastUpdateToBeNow() {
    this.delta.mutableRobotComponent().last_update = secondsSinceEpoch();
  }

  id(): BiomesId {
    return this.delta.id;
  }

  private insideInventory(): boolean {
    return this.delta.iced() === true;
  }

  placeInInventory(inventory: PlayerInventoryEditor) {
    this.delta.setIced();
    const item = countOf(
      this.delta.npcMetadata()!.type_id,
      { [attribs.entityId.id]: this.id() },
      1n
    );
    inventory.giveWithInventoryOverflow(createBag(item));
    this.updateTriggerTime();
  }

  place(position: Vec3f, orientation: Vec2f, creator?: BiomesId) {
    ok(creator);
    this.delta.setCreatedBy({
      id: creator,
      created_at: secondsSinceEpoch(),
    });
    this.delta.clearIced();
    this.delta.setPosition({ v: position });
    this.delta.setOrientation({ v: orientation });
  }

  private baseCharge(): number {
    return this.delta.robotComponent()!.internal_battery_charge!;
  }

  private setBaseCharge(charge: number) {
    this.delta.mutableRobotComponent().internal_battery_charge = charge;
    this.setLastUpdateToBeNow();
  }

  private baseCapacity(): number {
    return this.delta.robotComponent()!.internal_battery_capacity!;
  }

  private chargeUntilFull(): number {
    return this.baseCapacity() - this.baseCharge();
  }

  private batteries(): {
    ref: OwnedItemReference;
    battery: BatteryItemBuilder;
  }[] {
    const batteries = [];
    const inventory = this.inventory.mutableInventory();
    for (const itemAndCount of inventory.items ?? []) {
      if (!itemAndCount) {
        continue;
      }
      const result = this.inventory.find(itemAndCount);
      if (!result) {
        continue;
      }
      batteries.push({
        ref: result[0],
        battery: new BatteryItemBuilder(itemAndCount),
      });
    }
    return batteries;
  }

  /**
   * Increase the base charge of the robot until its capacity is
   * full. Any remaining power after that will charge batteries in the
   * robot's inventory.
   */
  private addCharge(power: number) {
    const baseChargeIncrease = Math.min(this.chargeUntilFull(), power);
    this.setBaseCharge(this.baseCharge() + baseChargeIncrease);

    power -= baseChargeIncrease;
    for (const { ref, battery } of this.batteries()) {
      power = battery.addCharge(power);
      this.inventory.set(ref, battery.build());

      if (power <= 0) {
        continue;
      }
    }

    this.updateTriggerTime();
  }

  /**
   * Take charge from batteries stored in the robot's inventory. Once depleted,
   * charge is taken from the robot's internal capacity.
   */
  pullCharge(power: number) {
    for (const { ref, battery } of this.batteries()) {
      power = battery.pullCharge(power);
      this.inventory.set(ref, battery.build());
    }
    const baseChargeDecrease = Math.min(this.baseCharge(), power);
    this.setBaseCharge(this.baseCharge() - baseChargeDecrease);
    this.updateTriggerTime();
  }

  isAdminRobot(): boolean {
    return false;
  }

  totalBattery(): Battery {
    // mutableInventory() is used because the inventory may have changed
    // before this was called and we want the updated state.
    const battery = inventoryAsBattery(this.inventory.mutableInventory());

    return {
      capacity: battery.capacity + this.baseCapacity(),
      charge: battery.charge + this.baseCharge(),
    };
  }

  feedBling(bling: number) {
    const power = bling * ROBOT_SECONDS_PER_BLING;
    this.addCharge(power);
  }

  private computeTriggerTime() {
    return secondsSinceEpoch() + this.totalBattery().charge;
  }

  updateTriggerTime() {
    this.delta.mutableRobotComponent().trigger_at = this.computeTriggerTime();
    this.setLastUpdateToBeNow();
  }
}
