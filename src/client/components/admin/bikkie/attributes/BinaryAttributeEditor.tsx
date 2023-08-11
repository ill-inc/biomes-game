import { DialogTypeaheadInput } from "@/client/components/system/DialogTypeaheadInput";
import { useEffectAsyncFetcher } from "@/client/util/hooks";
import type { AnyBinaryAttribute } from "@/shared/bikkie/schema/binary";
import { getBinaryAttributeType } from "@/shared/bikkie/schema/binary";
import {
  fullPath,
  originStringForAsset,
  zMirroredAsset,
  type MirroredAsset,
} from "@/shared/drive/types";
import { zjsonPost } from "@/shared/util/fetch_helpers";
import { useMemo, useState } from "react";
import type { ZodType } from "zod";
import { z } from "zod";

const NULL_PATH = "/dev/null";

export const BinaryAttributeEditor: React.FunctionComponent<{
  attributeType: ZodType<AnyBinaryAttribute>;
  value: AnyBinaryAttribute;
  onChange: (value: AnyBinaryAttribute) => void;
}> = ({ attributeType, value, onChange }) => {
  const [assets, setAssets] = useState<MirroredAsset[]>([]);

  useEffectAsyncFetcher(
    async (signal) =>
      zjsonPost("/api/admin/bikkie/assets", z.void(), zMirroredAsset.array(), {
        signal,
      }),
    (assets) => {
      const type = getBinaryAttributeType(attributeType);
      if (type) {
        assets = assets.filter((a) => a.name.endsWith(type));
      }
      setAssets(assets.sort((a, b) => fullPath(a).localeCompare(fullPath(b))));
    },
    []
  );

  const match = useMemo(
    () =>
      assets.find((a) => originStringForAsset(a) === value.origin) ??
      assets.find((a) => a.mirrored.hash === value.hash),
    [assets, value]
  );

  const matchedPath = useMemo(
    () => (match ? fullPath(match) : value.origin),
    [match, value]
  );

  const options = useMemo(
    () => [
      NULL_PATH,
      ...assets.map((asset) => fullPath(asset)),
      // When there was no match, make the value.origin an option.
      ...(match ? [value.origin] : []),
    ],
    [assets, match, value]
  );

  return (
    <>
      <DialogTypeaheadInput
        value={matchedPath}
        options={options}
        getDisplayName={(e) => e ?? NULL_PATH}
        onChange={(newValue) => {
          if (!newValue || newValue === NULL_PATH) {
            onChange({ hash: "" });
          } else if (newValue !== value.origin) {
            const asset = assets.find((a) => fullPath(a) === newValue);
            if (asset) {
              onChange(asset.mirrored);
            }
          }
        }}
      />
      <p>Hash: {value.hash}</p>
    </>
  );
};
