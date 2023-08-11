import { makeEventHandler } from "@/server/logic/events/core";
import { q } from "@/server/logic/events/query";

const WATER_SOURCE_LEVEL = 15;

export const dumpWaterEventHandler = makeEventHandler("dumpWaterEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => ({
    terrain: q.terrain(event.id),
  }),
  apply: ({ terrain }, event) => {
    terrain.mutableWater.set(...event.pos, WATER_SOURCE_LEVEL);
  },
});

export const scoopWaterEventHandler = makeEventHandler("scoopWaterEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => ({
    terrain: q.terrain(event.id),
  }),
  apply: ({ terrain }, event) => {
    terrain.mutableWater.set(...event.pos, 0);
  },
});
