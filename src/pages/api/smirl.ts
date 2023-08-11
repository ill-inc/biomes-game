import { biomesApiHandler } from "@/server/web/util/api_middleware";

import { z } from "zod";

export default biomesApiHandler(
  {
    auth: "optional",
    response: z.object({
      number: z.number(),
    }),
  },
  async ({ context: { askApi } }) => ({
    number: await askApi.playerCount(),
  })
);
