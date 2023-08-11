import { fetchUserBundles, findByUID } from "@/server/web/db/users_fetch";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zSpecialRoles } from "@/shared/acl_types";
import { zUserBundle } from "@/shared/types";
import { z } from "zod";

export const zSelfProfileResponse = z.object({
  user: zUserBundle,
  profilePicHash: z.string().optional(),
  roles: z.array(zSpecialRoles),
});

export type SelfProfileResponse = z.infer<typeof zSelfProfileResponse>;

export default biomesApiHandler(
  {
    auth: "required",
    response: zSelfProfileResponse,
  },
  async ({ context: { db, worldApi }, auth: { userId } }) => {
    const [user, userEntity] = await Promise.all([
      findByUID(db, userId),
      worldApi.get(userId),
    ]);
    okOrAPIError(user);
    const userBundle = (await fetchUserBundles(db, user))[0];
    okOrAPIError(userBundle);
    return {
      user: userBundle,
      profilePicHash: user.profilePicHash,
      roles: [...(userEntity?.userRoles()?.roles ?? [])],
    };
  }
);
