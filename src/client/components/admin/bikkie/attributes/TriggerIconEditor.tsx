import { AdminInlinePreviewImageUpload } from "@/client/components/admin/AdminInlinePreviewImageUpload";
import { BiscuitIdEditor } from "@/client/components/admin/bikkie/attributes/BiscuitIdEditor";
import { getTriggerIconUrl } from "@/client/components/inventory/icons";
import styles from "@/client/styles/admin.bikkie.module.css";
import { anItem } from "@/shared/game/item";
import type { TriggerIcon } from "@/shared/game/types";
import { INVALID_BIOMES_ID } from "@/shared/ids";

export const TriggerIconEditor: React.FunctionComponent<{
  value: TriggerIcon;
  onChange: (newIcon: TriggerIcon) => void;
}> = ({ value, onChange }) => {
  return (
    <div className={styles["step-icon-selector"]}>
      <AdminInlinePreviewImageUpload
        size="thumbnail"
        bucket="biomes-static"
        basePath="challenge-icons"
        showingPreview={getTriggerIconUrl(value)}
        onClear={() => onChange({ kind: "none" })}
        onUploadComplete={(locations) =>
          onChange({
            kind: "custom",
            bundle: locations,
          })
        }
      />
      <BiscuitIdEditor
        value={value.kind === "item" ? value.item.id : INVALID_BIOMES_ID}
        onChange={(newId) => {
          if (newId) {
            onChange({
              kind: "item",
              item: anItem(newId),
            });
          } else if (value.kind === "item") {
            onChange({ kind: "none" });
          }
        }}
      />
    </div>
  );
};
