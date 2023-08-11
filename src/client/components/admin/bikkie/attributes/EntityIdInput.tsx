import styles from "@/client/styles/admin.bikkie.module.css";
import type { Entity } from "@/shared/ecs/gen/entities";
import { zEntity } from "@/shared/ecs/zod";
import type { BiomesId } from "@/shared/ids";
import { parseBiomesId } from "@/shared/ids";
import { zjsonPost } from "@/shared/util/fetch_helpers";
import { throttle } from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";
import spinnerIcon from "/public/hud/spinner.gif";
import failedIcon from "/public/hud/status-failed.png";
import successIcon from "/public/hud/status-success.png";

export const EntityIdInput: React.FunctionComponent<{
  value: BiomesId;
  onChange: (value: BiomesId) => void;
}> = ({ value, onChange }) => {
  const [loading, setLoading] = useState(false);
  const [match, setMatch] = useState<Entity | undefined>(undefined);
  const [localValue, setLocalValue] = useState(value);

  const throttledMatch = useCallback(
    throttle((value: BiomesId, fn: (match: Entity | undefined) => void) => {
      void (async () => {
        try {
          const wrapped = await zjsonPost(
            "/api/admin/ecs/get",
            [value],
            zEntity.array()
          );
          fn(wrapped[0]?.entity);
        } catch (e) {
          fn(undefined);
        }
      })();
    }, 1000),
    []
  );

  useEffect(() => {
    let needsUpdate = true;
    setLoading(true);
    throttledMatch(localValue, (match) => {
      if (needsUpdate) {
        setMatch(match);
        setLoading(false);
        if (value !== localValue) {
          onChange(localValue);
        }
      }
    });
    return () => {
      needsUpdate = false;
    };
  }, [localValue, throttledMatch, onChange]);

  const name = useMemo(() => {
    if (!match) {
      return "...";
    }
    return match.label?.text ?? match.id;
  }, [match]);

  return (
    <div className={styles["compound-attribute"]}>
      <input
        type="number"
        onChange={(e) => {
          setLocalValue(parseBiomesId(e.target.value));
        }}
        value={localValue}
      />
      <img
        src={
          loading ? spinnerIcon.src : match ? successIcon.src : failedIcon.src
        }
        className={styles["attribute-loading"]}
      />
      <div>{name}</div>
    </div>
  );
};
