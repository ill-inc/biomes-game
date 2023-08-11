import type { AuthedToken } from "@/server/shared/auth/cookies";
import type { WorldApi } from "@/server/shared/world/api";
import type { SpecialRoles } from "@/shared/acl_types";
import { evaluateRole } from "@/shared/roles";

export async function hasRole(
  worldApi: WorldApi,
  auth: AuthedToken | undefined,
  ...requiredRoles: SpecialRoles[]
): Promise<boolean> {
  if (!auth || !auth.userId) {
    return false;
  }
  if (requiredRoles.length === 0) {
    return true;
  }
  if (
    auth.session.roleOverrides &&
    evaluateRole(new Set(auth.session.roleOverrides), ...requiredRoles)
  ) {
    return true;
  }
  const roles = (await worldApi.get(auth.userId))?.userRoles()?.roles;
  if (!roles) {
    return false;
  }
  return evaluateRole(roles, ...requiredRoles);
}
