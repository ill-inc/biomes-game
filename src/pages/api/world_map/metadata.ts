import { fetchSocialMetadata, fetchTileMetadata } from "@/server/web/db/map";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zWorldMapMetadataResponse } from "@/shared/types";

export default biomesApiHandler(
  {
    auth: "optional",
    response: zWorldMapMetadataResponse,
  },
  async ({ context: { db } }) => {
    const [tileMetadata, socialMetadata] = await Promise.all([
      fetchTileMetadata(db),
      fetchSocialMetadata(db),
    ]);
    okOrAPIError(tileMetadata, "not_found");

    return {
      ...tileMetadata,
      socialData: socialMetadata,
    };
  }
);
