import { makeEventHandler } from "@/server/logic/events/core";

export const changeCameraModeEventHandler = makeEventHandler(
  "changeCameraModeEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({ player: event.id }),
    apply: ({ player }, event) => {
      player.mutablePlayerBehavior().camera_mode = event.mode;
    },
  }
);
