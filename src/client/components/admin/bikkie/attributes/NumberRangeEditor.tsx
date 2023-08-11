import { getNumberRange } from "@/shared/bikkie/schema/types";
import type * as z from "zod";

export const NumberRangeEditor: React.FunctionComponent<{
  schema: z.ZodNumber;
  value: number;
  onChangeRequest: (newValue: number) => void;
}> = ({ schema, value, onChangeRequest }) => {
  const numberRange = getNumberRange(schema);
  return (
    <input
      min={numberRange.min}
      max={numberRange.max}
      step={numberRange.step}
      className={
        numberRange.step && value % numberRange.step !== 0
          ? "invalid"
          : undefined
      }
      type="number"
      value={value}
      onChange={(e) => {
        e.preventDefault();
        if (e.target.value !== "") {
          onChangeRequest(parseFloat(e.target.value));
        }
      }}
    />
  );
};
