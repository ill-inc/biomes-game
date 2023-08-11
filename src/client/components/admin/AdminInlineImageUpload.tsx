import { InlineFileUpload } from "@/client/components/InlineFileUpload";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import type {
  UploadImageRequest,
  UploadImageResponse,
} from "@/pages/api/upload/admin_image";
import type {
  BucketedImageCloudBundle,
  CloudBucketKey,
} from "@/shared/url_types";
import { jsonPost } from "@/shared/util/fetch_helpers";
import React, { useCallback, useState } from "react";

export const AdminInlineImageUpload: React.FunctionComponent<{
  basePath?: string;
  imageUploadRef?: React.MutableRefObject<HTMLInputElement | null>;
  bucket: CloudBucketKey;
  onUploadComplete: (bundle: BucketedImageCloudBundle) => unknown;
  showButton?: boolean;
}> = ({ basePath, bucket, onUploadComplete, imageUploadRef, showButton }) => {
  imageUploadRef ??= React.useRef<HTMLInputElement | null>(null);
  const [error, setError] = useError();
  const [uploading, setUploading] = useState(false);
  const doUpload = useCallback(
    async (dataURI: string) => {
      try {
        setUploading(true);
        const res = await jsonPost<UploadImageResponse, UploadImageRequest>(
          "/api/upload/admin_image",
          {
            dataURI,
            bucket,
            basePath,
          }
        );
        onUploadComplete(res.locations);
      } catch (error: any) {
        setError(error);
      } finally {
        setUploading(false);
      }
    },
    [basePath, bucket]
  );

  return (
    <div>
      <MaybeError error={error} />
      <InlineFileUpload
        ref={imageUploadRef}
        onUpload={(file) => {
          void (async () => {
            const reader = new FileReader();
            reader.addEventListener(
              "load",
              () => {
                if (typeof reader.result === "string") {
                  void doUpload(reader.result);
                }
              },
              false
            );
            reader.readAsDataURL(file);
          })();
        }}
      />
      {showButton && (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (!uploading) {
              imageUploadRef?.current?.click();
            }
          }}
        >
          {uploading ? "Uploading..." : "Upload"}
        </a>
      )}
    </div>
  );
};
