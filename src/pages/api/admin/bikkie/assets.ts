import { getAllAssets } from "@/server/shared/drive/mirror";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zMirroredAsset } from "@/shared/drive/types";

export default biomesApiHandler(
  {
    auth: "admin",
    response: zMirroredAsset.array(),
    zrpc: true,
  },
  async ({ context: { db } }) => getAllAssets(db)
);
