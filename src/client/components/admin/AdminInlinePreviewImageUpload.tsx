import { AdminInlineImageUpload } from "@/client/components/admin/AdminInlineImageUpload";
import { Img } from "@/client/components/system/Img";
import styles from "@/client/styles/admin.system.module.css";
import type {
  BucketedImageCloudBundle,
  CloudBucketKey,
} from "@/shared/url_types";
import React from "react";

export const AdminInlinePreviewImageUpload: React.FunctionComponent<{
  basePath?: string;
  bucket: CloudBucketKey;
  showingPreview?: string;
  onUploadComplete: (bundle: BucketedImageCloudBundle) => unknown;
  onClear?: () => unknown;
  size: "thumbnail";
}> = ({ basePath, bucket, onUploadComplete, onClear, showingPreview }) => {
  const imageUploadRef = React.useRef<HTMLInputElement | null>(null);
  return (
    <div className={styles["image-uploader"]}>
      <div
        className={`${styles["image-wrapper"]} ${styles["thumbnail"]}`}
        onClick={() => {
          imageUploadRef.current?.click();
        }}
      >
        {onClear && showingPreview && (
          <div
            className={styles["clear"]}
            onClick={(evt) => {
              evt.stopPropagation();
              onClear?.();
            }}
          >
            X
          </div>
        )}
        {showingPreview && <Img src={showingPreview} />}
      </div>
      <AdminInlineImageUpload
        bucket={bucket}
        basePath={basePath}
        onUploadComplete={onUploadComplete}
        imageUploadRef={imageUploadRef}
        showButton={false}
      />
    </div>
  );
};
