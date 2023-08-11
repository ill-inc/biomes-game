import { GameEvent } from "@/server/shared/api/game_event";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import type { InMemoryWorld } from "@/server/shared/world/shim/in_memory_world";
import {
  addGameRobot,
  addGameUser,
  setItemAtSlotIndex,
  TestLogicApi,
} from "@/server/test/test_helpers";
import { BikkieIds } from "@/shared/bikkie/ids";
import {
  DEFAULT_ROBOT_EXPIRATION_S,
  ROBOT_SECONDS_PER_BLING,
} from "@/shared/constants";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import {
  ExpireRobotEvent,
  FeedRobotEvent,
  PickUpRobotEvent,
  PlayerInitEvent,
  RobotInventorySwapEvent,
} from "@/shared/ecs/gen/events";
import { anItem } from "@/shared/game/item";
import { countOf } from "@/shared/game/items";
import { generateTestId } from "@/shared/test_helpers";
import type { VoxelooModule } from "@/shared/wasm/types";
import assert from "assert";

const TEST_ID = generateTestId();
const ROBOT_TEST_ID = generateTestId();

function approxEqual(a: number, b: number) {
  assert(Math.abs(a - b) < Math.abs(a / 100), `a: ${a}, b: ${b}`);
}

function getRobotCharge(
  robot: ReadonlyEntity,
  fromTriggerAt?: boolean
): number {
  if (fromTriggerAt) {
    return (robot.robot_component?.trigger_at as number) - secondsSinceEpoch();
  }
  return robot.robot_component?.internal_battery_charge as number;
}

function robotInInventory(player: ReadonlyEntity): boolean {
  return [...player.inventory!.items, ...player.inventory!.hotbar].some(
    (itemAndCount) => itemAndCount?.item?.id === BikkieIds.biomesRobot
  );
}

function refresh(world: InMemoryWorld): [ReadonlyEntity, ReadonlyEntity] {
  return [world.table.get(TEST_ID)!, world.table.get(ROBOT_TEST_ID)!];
}

describe("Robot tests", () => {
  let voxeloo!: VoxelooModule;
  before(async () => {
    voxeloo = await loadVoxeloo();
  });

  let logic: TestLogicApi;
  let player: ReadonlyEntity;
  let robot: ReadonlyEntity;

  beforeEach(async () => {
    logic = new TestLogicApi(voxeloo);
    player = await addGameUser(logic.world, TEST_ID, {})!;
    await logic.publish(
      new GameEvent(player.id, new PlayerInitEvent({ id: player.id }))
    );
    robot = await addGameRobot(logic.world, ROBOT_TEST_ID, false, TEST_ID);

    [player, robot] = refresh(logic.world);
  });

  it("puts robot in inventory on request", async () => {
    assert(!robotInInventory(player));
    await logic.publish(
      new GameEvent(
        player.id,
        new PickUpRobotEvent({
          id: player.id,
          player_id: player.id,
          entity_id: robot.id,
        })
      )
    );
    [player, robot] = refresh(logic.world);
    assert(robotInInventory(player));
  });

  it("puts robot in inventory after it expires", async () => {
    assert(!robotInInventory(player));
    await logic.publish(
      new GameEvent(
        player.id,
        new ExpireRobotEvent({
          id: robot.id,
        })
      )
    );
    [player, robot] = refresh(logic.world);
    assert(robotInInventory(player));
  });

  it("has a default charge and can increase it's charge with bling", async () => {
    assert(getRobotCharge(robot) === DEFAULT_ROBOT_EXPIRATION_S);
    await logic.publish(
      new GameEvent(
        player.id,
        new FeedRobotEvent({ id: robot.id, user_id: player.id, amount: 1n })
      )
    );
    [player, robot] = refresh(logic.world);
    // Both total charge and interal charge increase.
    approxEqual(
      getRobotCharge(robot, true),
      DEFAULT_ROBOT_EXPIRATION_S + ROBOT_SECONDS_PER_BLING
    );
    approxEqual(
      getRobotCharge(robot),
      DEFAULT_ROBOT_EXPIRATION_S + ROBOT_SECONDS_PER_BLING
    );
  });

  it("using bling will increase the robot's charge if not full, if the robot is holding an item", async () => {
    setItemAtSlotIndex(
      logic.world,
      player.id,
      countOf(BikkieIds.robotModule, undefined, 1n),
      4
    );
    await logic.publish(
      new GameEvent(
        player.id,
        new RobotInventorySwapEvent({
          id: player.id,
          src: {
            idx: 4,
            kind: "item",
          },
          dst: {
            idx: 0,
            kind: "item",
          },
          dst_id: robot.id,
        })
      )
    );

    [player, robot] = refresh(logic.world);
    approxEqual(
      getRobotCharge(robot),
      DEFAULT_ROBOT_EXPIRATION_S + ROBOT_SECONDS_PER_BLING
    );
  });

  it("holding a charged battery will increase charge", async () => {
    assert(getRobotCharge(robot) === DEFAULT_ROBOT_EXPIRATION_S);
    const robotModule = anItem(BikkieIds.robotModule);
    setItemAtSlotIndex(
      logic.world,
      player.id,
      countOf(BikkieIds.robotModule, undefined, 1n),
      4
    );
    await logic.publish(
      new GameEvent(
        player.id,
        new RobotInventorySwapEvent({
          id: player.id,
          src: {
            idx: 4,
            kind: "item",
          },
          dst: {
            idx: 0,
            kind: "item",
          },
          dst_id: robot.id,
        })
      )
    );

    [player, robot] = refresh(logic.world);

    // Internal charge does not change
    approxEqual(getRobotCharge(robot), DEFAULT_ROBOT_EXPIRATION_S);
    // Total charge does change.
    approxEqual(
      getRobotCharge(robot, true),
      DEFAULT_ROBOT_EXPIRATION_S + robotModule.batteryCharge!
    );

    // Remove battery.
    await logic.publish(
      new GameEvent(
        player.id,
        new RobotInventorySwapEvent({
          dst_id: player.id,
          dst: {
            idx: 4,
            kind: "item",
          },
          src: {
            idx: 0,
            kind: "item",
          },
          id: robot.id,
        })
      )
    );

    [player, robot] = refresh(logic.world);

    // Removing it resets the battery.
    approxEqual(getRobotCharge(robot, true), DEFAULT_ROBOT_EXPIRATION_S);
  });
});
