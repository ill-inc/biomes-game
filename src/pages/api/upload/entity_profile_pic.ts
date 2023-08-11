import type { BDB } from "@/server/shared/storage";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { makeCloudImageBundle } from "@/server/web/util/image_resizing";
import type { BucketedImageCloudBundle } from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";
import { zBiomesId } from "@/shared/ids";
import { dataURLToBase64 } from "@/shared/util/helpers";
import { z } from "zod";

export const zUpdateEntityProfilePictureRequest = z.object({
  entityId: zBiomesId,
  photoDataURI: z.string(),
  hash: z.string(),
});

export type UpdateEntityProfilePictureRequest = z.infer<
  typeof zUpdateEntityProfilePictureRequest
>;

async function uploadEntityProfilePic(
  db: BDB,
  entityId: BiomesId,
  dataURI: string
): Promise<BucketedImageCloudBundle> {
  const b64 = dataURLToBase64(dataURI);

  const basePath = `${entityId}/profile_pic`;
  const image = Buffer.from(b64, "base64");
  const cloudBundle = await makeCloudImageBundle(
    "biomes-social",
    image,
    basePath
  );
  return {
    bucket: "biomes-social",
    png_1280w: undefined,
    webp_1280w: undefined,
    webp_320w: undefined,
    webp_640w: undefined,
    webp_original: undefined,
    ...cloudBundle,
  };
}

export default biomesApiHandler(
  {
    auth: "admin",
    body: zUpdateEntityProfilePictureRequest,
  },
  async ({
    context: { db, worldApi },
    auth: {},
    body: { photoDataURI, entityId, hash },
  }) => {
    const bundle = await uploadEntityProfilePic(db, entityId, photoDataURI);
    await worldApi.apply({
      changes: [
        {
          kind: "update",
          entity: {
            id: entityId,
            profile_pic: {
              cloud_bundle: bundle,
              hash,
            },
          },
        },
      ],
    });
  }
);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb",
    },
  },
};
