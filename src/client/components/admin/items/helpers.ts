import {
  useFullBiscuits,
  useMatchingBiscuits,
} from "@/client/components/admin/bikkie/search";
import type { Biscuit } from "@/shared/bikkie/schema/attributes";
import type { DropTable } from "@/shared/game/item_specs";
import type { BiomesId } from "@/shared/ids";
import { visitTrigger } from "@/shared/triggers/challenge";
import { MultiMap } from "@/shared/util/collections";
import type { ElkExtendedEdge, ElkNode } from "elkjs";
import Elk from "elkjs";
import { useMemo } from "react";

export interface BikkieDepNode {
  id: BiomesId;
  biscuit: Biscuit;
}

export interface BikkieDepEdge {
  kind:
    | "recipe_makes"
    | "recipe_takes"
    | "blueprint_makes"
    | "unlocks"
    | "rewards"
    | "drops"
    | "grows";
  from: BiomesId;
  to: BiomesId;
}

export type BikkieDepEdgeKind = BikkieDepEdge["kind"];

export class BikkieDepGraph {
  nodeMap: Map<BiomesId, BikkieDepNode> = new Map();
  outEdges: MultiMap<BiomesId, BikkieDepEdge> = new MultiMap();
  inEdges: MultiMap<BiomesId, BikkieDepEdge> = new MultiMap();
  edgeKinds: Set<BikkieDepEdge["kind"]> = new Set();

  nodes() {
    return [...this.nodeMap.values()];
  }

  inbound(id: BiomesId) {
    return this.inEdges.get(id);
  }

  outbound(id: BiomesId) {
    return this.outEdges.get(id);
  }

  allEdges() {
    const ret = [];
    for (const [_, dests] of this.outEdges) {
      for (const d of dests) {
        ret.push(d);
      }
    }

    return ret;
  }

  purgeUnreachable() {
    const toDelete: BiomesId[] = [];
    for (const node of this.nodeMap) {
      if (
        this.outEdges.get(node[0]).length === 0 &&
        this.inEdges.get(node[0]).length === 0
      ) {
        toDelete.push(node[0]);
      }
    }

    for (const id of toDelete) {
      this.nodeMap.delete(id);
    }
  }

  addNode(...nodes: BikkieDepNode[]) {
    for (const node of nodes) {
      this.nodeMap.set(node.id, node);
    }
  }

  addEdge(edge: BikkieDepEdge) {
    this.outEdges.add(edge.from, edge);
    this.inEdges.add(edge.to, edge);
    this.edgeKinds.add(edge.kind);
  }

  subgraphOfEdgeKinds(kinds: BikkieDepEdge["kind"][]) {
    const ret = new BikkieDepGraph();
    ret.addNode(...this.nodeMap.values());
    for (const [_, dests] of this.outEdges) {
      for (const dest of dests) {
        if (kinds.includes(dest.kind)) {
          ret.addEdge(dest);
        }
      }
    }

    ret.purgeUnreachable();
    return ret;
  }
}

function addDropTableWithKind(
  ret: BikkieDepGraph,
  fromId: BiomesId,
  dropTable: DropTable,
  kind: BikkieDepEdgeKind
) {
  for (const [_, dropList] of dropTable) {
    for (const [dropId] of dropList) {
      ret.addEdge({
        kind,
        from: fromId,
        to: dropId,
      });
    }
  }
}

