import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zSpecialRoles } from "@/shared/acl_types";
import { UserRoles } from "@/shared/ecs/gen/components";
import { zUserRole } from "@/shared/ecs/gen/types";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zChangeRoleRequest = z.object({
  userId: zBiomesId,
  role: zSpecialRoles,
  isAdd: z.boolean(),
});
export type ChangeRoleRequest = z.infer<typeof zChangeRoleRequest>;

export const zChangeRoleResponse = z.object({
  newRoles: z.array(zUserRole),
});
export type ChangeRoleResponse = z.infer<typeof zChangeRoleResponse>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zChangeRoleRequest,
    response: zChangeRoleResponse,
  },
  async ({ context: { worldApi }, body: { userId, role, isAdd } }) => {
    const [version, userEntity] = await worldApi.getWithVersion(userId);
    okOrAPIError(userEntity, "not_found");

    const patchable = userEntity.edit();
    const roles = new Set(userEntity.userRoles()?.roles) ?? new Set();
    if (isAdd) {
      roles.add(role);
    } else {
      roles.delete(role);
    }
    if (roles.size === 0) {
      patchable.clearUserRoles();
    } else {
      patchable.setUserRoles(
        UserRoles.create({
          roles,
        })
      );
    }

    const delta = patchable.finish();
    okOrAPIError(delta, "not_found");
    const applyResult = await worldApi.apply({
      iffs: [[userEntity.id, version, UserRoles.ID]],
      changes: [
        {
          kind: "update",
          entity: delta,
        },
      ],
    });
    okOrAPIError(applyResult.outcome === "success", "internal_error");
    return { newRoles: Array.from(roles) };
  }
);
