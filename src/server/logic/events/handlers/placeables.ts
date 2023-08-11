import type {
  AclChecker,
  EventContext,
  InvolvedSpecification,
} from "@/server/logic/events/core";
import {
  RollbackError,
  aclChecker,
  makeEventHandler,
  newId,
  newIds,
} from "@/server/logic/events/core";
import { AabbTerrainIterator } from "@/server/logic/events/occupancy";

import type { QueriedEntityWith } from "@/server/logic/events/query";
import { q } from "@/server/logic/events/query";
import {
  queryForRelevantEntities,
  queryForTerrainInBox,
} from "@/server/logic/events/space_clipboard";
import { PlayerInventoryEditor } from "@/server/logic/inventory/player_inventory_editor";
import { PricedContainerInventoryEditor } from "@/server/logic/inventory/priced_container_inventory_editor";
import {
  createDropsForBag,
  newDrop,
  rollSpec,
} from "@/server/logic/utils/drops";
import {
  checkAndOccupyTerrainForPlaceable,
  clearTerrainOccupancyForPlaceable,
  involvedShardsForPlaceable,
  newPlaceable,
  onPlaceablePlace,
  sizeForPlacable,
} from "@/server/logic/utils/placeables";
import {
  maybeSetRestoreTo,
  tryRestoreToCreated,
} from "@/server/logic/utils/restoration";
import type { Terrain } from "@/shared/game/terrain/terrain";

import {
  associateMinigameElement,
  disassociateMinigameElement,
  serverRuleset,
} from "@/server/shared/minigames/util";
import { attribs } from "@/shared/bikkie/schema/attributes";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import {
  ContainerInventory,
  PlacedBy,
  PricedContainerInventory,
  Wearing,
} from "@/shared/ecs/gen/components";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type {
  GrabBagFilter,
  ItemAndCount,
  ReadonlyItemAndCount,
} from "@/shared/ecs/gen/types";
import type { ChangePictureFrameContents } from "@/shared/firehose/events";
import { aabbToBox } from "@/shared/game/group";
import type { ItemPayload } from "@/shared/game/item";
import { anItem } from "@/shared/game/item";
import { addToBag, countOf, createBag } from "@/shared/game/items";
import { itemBagToString } from "@/shared/game/items_serde";
import {
  allowPlaceableDestruction,
  getAabbForPlaceable,
} from "@/shared/game/placeables";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { add, integerAABB } from "@/shared/math/linear";
import type { ReadonlyVec2, ReadonlyVec3 } from "@/shared/math/types";
import { compactMap } from "@/shared/util/collections";
import { ok } from "assert";
import { compact } from "lodash";