export function computeBikkieDepGraph(allBiscuits: Biscuit[]) {
  const ret = new BikkieDepGraph();
  ret.addNode(
    ...allBiscuits.map((e) => {
      return {
        id: e.id,
        biscuit: e,
      };
    })
  );

  for (const biscuit of allBiscuits) {
    if (biscuit.isRecipe) {
      biscuit.output?.forEach(([itemId]) => {
        ret.addEdge({
          kind: "recipe_makes",
          from: biscuit.id,
          to: itemId,
        });
      });

      if (biscuit.craftWith) {
        for (const craftWithId of biscuit.craftWith) {
          ret.addEdge({
            kind: "recipe_takes",
            from: craftWithId,
            to: biscuit.id,
          });
        }
      }

      visitTrigger(biscuit.unlock, (e) => {
        switch (e.kind) {
          case "craft":
          case "collect":
          case "everCraft":
          case "everCollect":
            ret.addEdge({
              kind: "unlocks",
              from: e.item.id,
              to: biscuit.id,
            });
            break;

          case "blueprintBuilt":
            ret.addEdge({
              kind: "unlocks",
              from: e.blueprint,
              to: biscuit.id,
            });
            break;
        }
      });
    }
    if (biscuit.turnsInto) {
      ret.addEdge({
        kind: "blueprint_makes",
        from: biscuit.id,
        to: biscuit.turnsInto,
      });
    }

    if (biscuit.drop) {
      addDropTableWithKind(ret, biscuit.id, biscuit.drop, "drops");
    }

    if (biscuit.seedDrop) {
      addDropTableWithKind(ret, biscuit.id, biscuit.seedDrop, "drops");
    }

    if (biscuit.preferredDrop) {
      addDropTableWithKind(ret, biscuit.id, biscuit.preferredDrop, "drops");
    }

    if (biscuit.muckDrop) {
      addDropTableWithKind(ret, biscuit.id, biscuit.muckDrop, "drops");
    }

    if (biscuit.muckPreferredDrop) {
      addDropTableWithKind(ret, biscuit.id, biscuit.muckPreferredDrop, "drops");
    }

    if (biscuit.treasureChestDrop) {
      addDropTableWithKind(ret, biscuit.id, biscuit.treasureChestDrop, "drops");
    }

    if (biscuit.farming) {
      if (biscuit.farming.kind === "basic") {
        if (biscuit.farming.partialGrowthDropTable) {
          addDropTableWithKind(
            ret,
            biscuit.id,
            biscuit.farming.partialGrowthDropTable,
            "grows"
          );
        }
        if (biscuit.farming.dropTable) {
          addDropTableWithKind(
            ret,
            biscuit.id,
            biscuit.farming.dropTable,
            "grows"
          );
        }

        if (biscuit.farming.seedDropTable) {
          addDropTableWithKind(
            ret,
            biscuit.id,
            biscuit.farming.seedDropTable,
            "grows"
          );
        }
      }
    }

    if (biscuit.isQuest) {
      visitTrigger(biscuit.trigger, (e) => {
        if (e.kind === "challengeClaimRewards") {
          e.rewardsList?.forEach((l) => {
            l.forEach((item) => {
              ret.addEdge({
                kind: "rewards",
                from: biscuit.id,
                to: item.item.id,
              });
            });
          });
        }
      });
    }
  }

  return ret;
}

export function useItemGraph(purgeUnreachable: boolean = true) {
  const allBiscuits = useMatchingBiscuits("/");

  const unsaved = useFullBiscuits(allBiscuits.map((q) => q.id));
  const rawBiscuits = useMemo(() => unsaved.map((b) => b.bake()), [unsaved]);

  const graph = useMemo(() => {
    const ret = computeBikkieDepGraph(rawBiscuits);
    if (purgeUnreachable) {
      ret.purgeUnreachable();
    }
    return ret;
  }, [rawBiscuits]);

  return graph;
}

export async function createGraphLayout2(depGraph: BikkieDepGraph) {
  const elk = new Elk({
    defaultLayoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.alignment": "CENTER",
      "elk.spacing.nodeNode": "80",
      "elk.aspectRatio": String(1.6),
      "elk.layered.spacing.nodeNodeBetweenLayers": "80",
      "nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk​.layered​.nodePlacement​.favorStraightEdges": "true",
    },
  });
  const nodes: Array<
    ElkNode & {
      position: { x: number; y: number };
      data: {
        biscuit: Biscuit;
      };
      type: string;
    }
  > = [];
  const edges: (ElkExtendedEdge & {
    source: string;
    target: string;
  })[] = [];

  depGraph.nodes().forEach((el) => {
    nodes.push({
      id: String(el.id),
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      position: {
        x: 0,
        y: 0,
      },
      data: {
        biscuit: el.biscuit,
      },
      type: "itemGraphNode",
    } as any);
  });

  const seenEdges = new Set<string>();

  depGraph.allEdges().forEach((el) => {
    const simplEdge = `${el.from}-${el.to}`;
    if (!seenEdges.has(simplEdge) && el.from !== el.to) {
      edges.push({
        ...el,
        id: simplEdge,
        source: String(el.from),
        target: String(el.to),
        sources: [String(el.from)],
        targets: [String(el.to)],
      });
    }
    seenEdges.add(simplEdge);
  });

  const newGraph = await elk.layout(
    {
      id: "root",
      children: nodes,
      edges: edges,
    },
    {
      logging: true,
    }
  );

  nodes?.forEach((el) => {
    const node = newGraph?.children?.find((n) => n.id === el.id);
    if (node?.x && node?.y && node?.width && node?.height) {
      el.position = {
        x: node.x - node.width / 2 + Math.random() / 1000,
        y: node.y - node.height / 2,
      };
    }
  });
  return { nodes, edges };
}

const DEFAULT_WIDTH = 64;
const DEFAULT_HEIGHT = 64;
