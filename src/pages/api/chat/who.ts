import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zBiomesId } from "@/shared/ids";
import { compactMap } from "@/shared/util/collections";
import { z } from "zod";

export const zWhoPlayer = z.object({
  id: zBiomesId,
  name: z.string(),
});

export type WhoPlayer = z.infer<typeof zWhoPlayer>;

export default biomesApiHandler(
  {
    auth: "required",
    response: z.array(zWhoPlayer),
  },
  async ({ context: { askApi } }) => {
    return compactMap(await askApi.scanAll("players"), (e) =>
      e.label()?.text ? { id: e.id, name: e.label()!.text } : undefined
    );
  }
);
