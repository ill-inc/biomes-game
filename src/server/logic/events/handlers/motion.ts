import { makeEventHandler } from "@/server/logic/events/core";

export const moveEventHandler = makeEventHandler("moveEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => ({ ent: event.id }),
  apply: () => {
    // See server/sync/events/short_circuit.ts
    throw new Error("Move events are short-circuited.");
  },
});
