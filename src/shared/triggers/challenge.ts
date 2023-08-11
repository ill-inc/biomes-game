import type { Biscuit } from "@/shared/bikkie/schema/attributes";
import type { BiomesId } from "@/shared/ids";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import { MultiMap } from "@/shared/util/collections";

export function visitTrigger(
  def: StoredTriggerDefinition | undefined,
  fn: (def: StoredTriggerDefinition) => void
) {
  if (!def) {
    return;
  }
  fn(def);

  const visit = (def?: StoredTriggerDefinition) => visitTrigger(def, fn);
  switch (def.kind) {
    case "all":
    case "any":
    case "seq":
      for (const child of def.triggers) {
        visit(child);
      }
      break;
    default:
      break;
  }
}

export function getTriggerBiscuits(
  trigger: StoredTriggerDefinition
): BiomesId[] {
  switch (trigger.kind) {
    case "challengeComplete":
      return [trigger.challenge];
    case "blueprintBuilt":
      return [trigger.blueprint];
    case "challengeUnlocked":
      return [trigger.challenge];
    case "collect":
      return [trigger.item.id];
    case "collectType":
      return [trigger.typeId];
    case "everCollect":
      return [trigger.item.id];
    case "everCollectType":
      return [trigger.typeId];
    case "everCraft":
      return [trigger.item.id];
    case "everCraftType":
      return [trigger.typeId];
    case "craft":
      return [trigger.item.id];
    case "craftType":
      return [trigger.typeId];
    case "inventoryHas":
      return [trigger.item.id];
    case "inventoryHasType":
      return [trigger.typeId];
    case "place":
      return [trigger.item.id];
    case "wear":
      return [trigger.item.id];
    case "wearType":
      return [trigger.typeId];
    case "event":
      return [];
    case "all":
    case "any":
    case "seq":
      return trigger.triggers.flatMap(getTriggerBiscuits);
  }
  return [];
}

export function computeDependencies(
  challenges: Iterable<Biscuit>
): MultiMap<BiomesId, BiomesId> {
  const dependencies = new MultiMap<BiomesId, BiomesId>();
  for (const challenge of challenges) {
    if (challenge.unlock) {
      getTriggerBiscuits(challenge.unlock).forEach((biscuit) =>
        dependencies.add(challenge.id, biscuit)
      );
    }
  }
  return dependencies;
}
