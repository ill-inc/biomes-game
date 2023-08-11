import { migrateEntities } from "@/../scripts/node/abstract_migrate_script";
import { BikkieIds } from "@/shared/bikkie/ids";
import { attribs } from "@/shared/bikkie/schema/attributes";
import { DAY_IN_S } from "@/shared/constants";
import { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { ItemContainer } from "@/shared/ecs/gen/types";
import { countOf } from "@/shared/game/items";
import { ItemAndCount } from "@/shared/game/types";

const CHARGED_POWER_CELL_CHARGE = DAY_IN_S * 23;
const EMPTY_POWER_CELL_CHARGE = 0;

// Script that just re-runs getNpcSize on all of them.
const [backupFile] = process.argv.slice(2);

function requiresMigration(entity: ReadonlyEntity): boolean {
  for (const { item } of getInventoryItems(entity)) {
    if (
      item.id === BikkieIds.robotModule ||
      item.id === BikkieIds.emptyPowerCell ||
      item.id === BikkieIds.powerCell
    ) {
      if (item?.batteryCharge === undefined) {
        return true;
      }
    }
  }

  return false;
}

function getInventoryItems(entity: ReadonlyEntity): ItemAndCount[] {
  const c_inventory = entity.container_inventory;
  const inventory = entity.inventory;

  const items = [
    ...(c_inventory?.items ?? []),
    ...(inventory?.items ?? []),
    ...(inventory?.hotbar ?? []),
  ];

  return items.filter((item) => item !== undefined) as ItemAndCount[];
}

migrateEntities(
  backupFile,
  (entity) => requiresMigration(entity),
  (entity) => {
    if (entity.containerInventory() !== undefined) {
      migrateInventory(entity.mutableContainerInventory().items, migrateItem);
    }
    if (entity.inventory() !== undefined) {
      migrateInventory(entity.mutableInventory().items, migrateItem);
      migrateInventory(entity.mutableInventory().hotbar, migrateItem);
    }
  }
);

function migrateItem(itemAndCount: ItemAndCount): ItemAndCount {
  const { item, count } = itemAndCount;
  if (item?.batteryCharge !== undefined) {
    return itemAndCount;
  }
  if (item.id === BikkieIds.powerCell || item.id === BikkieIds.robotModule) {
    return countOf(
      item.id,
      {
        [attribs.batteryCharge.id]: CHARGED_POWER_CELL_CHARGE,
      },
      count
    );
  } else if (item.id === BikkieIds.emptyPowerCell) {
    return countOf(
      item.id,
      {
        [attribs.batteryCharge.id]: EMPTY_POWER_CELL_CHARGE,
      },
      count
    );
  } else {
    return itemAndCount;
  }
}

function migrateInventory(
  container: ItemContainer,
  itemMigrator: (item: ItemAndCount) => ItemAndCount
) {
  for (let i = 0; i < container.length; ++i) {
    if (container[i] !== undefined) {
      container[i] = itemMigrator(container[i]!);
    }
  }
}
