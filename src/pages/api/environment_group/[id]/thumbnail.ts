import { zGroupById } from "@/pages/api/environment_group/[id]";
import { fetchEnvironmentGroupById } from "@/server/web/db/environment_groups";
import { okOrAPIError } from "@/server/web/errors";
import {
  biomesApiHandler,
  DoNotSendResponse,
  zDoNotSendResponse,
} from "@/server/web/util/api_middleware";
import { absoluteBucketURL } from "@/server/web/util/urls";

export default biomesApiHandler(
  {
    auth: "required",
    query: zGroupById,
    response: zDoNotSendResponse,
  },
  async ({
    context: { db },
    query: { id: environmentGroupId },
    unsafeResponse,
  }) => {
    const data = await fetchEnvironmentGroupById(db, environmentGroupId);
    okOrAPIError(
      data?.cloudBucket && data?.cloudImageLocations?.webp_320w,
      "not_found"
    );
    unsafeResponse.setHeader(
      "Cache-Control",
      "s-maxage=3600, stale-while-revalidate"
    );
    unsafeResponse.redirect(
      303,
      absoluteBucketURL(data.cloudBucket, data.cloudImageLocations?.webp_320w)
    );
    return DoNotSendResponse;
  }
);