export const placePlaceableEventHandler = makeEventHandler(
  "placePlaceableEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => {
      const aabb = getAabbForPlaceable(
        event.placeable_item.id,
        event.position,
        event.orientation
      );
      ok(aabb);
      return {
        player: event.id,
        placeable: event.existing_placeable
          ? q
              .includeIced(event.existing_placeable)
              .with("placeable_component")
              .optional()
          : undefined,
        newPlaceableId: newId(),
        minigame: q.optional(event.minigame_id)?.with("minigame_component"),
        terrain: q
          .byKeys(
            "terrainByShardId",
            ...involvedShardsForPlaceable(
              event.placeable_item.id,
              event.position,
              event.orientation
            )
          )
          .terrain(),
        acl: aclChecker(
          {
            kind: "aabb",
            aabb: integerAABB(aabb),
          },
          event.id
        ),
      };
    },
    apply: (
      { player, placeable, newPlaceableId, terrain, minigame, acl },
      event,
      context
    ) => {
      const inventory = new PlayerInventoryEditor(context, player);
      const slot = inventory.get(event.inventory_ref);
      if (!slot || !event.placeable_item.isPlaceable) {
        return;
      }

      ok(slot.item.id === event.inventory_item.id);
      ok(
        !placeable ||
          placeable.placeableComponent().item_id === event.placeable_item.id
      );
      const existingPlaceableId = slot.item.entityId;
      ok(!placeable || placeable.id === existingPlaceableId);

      // Technically this event can pass up a different placeable item
      // than the item in the slot. In practice it does not
      ok(slot.item.id === event.inventory_item.id);
      inventory.takeFromSlot(event.inventory_ref, countOf(slot.item, 1n));

      const placeableId = placeable ? placeable.id : newPlaceableId;
      const timestamp = secondsSinceEpoch();

      if (!acl.canPerformItemAction(event.placeable_item)) {
        throw new RollbackError(
          `Cannot place ${event.placeable_item.displayName} here due to lack of permissions.`
        );
      }

      if (!placeable) {
        const entityToCreate = newPlaceable({
          id: placeableId,
          creatorId: player.id,
          position: event.position,
          orientation: event.orientation,
          item: event.placeable_item,
          timestamp,
        });

        placeable = context.create(entityToCreate);
      } else {
        const size = sizeForPlacable(event.placeable_item.id, event.position);
        if (size) {
          placeable.setSize(size);
        }
        placeable.setPosition({ v: event.position });
        placeable.setOrientation({ v: event.orientation });
      }

      deIcePlaceable(
        player.id,
        placeable,
        minigame,
        terrain,
        event.position,
        event.orientation,
        acl
      );

      onPlaceablePlace(placeable, acl, context);
    },
  }
);

export function deIcePlaceable(
  actor: BiomesId | undefined,
  placeable: QueriedEntityWith<"id" | "placeable_component">,
  minigame: QueriedEntityWith<"id" | "minigame_component"> | undefined,
  terrain: Terrain[],
  position: ReadonlyVec3,
  orientation: ReadonlyVec2,
  acl?: AclChecker
) {
  if (placeable.minigameElement() && minigame) {
    associateMinigameElement(placeable, minigame);
  }

  placeable.clearIced();
  if (actor) {
    placeable.setPlacedBy(
      PlacedBy.create({ id: actor, placed_at: secondsSinceEpoch() })
    );
  }

  checkAndOccupyTerrainForPlaceable(
    placeable.id,
    terrain,
    placeable.placeableComponent().item_id,
    position,
    orientation,
    acl
  );
}

export const startPlaceableAnimationEventHandler = makeEventHandler(
  "startPlaceableAnimationEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({
      placeable: event.id,
    }),
    apply: ({ placeable }, event) => {
      placeable.mutablePlaceableComponent().animation = {
        type: event.animation_type,
        start_time: secondsSinceEpoch(),
        repeat: undefined,
      };
    },
  }
);

function getPlaceableDropItems(entity: ReadonlyEntity) {
  const items: ReadonlyItemAndCount[] = [];
  if (entity.container_inventory?.items) {
    items.push(...compact(entity.container_inventory.items));
  }
  if (entity.priced_container_inventory?.items) {
    items.push(
      ...compactMap(entity.priced_container_inventory.items, (e) => e?.contents)
    );
  }
  if (entity.wearing?.items) {
    const wearables = [...entity.wearing.items.values()];
    const wearableItems = compact(
      wearables.map((e) => {
        return { item: e, count: 1n };
      })
    );
    items.push(...wearableItems);
  }

  return items;
}

