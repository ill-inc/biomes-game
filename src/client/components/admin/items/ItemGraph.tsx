import { useMemo } from "react";

import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
} from "reactflow";

import { ItemGraphNode } from "@/client/components/admin/items/ItemGraphNode";
import {
  createGraphLayout2,
  useItemGraph,
} from "@/client/components/admin/items/helpers";
import { QuestGraphMinimapNode } from "@/client/components/admin/quests/QuestGraphMinimapNode";
import { useEffectAsync } from "@/client/util/hooks";
import React from "react";
import "reactflow/dist/style.css";

export const ItemGraph: React.FunctionComponent<{}> = ({}) => {
  const graph = useItemGraph();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffectAsync(async () => {
    const { nodes, edges } = await createGraphLayout2(graph);
    setNodes(nodes);
    setEdges(edges);
  }, [graph]);

  const nodeTypes = useMemo(() => ({ itemGraphNode: ItemGraphNode }), []);
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
    >
      <Controls />
      <MiniMap
        zoomable
        pannable
        nodeComponent={QuestGraphMinimapNode}
        maskColor="var(--cell-bg-dark)"
        maskStrokeColor="var(--white)"
        maskStrokeWidth={10}
        style={{
          background: "var(--cell-bg)",
          border: "1px solid var(--tertiary-gray)",
        }}
      />
      <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      {/*<QuestGraphList />*/}
    </ReactFlow>
  );
};
