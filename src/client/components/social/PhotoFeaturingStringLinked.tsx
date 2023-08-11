import { LinkableUsername } from "@/client/components/chat/Links";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { MiniPhoneUserLink } from "@/client/components/social/MiniPhoneUserLink";
import type { SocialMiniPhonePayload } from "@/client/components/social/types";
import { useExistingMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import type { FeedPostBundle, TaggedUserBundle } from "@/shared/types";
import { displayUsername } from "@/shared/util/helpers";
import React from "react";

export type ProfileLinkType = "open" | "inline";

export type PhotoFeaturingStringLinkedProps = {
  post: FeedPostBundle;
  linkType: ProfileLinkType;
};

export const PhotoFeaturingStringLinked = ({
  post,
  linkType,
}: PhotoFeaturingStringLinkedProps) => {
  let filteredObjects = post.taggedObjects.filter((e) => {
    return (e.kind === "user" && e.bundle && e.bundle.id == post.userId) ||
      e.kind === "environment_group" ||
      e.kind === "land"
      ? false
      : true;
  });

  if (filteredObjects.length === 0) {
    return <></>;
  }

  const output: JSX.Element[] = [];
  const { reactResources } = useClientContext();

  // filter down to show "with x and y" or "with x and 2 more"
  const taggedCount = filteredObjects.length;
  if (filteredObjects.length > 2) {
    filteredObjects = filteredObjects.slice(0, 1);
  }

  // Use "with" for selfies and "of" for regular captures
  const capturedUsers = post.taggedObjects.filter(
    (e) => e.kind === "user"
  ) as TaggedUserBundle[];
  const selfie = capturedUsers.some((u) => u.bundle?.id == post.userId);
  output.push(
    selfie ? (
      <React.Fragment key={"push"}>with </React.Fragment>
    ) : (
      <React.Fragment key={"of"}>of </React.Fragment>
    )
  );
  filteredObjects.forEach(function (obj, i) {
    if (obj.kind == "user") {
      if (obj.bundle?.username) {
        if (linkType == "open") {
          output.push(
            <LinkableUsername key={obj.bundle.id} who={obj.bundle.id} />
          );
        } else {
          output.push(
            <MiniPhoneUserLink key={obj.bundle.id} userId={obj.bundle.id}>
              {displayUsername(obj.bundle.username)}
            </MiniPhoneUserLink>
          );
        }
      }
    }

    if (i < filteredObjects.length - 2) {
      output.push(<React.Fragment key={"comma"}>, </React.Fragment>);
    } else if (
      i < filteredObjects.length - 1 ||
      (filteredObjects.length == 1 && taggedCount > 2)
    ) {
      output.push(<React.Fragment key="and"> and </React.Fragment>);
    }
  });

  if (taggedCount > 2) {
    if (linkType == "inline") {
      const miniPhone = useExistingMiniPhoneContext<SocialMiniPhonePayload>();
      output.push(
        <a
          href="#"
          key={`inline-${post.id}`}
          onClick={(e) => {
            e.preventDefault();
            miniPhone.pushNavigationStack({
              type: "tagged_list",
              post: post,
            });
          }}
        >
          {taggedCount - 1} more
        </a>
      );
    } else {
      output.push(
        <a
          href="#"
          key={`tags-${post.id}`}
          onClick={(e) => {
            e.preventDefault();
            reactResources.set("/game_modal", {
              kind: "generic_miniphone",
              rootPayload: {
                type: "social_detail",
                documentId: post.id,
                documentType: "post",
              },
            });
          }}
        >
          {taggedCount - 1} more
        </a>
      );
    }
  }
  return <>{output}</>;
};
