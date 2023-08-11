import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { makeBucketedImageCloudBundle } from "@/server/web/util/image_resizing";
import { zBucketedImageCloudBundle, zCloudBucketKey } from "@/shared/url_types";
import { dataURLToBase64 } from "@/shared/util/helpers";
import { z } from "zod";

export const zUploadImageRequest = z.object({
  dataURI: z.string(),
  bucket: zCloudBucketKey,
  basePath: z.string().optional(),
});

export const zUploadImageResponse = z.object({
  locations: zBucketedImageCloudBundle,
});

export type UploadImageRequest = z.infer<typeof zUploadImageRequest>;
export type UploadImageResponse = z.infer<typeof zUploadImageResponse>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zUploadImageRequest,
    response: zUploadImageResponse,
  },
  async ({ context: {}, body: { dataURI, bucket, basePath } }) => {
    const buffy = Buffer.from(dataURLToBase64(dataURI), "base64");
    const imageBundle = await makeBucketedImageCloudBundle(
      bucket,
      buffy,
      basePath
    );

    return {
      locations: imageBundle,
    };
  }
);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "64mb",
    },
  },
};
