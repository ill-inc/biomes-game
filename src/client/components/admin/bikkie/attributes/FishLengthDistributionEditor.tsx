import { prettyFishLength } from "@/client/components/chat/CatchMessageView";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import { truncatedGaussianForFishDistribution } from "@/client/game/util/fishing/params";
import styles from "@/client/styles/admin.bikkie.module.css";
import type { FishLengthDistribution } from "@/shared/bikkie/schema/types";
import { useCallback } from "react";

export const FishLengthDistributionEditor: React.FunctionComponent<{
  distribution: FishLengthDistribution;
  onChange: (distribution: FishLengthDistribution) => void;
}> = ({ distribution, onChange }) => {
  const variance = truncatedGaussianForFishDistribution(distribution).variance;
  const imperialString = useCallback((meters: number) => {
    const imperial = meters > 0 ? prettyFishLength(meters) : "0";
    return `(Imperial: ${imperial})`;
  }, []);
  const stdDev = Math.sqrt(variance);
  return (
    <div className={styles["complex-attribute"]}>
      <div className={styles["compound-attribute"]}>
        <Tooltipped tooltip="The mean length of the fish, in meters.">
          <label>Mean</label>
          <input
            type="number"
            value={distribution.mean}
            onChange={(e) => {
              onChange({ ...distribution, mean: parseFloat(e.target.value) });
            }}
          />
          <span>{imperialString(distribution.mean)}</span>
        </Tooltipped>
        <Tooltipped tooltip="The minimum length of the fish, in meters.">
          <label>Min</label>
          <input
            type="number"
            value={distribution.min}
            onChange={(e) => {
              onChange({
                ...distribution,
                min: parseFloat(e.target.value),
              });
            }}
          />
          <span>{imperialString(distribution.min)}</span>
        </Tooltipped>
        <Tooltipped tooltip="(Optional) variance of fish from the mean, in meters.">
          <label>Variance</label>
          <>
            <input
              type="number"
              value={distribution.variance}
              placeholder={`${variance}`}
              onChange={(e) => {
                const variance =
                  e.target.value !== ""
                    ? parseFloat(e.target.value)
                    : undefined;
                onChange({
                  ...distribution,
                  variance,
                });
              }}
            />
            <span>{imperialString(variance)}</span>
          </>
        </Tooltipped>
      </div>
      <div className={styles["footnote"]}>
        64.8% of fish will be between{" "}
        {prettyFishLength(
          Math.max(distribution.min, distribution.mean - stdDev)
        )}{" "}
        and {prettyFishLength(distribution.mean + stdDev)}.
      </div>
      <div className={styles["footnote"]}>
        92% of fish will be between{" "}
        {prettyFishLength(
          Math.max(distribution.min, distribution.mean - stdDev * 2)
        )}{" "}
        and {prettyFishLength(distribution.mean + stdDev * 2)}.
      </div>
    </div>
  );
};
