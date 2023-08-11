import {
  biomesApiHandler,
  zQueryOptionalBiomesId,
} from "@/server/web/util/api_middleware";
import { zEncodedBiscuitTray } from "@/shared/bikkie/tray";
import { z } from "zod";

export default biomesApiHandler(
  {
    auth: "admin",
    query: z.object({
      id: zQueryOptionalBiomesId,
    }),
    response: zEncodedBiscuitTray.optional(),
    zrpc: true,
  },
  async ({ context: { bakery, bikkieStorage }, query: { id } }) => {
    id ||= await bakery.getActiveTrayId();
    const tray = await bikkieStorage.loadDefinition(id);
    return tray?.prepareForZrpc();
  }
);
