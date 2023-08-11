import React, { useEffect } from "react";
import styles from "@/client/styles/admin.bikkie.module.css";

type TimeUnit =
  | "milliseconds"
  | "seconds"
  | "minutes"
  | "hours"
  | "days"
  | "weeks";
const timeDurations = new Map<TimeUnit, number>([
  ["milliseconds", 1],
  ["seconds", 1000],
  ["minutes", 60 * 1000],
  ["hours", 60 * 60 * 1000],
  ["days", 24 * 60 * 60 * 1000],
  ["weeks", 7 * 24 * 60 * 60 * 1000],
]);

export const DurationEditor: React.FunctionComponent<{
  timeMs?: number;
  onChange: (timeMs: number) => void;
}> = ({ timeMs, onChange }) => {
  const [timeUnit, setTimeUnit] = React.useState<TimeUnit | undefined>();
  useEffect(() => {
    // Determine a suitable default
    if (timeUnit === undefined) {
      const sortedTimeDurations = [...timeDurations.entries()].sort(
        ([, a], [, b]) => b - a
      );
      for (const [name, ms] of sortedTimeDurations) {
        if ((timeMs ?? 0) / ms >= 1) {
          setTimeUnit(name);
          return;
        }
      }
      setTimeUnit("milliseconds");
    }
  }, [timeUnit]);
  const timeDuration = (timeUnit && timeDurations.get(timeUnit)) ?? 1;
  return (
    <div className={styles["compound-attribute"]}>
      <input
        type="number"
        value={(timeMs ?? 0) / timeDuration}
        onChange={(e) => {
          const newTimeInUnit = parseFloat(e.target.value);
          const newTime = newTimeInUnit * (timeDuration ?? 1);
          onChange(newTime ?? 0);
        }}
      />
      <select
        onChange={(e) => {
          setTimeUnit(e.target.value as TimeUnit);
        }}
      >
        {[...timeDurations.keys()].map((name) => (
          <option value={name} selected={timeUnit === name} key={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
};
