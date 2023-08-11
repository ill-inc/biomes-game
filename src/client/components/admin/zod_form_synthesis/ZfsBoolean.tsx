import type * as z from "zod";

export const ZfsBoolean: React.FunctionComponent<{
  schema: z.ZodBoolean;
  value: boolean;
  onChangeRequest: (newValue: boolean) => void;
}> = ({ value, onChangeRequest }) => {
  return (
    <input
      type="checkbox"
      checked={value}
      onChange={() => {
        onChangeRequest(!value);
      }}
    />
  );
};
