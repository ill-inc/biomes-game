import { findByUID } from "@/server/web/db/users_fetch";
import {
  biomesApiHandler,
  DoNotSendResponse,
  zDoNotSendResponse,
  zQueryBiomesId,
} from "@/server/web/util/api_middleware";
import {
  absoluteBucketURL,
  avatarPlaceholderURL,
} from "@/server/web/util/urls";
import { z } from "zod";

export default biomesApiHandler(
  {
    auth: "optional",
    query: z.object({
      id: zQueryBiomesId,
    }),
    response: zDoNotSendResponse,
  },
  async ({ context: { db }, query: { id: userId }, unsafeResponse }) => {
    const user = await findByUID(db, userId);
    if (
      !user ||
      !user.profilePicCloudImageLocations ||
      !user.profilePicCloudImageLocations.webp_320w
    ) {
      unsafeResponse.redirect(avatarPlaceholderURL());
      return DoNotSendResponse;
    }

    unsafeResponse.redirect(
      absoluteBucketURL(
        user.profilePicCloudBucket!,
        user.profilePicCloudImageLocations.webp_320w
      )
    );
    return DoNotSendResponse;
  }
);
