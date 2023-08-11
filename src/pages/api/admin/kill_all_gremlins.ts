import { biomesApiHandler } from "@/server/web/util/api_middleware";
import type { Update } from "@/shared/ecs/change";
import { log } from "@/shared/logging";

export default biomesApiHandler(
  {
    auth: "admin",
  },
  async ({ context: { worldApi, askApi } }) => {
    const allGremlins = await askApi.scanAll("gremlins");
    log.info(`Killing ${allGremlins.length} gremlins`);
    await worldApi.apply(
      allGremlins.map((e) => ({
        changes: [
          <Update>{
            kind: "update",
            entity: {
              id: e.id,
              iced: {},
            },
          },
        ],
      }))
    );
  }
);