export const destroyPlaceableEventHandler = makeEventHandler(
  "destroyPlaceableEvent",
  {
    mergeKey: (event) => event.id,
    prepareInvolves: (event) => ({
      placeable: q
        .id(event.id)
        .with("placeable_component", "position", "orientation"),
      player: q.id(event.user_id),
    }),
    prepare: ({ placeable, player }) => ({
      numDrops: getPlaceableDropItems(placeable).length,
      itemId: placeable.placeable_component.item_id,
      groupId: placeable.in_group?.id,
      position: placeable.position.v,
      orientation: placeable.orientation?.v,
      minigameId: placeable.minigame_element?.minigame_id,
      activeMinigameInstanceId: player.playing_minigame?.minigame_instance_id,
      activeMinigameId: player.playing_minigame?.minigame_id,
    }),
    involves: (
      event,
      {
        numDrops,
        itemId,
        groupId,
        position,
        orientation,
        minigameId,
        activeMinigameId,
        activeMinigameInstanceId,
      }
    ) => {
      return {
        placeable: q
          .id(event.id)
          .with("placeable_component", "position", "orientation"),
        placeableDropId: newId(),
        itemDropIds: numDrops > 0 ? newIds(numDrops) : undefined,
        group: q.optional(groupId),
        minigame: q.optional(minigameId)?.with("minigame_component"),

        playerActiveMinigame:
          activeMinigameId &&
          q.optional(activeMinigameId).with("minigame_component"),
        playerActiveMinigameInstance:
          activeMinigameInstanceId &&
          q.optional(activeMinigameInstanceId).with("minigame_instance"),

        terrain: q
          .byKeys(
            "terrainByShardId",
            ...involvedShardsForPlaceable(itemId, position, orientation)
          )
          .terrain(),
        acl: aclChecker({ kind: "point", point: position }, event.user_id),
        player: q.id(event.user_id),
      };
    },
    apply: (
      {
        placeable,
        placeableDropId,
        group,
        terrain,
        minigame,
        acl,
        playerActiveMinigame,
        playerActiveMinigameInstance,
        player,
      },
      event,
      context
    ) => {
      const ruleset = serverRuleset(
        {},
        player,
        playerActiveMinigame,
        playerActiveMinigameInstance
      );
      if (
        !event.expired &&
        !acl.can("destroy", { entity: placeable }) &&
        !ruleset.overrideAcl("destroy", { entity: placeable })
      ) {
        return;
      }

      icePlaceable(placeable, group, minigame, terrain, context);
      if (event.expired) {
        placeable.clearRestoresTo();
        return;
      }

      maybeSetRestoreTo(acl.restoreTimeSecs("destroy"), placeable, "created");

      const willBeRestored =
        placeable.restoresTo()?.restore_to_state === "created";

      if (
        !willBeRestored &&
        ruleset.canDropAt(terrain[0], placeable.position().v)
      ) {
        makePlaceableDrops(
          placeable,
          placeableDropId,
          minigame,
          event.user_id,
          context
        );
      }
    },
  }
);

function icePlaceable(
  placeable: QueriedEntityWith<
    "id" | "position" | "orientation" | "placeable_component"
  >,
  group: QueriedEntityWith<"id"> | undefined,
  minigame: QueriedEntityWith<"id" | "minigame_component"> | undefined,
  terrain: Terrain[],
  context: EventContext<{}>
) {
  if (
    !allowPlaceableDestruction(
      placeable.asReadonlyEntity(),
      group?.asReadonlyEntity()
    )
  ) {
    throw new RollbackError(
      `Cannot break placeable ${placeable.id}, it's part of a group.`
    );
  }

  if (minigame) {
    disassociateMinigameElement(placeable, minigame, context);
  }
  placeable.setIced();

  clearTerrainOccupancyForPlaceable(
    terrain,
    placeable.placeableComponent().item_id,
    placeable.position().v,
    placeable.orientation().v
  );
}

