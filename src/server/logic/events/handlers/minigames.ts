import {
  makeEventHandler,
  newId,
  newIds,
  RollbackError,
} from "@/server/logic/events/core";
import { q } from "@/server/logic/events/query";
import {
  queryForRelevantEntities,
  queryForSpaceClipboardEntity,
  queryForTerrainInBox,
} from "@/server/logic/events/space_clipboard";
import { serverModFor } from "@/server/shared/minigames/server_mods";
import { parseMinigameSettings } from "@/server/shared/minigames/type_utils";
import {
  associateMinigameElement,
  disassociateMinigameElement,
  expireMinigameInstance,
  minigameStashEntityIdForPlayerId,
  minigameTickIn,
  removePlayerFromMinigameInstance,
} from "@/server/shared/minigames/util";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { CreatedBy } from "@/shared/ecs/gen/components";
import { boxToAabb } from "@/shared/game/group";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { log } from "@/shared/logging";
import { mapMap } from "@/shared/util/collections";
import { ok } from "assert";

/*
 * Generic minigame handlers
 */

export const giveMinigameKitEventHandler = makeEventHandler(
  "giveMinigameKitEvent",
  {
    involves: (event) => ({
      player: q.player(event.id).includeIced(),
      minigameId: newId(),
    }),
    apply: ({ player, minigameId }, event, context) => {
      const mod = serverModFor(event.kit.kind);
      const [component, items] = mod.kitSpec(minigameId);
      player.inventory.giveWithInventoryOverflow(items);
      context.create({
        id: minigameId,
        created_by: CreatedBy.create({
          id: player.id,
          created_at: Date.now(),
        }),
        minigame_component: component,
      });
    },
  }
);

export const editMinigameMetadataEventHandler = makeEventHandler(
  "editMinigameMetadataEvent",
  {
    involves: (event) => ({
      player: q.player(event.id).includeIced(),
      minigame: q
        .includeIced(event.minigame_id)
        .with("minigame_component", "created_by"),
    }),
    apply: ({ minigame }, event, _context) => {
      const mod = serverModFor(minigame.minigameComponent().metadata.kind);

      if (event.label) {
        minigame.mutableLabel().text = event.label;
      }

      const mutMinigame = minigame.mutableMinigameComponent();

      if (event.hero_photo_id) {
        mutMinigame.hero_photo_id = event.hero_photo_id;
      }

      if (event.minigame_settings) {
        parseMinigameSettings(event.minigame_settings, mod.settingsType);
        mutMinigame.minigame_settings = event.minigame_settings;
      }

      if (event.entry_price !== undefined) {
        mutMinigame.entry_price = event.entry_price;
      }
      mutMinigame.game_modified_at = secondsSinceEpoch();

      mod.logicHooks.onEdit?.({ event, minigame });
    },
  }
);

export const touchMinigameStatsEventHandler = makeEventHandler(
  "touchMinigameStatsEvent",
  {
    involves: (event) => ({
      player: q.player(event.id).includeIced(),
      minigame: q
        .includeIced(event.minigame_id)
        .with("minigame_component", "created_by"),
    }),
    apply: ({ minigame }, _event, _context) => {
      minigame.mutableMinigameComponent().stats_changed_at =
        secondsSinceEpoch();
    },
  }
);

