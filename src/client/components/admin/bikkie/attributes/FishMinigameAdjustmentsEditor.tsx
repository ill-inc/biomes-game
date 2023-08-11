import { Tooltipped } from "@/client/components/system/Tooltipped";
import styles from "@/client/styles/admin.bikkie.module.css";
import type { FishMinigameAdjustments } from "@/shared/bikkie/schema/types";

export const FishMinigameAdjustmentsEditor: React.FunctionComponent<{
  value: FishMinigameAdjustments;
  onChange: (value: FishMinigameAdjustments) => void;
}> = ({ value, onChange }) => {
  return (
    <div className={styles["complex-attribute"]}>
      <label>Catching Minigame</label>
      <div className={styles["compound-attribute"]}>
        <Tooltipped tooltip="Relative fish movement speed adjustment. Positive = move more, negative = move less">
          <label>Velocity</label>
          <input
            type="number"
            value={value.velocityOffset}
            placeholder="0"
            onChange={(e) => {
              onChange({
                ...value,
                velocityOffset:
                  e.target.value !== ""
                    ? parseFloat(e.target.value)
                    : undefined,
              });
            }}
          />
        </Tooltipped>
        <Tooltipped tooltip="Relative bar size adjustment. Positive = larger, negative = smaller">
          <label>Bar Size</label>
          <input
            type="number"
            value={value.barSizeOffset}
            placeholder="0"
            onChange={(e) => {
              onChange({
                ...value,
                barSizeOffset:
                  e.target.value !== ""
                    ? parseFloat(e.target.value)
                    : undefined,
              });
            }}
          />
        </Tooltipped>
        <Tooltipped tooltip="Relative bar fill speed, when fish is inside the correct zone. Positive = fills faster, negative = fills slower">
          <label>Bar Increase Speed</label>
          <>
            <input
              type="number"
              value={value.barFillIncreaseOffset}
              placeholder="0"
              onChange={(e) => {
                onChange({
                  ...value,
                  barFillIncreaseOffset:
                    e.target.value !== ""
                      ? parseFloat(e.target.value)
                      : undefined,
                });
              }}
            />
          </>
        </Tooltipped>
        <Tooltipped tooltip="Relative bar fill speed, when fish is outside the correct zone. Positive = decreases slower, negative = decreases faster">
          <label>Bar Decrease Speed</label>
          <>
            <input
              type="number"
              value={value.barFillDecreaseOffset}
              placeholder="0"
              onChange={(e) => {
                onChange({
                  ...value,
                  barFillDecreaseOffset:
                    e.target.value !== ""
                      ? parseFloat(e.target.value)
                      : undefined,
                });
              }}
            />
          </>
        </Tooltipped>
      </div>
      <label>Bite Minigame</label>
      <div className={styles["compound-attribute"]}>
        <Tooltipped tooltip="Relative bite time adjustment, in seconds. Positive = more time before fish bites,, negative = less time before fish bites">
          <label>Bite Time</label>
          <input
            type="number"
            value={value.biteTimeOffset}
            placeholder="0"
            onChange={(e) => {
              onChange({
                ...value,
                biteTimeOffset:
                  e.target.value !== ""
                    ? parseFloat(e.target.value)
                    : undefined,
              });
            }}
          />
        </Tooltipped>
        <Tooltipped tooltip="Relative bite duration adjustment, in seconds. Positive = more time for player to click, negative = less time for player to click">
          <label>Bite Duration</label>
          <input
            type="number"
            value={value.biteDurationOffset}
            placeholder="0"
            onChange={(e) => {
              onChange({
                ...value,
                biteDurationOffset:
                  e.target.value !== ""
                    ? parseFloat(e.target.value)
                    : undefined,
              });
            }}
          />
        </Tooltipped>
      </div>
    </div>
  );
};
