import { zGroupById } from "@/pages/api/environment_group/[id]";
import { fetchGroupDetailBundle } from "@/server/web/db/environment_groups";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zGroupDetailBundle } from "@/shared/types";

// TODO(akarpenko): Combine api/environment_group/[id] with this.
export default biomesApiHandler(
  {
    auth: "optional",
    query: zGroupById,
    response: zGroupDetailBundle,
  },
  async ({ context: { db, worldApi }, auth, query: { id: groupId } }) => {
    const groupBundle = await fetchGroupDetailBundle(db, worldApi, groupId, {
      queryingUserId: auth?.userId,
    });
    okOrAPIError(groupBundle, "not_found", `Couldn't find info for ${groupId}`);
    return groupBundle;
  }
);