export const minigameInstanceTickEventHandler = makeEventHandler(
  "minigameInstanceTickEvent",
  {
    prepareInvolves: (event) => ({
      minigame: q
        .id(event.minigame_id)
        .with("minigame_component")
        .includeIced(),
      minigameInstance: q
        .id(event.minigame_instance_id)
        .with("minigame_instance")
        .includeIced(),
      terrain:
        event.denorm_space_clipboard_info &&
        queryForTerrainInBox(event.denorm_space_clipboard_info.region.box),

      clipboardEntity:
        event.denorm_space_clipboard_info &&
        queryForSpaceClipboardEntity(
          event.denorm_space_clipboard_info.region.clipboard_entity_id
        ).optional(),
    }),
    prepare: (
      { minigame, minigameInstance, terrain, clipboardEntity },
      event,
      { voxeloo }
    ) => ({
      minigameInstanceId: minigameInstance.id,
      minigameId: minigameInstance.minigame_instance.minigame_id,
      activePlayerIds: [
        ...minigameInstance.minigame_instance.active_players.keys(),
      ],
      minigameElementIds: minigame.minigame_component.minigame_element_ids,
      clipboardRelevantEntityIds: event.denorm_space_clipboard_info
        ? clipboardEntity?.grouped_entities?.ids ?? []
        : [],
      terrainRelevantEntityIds:
        terrain && event.denorm_space_clipboard_info
          ? queryForRelevantEntities(
              voxeloo,
              terrain,
              boxToAabb(event.denorm_space_clipboard_info.region.box)
            )
          : [],
    }),
    involves: (
      event,
      {
        minigameId,
        minigameInstanceId,
        activePlayerIds,
        minigameElementIds,
        terrainRelevantEntityIds,
        clipboardRelevantEntityIds,
      }
    ) => ({
      minigame: q
        .id(minigameId)
        .with("created_by", "minigame_component")
        .includeIced(),
      minigameInstance: q
        .id(minigameInstanceId)
        .with("created_by", "minigame_instance", "minigame_instance_tick_info")
        .includeIced(),

      minigameElements: q
        .ids([...minigameElementIds])
        .with("minigame_element")
        .optional(),
      activePlayers: q.ids(activePlayerIds).includeIced().optional(),

      clipboardEntity:
        event.denorm_space_clipboard_info &&
        queryForSpaceClipboardEntity(
          event.denorm_space_clipboard_info.region.clipboard_entity_id
        ),

      clipboardRelevantEntities:
        event.denorm_space_clipboard_info &&
        q.ids(clipboardRelevantEntityIds).includeIced(),
      terrainRelevantEntities:
        event.denorm_space_clipboard_info &&
        q.ids(terrainRelevantEntityIds).includeIced(),
      terrain:
        event.denorm_space_clipboard_info &&
        queryForTerrainInBox(event.denorm_space_clipboard_info.region.box),
      clonedRelevantEntityIds:
        event.denorm_space_clipboard_info &&
        newIds(clipboardRelevantEntityIds.length),
    }),
    apply: (
      {
        minigame,
        minigameInstance,
        activePlayers,
        minigameElements,
        clipboardEntity,
        clipboardRelevantEntities,
        terrainRelevantEntities,
        terrain,
        clonedRelevantEntityIds,
      },
      event,
      context
    ) => {
      if (minigameInstance.minigameInstance().finished) {
        minigameInstance.clearMinigameInstanceTickInfo();
        return;
      }

      const kind = minigame.minigameComponent().metadata.kind;

      const mod = serverModFor(minigame.minigameComponent().metadata.kind);
      if (!mod.logicHooks.onTick) {
        throw new RollbackError(`No tick handler found for ${kind}`);
      }

      const now = secondsSinceEpoch();
      const dt = now - minigameInstance.minigameInstanceTickInfo().last_tick;

      log.debug(`Processing tick of ${kind}`);
      const nextTick = mod.logicHooks.onTick(
        {
          minigameEntity: minigame,
          activePlayers,
          minigameElements,
          minigameInstanceEntity: minigameInstance,
          spaceClipboard: event.denorm_space_clipboard_info && {
            aabb: boxToAabb(event.denorm_space_clipboard_info.region.box),
            spaceClipboardEntity: clipboardEntity!,
            spaceRelevantEntities: clipboardRelevantEntities!,
            terrain: terrain!,
            terrainRelevantEntities: terrainRelevantEntities!,
            clonedRelevantEntityIds: clonedRelevantEntityIds!,
          },
        },
        context,
        dt
      );

      if (nextTick === "stop_tick") {
        log.debug(`Stopping ticks for ${kind}`);
        minigameInstance.clearMinigameInstanceTickInfo();
      } else {
        log.debug(`Scheduling next tick for ${kind} in ${nextTick}`);
        minigameInstance.setMinigameInstanceTickInfo(minigameTickIn(nextTick));
      }
    },
  }
);

export const associateMinigameElementEventHandler = makeEventHandler(
  "associateMinigameElementEvent",
  {
    involves: (event) => ({
      player: q.player(event.id),
      minigameElement: q.id(event.minigame_element_id).includeIced(),
      minigame: q.id(event.minigame_id).with("minigame_component"),
      oldMinigame: q
        .optional(event.old_minigame_id)
        ?.with("minigame_component"),
    }),

    apply: ({ minigame, oldMinigame, minigameElement }, _event, context) => {
      ok(minigameElement.minigameElement()?.minigame_id === oldMinigame?.id);

      if (oldMinigame) {
        disassociateMinigameElement(minigameElement, oldMinigame, context);
      }

      associateMinigameElement(minigameElement, minigame);
    },
  }
);

export const createMinigameThroughAssociationEventHandler = makeEventHandler(
  "createMinigameThroughAssocationEvent",
  {
    involves: (event) => ({
      player: q.player(event.id),
      minigameElement: q.id(event.minigame_element_id).includeIced(),
      newMinigameId: newId(),
      oldMinigame: q
        .optional(event.old_minigame_id)
        ?.with("minigame_component"),
    }),

    apply: (
      { player, oldMinigame, minigameElement, newMinigameId },
      event,
      context
    ) => {
      ok(minigameElement.minigameElement()?.minigame_id === oldMinigame?.id);

      if (oldMinigame) {
        disassociateMinigameElement(minigameElement, oldMinigame, context);
      }

      const mod = serverModFor(event.minigameType);
      const [component, _] = mod.kitSpec(newMinigameId);

      const minigame = context.create({
        id: newMinigameId,
        created_by: CreatedBy.create({
          id: player.id,
          created_at: Date.now(),
        }),
        label: {
          text: event.name,
        },
        minigame_component: component,
      });
      associateMinigameElement(minigameElement, minigame);
    },
  }
);