function makePlaceableDrops(
  placeable: QueriedEntityWith<
    "id" | "position" | "orientation" | "placeable_component"
  >,
  placeableDropId: BiomesId,
  _minigame: QueriedEntityWith<"id" | "minigame_component"> | undefined,
  userId: BiomesId | undefined,
  context: EventContext<InvolvedSpecification>
) {
  const itemId = placeable.placeableComponent().item_id;
  const item = anItem(itemId);
  let placeableDrop: ItemAndCount[] = [];

  if (item.drop) {
    // Drop what is prescribed in the drop table.
    placeableDrop = [...rollSpec(item.drop).values()];
  } else {
    // Drop the item itself.
    const dropItemPayload: ItemPayload = {
      [attribs.entityId.id]: placeable.id,
    };
    placeableDrop = [countOf(itemId, dropItemPayload, 1n)];
  }

  const dropFilter = userId
    ? <GrabBagFilter>{
        kind: "only",
        entity_ids: new Set([userId]),
        // TODO: What if drop is a group? Should we disable expiry?
        expiry: secondsSinceEpoch() + CONFIG.gameMinePrioritySecs,
      }
    : undefined;

  if (placeableDrop.length > 0) {
    context.create(
      newDrop(
        placeableDropId,
        [...placeable.position().v],
        false,
        placeableDrop,
        dropFilter
      )
    );
  }

  const items = getPlaceableDropItems(placeable.asReadonlyEntity());
  if (items.length > 0) {
    const bag = createBag(...items);
    createDropsForBag(
      context,
      "itemDropIds",
      bag,
      add(placeable.position().v, [0, 0.5, 0]),
      false,
      dropFilter
    );

    const itemId = placeable.placeableComponent().item_id;
    if (anItem(itemId).isContainer || anItem(itemId).isMailbox) {
      placeable.setContainerInventory(
        ContainerInventory.create({
          items: new Array(anItem(itemId).numSlots),
        })
      );
    }
    if (anItem(itemId).isShopContainer) {
      placeable.setPricedContainerInventory(
        PricedContainerInventory.create({
          items: new Array(anItem(itemId).numSlots),
        })
      );
    }
    if (anItem(itemId).isOutfit) {
      placeable.setWearing(Wearing.create());
    }
  }
}

export const changePictureFrameContentsEventHandler = makeEventHandler(
  "changePictureFrameContentsEvent",
  {
    mergeKey: (event) => event.id,
    prepareInvolves: (event) => ({
      frame: q.id(event.id).with("placeable_component", "position"),
    }),
    prepare: ({ frame }) => ({
      position: frame.position.v,
    }),
    involves: (event, { position }) => ({
      frame: q.id(event.id).with("placeable_component", "position"),
      acl: aclChecker({ kind: "point", point: position }, event.user_id),
    }),
    apply: ({ frame, acl }, event, context) => {
      ok(anItem(frame.placeableComponent().item_id).isFrame);

      if (!acl.can("destroy", { entity: frame })) {
        return;
      }

      const old: ChangePictureFrameContents = {
        placerId: frame.pictureFrameContents()?.placer_id,
        photoId: frame.pictureFrameContents()?.photo_id,
        minigameId: frame.pictureFrameContents()?.minigame_id,
      };
      const mod = frame.mutablePictureFrameContents();
      mod.placer_id = event.user_id;

      mod.photo_id = undefined;
      mod.minigame_id = undefined;

      if (event.photo_id) {
        mod.photo_id = event.photo_id;
      } else if (event.minigame_id) {
        mod.minigame_id = event.minigame_id;
      } else {
        log.error("Bad event -- photoId, or minigameId missing");
      }

      context.publish({
        kind: "changePictureFrameContents",
        entityId: event.user_id,
        frameEntityId: frame.id,
        position: frame.position().v,
        old,
        new: {
          placerId: mod.placer_id,
          photoId: mod.photo_id,
          minigameId: mod.minigame_id,
        },
      });
    },
  }
);

export const changeTextSignContentsEventHandler = makeEventHandler(
  "changeTextSignContentsEvent",
  {
    mergeKey: (event) => event.id,
    prepareInvolves: (event) => ({
      placeable: q.id(event.id).with("placeable_component", "position"),
    }),
    prepare: ({ placeable }) => ({
      position: placeable.position.v,
    }),
    involves: (event, { position }) => ({
      placeable: q.id(event.id).with("placeable_component", "position"),
      acl: aclChecker({ kind: "point", point: position }, event.user_id),
    }),
    apply: ({ placeable, acl }, event) => {
      const itemId = placeable.placeableComponent().item_id;
      ok(anItem(itemId).isCustomizableTextSign);
      const textSignConfiguration = anItem(itemId).textSignConfiguration;
      ok(textSignConfiguration);

      if (!acl.can("destroy", { entity: placeable })) {
        return;
      }

      event.text.splice(textSignConfiguration.line_count);

      placeable.setTextSign({
        text: event.text,
      });
    },
  }
);

