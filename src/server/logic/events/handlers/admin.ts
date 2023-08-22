import { makeEventHandler } from "@/server/logic/events/core";
import { q } from "@/server/logic/events/query";
import {
  copyPlayer,
  ensurePlayerHasReasonablePosition,
  forcePlayerWarp,
  newPlayer,
  newPlayerInventory,
} from "@/server/logic/utils/players";
import { QuestExecutor } from "@/server/shared/triggers/roots/quest";
import { getBiscuit } from "@/shared/bikkie/active";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import * as Component from "@/shared/ecs/gen/components";
import { RecipeBook } from "@/shared/ecs/gen/components";
import type { Delta } from "@/shared/ecs/gen/delta";
import { anItem } from "@/shared/game/item";
import { removeFromSet } from "@/shared/game/items";
import { log } from "@/shared/logging";
import { ok } from "assert";

export const adminDeleteEventHandler = makeEventHandler("adminDeleteEvent", {
  mergeKey: (event) => event.entity_id,
  involves: (event) => ({
    entity: q.id(event.entity_id).includeIced(),
  }),
  apply: ({ entity }, event, context) => {
    context.delete(entity.id);
  },
});

export const adminIceEventHandler = makeEventHandler("adminIceEvent", {
  mergeKey: (event) => event.entity_id,
  involves: (event) => ({
    entity: q.id(event.entity_id).includeIced(),
  }),
  apply: ({ entity }) => {
    entity.setIced();
  },
});

export const adminResetChallengeEventHandler = makeEventHandler(
  "adminResetChallengesEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({ player: q.includeIced(event.id) }),
    apply: ({ player }, event, context) => {
      for (const [challengeId, state] of event.challenge_states) {
        const executor = QuestExecutor.fromBiscuit(getBiscuit(challengeId));
        executor?.transitionState(
          { entity: player, publish: (event) => context.publish(event) },
          state
        );
      }
    },
  }
);

export const adminResetRecipeEventHandler = makeEventHandler(
  "adminResetRecipeEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({ player: q.includeIced(event.id) }),
    apply: ({ player }, event) => {
      if (event.clear_all) {
        player.setRecipeBook(RecipeBook.create());
      } else if (event.recipe_id) {
        removeFromSet(
          player.mutableRecipeBook().recipes,
          anItem(event.recipe_id)
        );
      }
    },
  }
);

export const adminResetInventoryEventHandler = makeEventHandler(
  "adminResetInventoryEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({ player: q.includeIced(event.id) }),
    apply: ({ player }) => {
      player.setInventory(newPlayerInventory());
    },
  }
);

export const adminGiveItemEventHandler = makeEventHandler(
  "adminGiveItemEvent",
  {
    involves: (event) => ({ player: q.player(event.id).includeIced() }),
    apply: ({ player: { inventory } }, event) => {
      if (event.toOverflow) {
        inventory.giveIntoOverflow(event.bag);
      } else {
        inventory.giveWithInventoryOverflow(event.bag);
      }
    },
  }
);

export const adminRemoveItemEventHandler = makeEventHandler(
  "adminRemoveItemEvent",
  {
    involves: (event) => ({ player: q.player(event.id).includeIced() }),
    apply: ({ player: { inventory } }, { ref }) =>
      inventory.set(ref, undefined),
  }
);

export const adminSetInfiniteCapacityEventHandler = makeEventHandler(
  "adminSetInfiniteCapacityContainerEvent",
  {
    involves: (event) => ({
      pricedContainer: q
        .includeIced(event.id)
        .with("priced_container_inventory"),
    }),
    apply: ({ pricedContainer }, event) => {
      // TODO: enforce only admins are sending
      pricedContainer.mutablePricedContainerInventory().infinite_capacity =
        event.infinite_capacity ?? false;
    },
  }
);

export const adminSavePresetEventHandler = makeEventHandler(
  "adminSavePresetEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({
      preset: q.includeIced(event.preset_id).optional(),
      player: q.includeIced(event.player_id),
      existingPresetsByName: q.byKeys("presetByLabel", event.name).optional(),
      world: q.worldMetadata(),
    }),
    apply: (
      { preset, player, world, existingPresetsByName },
      { id, preset_id, player_id, name },
      context
    ) => {
      log.info(
        `Admin ${id} saving preset ${preset_id} for player ${player_id}`
      );
      if (
        existingPresetsByName.length > 0 &&
        existingPresetsByName[0].id !== preset_id
      ) {
        log.error(
          `Admin ${id} tried to save preset ${preset_id} with name ${name} but a preset with that name already exists`
        );
        return;
      }
      if (preset === undefined) {
        log.info(`Creating new preset entity ${preset_id}`);
        preset = context.create(newPlayer(preset_id, "preset"));
      }
      copyPlayer(player, preset);
      preset.setLabel({ text: name });
      preset.setPresetPrototype({
        last_updated: secondsSinceEpoch(),
        last_updated_by: player_id,
      });
      ensurePlayerHasReasonablePosition(world, preset);
      preset.setIced();
    },
  }
);

export const adminLoadPresetEventHandler = makeEventHandler(
  "adminLoadPresetEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({
      preset: q.includeIced(event.preset_id),
      player: q.includeIced(event.player_id),
      world: q.worldMetadata(),
    }),
    apply: ({ preset, player, world }, { id, preset_id, player_id }) => {
      log.info(
        `Admin ${id} loading preset ${preset_id} for player ${player_id}`
      );
      copyPlayer(preset, player);
      player.setPresetApplied({
        preset_id,
        applier_id: id,
        applied_at: secondsSinceEpoch(),
      });
      const pos = preset.position()?.v;
      if (pos) {
        forcePlayerWarp(player, pos, preset.orientation()?.v);
      }
      ensurePlayerHasReasonablePosition(world, player);
    },
  }
);

