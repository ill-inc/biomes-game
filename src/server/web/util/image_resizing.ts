import { uploadToBucket } from "@/server/web/cloud_storage/cloud_storage";
import type {
  BucketedImageCloudBundle,
  CloudBucketKey,
  ImageBufferBundle,
  ImageCloudBundle,
} from "@/shared/url_types";
import { resolveAsyncObject } from "@/shared/util/async";
import { includes, mapValues } from "lodash";
import { default as sharp } from "sharp";
import { v4 } from "uuid";

export async function makeImageBundle(
  originalImage: Buffer
): Promise<ImageBufferBundle> {
  const sharped = sharp(originalImage);

  const webPOfWidth = async (width: number) => {
    return sharped
      .resize(width)
      .webp({
        quality: 90,
      })
      .toBuffer();
  };

  const pngOfWidth = async (width: number) => {
    return sharped
      .resize(width)
      .png({
        compressionLevel: 9,
      })
      .toBuffer();
  };

  return resolveAsyncObject({
    webp_320w: await webPOfWidth(320),
    webp_640w: await webPOfWidth(640),
    webp_1280w: await webPOfWidth(1280),
    png_1280w: await pngOfWidth(1280),
    webp_original: (async () => {
      return sharped.webp({ lossless: true }).toBuffer();
    })(),
  });
}

export async function makeCloudImageBundle(
  bucket: CloudBucketKey,
  originalImage: Buffer,
  basePath?: string
): Promise<ImageCloudBundle> {
  const trueBase = basePath ?? "/";
  const bufferBundle = await makeImageBundle(originalImage);

  return resolveAsyncObject(
    mapValues(bufferBundle, async (buffer, key) => {
      if (!buffer) {
        return undefined;
      }

      let ext: string;
      let mimeType: string;
      if (includes(key, "webp")) {
        ext = "webp";
        mimeType = "image/webp";
      } else if (includes(key, "png")) {
        ext = "png";
        mimeType = "image/png";
      } else if (includes(key, "jpg") || includes(key, "jpeg")) {
        ext = "jpg";
        mimeType = "image/jpeg";
      } else {
        throw new Error(`Invalid image format for ${key}`);
      }
      const storagePath = `${trueBase}/${key}_${v4()}.${ext}`;
      await uploadToBucket(bucket, storagePath, buffer, mimeType);
      return storagePath;
    })
  );
}

export async function makeBucketedImageCloudBundle(
  bucket: CloudBucketKey,
  originalImage: Buffer,
  basePath?: string
): Promise<BucketedImageCloudBundle> {
  const ret = await makeCloudImageBundle(bucket, originalImage, basePath);
  return {
    bucket,
    ...ret,
  };
}
