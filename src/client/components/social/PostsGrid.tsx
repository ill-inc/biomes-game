import type { SocialMiniPhonePayload } from "@/client/components/social/types";
import { useExistingMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import { ShadowedImage } from "@/client/components/system/ShadowedImage";
import type { BiomesId } from "@/shared/ids";
import type { FeedPostBundle } from "@/shared/types";
import { imageUrlForSize } from "@/shared/util/urls";
import React from "react";

export const PostsGrid: React.FunctionComponent<{
  posts: FeedPostBundle[];
  onClick?: (photoId: BiomesId) => unknown;
}> = ({ posts, onClick }) => {
  const miniPhone = useExistingMiniPhoneContext<SocialMiniPhonePayload>();
  return (
    <div className="posts-grid">
      {posts.map((photo) => (
        <ShadowedImage
          extraClassNames="thumbnail-wrapper"
          key={photo.id}
          src={imageUrlForSize("thumbnail", photo.imageUrls)}
          onClick={() => {
            if (onClick) {
              onClick(photo.id);
            } else {
              miniPhone.pushNavigationStack({
                type: "social_detail",
                documentId: photo.id,
                documentType: "post",
              });
            }
          }}
        />
      ))}
    </div>
  );
};
