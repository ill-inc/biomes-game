import {
  aclChecker,
  makeEventHandler,
  newId,
  RollbackError,
} from "@/server/logic/events/core";
import { q } from "@/server/logic/events/query";
import { PlayerInventoryEditor } from "@/server/logic/inventory/player_inventory_editor";
import { AdminRobot, RobotHelper, UserRobot } from "@/server/logic/utils/robot";
import { BikkieIds } from "@/shared/bikkie/ids";
import { anItem } from "@/shared/game/item";
import { countOf } from "@/shared/game/items";
import { getAabbForPlaceable } from "@/shared/game/placeables";
import type { ReadonlyItemAndCount } from "@/shared/game/types";
import { log } from "@/shared/logging";
import { evaluateRole } from "@/shared/roles";
import assert, { ok } from "assert";

const updateRobotNameEventHandler = makeEventHandler("updateRobotNameEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => {
    return {
      player: event.id,
      robot: q.id(event.entity_id),
    };
  },
  apply: ({ robot, player }, event, context) => {
    const robotCreator = robot.createdBy()?.id;
    if (
      robotCreator !== player.id &&
      !(robot.adminEntity() && evaluateRole(player.userRoles()?.roles, "admin"))
    ) {
      log.error("Cannot rename a robot you don't own.");
      return;
    }

    robot.mutableLabel().text = event.name;

    context.publish({
      kind: "updateRobotName",
      entityId: player.id,
      robotId: robot.id,
      newName: event.name,
    });
  },
});

const placeRobotEventHandler = makeEventHandler("placeRobotEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => {
    // Assert that there is space to place the robot.
    const aabb = getAabbForPlaceable(
      event.item_id,
      event.position,
      event.orientation
    );
    ok(aabb);
    return {
      player: event.id,
      robot: event.robot_entity_id
        ? q.includeIced(event.robot_entity_id).optional()
        : undefined,
      robotInventory: event.robot_entity_id
        ? q.inventory(event.robot_entity_id)
        : undefined,
      newEntityId: newId(),
      acl: aclChecker({ kind: "aabb", aabb }, event.id),
    };
  },
  apply: (
    { player, robot, newEntityId, acl, robotInventory },
    event,
    context
  ) => {
    const inventory = new PlayerInventoryEditor(context, player);
    const slot = inventory.get(event.inventory_ref);
    if (!slot || !slot?.item.isPlaceable) {
      return;
    }
    ok(slot.item.isRobot);
    ok(slot.item.id === event.item_id);
    if (!acl.can("placeRobot")) {
      const displayName = anItem(slot.item.id).displayName;
      throw new RollbackError(
        `Cannot place ${displayName} here due to lack of permissions.`
      );
    }

    const isNewRobot = robot === undefined;
    inventory.takeFromSlot(event.inventory_ref, countOf(slot.item, 1n));
    if (isNewRobot) {
      // Create a new robot.
      const isAdminRobot = !!slot.item.isAdminEntity;
      const baseRobotParams = {
        id: newEntityId,
        position: event.position,
        orientation: event.orientation,
        item: slot.item,
      };

      if (isAdminRobot) {
        AdminRobot.createNew(context, baseRobotParams);
      } else {
        UserRobot.createNew(context, {
          ...baseRobotParams,
          creator: player.id,
        });
      }
    } else {
      // Update an existing robot.
      ok(robotInventory);
      const robot = RobotHelper.buildFromQueriedRobotInventory(robotInventory);
      ok(robot);
      robot.place(event.position, event.orientation, player.id);
    }

    context.publish({
      kind: "place",
      entityId: player.id,
      item: slot.item,
      position: event.position,
    });
  },
});

const endPlaceRobotEventHandler = makeEventHandler("endPlaceRobotEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => ({
    player: event.id,
    robot: q.id(event.robot_entity_id).with("npc_metadata"),
  }),
  apply: ({ player, robot }, event, context) => {
    robot?.setLockedInPlace();
    context.publish({
      kind: "place",
      entityId: player.id,
      item: anItem(robot.npcMetadata().type_id),
      position: event.position,
    });
  },
});

