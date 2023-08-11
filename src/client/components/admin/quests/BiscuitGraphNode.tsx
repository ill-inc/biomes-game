import { Handle, Position } from "reactflow";
import type { QuestGraphNodeData } from "@/client/components/admin/quests/types";
import { ItemIcon } from "@/client/components/inventory/ItemIcon";

export const BiscuitGraphNode: React.FunctionComponent<{
  data: QuestGraphNodeData;
}> = ({ data: biscuit }) => {
  if (!biscuit) {
    return <></>;
  }
  return (
    <div
      className={`relative flex-col bg-cell-bg ${
        biscuit.graphData?.filtered ? "opacity-50" : ""
      }`}
    >
      <Handle type="target" position={Position.Left} isConnectable={true} />
      <div className={`challenge-icon`}>
        <ItemIcon item={biscuit} />
      </div>
      <div className="absolute">{biscuit.displayName} (Biscuit)</div>
      <Handle type="source" position={Position.Right} isConnectable={true} />
    </div>
  );
};
