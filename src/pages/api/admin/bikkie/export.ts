import {
  toStoredBakedTray,
  zStoredBakedTray,
} from "@/server/shared/bikkie/storage/baked";
import { biomesApiHandler } from "@/server/web/util/api_middleware";

export default biomesApiHandler(
  {
    auth: "admin",
    response: zStoredBakedTray,
    zrpc: true,
  },
  async ({ context: { bikkieRefresher } }) => {
    return toStoredBakedTray(await bikkieRefresher.force());
  }
);
