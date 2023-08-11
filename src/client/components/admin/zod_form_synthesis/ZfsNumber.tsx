import type * as z from "zod";

export const ZfsNumber: React.FunctionComponent<{
  schema: z.ZodNumber;
  value: number;
  onChangeRequest: (newValue: number) => void;
}> = ({ value, onChangeRequest }) => {
  return (
    <input
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
