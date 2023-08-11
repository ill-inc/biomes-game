import { makeEventHandler } from "@/server/logic/events/core";

export const labelChangeEventHandler = makeEventHandler("labelChangeEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => ({ ent: event.id }),
  apply: ({ ent }, event) => {
    ent.setLabel({ text: event.text });
  },
});
