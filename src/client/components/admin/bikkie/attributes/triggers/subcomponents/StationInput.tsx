import { useMatchingBiscuits } from "@/client/components/admin/bikkie/search";
import type { BiomesId } from "@/shared/ids";
import { parseBiomesId } from "@/shared/ids";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";

export const StationInput = <
  TDef extends StoredTriggerDefinition & { station?: BiomesId }
>({
  def,
  onChange,
}: {
  def: TDef;
  onChange: (def: TDef) => void;
}) => {
  const stations = useMatchingBiscuits("/items/craftingStation");
  return (
    <select
      defaultValue={def.station || "null"}
      onChange={(e) => {
        onChange({
          ...def,
          station:
            e.target.value === "null"
              ? undefined
              : parseBiomesId(e.target.value),
        });
      }}
    >
      <option key="null" value="null">
        No Requirement
      </option>
      {stations.map((station) => (
        <option key={station.id} value={station.id}>
          {station.name}
        </option>
      ))}
    </select>
  );
};
