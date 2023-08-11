import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import { changeRole } from "@/client/util/roles";
import type { SpecialRoles } from "@/shared/acl_types";
import { ALL_SPECIAL_ROLES } from "@/shared/acl_types";

export const AdvancedOptionsRoles: React.FunctionComponent<{}> = ({}) => {
  const context = useClientContext();
  const roles = context.reactResources.use("/ecs/c/user_roles", context.userId);
  return (
    <div className="my-2">
      <label>Roles</label>

      {roles && (
        <div className="flex gap-0.6">
          {Array.from(roles.roles).map((role, i) => (
            <Tooltipped key={i} tooltip="Click to remove">
              <div
                className="cursor-pointer bg-white/5 px-0.4 py-0.2"
                onClick={() => {
                  void changeRole(context, role, false);
                }}
              >
                {role}
              </div>
            </Tooltipped>
          ))}
        </div>
      )}

      <select
        onChange={(e) => {
          void changeRole(context, e.target.value as SpecialRoles, true);
        }}
      >
        <option selected>Add Role</option>
        {Array.from(ALL_SPECIAL_ROLES)
          .filter((role) => !roles?.roles.has(role))
          .sort()
          .map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
      </select>
    </div>
  );
};