const pickUpRobotEventHandler = makeEventHandler("pickUpRobotEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => {
    return {
      robotEntity: q
        .id(event.entity_id)
        .with("robot_component", "npc_metadata"),
      robotInventory: q.inventory(event.entity_id),
      player: event.id,
    };
  },
  apply: ({ robotEntity, robotInventory, player }, _event, context) => {
    const robotCreator = robotEntity.createdBy()?.id;
    if (
      robotCreator !== player.id &&
      !(
        robotEntity.adminEntity() &&
        evaluateRole(player.userRoles()?.roles, "admin")
      )
    ) {
      log.error("Cannot pick up a robot you didn't create.");
      return;
    }

    const inventory = new PlayerInventoryEditor(context, player);
    const robot = RobotHelper.buildFromQueriedRobotInventory(robotInventory);
    assert(robot);
    robot.placeInInventory(inventory);
  },
});

const robotInventorySwapEventHandler = makeEventHandler(
  "robotInventorySwapEvent",
  {
    involves: (event) => {
      const dstId = event.dst_id;
      return {
        src: q.inventory(event.id),
        dst: q.inventory(dstId),
      };
    },
    apply: ({ src: srcInventory, dst: dstInventory }, event, context) => {
      const srcIsRobot = srcInventory.delta().robotComponent() !== undefined;
      const robotInventory = srcIsRobot ? srcInventory : dstInventory;
      const robot = RobotHelper.buildFromQueriedRobotInventory(robotInventory);
      ok(robot);
      const srcItem = srcInventory.inventory.get(event.src);
      const dstItem = dstInventory.inventory.get(event.dst);

      // Do the swap
      srcInventory.inventory.set(event.src, dstItem);
      dstInventory.inventory.set(event.dst, srcItem);

      let itemGained: ReadonlyItemAndCount | undefined;
      let itemLost: ReadonlyItemAndCount | undefined;

      if (event.id === event.dst_id) {
        // Self-move
        return;
      }

      if (srcIsRobot) {
        itemLost = srcItem;
      } else {
        itemGained = srcItem;
      }

      // Update the robot based on the inventory diff.
      robot.updateTriggerTime();

      context.publish({
        kind: "robotInventoryChanged",
        entityId: srcIsRobot ? event.id : event.dst_id,
        itemsGained: itemGained ? [itemGained] : [],
        itemsLost: itemLost ? [itemLost] : [],
      });
    },
  }
);

const expireRobotEventHandler = makeEventHandler("expireRobotEvent", {
  mergeKey: (event) => event.id,
  prepareInvolves: (event) => ({
    robot: q.optional(event.id).with("created_by"),
  }),
  prepare: ({ robot }, _event) => ({
    playerId: robot && robot.created_by.id,
  }),
  involves: (event, { playerId }) => ({
    robotInventory: q.inventory(event.id).with("npc_metadata"),
    player: q.optional(playerId)?.includeIced(),
  }),
  apply: ({ robotInventory, player }, event, context) => {
    const robot = RobotHelper.buildFromQueriedRobotInventory(robotInventory);
    if (!robot) {
      log.warn(
        `Robot not found when expiring robot (expected ${event.id}). Ignoring.`
      );
      return;
    }
    if (!player) {
      log.warn(
        `Player not found when expiring robot ${robot.id()}. Deleting robot.`
      );
      context.delete(robot.id());
      return;
    }

    const inventory = new PlayerInventoryEditor(context, player);
    robot.placeInInventory(inventory);

    context.publish({
      kind: "robotExpired",
      entityId: player.id,
      robotId: robot.id(),
    });
  },
});

const feedRobotEventHandler = makeEventHandler("feedRobotEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => ({
    robotEntity: q.id(event.id).with("robot_component", "position"),
    robotInventory: q.inventory(event.id),
    player: event.user_id,
  }),
  apply: ({ robotEntity, robotInventory, player }, event, context) => {
    const inventory = new PlayerInventoryEditor(context, player);
    if (!inventory.trySpendCurrency(BikkieIds.bling, event.amount)) {
      throw new RollbackError(
        "Tried to feed robot but didn't have enough dough"
      );
    }
    const robot = RobotHelper.buildFromQueriedRobotInventory(robotInventory);
    ok(robot);
    robot.feedBling(Number(event.amount));
    robot.updateTriggerTime();
    context.publish({
      kind: "robotFeed",
      entityId: player.id,
      position: robotEntity.position().v,
      amount: event.amount,
    });
  },
});

export const allRobotHandlers = [
  updateRobotNameEventHandler,
  placeRobotEventHandler,
  pickUpRobotEventHandler,
  expireRobotEventHandler,
  feedRobotEventHandler,
  endPlaceRobotEventHandler,
  robotInventorySwapEventHandler,
];
