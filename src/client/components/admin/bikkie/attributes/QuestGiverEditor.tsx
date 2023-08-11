import { EntityIdEditor } from "@/client/components/admin/bikkie/attributes/EntityIdEditor";
import type { BiomesId } from "@/shared/ids";

export const QuestGiverEditor: React.FunctionComponent<{
  value: BiomesId;
  onChange: (newValue: BiomesId) => void;
}> = ({ value, onChange }) => {
  return (
    <EntityIdEditor value={value} onChange={onChange} filter="quest_givers" />
  );
};
