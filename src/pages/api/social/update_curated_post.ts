import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { toStoredEntityId, zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zUpdateCuratedPhotoRequest = z.object({
  postId: zBiomesId,
  approved: z.boolean(),
});
export type UpdateCuratedPhotoRequest = z.infer<
  typeof zUpdateCuratedPhotoRequest
>;

export const zUpdateCuratedPhotoResponse = z.object({});
export type UpdateCuratedPhotoResponse = z.infer<
  typeof zUpdateCuratedPhotoResponse
>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zUpdateCuratedPhotoRequest,
    response: zUpdateCuratedPhotoResponse,
  },
  async ({ context: { db }, body: { postId, approved } }) => {
    try {
      await db
        .collection("currated-feed-posts")
        .doc(toStoredEntityId(postId))
        .update({
          approved,
        });
    } catch (e) {}

    return {};
  }
);
