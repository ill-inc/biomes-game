import type { SpecialRoles } from "@/shared/acl_types";

const nonEmployeeRoles = new Set(["groundskeeper", "farmingAdmin"]);

export function evaluateRole(
  roles: ReadonlySet<SpecialRoles> | undefined,
  ...requiredRoles: SpecialRoles[]
): boolean {
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }
  if (!roles || roles.size === 0) {
    return false;
  }
  let superRole = roles.has("employee");
  if (!process.env.IS_SERVER) {
    const isLocalhost =
      window.location.host.includes("127.0.0.1") ||
      window.location.host.includes("localhost");
    if (isLocalhost) {
      // Developers get super-roles.
      superRole = true;
    }
  }
  for (const requiredRole of requiredRoles) {
    if (!roles.has(requiredRole)) {
      // Employees/devs get all roles, except specifically excluded roles
      if (!superRole || nonEmployeeRoles.has(requiredRole)) {
        return false;
      }
    }
  }
  return true;
}
