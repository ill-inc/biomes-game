import {
  fetchInviteCodeBundles,
  listInviteCodesByOwner,
} from "@/server/web/db/invite_codes";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zInviteCodeBundle } from "@/shared/types";
import { z } from "zod";

export const zInviteCodesResponse = z.object({
  inviteCodes: zInviteCodeBundle.array(),
});
export type InviteCodesResponse = z.infer<typeof zInviteCodesResponse>;

export default biomesApiHandler(
  {
    auth: "required",
    response: zInviteCodesResponse,
  },
  async ({ context: { db }, auth: { userId } }) => {
    const inviteCodes = await listInviteCodesByOwner(db, userId);
    const bundles = await fetchInviteCodeBundles(db, inviteCodes);

    return {
      inviteCodes: bundles,
    };
  }
);
