import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import { changeRole } from "@/client/util/roles";
import React from "react";

export const RolesHUD: React.FunctionComponent<{}> = ({}) => {
  const context = useClientContext();
  const { reactResources, userId } = context;
  const roles = reactResources.use("/ecs/c/user_roles", userId);

  return (
    <div className="flex flex-col items-end gap-1">
      <>
        {roles && roles.roles.has("groundskeeper") && (
          <Tooltipped tooltip="Groundskeeper changes are permanent. Click to Remove">
            <div
              className="biomes-box bg-orange px-0.6 py-0.2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                void changeRole(context, "groundskeeper", false);
              }}
            >
              Groundskeeper
            </div>
          </Tooltipped>
        )}
      </>
    </div>
  );
};
