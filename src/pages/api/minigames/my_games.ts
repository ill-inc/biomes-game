import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { WrappedEntityFor, zEntity } from "@/shared/ecs/zod";
import { z } from "zod";

export const zMyGamesRequest = z.object({});
export type MyGamesRequest = z.infer<typeof zMyGamesRequest>;

export const zMyGamesResponse = z.object({
  games: z.array(zEntity),
});

export type MyGamesResponse = z.infer<typeof zMyGamesResponse>;

export default biomesApiHandler(
  {
    auth: "required",
    body: zMyGamesRequest,
    response: zMyGamesResponse,
    zrpc: true,
  },
  async ({ auth: { userId }, context: { askApi }, body: {} }) => {
    const games = await askApi.getByKeys({
      kind: "minigamesByCreatorId",
      creatorId: userId,
    });
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
