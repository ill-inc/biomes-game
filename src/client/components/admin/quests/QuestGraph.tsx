import {
  useFullBiscuits,
  useMatchingBiscuits,
} from "@/client/components/admin/bikkie/search";
import { useEffect, useMemo, useState } from "react";

import * as d3 from "d3-hierarchy";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
} from "reactflow";

import { BiscuitGraphNode } from "@/client/components/admin/quests/BiscuitGraphNode";
import { GraphSearchContext } from "@/client/components/admin/quests/GraphSearchContext";
import { QuestGraphList } from "@/client/components/admin/quests/QuestGraphList";
import { QuestGraphMinimapNode } from "@/client/components/admin/quests/QuestGraphMinimapNode";
import { QuestGraphNode } from "@/client/components/admin/quests/QuestGraphNode";
import type { QuestGraphNodeData } from "@/client/components/admin/quests/types";
import type { Biscuit } from "@/shared/bikkie/schema/attributes";
import type { BiomesId } from "@/shared/ids";
import { computeDependencies } from "@/shared/triggers/challenge";
import { DefaultMap, compactMap } from "@/shared/util/collections";
import { compact, sortBy } from "lodash";
import React from "react";
import "reactflow/dist/style.css";

// Store some extra data along the biscuit for graph usage
export type QuestNode = Biscuit & {
  graphData?: {
    filtered?: boolean;
  };
};

// Fake root const to position all nodes at once
const FAKEROOT = "fakeRoot";

// D3 hierarchy tree to list for react flow nodes
function treeToList<T>(
  node: d3.HierarchyPointNode<T>
): d3.HierarchyPointNode<T>[] {
  return [node, ...(node.children?.flatMap(treeToList) ?? [])];
}

