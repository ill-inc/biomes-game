import type { Biscuit } from "@/shared/bikkie/schema/attributes";

// Store some extra data along the biscuit for graph usage
export type QuestGraphNodeData = Biscuit & {
  graphData?: {
    filtered?: boolean;
  };
};
