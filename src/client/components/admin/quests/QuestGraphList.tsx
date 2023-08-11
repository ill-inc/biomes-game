import { Panel, useNodes, useReactFlow } from "reactflow";
import { GraphSearchContext } from "@/client/components/admin/quests/GraphSearchContext";
import { useContext } from "react";
import { useBikkieEditorContext } from "@/client/components/admin/bikkie/BikkieEditorContext";
import { AsyncButton } from "@/client/components/system/AsyncButton";
import type { QuestGraphNodeData } from "@/client/components/admin/quests/types";

export const QuestGraphList: React.FunctionComponent<{}> = ({}) => {
  const reactFlowInstance = useReactFlow();
  const nodes = useNodes<QuestGraphNodeData>();
  const { search, setSearch, showNonQuests, setShowNonQuests } =
    useContext(GraphSearchContext);
  const { newBiscuit } = useBikkieEditorContext();
  return (
    <Panel position="top-left">
      <div className="fixed h-3/4 overflow-scroll rounded-md border border-tertiary-gray bg-cell-bg p-1 shadow-cell-inset">
        <AsyncButton
          className="w-full rounded-md border border-tertiary-gray bg-dialog-bg-dark p-1 py-0.6 font-bold shadow-cell-inset"
          onClick={newBiscuit}
        >
          New Quest
        </AsyncButton>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex">
          <label>
            <input
              type="checkbox"
              checked={showNonQuests}
              onChange={(e) => setShowNonQuests(e.target.checked)}
            />
            Show Non Quests
          </label>
        </div>
        <ul>
          {nodes.map(
            (node) =>
              !node.data.graphData?.filtered !== false && (
                <li
                  key={node.data.id}
                  onClick={() => {
                    reactFlowInstance.setCenter(
                      node.position.x,
                      node.position.y,
                      {
                        duration: 300,
                        zoom: reactFlowInstance.getZoom(),
                      }
                    );
                  }}
                >
                  {node.data.displayName}
                </li>
              )
          )}
        </ul>
      </div>
    </Panel>
  );
};
