import { makeEventHandler } from "@/server/logic/events/core";

export const emoteEventHandler = makeEventHandler("emoteEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => ({ player: event.id }),
  apply: () => {
    // See server/sync/events/short_circuit.ts
    throw new Error("Emote events are short-circuited.");
  },
});
