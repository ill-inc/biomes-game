import type * as z from "zod";

export const ZfsString: React.FunctionComponent<{
  schema: z.ZodString;
  value: string;
  onChangeRequest: (newValue: string) => void;
}> = ({ value, onChangeRequest }) => {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => {
        e.preventDefault();
        onChangeRequest(e.target.value);
      }}
    />
  );
};
