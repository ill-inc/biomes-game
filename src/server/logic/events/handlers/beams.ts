import { makeEventHandler } from "@/server/logic/events/core";

export const removeMapBeamEventHandler = makeEventHandler(
  "removeMapBeamEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({
      player: event.id,
    }),
    apply: ({ player }, event, context) => {
      context.publish({
        kind: "mapBeamRemove",
        entityId: player.id,
        clientBeamId: event.beam_client_id,
        entityLocation: [...(player.staleOk().position()?.v ?? [0, 0, 0])],
      });
    },
  }
);
