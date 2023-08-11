import type { BiomesId } from "@/shared/ids";
import type { ImageUrls } from "@/shared/url_types";
import type { UserInfoBundle } from "@/shared/util/fetch_bundles";
import type { Vec3 } from "@/shared/math/types";

export type ImageSizes = "thumbnail" | "grid" | "big";

export function sizeToWidth(size: ImageSizes) {
  switch (size) {
    case "thumbnail":
      return 320;
    case "grid":
      return 640;
    case "big":
      return 1280;
  }
}

export function imageUrlForSize(size: ImageSizes, imageUrls: ImageUrls) {
  return imageUrlForWidth(sizeToWidth(size), imageUrls);
}

export function imageUrlForWidth(width: number, imageUrls: ImageUrls) {
  if (width >= 2000 && imageUrls.webp_original) {
    return imageUrls.webp_original;
  } else if (width >= 960 && imageUrls.webp_1280w) {
    return imageUrls.webp_1280w;
  } else if (width >= 480 && imageUrls.webp_640w) {
    return imageUrls.webp_640w;
  } else if (width >= 0 && imageUrls.webp_320w) {
    return imageUrls.webp_320w;
  } else if (width >= 0 && imageUrls.png_1280w) {
    return imageUrls.png_1280w;
  }

  return imageUrls.fallback;
}

export function ogMetadataForImage(imageUrls: ImageUrls): {
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
} {
  if (imageUrls.png_1280w) {
    return {
      image: imageUrls.png_1280w,
      imageWidth: 1280,
      imageHeight: 1280,
    };
  }

  return {
    image: imageUrlForSize("big", imageUrls),
  };
}

export function profilePicThumbnailUrl(userId: BiomesId) {
  return `/api/social/user_thumbnail?id=${userId}`;
}

export function profilePicThumbnailUrlForBundle(userBundle: UserInfoBundle) {
  return imageUrlForSize("thumbnail", userBundle.user.profilePicImageUrls);
}

export function adminUserUrl(userIdOrUsername: BiomesId | string) {
  return `/admin/user/${userIdOrUsername}`;
}

export function observeUrl(pos: Vec3) {
  return `/at/${pos[0].toFixed(1)}/${pos[1].toFixed(1)}/${pos[2].toFixed(1)}`;
}