export const adminEditPresetEventHandler = makeEventHandler(
  "adminEditPresetEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({
      preset: q.includeIced(event.preset_id),
    }),
    apply: ({ preset }, { name, id }) => {
      preset.setLabel({ text: name });
      preset.setPresetPrototype({
        last_updated: secondsSinceEpoch(),
        last_updated_by: id,
      });
    },
  }
);

export const adminDestroyPlantEventHandler = makeEventHandler(
  "adminDestroyPlantEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({
      plant: q.id(event.plant_id).with("farming_plant_component"),
      player: q.id(event.id),
    }),
    apply({ plant, player }, _event, _context) {
      plant.mutableFarmingPlantComponent().player_actions.push({
        kind: "adminDestroy",
        timestamp: secondsSinceEpoch(),
      });
      log.info(`Admin ${player.id} destroying plant ${plant.id}`);
    },
  }
);

export const adminUpdateInspectionTweaksHandler = makeEventHandler(
  "adminUpdateInspectionTweaksEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({
      entity: q.id(event.entity_id),
    }),
    apply({ entity }, event, _context) {
      if (event.hidden !== undefined) {
        entity.mutableInspectionTweaks().hidden = event.hidden;
      }

      // If no tweaks remain, clear the component
      if (!entity.mutableInspectionTweaks().hidden) {
        entity.clearInspectionTweaks();
      }
    },
  }
);

type EntityField = keyof Delta;

function snakeCaseToUpperCamalCase(field: string): string {
  return field
    .split("_")
    .map((name) => name[0].toUpperCase() + name.slice(1))
    .join("");
}

function snakeCaseToCamalCase(field: string): string {
  const words = field.split("_");
  return (
    words[0] +
    words
      .slice(1)
      .map((name) => name[0].toUpperCase() + name.slice(1))
      .join("")
  );
}

function entityInvoke(
  entity: Delta,
  field: string,
  method: "get" | "mutable" | "set" | "clear",
  ...args: any[]
): any {
  if (method === "get") {
    return entity[snakeCaseToCamalCase(field) as EntityField];
  }
  const componentName = snakeCaseToUpperCamalCase(field);
  return (entity[`${method}${componentName}` as EntityField] as any)(...args);
}

// Delete a component from an entity.
//
// Throws if the component does not exist.
export const adminECSDeleteComponentEventHandler = makeEventHandler(
  "adminECSDeleteComponentEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({
      entity: q.includeIced(event.id),
    }),
    apply({ entity }, { field }, _context) {
      if (entityInvoke(entity, field, "get") === undefined) {
        // Entity does not have the required field.
        throw new Error("field not found");
      }

      entityInvoke(entity, field, "clear");
    },
  }
);

// Add the default value of a component to an entity.
//
// Throws if the component does not exist.
export const adminECSAddComponentEventHandler = makeEventHandler(
  "adminECSAddComponentEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({
      entity: q.includeIced(event.id),
    }),
    apply({ entity }, { field }, _context) {
      if (entityInvoke(entity, field, "get") === undefined) {
        throw new Error("attempted to add a component that does not exist");
      }

      // @ts-ignore (ignore cannot index Component with componentName error)
      const newComponent = Component[snakeCaseToUpperCamalCase(field)].create();
      entityInvoke(entity, field, "set", newComponent);
    },
  }
);

function fetchCurrentValue(component: any, path: string[]): any {
  let current = component;
  for (const key of path) {
    if (current === undefined) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

function updateCurrentValue(component: any, path: string[], value: any) {
  let current = component;
  for (let i = 0; i < path.length - 1; ++i) {
    current = component[path[i]];
    ok(current !== undefined);
  }
  current[path[path.length - 1]] = value;
}

function matchTypeWithExisting(current: any, newValue: string) {
  try {
    if (typeof current === "boolean") {
      return newValue === "true";
    }
    if (typeof current === "string") {
      return newValue;
    }
    if (typeof current === "number") {
      return Number(newValue);
    }
  } catch (_e) {}
  return undefined;
}

// Edits a field within a component.
//
// Throws if the component does not exist or the edit path is invalid.
export const adminECSUpdateComponentEventHandler = makeEventHandler(
  "adminECSUpdateComponentEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({
      entity: q.includeIced(event.id),
    }),
    apply({ entity }, { path, value }, _context) {
      if (path.length === 0) {
        throw new Error("invalid edit path");
      }

      const componentField = path[0];
      const componentLocalPath = path.slice(1);

      if (entityInvoke(entity, componentField, "get") === undefined) {
        // Entity does not have the required component.
        throw new Error("component not found");
      }

      try {
        const newComponent = entityInvoke(entity, componentField, "mutable");
        const currentValue = fetchCurrentValue(
          newComponent,
          componentLocalPath
        );

        if (
          currentValue === undefined ||
          currentValue === null ||
          typeof currentValue === "object"
        ) {
          throw new Error("can't update null, undefined, or object");
        }
        const newValue = matchTypeWithExisting(currentValue, value);
        if (newValue === undefined) {
          throw new Error("invalid new value");
        }

        updateCurrentValue(newComponent, componentLocalPath, newValue);
        // Apply the change to the entity.
        entityInvoke(entity, componentField, "set", newComponent);
      } catch (e) {
        throw new Error(`Failed to update component: ${e}`);
      }
    },
  }
);