export const updateVideoSettingsEventHandler = makeEventHandler(
  "updateVideoSettingsEvent",
  {
    mergeKey: (event) => event.id,
    prepareInvolves: (event) => ({
      placeable: q.id(event.id).with("placeable_component", "position"),
    }),
    prepare: ({ placeable }) => ({
      position: placeable.position.v,
    }),
    involves: (event, { position }) => ({
      placeable: q.id(event.id).with("placeable_component", "position"),
      acl: aclChecker({ kind: "point", point: position }, event.user_id),
    }),
    apply: ({ placeable, acl }, event) => {
      const itemId = placeable.placeableComponent().item_id;
      const item = anItem(itemId);
      ok(item.isMediaPlayer);

      if (!acl.can("destroy", { entity: placeable })) {
        return;
      }

      const videoUrl = event.video_url;
      const isPlayingVideo = videoUrl !== undefined && videoUrl !== "";

      if (item.isBoombox) {
        if (isPlayingVideo) {
          placeable.mutablePlaceableComponent().animation = {
            type: "play",
            start_time: secondsSinceEpoch(),
            repeat: "repeat",
          };
        } else {
          placeable.mutablePlaceableComponent().animation = undefined;
        }
      }

      placeable.setVideoComponent({
        video_url: videoUrl,
        video_start_time: secondsSinceEpoch(),
        muted: event.muted,
      });
    },
  }
);

export const sellInContainerEventHandler = makeEventHandler(
  "sellInContainerEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({
      pricedContainer: q
        .id(event.id)
        .with("placeable_component", "position", "priced_container_inventory"),
      seller: q.id(event.seller_id).with("inventory"),
    }),
    apply: ({ pricedContainer, seller }, event, context) => {
      const containerInventory = new PricedContainerInventoryEditor(
        pricedContainer
      );
      const playerInventory = new PlayerInventoryEditor(context, seller);
      playerInventory.takeFromSlot(event.src, event.sell_item);
      const existing = containerInventory.get(event.dst_slot);
      if (existing) {
        ok(existing.seller_id === seller.id);
        playerInventory.set(event.src, existing.contents);
      }
      containerInventory.set(event.dst_slot, {
        contents: event.sell_item,
        seller_id: seller.id,
        price: event.dst_price,
      });
    },
  }
);

export const purchaseFromContainerEventHandler = makeEventHandler(
  "purchaseFromContainerEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({
      pricedContainer: q
        .id(event.id)
        .with("placeable_component", "position", "priced_container_inventory"),
      purchaser: q.id(event.purchaser_id).with("inventory"),
      seller: q.includeIced(event.seller_id).with("inventory"),
    }),
    apply: ({ pricedContainer, purchaser, seller }, event, context) => {
      const purchaserInventory = new PlayerInventoryEditor(context, purchaser);
      const sellerInventory = new PlayerInventoryEditor(context, seller);
      const containerInventory = new PricedContainerInventoryEditor(
        pricedContainer
      );
      const src = containerInventory.get(event.src);
      const isAdminContainer =
        pricedContainer.pricedContainerInventory().infinite_capacity;
      const quantity = event.quantity ?? 1;
      ok(src && src.seller_id === event.seller_id);
      ok(src.price.item.isCurrency);
      // Multiple copies of an item can only but purchased from an admin container.
      ok(quantity === 1 || isAdminContainer);
      const purchasePrice = BigInt(quantity) * src.price.count;

      const bag = createBag();
      for (let i = 0; i < quantity; ++i) {
        addToBag(bag, src.contents);
      }
      purchaserInventory.giveOrThrow(bag);

      const isItemOwner = purchaser.id === seller.id;
      if (!isItemOwner) {
        ok(
          purchaserInventory.trySpendCurrency(src.price.item.id, purchasePrice)
        );
        sellerInventory.giveCurrency(src.price.item.id, purchasePrice);
      }

      if (isItemOwner || !isAdminContainer) {
        containerInventory.set(event.src, undefined);
      }
      context.publish({
        kind: "purchase",
        entityId: purchaser.id,
        seller: seller.id,
        bag: itemBagToString(bag),
        payment: itemBagToString(
          createBag({
            item: src.price.item,
            count: BigInt(purchasePrice),
          })
        ),
      });
    },
  }
);

