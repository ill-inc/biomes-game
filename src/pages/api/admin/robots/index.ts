import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { WrappedEntityFor, zEntity } from "@/shared/ecs/zod";
import { z } from "zod";

export const zRobotsRequest = z.object({});

export type RobotsRequest = z.infer<typeof zRobotsRequest>;

export const zRobotsResponse = z.object({
  robots: z.array(zEntity),
});

export type RobotsResponse = z.infer<typeof zRobotsResponse>;

export default biomesApiHandler(
  {
    auth: "required",
    body: zRobotsRequest,
    response: zRobotsResponse,
    zrpc: true,
  },
  async ({ auth: { userId }, context: { askApi }, body: {} }) => {
    const robots = (await askApi.scanAll("robots")).filter(
      (robot) => !robot.iced()
    );
    return {
      robots: robots.map(
        (e) =>
          new WrappedEntityFor(
            { whoFor: "client", id: userId },
            e.materialize()
          )
      ),
    };
  }
);
