import type { ClientContextSubset } from "@/client/game/context";
import type {
  ChangeRoleRequest,
  ChangeRoleResponse,
} from "@/pages/api/admin/change_role";
import type { SpecialRoles } from "@/shared/acl_types";
import { jsonPost } from "@/shared/util/fetch_helpers";

export async function changeRole(
  { userId, authManager }: ClientContextSubset<"userId" | "authManager">,
  role: SpecialRoles,
  isAdd: boolean
) {
  const results = await jsonPost<ChangeRoleResponse, ChangeRoleRequest>(
    "/api/admin/change_role",
    {
      userId,
      role,
      isAdd,
    }
  );
  authManager.currentUser.updateSpecialRoles(new Set(results.newRoles));
}
