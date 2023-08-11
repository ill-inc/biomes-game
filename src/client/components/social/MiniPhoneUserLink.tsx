import type { SocialMiniPhonePayload } from "@/client/components/social/types";
import { useExistingMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import { ShadowedImage } from "@/client/components/system/ShadowedImage";
import type { BiomesId } from "@/shared/ids";
import type { UserBundle } from "@/shared/types";
import { imageUrlForSize } from "@/shared/util/urls";
import type { PropsWithChildren } from "react";
import React from "react";

export const CallbackUserLink: React.FunctionComponent<
  PropsWithChildren<{
    userId: BiomesId;
    onClick?: (payload: SocialMiniPhonePayload) => any;
  }>
> = ({ onClick, children, userId }) => {
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick?.({
          type: "profile",
          userId: userId,
        });
      }}
    >
      {children}
    </a>
  );
};

export const CallbackUserAvatarLink: React.FunctionComponent<{
  user: UserBundle;
  onClick?: (payload: SocialMiniPhonePayload) => any;
  extraImageClasses?: string;
}> = ({ onClick, user, extraImageClasses }) => {
  return (
    <CallbackUserLink userId={user.id} onClick={onClick}>
      <ShadowedImage
        extraClassNames={`${extraImageClasses} avatar`}
        src={imageUrlForSize("thumbnail", user.profilePicImageUrls)}
      />
    </CallbackUserLink>
  );
};

export const MiniPhoneUserLink: React.FunctionComponent<
  PropsWithChildren<{
    userId: BiomesId;
  }>
> = ({ children, userId }) => {
  const { pushNavigationStack } =
    useExistingMiniPhoneContext<SocialMiniPhonePayload>();

  return (
    <CallbackUserLink
      userId={userId}
      onClick={(e) => {
        pushNavigationStack(e);
      }}
    >
      {children}
    </CallbackUserLink>
  );
};

export const MiniPhoneUserAvatarLink: React.FunctionComponent<{
  user: UserBundle;
  extraImageClasses?: string;
}> = ({ user, extraImageClasses }) => {
  const { pushNavigationStack } =
    useExistingMiniPhoneContext<SocialMiniPhonePayload>();
  return (
    <CallbackUserAvatarLink
      user={user}
      onClick={(e) => {
        pushNavigationStack(e);
      }}
      extraImageClasses={extraImageClasses}
    />
  );
};