export const restorePlaceableEventHandler = makeEventHandler(
  "restorePlaceableEvent",
  {
    mergeKey: (event) => event.id,
    prepareInvolves: (event) => ({
      placeable: q
        .includeIced(event.id)
        .with("placeable_component", "position", "orientation"),
      terrain: event.restoreRegion
        ? queryForTerrainInBox(aabbToBox(event.restoreRegion))
        : undefined,
    }),
    prepare: ({ placeable, terrain }, event, { voxeloo }) => ({
      numDrops: getPlaceableDropItems(placeable).length,
      itemId: placeable.placeable_component.item_id,
      groupId: placeable.in_group?.id,
      position: placeable.position.v,
      orientation: placeable.orientation?.v,
      minigameId: placeable.minigame_element?.minigame_id,
      terrainRelevantEntityIds:
        terrain && event.restoreRegion
          ? queryForRelevantEntities(voxeloo, terrain, event.restoreRegion)
          : undefined,
    }),
    involves: (
      event,
      {
        numDrops,
        minigameId,
        groupId,
        itemId,
        position,
        orientation,
        terrainRelevantEntityIds,
      }
    ) => ({
      placeable: q
        .includeIced(event.id)
        .with("placeable_component", "position", "orientation", "restores_to"),
      placeableDropId: newId(),
      itemDropIds: numDrops > 0 ? newIds(numDrops) : undefined,
      minigame: q.optional(minigameId)?.with("minigame_component"),
      group: q.optional(groupId),
      terrain: q
        .byKeys(
          "terrainByShardId",
          ...involvedShardsForPlaceable(itemId, position, orientation)
        )
        .terrain(),
      terrainRelevantEntities: terrainRelevantEntityIds
        ? q.ids(terrainRelevantEntityIds)
        : undefined,
    }),
    apply: (
      {
        placeable,
        placeableDropId,
        minigame,
        group,
        terrain,
        terrainRelevantEntities,
      },
      _event,
      context
    ) => {
      const timestamp = secondsSinceEpoch();
      ok(placeable.restoresTo().trigger_at <= timestamp);

      switch (placeable.restoresTo().restore_to_state) {
        case "created":
          {
            const aabb = getAabbForPlaceable(
              placeable.placeableComponent().item_id,
              placeable.position().v,
              placeable.orientation().v
            );
            ok(aabb);

            tryRestoreToCreated(
              placeable,
              terrainRelevantEntities ?? [],
              [new AabbTerrainIterator(terrain, aabb)],
              context,
              () => {
                deIcePlaceable(
                  undefined,
                  placeable,
                  minigame,
                  terrain,
                  placeable.position().v,
                  placeable.orientation().v
                );
              }
            );
          }
          break;
        case "deleted":
          {
            const expire = placeable.restoresTo().expire;
            if (placeable.iced()) {
              log.error(
                `About to restore entity ${placeable.id} to deleted state, but it's already iced.`
              );
              placeable.clearRestoresTo();
              break;
            }
            icePlaceable(placeable, group, minigame, terrain, context);
            placeable.clearRestoresTo();
            if (!expire) {
              makePlaceableDrops(
                placeable,
                placeableDropId,
                minigame,
                undefined,
                context
              );
            }
          }
          break;
      }
    },
  }
);
