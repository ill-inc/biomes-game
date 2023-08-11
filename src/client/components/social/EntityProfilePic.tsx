import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useLatestAvailableComponents } from "@/client/components/hooks/client_hooks";
import { iconUrl } from "@/client/components/inventory/icons";
import { ShadowedImage } from "@/client/components/system/ShadowedImage";
import { useCachedUserInfo } from "@/client/util/social_manager_hooks";
import { resolveImageUrls } from "@/server/web/util/urls";
import type { BiomesId } from "@/shared/ids";
import { relevantBiscuitForEntityId } from "@/shared/npc/bikkie";
import { imageUrlForSize } from "@/shared/util/urls";
import type { PropsWithChildren } from "react";
import React from "react";
import avatarIcon from "/public/hud/avatar-placeholder.png";

export const ProfilePicJSX: React.FunctionComponent<{
  src: string | undefined;
  extraClassName?: string;
  imgExtraClassName?: string;
}> = ({ src, extraClassName, imgExtraClassName }) => {
  return (
    <ShadowedImage
      extraClassNames={`avatar-wrapper avatar ${extraClassName}`}
      src={src ?? avatarIcon.src}
      imgClassName={imgExtraClassName}
    />
  );
};

const UserProfilePic: React.FunctionComponent<{
  userId: BiomesId;
  extraClassName?: string;
}> = ({ userId, extraClassName }) => {
  const { socialManager } = useClientContext();
  const userInfo = useCachedUserInfo(socialManager, userId);
  return (
    <ProfilePicJSX
      extraClassName={extraClassName}
      src={imageUrlForSize("thumbnail", {
        fallback: avatarIcon.src,
        ...userInfo?.user.profilePicImageUrls,
      })}
    />
  );
};

const FetchedEntityProfilePic: React.FunctionComponent<{
  entityId: BiomesId;
  extraClassName?: string;
}> = ({ entityId, extraClassName }) => {
  const clientContext = useClientContext();
  const [entityProfile, playerStatus] = useLatestAvailableComponents(
    entityId,
    "profile_pic",
    "player_status"
  );

  const isUser = Boolean(playerStatus);
  if (isUser) {
    return <UserProfilePic extraClassName={extraClassName} userId={entityId} />;
  }

  if (entityProfile) {
    return (
      <ProfilePicJSX
        extraClassName={extraClassName}
        src={imageUrlForSize(
          "thumbnail",
          resolveImageUrls(
            entityProfile.cloud_bundle.bucket,
            entityProfile.cloud_bundle,
            avatarIcon.src
          )
        )}
      />
    );
  }

  const relevantBiscuit = relevantBiscuitForEntityId(
    clientContext.resources,
    entityId
  );
  if (relevantBiscuit) {
    return (
      <ProfilePicJSX
        extraClassName={extraClassName}
        src={iconUrl(relevantBiscuit)}
      />
    );
  }

  return <ProfilePicJSX extraClassName={extraClassName} src={avatarIcon.src} />;
};

export const EntityProfilePic: React.FunctionComponent<
  PropsWithChildren<{
    entityId: BiomesId;
    extraClassName?: string;
    hint?: "user";
  }>
> = React.memo(({ entityId, extraClassName, hint }) => {
  if (hint === "user") {
    return <UserProfilePic extraClassName={extraClassName} userId={entityId} />;
  }

  return (
    <FetchedEntityProfilePic
      extraClassName={extraClassName}
      entityId={entityId}
    />
  );
});
