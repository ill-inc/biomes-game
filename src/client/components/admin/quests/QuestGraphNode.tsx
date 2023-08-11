import challengesIcon from "/public/hud/default-challenge-icon.png";
import challengeHex from "/public/hud/challenge-hex-bg.png";
import challengeHexMask from "/public/hud/challenge-hex-mask.png";
import { useRouter } from "next/router";
import type { ReactFlowState } from "reactflow";
import { Handle, Position, useStore } from "reactflow";
import { useBikkieEditorContext } from "@/client/components/admin/bikkie/BikkieEditorContext";
import { useCallback } from "react";
import { AsyncButton } from "@/client/components/system/AsyncButton";
import type { QuestGraphNodeData } from "@/client/components/admin/quests/types";
import { ItemIcon } from "@/client/components/inventory/ItemIcon";

const zoomSelector = (s: ReactFlowState) => s.transform[2] >= 1;

export const QuestGraphNode: React.FunctionComponent<{
  data: QuestGraphNodeData;
}> = ({ data: quest }) => {
  const router = useRouter();
  const showAddButton = useStore(zoomSelector);
  const { newBiscuit } = useBikkieEditorContext();
  if (!quest) {
    return <></>;
  }
  const addQuestAfter = useCallback(async () => {
    await newBiscuit({
      attributes: {
        300: {
          kind: "constant",
          value: {
            kind: "all",
            triggers: [
              {
                kind: "challengeComplete",
                challenge: quest.id,
              },
            ],
          },
        },
      },
    });
  }, [quest.id]);

  return (
    <div
      className={`relative flex-col bg-cell-bg ${
        quest.graphData?.filtered ? "opacity-50" : ""
      }`}
    >
      <Handle type="target" position={Position.Left} isConnectable={true} />
      <div
        className={`challenge-icon`}
        onClick={() => void router.push(`/admin/quests/${quest.id}`)}
      >
        <img src={challengeHex.src} />
        <ItemIcon
          item={quest}
          defaultIcon={challengesIcon.src}
          className="challenge-hex-image"
          style={{
            maskImage: `url(${challengeHexMask.src})`,
            WebkitMaskImage: `url(${challengeHexMask.src})`,
          }}
        />
      </div>
      <div className="absolute">{quest.displayName}</div>
      <Handle type="source" position={Position.Right} isConnectable={true} />
      {showAddButton && (
        <div className="absolute -right-7 -top-1">
          <AsyncButton
            className="rounded-md border border-tertiary-gray p-0.6 shadow-cell-inset"
            onClick={addQuestAfter}
          >
            New Quest
          </AsyncButton>
        </div>
      )}
    </div>
  );
};
