import { attribs } from "@/shared/bikkie/schema/attributes";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import type {
  ReadonlyContainerInventory,
  RobotComponent,
} from "@/shared/ecs/gen/components";
import type {
  ItemAndCount,
  ReadonlyItemAndCount,
} from "@/shared/ecs/gen/types";
import { countOf } from "@/shared/game/items";
import type { AABB } from "@/shared/math/types";

export type RobotParams = {
  upkeepFactor: number;
  battery: Battery;
  aabb?: AABB;
};

export function getRobotParams(
  robotComponent: RobotComponent,
  robotInventory?: ReadonlyContainerInventory
): RobotParams | undefined {
  if (!robotInventory?.items) {
    return;
  }

  let upkeepFactor = 1.0;
  for (const itemAndCount of robotInventory.items) {
    const { item, count } = itemAndCount ?? {};
    if (item?.robotUpkeepFactor !== undefined) {
      upkeepFactor *= item.robotUpkeepFactor ** Number(count);
    }
  }

  return {
    upkeepFactor,
    battery: getRobotBattery(robotComponent, robotInventory),
  };
}

// Compute the amount of charge the robot has lost.
export function computeRobotBatterySpace(
  { last_update }: RobotComponent,
  { battery }: RobotParams
): number | undefined {
  if (!last_update) {
    return;
  }
  const space = battery.capacity - battery.charge;
  return secondsSinceEpoch() - last_update + space;
}

export function getRobotBattery(
  robotComponent: RobotComponent,
  robotInventory: ReadonlyContainerInventory | undefined
): Battery {
  let capacity = robotComponent.internal_battery_capacity ?? 0;
  let charge = robotComponent.internal_battery_charge ?? 0;
  if (robotInventory === undefined) {
    return { capacity, charge };
  }

  for (const itemAndCount of robotInventory.items) {
    if (itemAndCount !== undefined) {
      const battery = itemAsBattery(itemAndCount);
      capacity += battery.capacity;
      charge += battery.charge;
    }
  }

  return { capacity, charge };
}

export function isValidRobotInventoryItem(
  item: ReadonlyItemAndCount | undefined
): boolean {
  if (item === undefined) {
    return true;
  }
  return item.item.isRobotModule ?? false;
}

export interface Battery {
  capacity: number;
  charge: number;
}

export class BatteryItemBuilder {
  battery: Battery;
  constructor(private itemAndCount: ItemAndCount) {
    this.battery = itemAsBattery(this.itemAndCount);
  }

  charge(): number {
    return this.battery.charge;
  }

  capacity(): number {
    return this.battery.capacity;
  }

  private chargeUntilFull(): number {
    return this.capacity() - this.charge();
  }

  // Adds charge to a battery and returns any access power that could not be consumed.
  addCharge(power: number): number {
    const chargeAdded = Math.min(this.chargeUntilFull(), power);
    this.battery.charge += chargeAdded;
    return power - chargeAdded;
  }

  // Takes charge from a battery and returns any power in access
  // of the charge that was removed.
  pullCharge(power: number): number {
    const chargeRemoved = Math.min(this.charge(), power);
    this.battery.charge -= chargeRemoved;
    return power - chargeRemoved;
  }

  // Apply changes and create a new entity.
  build(): ItemAndCount {
    const { item, count } = this.itemAndCount;
    return countOf(
      item.id,
      {
        [attribs.batteryCapacity.id]: this.battery.capacity,
        [attribs.batteryCharge.id]: this.battery.charge,
      },
      count
    );
  }
}

export function inventoryAsBattery(
  inventory: ReadonlyContainerInventory | undefined
): Battery {
  let capacity = 0;
  let charge = 0;

  for (const itemAndCount of inventory?.items ?? []) {
    const { capacity: batteryCapacity, charge: batteryCharge } =
      itemAsBattery(itemAndCount);
    capacity += batteryCapacity;
    charge += batteryCharge;
  }
  return {
    capacity: capacity,
    charge: Math.min(charge, capacity),
  };
}

export function itemAsBattery(
  itemAndCount: ReadonlyItemAndCount | undefined
): Battery {
  const battery = {
    capacity: 0,
    charge: 0,
  };
  if (itemAndCount === undefined) {
    return battery;
  }
  const { item, count } = itemAndCount;
  if (item.batteryCapacity) {
    battery.capacity = item.batteryCapacity * Number(count);
  }
  if (item.batteryCharge) {
    battery.charge = item.batteryCharge * Number(count);
  }

  return battery;
}
