import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { ShadowedImage } from "@/client/components/system/ShadowedImage";
import { useCachedPostBundle } from "@/client/util/social_manager_hooks";
import type { BiomesId } from "@/shared/ids";
import type { FeedPostBundle } from "@/shared/types";
import { imageUrlForSize } from "@/shared/util/urls";

export const PhotoDialogItem: React.FunctionComponent<{
  id: BiomesId;
  onClick?: (bundle: FeedPostBundle) => unknown;
  onDoubleClick?: (bundle: FeedPostBundle) => unknown;
}> = ({ id, onClick, onDoubleClick }) => {
  const { socialManager } = useClientContext();
  const photo = useCachedPostBundle(socialManager, id);
  if (!photo || !photo.metadata?.coordinates) {
    return <></>;
  }

  const imageUrl = imageUrlForSize("thumbnail", photo.imageUrls);
  if (!imageUrl) {
    return <></>;
  }

  return (
    <ShadowedImage
      extraClassNames="thumbnail-wrapper"
      onClick={() => onClick?.(photo)}
      onDoubleClick={() => onDoubleClick?.(photo)}
      src={imageUrlForSize("thumbnail", photo.imageUrls)}
    />
  );
};
