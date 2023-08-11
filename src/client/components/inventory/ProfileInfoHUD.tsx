import { RolesHUD } from "@/client/components/RolesHUD";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { EntityProfilePic } from "@/client/components/social/EntityProfilePic";
import { TeamLabelForUser } from "@/client/components/social/TeamLabel";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import { useCachedUserInfo } from "@/client/util/social_manager_hooks";
import { BikkieIds } from "@/shared/bikkie/ids";
import { currencyBalance } from "@/shared/game/inventory";
import { formatCurrency } from "@/shared/util/view_helpers";
import React from "react";
import blingIcon from "/public/hud/bling-hud.png";

export const ProfileInfoHUD: React.FunctionComponent<{}> = React.memo(({}) => {
  const { reactResources, socialManager, userId } = useClientContext();
  const localInventory = reactResources.use("/ecs/c/inventory", userId);
  const userBundle = useCachedUserInfo(socialManager, userId);

  if (!localInventory || !userBundle) {
    return <></>;
  }

  return (
    <div
      className="profile-hud flex cursor-pointer items-center gap-0.6 hover:opacity-75"
      onClick={() => reactResources.set("/game_modal", { kind: "inventory" })}
    >
      <EntityProfilePic
        extraClassName="w-4 h-4 bg-dialog-bg-dark"
        entityId={userId}
      />
      <div className="flex flex-col items-start text-l font-semibold">
        <div className="flex gap-0.4">
          {userBundle.user.username}
          <TeamLabelForUser userId={userBundle.user.id} />
        </div>
        <div className="flex items-center gap-0.6">
          <Tooltipped tooltip="Bling">
            <div className="flex items-center gap-0.2 text-med font-semibold">
              <img
                src={blingIcon.src}
                className="-ml-0.2 h-[2.25vmin] w-[2.25vmin]"
              />
              <span className="amount">
                {formatCurrency(
                  BikkieIds.bling,
                  currencyBalance(localInventory, BikkieIds.bling),
                  "abbreviated",
                  "hide_zeros"
                ).replace(/\.\d*$/, "")}{" "}
              </span>
            </div>
          </Tooltipped>
          <RolesHUD />
        </div>
      </div>
    </div>
  );
});
