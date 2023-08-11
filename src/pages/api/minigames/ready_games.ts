import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { WrappedEntityFor, zEntity } from "@/shared/ecs/zod";
import { z } from "zod";

export const zReadyGamesRequest = z.object({});

export type ReadyGamesRequest = z.infer<typeof zReadyGamesRequest>;

export const zReadyGamesResponse = z.object({
  games: z.array(zEntity),
});

export type ReadyGamesResponse = z.infer<typeof zReadyGamesResponse>;

export default biomesApiHandler(
  {
    auth: "required",
    body: zReadyGamesRequest,
    response: zReadyGamesResponse,
    zrpc: true,
  },
  async ({ auth: { userId }, context: { askApi }, body: {} }) => {
    const games = await askApi.scanAll("ready_minigames");
    return {
      games: games.map(
        (e) =>
          new WrappedEntityFor(
            { whoFor: "client", id: userId },
            e.materialize()
          )
      ),
    };
  }
);
