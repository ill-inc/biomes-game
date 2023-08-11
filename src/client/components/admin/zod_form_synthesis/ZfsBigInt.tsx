import type * as z from "zod";

export const ZfsBigInt: React.FunctionComponent<{
  schema: z.ZodBigInt;
  value: bigint;
  onChangeRequest: (newValue: bigint) => void;
}> = ({ value, onChangeRequest }) => {
  return (
    <input
      type="number"
      value={String(value)}
      onChange={(e) => {
        e.preventDefault();
        if (e.target.value !== "") {
          onChangeRequest(BigInt(e.target.value));
        }
      }}
    />
  );
};
