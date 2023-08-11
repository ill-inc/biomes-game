import type { ItemGraphNodeData } from "@/client/components/admin/items/types";
import { iconUrl } from "@/client/components/inventory/icons";
import { useRouter } from "next/router";
import { Handle, Position } from "reactflow";
import challengeHex from "/public/hud/challenge-hex-bg.png";
import challengeHexMask from "/public/hud/challenge-hex-mask.png";

export const ItemGraphNode: React.FunctionComponent<{
  data: ItemGraphNodeData;
}> = ({ data }) => {
  const router = useRouter();
  const challengeIconUrl = iconUrl(data.biscuit);

  if (!data.biscuit) {
    return <></>;
  }
  return (
    <div className={`relative flex-col bg-cell-bg`}>
      <Handle type="target" position={Position.Left} isConnectable={true} />
      <div
        className={`challenge-icon`}
        onClick={() => void router.push(`/admin/bikkie/${data.biscuit.id}`)}
      >
        <img src={challengeHex.src} />
        <img
          className="challenge-hex-image"
          style={{
            maskImage: `url(${challengeHexMask.src})`,
            WebkitMaskImage: `url(${challengeHexMask.src})`,
          }}
          src={challengeIconUrl}
        />
      </div>
      <div className="absolute">
        {data.biscuit.displayName}
        {data.biscuit.isRecipe ? "(recipe)" : ""}
      </div>
      <Handle type="source" position={Position.Right} isConnectable={true} />
    </div>
  );
};
