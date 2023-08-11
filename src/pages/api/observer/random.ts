import type { AskApi } from "@/server/ask/api";
import type { LazyEntity } from "@/server/shared/ecs/gen/lazy";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import type { SyncTarget } from "@/shared/api/sync";
import { zSyncTarget } from "@/shared/api/sync";
import { assertNever } from "@/shared/util/type_helpers";
import { sample } from "lodash";
import { z } from "zod";

export const zRandomRequest = z.object({
  kind: z.enum(["player", "robot", "landmark", "npc"]).optional(),
});
export type RandomRequest = z.infer<typeof zRandomRequest>;

export const zRandomResponse = z.object({
  target: zSyncTarget,
});

export type RandomResponse = z.infer<typeof zRandomResponse>;

async function rollPlayer(askApi: AskApi) {
  return sample(await askApi.scanAll("players"));
}

async function rollRobot(askApi: AskApi) {
  return sample(
    (await askApi.scanAll("robots")).filter(
      (e) => !e.hasIced() && e.hasPosition()
    )
  );
}

async function rollLandmark(askApi: AskApi) {
  return sample(
    (await askApi.scanAll("landmarks")).filter((e) => !e.hasIced())
  );
}

async function rollNpc(askApi: AskApi) {
  return sample((await askApi.scanAll("npcs")).filter((e) => !e.hasIced()));
}

export default biomesApiHandler(
  {
    auth: "optional",
    query: zRandomRequest,
    response: zRandomResponse,
  },
  async ({ context: { askApi }, query }) => {
    const r = Math.random();

    let retEntity: LazyEntity | undefined;
    if (query.kind) {
      switch (query.kind) {
        case "landmark":
          retEntity = await rollLandmark(askApi);
          break;
        case "robot":
          retEntity = await rollRobot(askApi);
          break;
        case "player":
          retEntity = await rollPlayer(askApi);
          break;
        case "npc":
          retEntity = await rollNpc(askApi);
          break;
        default:
          assertNever(query.kind);
      }
    } else {
      if (r < 0.25) {
        retEntity = await rollPlayer(askApi);
      } else if (r < 0.5) {
        retEntity = await rollRobot(askApi);
      } else if (r < 0.75) {
        retEntity = await rollLandmark(askApi);
      } else {
        retEntity = await rollNpc(askApi);
      }
    }

    if (!retEntity) {
      return {
        target: <SyncTarget>{
          kind: "position",
          position: sample(CONFIG.observerStartPositions)![0],
        },
      };
    }

    return {
      target: <SyncTarget>{
        kind: "entity",
        entityId: retEntity.id,
      },
    };
  }
);
