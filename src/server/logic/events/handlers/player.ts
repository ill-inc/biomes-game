import { makeEventHandler } from "@/server/logic/events/core";
import { q } from "@/server/logic/events/query";
import { Unmuck } from "@/shared/ecs/gen/components";
import { log } from "@/shared/logging";

const disconnectPlayerEventHandler = makeEventHandler("disconnectPlayerEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => ({
    player: q.id(event.id).with("gremlin").includeIced(),
  }),
  apply: ({ player }) => {
    if (!player.gremlin()) {
      return;
    }
    log.info(`Icing gremlin "${player.id}" due to disconnection.`);
    player.setIced();
  },
});

const ackWarpEventHandler = makeEventHandler("ackWarpEvent", {
  involves: (event) => ({
    player: q.id(event.id).includeIced(),
  }),
  apply: ({ player }) => {
    player.clearWarpingTo();
  },
});

const enterRobotFieldEventHandler = makeEventHandler("enterRobotFieldEvent", {
  involves: (event) => ({
    player: q.player(event.id),
    robot: q.id(event.robot_id).includeIced(),
  }),
  apply: ({ player, robot }, _event, context) => {
    const createdBy = robot.createdBy()?.id;
    if (createdBy) {
      context.publish({
        kind: "enterRobotField",
        entityId: player.id,
        robotId: robot.id,
        robotCreatorId: createdBy,
      });
    }
  },
});

const unmuckerEventHandler = makeEventHandler("unmuckerEvent", {
  involves: (event) => ({ gremlin: q.id(event.id).with("gremlin") }),
  apply: ({ gremlin }, event) => {
    if (event.unmucker) {
      gremlin.setUnmuck(
        Unmuck.create({
          volume: {
            kind: "sphere",
            radius: 10,
          },
        })
      );
    } else {
      gremlin.clearUnmuck();
    }
  },
});

const idleChangeEventHandler = makeEventHandler("idleChangeEvent", {
  involves: (event) => ({ player: q.id(event.id) }),
  apply: ({ player }, event) => {
    if (event.idle) {
      player.setIdle();
    } else {
      player.clearIdle();
    }
  },
});

export const allPlayerEventHandlers = [
  disconnectPlayerEventHandler,
  ackWarpEventHandler,
  enterRobotFieldEventHandler,
  unmuckerEventHandler,
  idleChangeEventHandler,
] as const;
