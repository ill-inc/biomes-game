import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { Img } from "@/client/components/system/Img";
import { ShadowedImage } from "@/client/components/system/ShadowedImage";
import type { MiniPhoneContextType } from "@/client/components/system/mini_phone/MiniPhoneContext";
import { maybeUseExistingMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import type { GenericMiniPhonePayload } from "@/client/components/system/types";
import type { ClientReactResources } from "@/client/game/resources/types";
import {
  useCachedUserInfo,
  useCachedUsername,
} from "@/client/util/social_manager_hooks";
import { type BiomesId } from "@/shared/ids";
import type { FeedPostBundle, GroupDetailBundle } from "@/shared/types";
import { displayUsername } from "@/shared/util/helpers";
import {
  imageUrlForSize,
  profilePicThumbnailUrlForBundle,
} from "@/shared/util/urls";
import avatarIcon from "/public/hud/avatar-placeholder.png";

export function doModalOrMiniPhonePush(
  reactResources: ClientReactResources,
  existingContext: MiniPhoneContextType<GenericMiniPhonePayload> | undefined,
  root: GenericMiniPhonePayload
) {
  if (existingContext) {
    existingContext.pushNavigationStack(root);
  } else {
    reactResources.set("/game_modal", {
      kind: "generic_miniphone",
      rootPayload: root,
    });
  }
}

export const AvatarView: React.FunctionComponent<{
  userId: BiomesId;
  extraClassName?: string;
}> = ({ userId, extraClassName }) => {
  const { reactResources, socialManager } = useClientContext();
  const existingMiniphoneContext =
    maybeUseExistingMiniPhoneContext<GenericMiniPhonePayload>();
  const userBundle = useCachedUserInfo(socialManager, userId);
  return (
    <ShadowedImage
      onClick={() => {
        doModalOrMiniPhonePush(reactResources, existingMiniphoneContext, {
          type: "profile",
          userId: userId,
        });
      }}
      src={
        userBundle
          ? profilePicThumbnailUrlForBundle(userBundle)
          : avatarIcon.src
      }
      extraClassNames={`avatar ${extraClassName}`}
    />
  );
};

export const LinkableUsername = ({
  who,
  you,
}: {
  who: BiomesId;
  you?: string;
}) => {
  const { reactResources, userId } = useClientContext();
  const existingMiniphoneContext =
    maybeUseExistingMiniPhoneContext<GenericMiniPhonePayload>();

  const username = useCachedUsername(who);
  const usernameToDisplay = you && who === userId ? you : username;

  return (
    <span
      className="link"
      onClick={() => {
        doModalOrMiniPhonePush(reactResources, existingMiniphoneContext, {
          type: "profile",
          userId: who,
        });
      }}
    >
      <span className="inline-flex gap-0.2">
        {displayUsername(usernameToDisplay)}
      </span>
    </span>
  );
};

export const LinkablePostName: React.FunctionComponent<{
  post: FeedPostBundle;
}> = ({ post }) => {
  const { reactResources } = useClientContext();
  const existingMiniphoneContext =
    maybeUseExistingMiniPhoneContext<GenericMiniPhonePayload>();

  return (
    <span
      className="link"
      onClick={() => {
        doModalOrMiniPhonePush(reactResources, existingMiniphoneContext, {
          type: "social_detail",
          documentType: "post",
          documentId: post.id,
        });
      }}
    >
      {post.caption ? post.caption : `${post.author.username}'s photo`}
    </span>
  );
};

export const LinkableGroupName: React.FunctionComponent<{
  group: GroupDetailBundle;
}> = ({ group }) => {
  const { reactResources } = useClientContext();
  const existingMiniphoneContext =
    maybeUseExistingMiniPhoneContext<GenericMiniPhonePayload>();

  return (
    <span
      className="link"
      onClick={() => {
        doModalOrMiniPhonePush(reactResources, existingMiniphoneContext, {
          type: "social_detail",
          documentType: "environment_group",
          documentId: group.id,
        });
      }}
    >
      {group.name
        ? group.name
        : `${group.ownerBiomesUser?.username ?? "someone"}'s group`}
    </span>
  );
};

export const LinkablePhotoPreview: React.FunctionComponent<{
  post: FeedPostBundle;
  onLoadImage?: () => unknown;
  extraClassName?: string;
}> = ({ post, onLoadImage, extraClassName }) => {
  const { reactResources, gardenHose } = useClientContext();
  const existingMiniphoneContext =
    maybeUseExistingMiniPhoneContext<GenericMiniPhonePayload>();
  return (
    <Img
      src={imageUrlForSize("thumbnail", post.imageUrls)}
      onLoad={onLoadImage}
      className={extraClassName}
      onClick={() => {
        gardenHose.publish({
          kind: "click_photo_message",
        });
        doModalOrMiniPhonePush(reactResources, existingMiniphoneContext, {
          type: "social_detail",
          documentId: post.id,
          documentType: "post",
        });
      }}
    />
  );
};

export const LinkableGroupPreview: React.FunctionComponent<{
  group: GroupDetailBundle;
  onLoadImage?: () => unknown;
}> = ({ group, onLoadImage }) => {
  const { reactResources } = useClientContext();
  const existingMiniphoneContext =
    maybeUseExistingMiniPhoneContext<GenericMiniPhonePayload>();
  return (
    <Img
      src={imageUrlForSize("thumbnail", group.imageUrls)}
      onLoad={onLoadImage}
      onClick={() => {
        doModalOrMiniPhonePush(reactResources, existingMiniphoneContext, {
          type: "social_detail",
          documentId: group.id,
          documentType: "environment_group",
        });
      }}
    />
  );
};
