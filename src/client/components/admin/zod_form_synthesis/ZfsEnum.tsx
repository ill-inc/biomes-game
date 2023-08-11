import type * as z from "zod";

export const ZfsEnum: React.FunctionComponent<{
  schema: z.ZodEnum<[string, ...string[]]>;
  value: string;
  onChangeRequest: (newValue: string) => void;
}> = ({ schema, value, onChangeRequest }) => {
  return (
    <select
      onChange={(e) => {
        e.preventDefault();
        onChangeRequest(e.target.value);
      }}
      value={value}
    >
      {schema.options.map((x) => (
        <option key={x} value={x}>
          {x}
        </option>
      ))}
    </select>
  );
};
