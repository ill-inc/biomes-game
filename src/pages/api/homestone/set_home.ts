import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { toStoredEntityId } from "@/shared/ids";

export default biomesApiHandler(
  {
    auth: "required",
    method: "POST",
  },
  async ({ context: { db, worldApi }, auth: { userId } }) => {
    const user = await worldApi.get(userId);
    okOrAPIError(user && user.hasPosition(), "ecs_error");
    await db
      .collection("users")
      .doc(toStoredEntityId(userId))
      .update({
        homeLocation: [...user.position().v],
      });
  }
);
