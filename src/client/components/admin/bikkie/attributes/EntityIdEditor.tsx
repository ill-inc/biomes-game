import { DialogTypeaheadInput } from "@/client/components/system/DialogTypeaheadInput";
import styles from "@/client/styles/admin.bikkie.module.css";
import { useEffectAsyncFetcher } from "@/client/util/hooks";
import type { AdminAskRequest, NamedEntity } from "@/pages/api/admin/ecs/ask";
import type { ScanAllRequest } from "@/server/ask/api";
import { zEntity } from "@/shared/ecs/zod";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID, parseBiomesId } from "@/shared/ids";
import { jsonPost, zjsonPost } from "@/shared/util/fetch_helpers";
import { compact } from "lodash";
import { useEffect, useMemo, useState } from "react";

const UNKNOWN_NAME = "Unknown";

export const EntityIdEditor: React.FunctionComponent<{
  value: BiomesId;
  onChange: (value: BiomesId) => void;
  filter: ScanAllRequest;
  includeUnnamed?: boolean;
}> = ({ filter, value, onChange, includeUnnamed }) => {
  const [loading, setLoading] = useState(false);
  const [possible, setPossible] = useState<NamedEntity[]>([]);
  const [name, setName] = useState("");
  const [manual, setManual] = useState(false);

  useEffectAsyncFetcher(
    async (signal) => {
      setLoading(true);
      try {
        const results = await jsonPost<NamedEntity[], AdminAskRequest>(
          "/api/admin/ecs/ask",
          { filter, namedOnly: !includeUnnamed },
          { signal }
        );
        results.sort(({ name: a }, { name: b }) => a.localeCompare(b));
        return results;
      } finally {
        setLoading(false);
      }
    },
    setPossible,
    [filter, includeUnnamed]
  );

  const notInSet = useMemo(
    () => value && !possible.some((item) => item.id === value),
    [possible, value]
  );

  useEffect(() => {
    if (!value) {
      setName("-");
      return;
    }
    if (!notInSet) {
      setName(possible.find((item) => item.id === value)!.name);
      return;
    }
    const controller = new AbortController();
    zjsonPost("/api/admin/ecs/get", [value], zEntity.array(), {
      signal: controller.signal,
    })
      .then((wrapped) => {
        setName(
          (wrapped.length > 0 && wrapped[0].entity.label?.text) || UNKNOWN_NAME
        );
      })
      .catch(() => {
        setName(UNKNOWN_NAME);
      });
    return () => controller.abort();
  }, [notInSet, value]);

  if (manual) {
    return (
      <div className={styles["compound-attribute"]}>
        <button onClick={() => setManual(false)}>DropDown</button>
        <input
          disabled={loading}
          type="text"
          value={value}
          onChange={(e) => onChange(parseBiomesId(e.target.value))}
        />
        <div>{name}</div>
      </div>
    );
  } else {
    const specialManual = notInSet ? `Manually entered: ${value}` : undefined;
    return (
      <DialogTypeaheadInput
        disabled={loading}
        options={possible}
        value={notInSet ? specialManual : possible.find((e) => e.id === value)}
        specialValues={compact(["manual", specialManual])}
        nullable
        nullName="None"
        onChange={(e) => {
          if (e === "manual") {
            setManual(true);
            return;
          } else if (e === undefined) {
            onChange(INVALID_BIOMES_ID);
          } else if (specialManual && e === specialManual) {
            onChange(value);
          } else {
            onChange((e as NamedEntity).id);
          }
        }}
        getDisplayName={(e) => {
          if (typeof e === "string") {
            return e;
          } else {
            return e.name;
          }
        }}
      />
    );
  }
};
