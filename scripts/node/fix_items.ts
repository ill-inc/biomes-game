import { migrateEntities } from "@/../scripts/node/abstract_migrate_script";
import { loadBikkieForScript } from "@/../scripts/node/helpers/bikkie";
import { triggerProdBake } from "@/server/shared/bikkie/dev";
import { createBiomesBakery } from "@/server/shared/bikkie/registry";
import { EmptyBikkieStorage } from "@/server/shared/bikkie/storage/empty";
import { determineEmployeeUserId } from "@/server/shared/bootstrap/sync";
import { DbIdGenerator } from "@/server/shared/ids/generator";
import { bootstrapGlobalSecrets } from "@/server/shared/secrets";
import { createBdb, createStorageBackend } from "@/server/shared/storage";
import { getBiscuits } from "@/shared/bikkie/active";
import { AnyBikkieAttribute } from "@/shared/bikkie/attributes";
import { Biscuit, attribs } from "@/shared/bikkie/schema/attributes";
import {
  BiscuitAttributeAssignment,
  BiscuitDefinition,
  createTrayMetadata,
} from "@/shared/bikkie/tray";
import {
  Item,
  ItemAndCount,
  ReadonlyItemBag,
  ReadonlyItemContainer,
  ReadonlyItemSet,
} from "@/shared/ecs/gen/types";
import { BagSpec } from "@/shared/game/bag_spec";
import { anItem } from "@/shared/game/item";
import { DropTable } from "@/shared/game/item_specs";
import { createBag, createItemSet } from "@/shared/game/items";
import { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { idToNpcType } from "@/shared/npc/bikkie";
import { StoredTriggerDefinition } from "@/shared/triggers/schema";
import { DefaultMap, mapMap, someMap } from "@/shared/util/collections";
import { removeFalsyInPlace } from "@/shared/util/object";
import { assertNever } from "@/shared/util/type_helpers";
import { isEqual, keys, mapKeys } from "lodash";

const LEGACY_HANDCRAFT = 1534621126189502 as BiomesId;

const NAVIGATION_AIDS_TO_DELETE: unknown[] = [
  "active_campsite",
  "plot",
  "deed",
];

function migrateTrigger(
  spec: StoredTriggerDefinition | undefined,
  idUpgrades: DefaultMap<BiomesId, BiomesId>
): boolean {
  if (!spec) {
    return false;
  }
  const migrateId = <C extends {}, F extends keyof C>(obj: C, field: F) => {
    if (!(field in obj) || !obj[field]) {
      return false;
    }
    const mapped = idUpgrades.get(obj[field] as BiomesId);
    if (mapped !== obj[field]) {
      (obj as any)[field] = mapped;
      return true;
    }
    return false;
  };

  const migrateItem = <C extends {}, F extends keyof C>(obj: C, field: F) => {
    if (!obj[field]) {
      return false;
    }
    const item = obj[field] as Item;
    return migrateId(item, "id");
  };

  const migrateStation = <C extends {}, F extends keyof C>(
    obj: C,
    field: F
  ) => {
    if (!obj[field]) {
      return false;
    }
    let mapped: BiomesId | undefined = idUpgrades.get(obj[field] as BiomesId);
    if (mapped === LEGACY_HANDCRAFT) {
      // Handcraft is no longer a station.
      mapped = undefined;
    }
    if (mapped !== obj[field]) {
      (obj as any)[field] = mapped;
      return true;
    }
    return false;
  };

  let dirty = false;

  if (spec.icon?.kind === "item") {
    dirty ||= migrateItem(spec.icon, "item");
  }

  if (spec.navigationAid?.kind === "npc") {
    try {
      idToNpcType(spec.navigationAid.npcTypeId);
    } catch {
      spec.navigationAid = {
        kind: "entity",
        id: spec.navigationAid.npcTypeId,
      };
      dirty = true;
    }
  } else if (NAVIGATION_AIDS_TO_DELETE.includes(spec.navigationAid?.kind)) {
    delete spec.navigationAid;
    dirty = true;
  }

  switch (spec.kind) {
    case "all":
    // Fallthrough.
    case "any":
    // Fallthrough.
    case "variant":
    // Fallthrough.
    case "seq":
      dirty ||= spec.triggers
        .map((t) => migrateTrigger(t, idUpgrades))
        .some(Boolean);
      break;
    case "blueprintBuilt":
      dirty ||= migrateId(spec, "blueprint");
      break;
    case "collect":
      dirty ||= migrateItem(spec, "item");
      break;
    case "collectType":
      dirty ||= migrateId(spec, "typeId");
      break;
    case "craft":
      dirty ||= migrateItem(spec, "item");
      dirty ||= migrateStation(spec, "station");
      break;
    case "craftType":
      dirty ||= migrateId(spec, "typeId");
      dirty ||= migrateStation(spec, "station");
      break;
    case "everCollect":
      dirty ||= migrateItem(spec, "item");
      break;
    case "everCollectType":
      dirty ||= migrateId(spec, "typeId");
      break;
    case "everCraft":
      dirty ||= migrateItem(spec, "item");
      break;
    case "everCraftType":
      dirty ||= migrateId(spec, "typeId");
      break;
    case "place":
      dirty ||= migrateItem(spec, "item");
      break;
    case "wear":
      dirty ||= migrateItem(spec, "item");
      break;
    case "wearType":
      dirty ||= migrateId(spec, "typeId");
      break;
    case "inventoryHas":
      dirty ||= migrateItem(spec, "item");
      break;
    case "inventoryHasType":
      dirty ||= migrateId(spec, "typeId");
      break;
    case "challengeClaimRewards":
    case "completeQuestStepAtMyRobot":
    case "cameraPhoto":
    case "challengeComplete":
    case "challengeUnlocked":
    case "event":
    case "mapBeam":
    case "approachPosition":
      break;
    default:
      assertNever(spec);
  }
  return dirty;
}

async function fixItems(backupFile: string) {
  await bootstrapGlobalSecrets("untrusted-apply-token");
  await loadBikkieForScript();

  const storage = await createStorageBackend("firestore");
  const db = createBdb(storage);
  const bikkieStorage = new EmptyBikkieStorage(); // TODO: Ability to modify prod tray from script.
  const idGenerator = new DbIdGenerator(db);
  const bakery = createBiomesBakery(db, bikkieStorage, [], idGenerator);

  const idMap = new DefaultMap<BiomesId, BiomesId>((key) => key);

  log.info("Migrating Biscuit definitions...");
  const migrateBikkieBagSpec = (bag: BagSpec) => {
    const output: BagSpec = [];
    for (const [id, count] of bag) {
      output.push([idMap.get(id) ?? id, count]);
    }
    return output;
  };

  const migrateBikkieDropTable = (table: DropTable) => {
    return table.map(([probability, items]) => [
      probability,
      items.map(([item, count]) => [idMap.get(item) ?? item, count]),
    ]);
  };

  const definitions: BiscuitDefinition[] = [];
  for (const biscuit of getBiscuits()) {
    const assignment: Record<number, BiscuitAttributeAssignment> = {};

    const updateField = (
      field: keyof Biscuit,
      attribute: AnyBikkieAttribute,
      fn: (val: any) => any
    ) => {
      const val = biscuit[field];
      if (val !== undefined) {
        const mapped = fn(val);
        if (!isEqual(val, mapped)) {
          if (mapped === undefined) {
            assignment[attribute.id] = { kind: "unassign" };
          } else {
            assignment[attribute.id] = {
              kind: "constant",
              value: mapped,
            };
          }
        }
      }
    };

    updateField("unlock", attribs.unlock, (val) => {
      const copy = structuredClone(val);
      return migrateTrigger(copy, idMap) ? copy : val;
    });

    updateField("trigger", attribs.unlock, (val) => {
      const copy = structuredClone(val);
      return migrateTrigger(copy, idMap) ? copy : val;
    });

    updateField("craftWith", attribs.craftWith, (val: BiomesId[]) =>
      val.map((id) => idMap.get(id)).filter((id) => id !== LEGACY_HANDCRAFT)
    );
    updateField("dyedWith", attribs.dyedWith, (val: BiomesId) =>
      idMap.get(val)
    );
    updateField("turnsInto", attribs.turnsInto, (val: BiomesId) =>
      idMap.get(val)
    );
    updateField("output", attribs.output, (val) => migrateBikkieBagSpec(val));
    updateField("input", attribs.input, (val) => migrateBikkieBagSpec(val));
    updateField("rewards", attribs.input, (val) => migrateBikkieBagSpec(val));
    updateField("drop", attribs.drop, (val) => migrateBikkieDropTable(val));
    updateField("preferredDrop", attribs.preferredDrop, (val) =>
      migrateBikkieDropTable(val)
    );
    updateField("seedDrop", attribs.seedDrop, (val) =>
      migrateBikkieDropTable(val)
    );
    updateField("navigationAid", attribs.navigationAid, (val) => {
      if (NAVIGATION_AIDS_TO_DELETE.includes(val.kind)) {
        return; // Delete.
      }
      if (val.kind !== "npc") {
        return val;
      }
      try {
        idToNpcType(val.npcTypeId);
      } catch {
        return {
          kind: "entity",
          id: val.npcTypeId,
        };
      }
    });

    if (Object.keys(assignment).length > 0) {
      definitions.push({ id: biscuit.id, attributes: assignment });
    }
  }
  if (definitions.length > 0) {
    log.info(`Updating ${definitions.length} biscuits...`);
    await bakery.saveAsActive(
      {
        meta: createTrayMetadata(
          "Updated item IDs",
          await determineEmployeeUserId()
        ),
        forceCompaction: true,
      },
      ...definitions
    );
    await triggerProdBake("fix_items script was run");
  }

  log.info("Migrating ECS entities...");
  const itemNeedsMigration = (item?: Item): item is Item => {
    if (!item) {
      return false;
    }
    return item.id !== idMap.get(item.id) || keys(item.payload).length > 0;
  };

  const itemAndCountNeedsMigration = (itemAndCount?: ItemAndCount) => {
    if (!itemAndCount) {
      return false;
    }
    return itemNeedsMigration(itemAndCount.item);
  };

  const migrateItem = (item: Item) => {
    const id = idMap.get(item.id);
    if (id === 7539420629350486 && item.payload) {
      // Environment group
      let name: string | undefined;
      let groupId = 0;
      let orientation: number | undefined;
      for (const key in item.payload) {
        const value = item.payload[key];
        if (typeof value === "number" && value > 1000) {
          groupId = value;
        } else if (typeof value === "string") {
          name = value;
        } else if (typeof value === "number") {
          orientation = value;
        }
      }
      return anItem({
        id,
        payload: removeFalsyInPlace({
          [attribs.groupId.id]: groupId,
          [attribs.displayName.id]: name,
          [attribs.rotation.id]: orientation,
        }),
      });
    }
    return anItem({
      id: idMap.get(item.id),
      payload: mapKeys(item.payload, (_value, key) => {
        const original = parseInt(key);
        return original < 200 ? original + 200 : original;
      }),
    });
  };

  const migrateItemAndCount = (itemAndCount: ItemAndCount) => {
    const { item, count } = itemAndCount;
    return {
      item: migrateItem(item),
      count,
    };
  };

  const bagNeedsMigration = (bag?: ReadonlyItemBag): bag is ReadonlyItemBag => {
    if (!bag) {
      return false;
    }
    for (const itemAndCount of bag.values()) {
      if (itemAndCountNeedsMigration(itemAndCount)) {
        return true;
      }
    }
    return false;
  };

  const migrateBag = (bag: ReadonlyItemBag) => {
    return createBag(
      ...mapMap(bag, (itemAndCount) => migrateItemAndCount(itemAndCount))
    );
  };

  const setNeedsMigration = (set?: ReadonlyItemSet): set is ReadonlyItemSet => {
    if (!set) {
      return false;
    }
    for (const item of set.values()) {
      if (itemNeedsMigration(item)) {
        return true;
      }
    }
    return false;
  };

  const migrateSet = (set: ReadonlyItemSet) => {
    const newItems: Item[] = [];
    for (const item of set.values()) {
      newItems.push(migrateItem(item));
    }
    return createItemSet(...newItems);
  };

  const containerNeedsMigration = (
    container?: ReadonlyItemContainer
  ): container is ReadonlyItemContainer => {
    return (
      container?.some((itemAndCount) =>
        itemAndCountNeedsMigration(itemAndCount)
      ) ?? false
    );
  };

  const migrateContainer = (container: ReadonlyItemContainer) => {
    return container.map((itemAndCount) =>
      itemAndCount ? migrateItemAndCount(itemAndCount) : itemAndCount
    );
  };

  if (backupFile) {
    await migrateEntities(
      backupFile,
      (entity) =>
        !!(
          entity.grab_bag ||
          entity.acquisition ||
          entity.loose_item ||
          entity.inventory ||
          entity.wearing ||
          entity.container_inventory ||
          entity.priced_container_inventory ||
          entity.selected_item ||
          entity.appearance_component ||
          entity.recipe_book ||
          entity.buffs_component ||
          entity.placeable_component ||
          entity.lifetime_stats ||
          entity.farming_plant_component
        ),
      (entity) => {
        if (bagNeedsMigration(entity.grabBag()?.slots)) {
          entity.mutableGrabBag().slots = migrateBag(entity.grabBag()!.slots);
        }
        if (bagNeedsMigration(entity.acquisition()?.items)) {
          entity.mutableAcquisition().items = migrateBag(
            entity.acquisition()!.items
          );
        }
        if (itemNeedsMigration(entity.looseItem()?.item)) {
          entity.mutableLooseItem().item = migrateItem(
            entity.looseItem()!.item
          );
        }
        if (containerNeedsMigration(entity.inventory()?.items)) {
          entity.mutableInventory().items = migrateContainer(
            entity.inventory()!.items
          );
        }
        if (bagNeedsMigration(entity.inventory()?.currencies)) {
          entity.mutableInventory().currencies = migrateBag(
            entity.inventory()!.currencies
          );
        }
        if (containerNeedsMigration(entity.inventory()?.hotbar)) {
          entity.mutableInventory().hotbar = migrateContainer(
            entity.inventory()!.hotbar
          );
        }
        if (bagNeedsMigration(entity.inventory()?.overflow)) {
          entity.mutableInventory().overflow = migrateBag(
            entity.inventory()!.overflow
          );
        }
        if (containerNeedsMigration(entity.containerInventory()?.items)) {
          entity.mutableContainerInventory().items = migrateContainer(
            entity.containerInventory()!.items
          );
        }
        if (
          entity
            .pricedContainerInventory()
            ?.items.some(
              (i) =>
                i &&
                (itemAndCountNeedsMigration(i.contents) ||
                  itemAndCountNeedsMigration(i.price))
            )
        ) {
          entity.mutablePricedContainerInventory().items = entity
            .pricedContainerInventory()!
            .items.map((i) => {
              if (!i) {
                return i;
              }
              return {
                contents: migrateItemAndCount(i.contents),
                price: migrateItemAndCount(i.price),
                seller_id: i.seller_id,
              };
            });
        }
        if (itemAndCountNeedsMigration(entity.selectedItem()?.item)) {
          entity.mutableSelectedItem().item = migrateItemAndCount(
            entity.selectedItem()!.item!
          );
        }
        if (
          someMap(
            entity.wearing()?.items ?? new Map(),
            (i, k) => k !== idMap.get(k) || itemNeedsMigration(i)
          )
        ) {
          entity.mutableWearing().items = new Map(
            mapMap(entity.wearing()!.items, (v, k) => [
              idMap.get(k),
              migrateItem(v),
            ])
          );
        }
        if (
          entity.appearanceComponent()?.appearance.head_id &&
          entity.appearanceComponent()!.appearance.head_id !==
            idMap.get(entity.appearanceComponent()!.appearance.head_id)
        ) {
          entity.mutableAppearanceComponent().appearance.head_id = idMap.get(
            entity.appearanceComponent()!.appearance.head_id
          );
        }
        if (setNeedsMigration(entity.recipeBook()?.recipes)) {
          entity.mutableRecipeBook().recipes = migrateSet(
            entity.recipeBook()!.recipes
          );
        }
        if (
          entity
            .buffsComponent()
            ?.buffs.some((b) => b.item_id !== idMap.get(b.item_id))
        ) {
          entity.mutableBuffsComponent().buffs = entity
            .buffsComponent()!
            .buffs.map((b) => ({
              ...b,
              item_id: idMap.get(b.item_id),
            }));
        }
        if (
          entity.placeableComponent()?.item_id &&
          entity.placeableComponent()!.item_id !==
            idMap.get(entity.placeableComponent()!.item_id)
        ) {
          entity.mutablePlaceableComponent().item_id = idMap.get(
            entity.placeableComponent()!.item_id
          );
        }
        if (
          someMap(entity.lifetimeStats()?.stats ?? new Map(), (v) =>
            bagNeedsMigration(v)
          )
        ) {
          entity.mutableLifetimeStats().stats = new Map(
            mapMap(entity.lifetimeStats()!.stats, (v, k) => [k, migrateBag(v)])
          );
        }
        if (
          entity.farmingPlantComponent()?.seed &&
          entity.farmingPlantComponent()!.seed !==
            idMap.get(entity.farmingPlantComponent()!.seed)
        ) {
          entity.mutableFarmingPlantComponent().seed = idMap.get(
            entity.farmingPlantComponent()!.seed
          );
        }
      }
    );
  }
}

const [backupFile] = process.argv.slice(2);
fixItems(backupFile);