export const QuestGraph: React.FunctionComponent<{}> = ({}) => {
  const allQuestNames = useMatchingBiscuits("/quests");
  const questIds = useMemo(
    () => new Set(allQuestNames.map((q) => q.id)),
    [allQuestNames]
  );
  const unsavedQuests = useFullBiscuits(allQuestNames.map((q) => q.id));
  const questBiscuits = useMemo(
    () => unsavedQuests.map((b) => b.bake()),
    [unsavedQuests]
  );
  const deps = useMemo(
    () => computeDependencies(questBiscuits),
    [questBiscuits]
  );

  const otherBiscuitIds = useMemo(() => {
    const allQuestDeps = new Set(
      questBiscuits.flatMap((b) => deps.get(b.id) ?? [])
    );
    return [...allQuestDeps].filter((id) => !questIds.has(id));
  }, [questBiscuits, questIds, deps]);
  const unsavedOtherBiscuits = useFullBiscuits(otherBiscuitIds);
  const otherBiscuits = useMemo(
    () => unsavedOtherBiscuits.map((b) => b.bake()),
    [unsavedOtherBiscuits]
  );
  const [showNonQuests, setShowNonQuests] = useState(false);
  const biscuits = useMemo(
    () =>
      showNonQuests ? [...questBiscuits, ...otherBiscuits] : [...questBiscuits],
    [questBiscuits, otherBiscuits, showNonQuests]
  );
  const invalidBiscuitIds = useMemo(() => {
    const reqIds = [...questIds, ...otherBiscuitIds];
    const biscuitIds = new Set(biscuits.map((b) => b.id));
    return reqIds.filter((id) => !biscuitIds.has(id));
  }, [questIds, otherBiscuitIds, biscuits]);

  // Compute quest deps to bias tree structure into deepest node
  const questDepth = useMemo(() => {
    const depths: DefaultMap<BiomesId, number> = new DefaultMap((id) => {
      const curDeps = deps.get(id);
      if (!curDeps?.length) {
        return 0;
      }
      return 1 + Math.max(...curDeps.map((depId) => depths.get(depId)));
    });
    return depths;
  }, [questIds, deps]);

  // Group quests by root node to sort root node by # of children
  const questsByRoot = useMemo(() => {
    const nodeToRoots: DefaultMap<BiomesId, BiomesId[]> = new DefaultMap(
      (id) => {
        const curDeps = deps.get(id);
        if (!curDeps || curDeps.length === 0) {
          return [id];
        }
        return curDeps.flatMap((id) => nodeToRoots.get(id));
      }
    );
    const rootsToNodes: DefaultMap<BiomesId, BiomesId[]> = new DefaultMap(
      () => []
    );
    for (const biscuit of biscuits) {
      const id = biscuit.id;
      const roots = nodeToRoots.get(id);
      for (const root of roots) {
        rootsToNodes.get(root).push(id);
      }
    }
    return rootsToNodes;
  }, [deps, biscuits]);

  // TODO: handle updates to nodes and edges; save into bikkie maybe?
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Search filtering
  const [search, setSearch] = useState("");
  const filteredQuests = useMemo(
    () =>
      new Set(
        biscuits
          .filter(
            (b) =>
              b.name.toLowerCase().includes(search.toLowerCase()) ||
              b.displayName.toLowerCase().includes(search.toLowerCase())
          )
          .map((b) => b.id)
      ),
    [biscuits, search]
  );

  // If we have a search term, animate all the nodes upstream
  const animatedNodes = useMemo((): Set<BiomesId> => {
    if (search.length === 0) {
      return new Set();
    }
    // Source, target
    const upstreamNodes: DefaultMap<BiomesId, BiomesId[]> = new DefaultMap<
      BiomesId,
      BiomesId[]
    >((id) => {
      const curDeps = deps.get(id);
      if (!curDeps?.length) {
        return [id];
      }
      return [id, ...curDeps.flatMap((id) => upstreamNodes.get(id))];
    });

    return new Set([...filteredQuests].flatMap((id) => upstreamNodes.get(id)));
  }, [deps, filteredQuests, search]);

  // biscuits into d3 hierarchy nodes
  const entries = useMemo(() => {
    const root =
      biscuits.length > 0 &&
      d3
        .stratify()
        .id((data) => {
          const b = data as Biscuit;
          return `${b.id}`;
        })
        .parentId((data) => {
          const b = data as Biscuit | { id: typeof FAKEROOT };
          if (b.id === FAKEROOT) {
            return "";
          }
          const curDeps = deps.get(b.id);
          if (curDeps) {
            const validDeps = curDeps.filter(
              (id) => !invalidBiscuitIds.includes(id)
            );
            const deepestDep = sortBy(validDeps, (d) =>
              questDepth.get(d)
            ).reverse()[0];
            if (deepestDep) {
              return `${deepestDep}`;
            }
          }
          return FAKEROOT;
        })([...biscuits, { id: FAKEROOT }])
        .sort((a, b) => {
          const bisA = a.data as Biscuit;
          const bisB = b.data as Biscuit;
          // If these are both roots, then sort by # of children
          // so we see deeper trees at the top
          if (questsByRoot.has(bisA.id) && questsByRoot.has(bisB.id)) {
            return (
              questsByRoot.get(bisB.id)!.length -
              questsByRoot.get(bisA.id)!.length
            );
          }
          // Otherwise just do something stable
          return bisB.id - bisA.id;
        });
    const tree =
      root &&
      (d3.tree().size([7000, 2500])(root) as d3.HierarchyPointNode<Biscuit>);
    return tree ? treeToList(tree) : [];
  }, [biscuits]);

  // d3 hierarchy nodes into react flow nodes and edges
  const initialNodes = useMemo(() => {
    return compactMap(entries, (node) => {
      if (node.id === FAKEROOT) {
        return undefined;
      }
      // React flow is a bit loose with these node types, so enforce it here
      const data: QuestGraphNodeData = {
        ...node.data,
        graphData: {
          filtered: !filteredQuests.has(node.data.id),
        },
      };
      return {
        id: `${node.data.id}`,
        position: {
          y: node.x,
          x: node.y,
        },
        data,
        type: node.data.isQuest ? "questNode" : "biscuitNode",
      };
    });
  }, [entries, search]);

  const initialEdges = useMemo(() => {
    return compact(
      entries.flatMap((node) => {
        const parentId = node.parent?.id;
        // Primary link
        const edges = [];
        const primaryDep = parentId && parseInt(parentId);
        if (parentId && parentId !== "fakeRoot") {
          edges.push({
            id: `${parentId}-${node.data.id}`,
            source: `${parentId}`,
            target: `${node.data.id}`,
            style: { stroke: "#aaa", strokeWidth: 5 },
            animated:
              !!primaryDep &&
              animatedNodes.has(node.data.id) &&
              animatedNodes.has(primaryDep as BiomesId),
          });
        }
        // Secondary links
        for (const dep of deps.get(node.data.id) ?? []) {
          if (dep === primaryDep) {
            continue;
          }
          edges.push({
            id: `${dep}-${node.data.id}`,
            source: `${dep}`,
            target: `${node.data.id}`,
            style: { stroke: "#aaa", strokeWidth: 2 },
            animated: animatedNodes.has(node.data.id) && animatedNodes.has(dep),
          });
        }
        return edges;
      })
    );
  }, [entries, animatedNodes]);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  const nodeTypes = useMemo(
    () => ({ biscuitNode: BiscuitGraphNode, questNode: QuestGraphNode }),
    []
  );
  return (
    <GraphSearchContext.Provider
      value={{ search, setSearch, showNonQuests, setShowNonQuests }}
    >
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
        <QuestGraphList />
      </ReactFlow>
    </GraphSearchContext.Provider>
  );
};