export const quitMinigameEventHandler = makeEventHandler("quitMinigameEvent", {
  prepareInvolves: (event) => ({
    player: q.id(event.id),
    minigameInstance: q
      .id(event.minigame_instance_id)
      .with("minigame_instance")
      .includeIced(),
  }),
  prepare: ({ player, minigameInstance }) => ({
    playerStashedEntityId:
      minigameStashEntityIdForPlayerId(
        minigameInstance.minigame_instance,
        player.id
      ) ?? INVALID_BIOMES_ID,
  }),
  involves: (event, { playerStashedEntityId }) => ({
    player: q.id(event.id).with("playing_minigame").includeIced(),
    playerStashedEntity: q
      .id(playerStashedEntityId)
      .with("stashed")
      .includeIced(),
    minigame: q
      .id(event.minigame_id)
      .with("created_by", "minigame_component")
      .includeIced(),
    minigameInstance: q
      .id(event.minigame_instance_id)
      .with("created_by", "minigame_instance")
      .includeIced(),
  }),
  apply: (
    { player, minigame, minigameInstance, playerStashedEntity },
    event,
    context
  ) => {
    ok(
      player.playingMinigame().minigame_instance_id === minigameInstance.id,
      "Not playing this game"
    );

    ok(
      minigameInstance.createdBy().id === minigame.id,
      "Minigame instance is not part of passed in minigame"
    );

    removePlayerFromMinigameInstance(
      player,
      playerStashedEntity,
      minigame,
      minigameInstance,
      context
    );
  },
});

export const expireMinigameInstanceEventHandler = makeEventHandler(
  "expireMinigameInstanceEvent",
  {
    prepareInvolves: (event) => ({
      minigameInstance: q
        .id(event.minigame_instance_id)
        .with("minigame_instance")
        .includeIced(),
      terrain:
        event.denorm_space_clipboard_info &&
        queryForTerrainInBox(event.denorm_space_clipboard_info.region.box),

      clipboardEntity:
        event.denorm_space_clipboard_info &&
        queryForSpaceClipboardEntity(
          event.denorm_space_clipboard_info.region.clipboard_entity_id
        ),
    }),
    prepare: (
      { minigameInstance, terrain, clipboardEntity },
      event,
      { voxeloo }
    ) => ({
      activePlayerIds: [
        ...minigameInstance.minigame_instance.active_players.keys(),
      ],
      activePlayerStashedEntityIds: mapMap(
        minigameInstance.minigame_instance.active_players,
        (e) => e.entry_stash_id
      ),
      clipboardRelevantEntityIds: event.denorm_space_clipboard_info
        ? clipboardEntity.grouped_entities?.ids ?? []
        : [],
      terrainRelevantEntityIds:
        terrain && event.denorm_space_clipboard_info
          ? queryForRelevantEntities(
              voxeloo,
              terrain,
              boxToAabb(event.denorm_space_clipboard_info.region.box)
            )
          : [],
    }),
    involves: (
      event,
      {
        activePlayerIds,
        activePlayerStashedEntityIds,
        clipboardRelevantEntityIds,
        terrainRelevantEntityIds,
      }
    ) => ({
      activePlayers: q.ids(activePlayerIds).includeIced(),
      activePlayerStashes: q
        .ids(activePlayerStashedEntityIds)
        .with("stashed")
        .includeIced(),
      minigame: q
        .id(event.minigame_id)
        .with("created_by", "minigame_component")
        .includeIced(),
      minigameInstance: q
        .id(event.minigame_instance_id)
        .with("created_by", "minigame_instance")
        .includeIced(),
      clipboardEntity:
        event.denorm_space_clipboard_info &&
        queryForSpaceClipboardEntity(
          event.denorm_space_clipboard_info.region.clipboard_entity_id
        ),

      clipboardRelevantEntities: q
        .ids(clipboardRelevantEntityIds)
        .includeIced(),
      terrainRelevantEntities: q.ids(terrainRelevantEntityIds).includeIced(),
      terrain:
        event.denorm_space_clipboard_info &&
        queryForTerrainInBox(event.denorm_space_clipboard_info.region.box),
    }),
    apply: (
      {
        minigame,
        minigameInstance,
        activePlayers,
        activePlayerStashes,
        clipboardEntity,
        clipboardRelevantEntities,
        terrain,
        terrainRelevantEntities,
      },
      event,
      context
    ) => {
      expireMinigameInstance(
        minigame,
        minigameInstance,
        activePlayers,
        activePlayerStashes,
        context,
        event.denorm_space_clipboard_info && {
          aabb: boxToAabb(event.denorm_space_clipboard_info.region.box),
          spaceClipboardEntity: clipboardEntity!,
          spaceRelevantEntities: clipboardRelevantEntities,
          terrain: terrain!,
          terrainRelevantEntities: terrainRelevantEntities,
        }
      );
    },
  }
);

export const minigameEventHandlers = [
  touchMinigameStatsEventHandler,
  giveMinigameKitEventHandler,
  editMinigameMetadataEventHandler,
  quitMinigameEventHandler,
  expireMinigameInstanceEventHandler,
  minigameInstanceTickEventHandler,
  associateMinigameElementEventHandler,
  createMinigameThroughAssociationEventHandler,
];
