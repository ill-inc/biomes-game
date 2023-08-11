import { shapeIDs } from "@/galois/assets/shapes";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { toShapeId } from "@/shared/game/ids";
import type {
  BlockResourceDeps,
  BlockResources,
} from "@/shared/game/resources/blocks";
import { voxelShard } from "@/shared/game/shard";
import { getTerrainIdAndIsomorphismAtPosition } from "@/shared/game/terrain_helper";
import { add, dist, equals } from "@/shared/math/linear";
import type { ReadonlyVec3, Vec3 } from "@/shared/math/types";
import { zVec3f } from "@/shared/math/types";
import FastPriorityQueue from "fastpriorityqueue";
import { z } from "zod";

const zNode = z.object({
  position: zVec3f,
});
export type Node = z.infer<typeof zNode>;

const zPath = z.object({
  nodes: z.array(zNode),
});
export type Path = z.infer<typeof zPath>;

export const zPathfindingComponent = z.object({
  // Time in seconds the NPC has been within a certain distance to {position}.
  searchTime: z.number(),
  path: zPath,
  // The NPCs position at some point during pathfinding. The distance from
  // this point is used to determine if the NPC is stuck.
  position: zVec3f,
});

const MIN_UPDATE_POSITION_DISTANCE = 3.0;
const STUCK_DURATION = 8.0;

export type PathfindingComponent = z.infer<typeof zPathfindingComponent>;

function isBetweenNodes(position: ReadonlyVec3, a: Node, b: Node): boolean {
  const BUFFER = 1.1;
  for (let i = 0; i < 3; ++i) {
    const total = Math.abs(a.position[i] - b.position[i]);
    const distA = Math.abs(a.position[i] - position[i]);
    const distB = Math.abs(b.position[i] - position[i]);

    if (distA > total + BUFFER || distB > total + BUFFER) {
      return false;
    }
  }

  return true;
}

// Given a current position and a path return the next position that the NPC should travel towards
// to continue following the path.
export function findNextTargetOnPath(
  position: ReadonlyVec3,
  path: Path
): Vec3 | undefined {
  // We iterate backwards so that the lastest target, is multiple satisfy inBetweenNodes,
  // is taken.
  for (let i = path.nodes.length - 1; i > 0; --i) {
    const a = path.nodes[i];
    const b = path.nodes[i - 1];

    if (isBetweenNodes(position, a, b)) {
      return add(a.position, [0.5, 0.5, 0.5]);
    }
  }
}

export interface Edge {
  weight: number;
}

export interface Graph {
  neighbors: (node: Node, resources: BlockResources) => [Edge, Node][];
  closestNode: (src: ReadonlyVec3) => Node | undefined;
}

export class GraphImpl implements Graph {
  private adj: Map<string, [Edge, Node][]>;

  constructor() {
    this.adj = new Map();
  }

  canOccupyBlock(position: Vec3, resources: BlockResources): boolean {
    return resources
      .get("/terrain/pathfinding/human_can_occupy", voxelShard(...position))
      .check(position);
  }

  movementOffsets(onFullBlock: boolean): Vec3[] {
    const offsets: Vec3[] = [];
    const options = [-1, 0, 1];

    for (const x of options) {
      for (const y of options) {
        if (!onFullBlock && y === 1) {
          // NPCs can only climb 1 block so if they are not standing on a full block they
          // will not be able to climb 1 block upwards.
          continue;
        }
        for (const z of options) {
          if (x !== 0 && z !== 0) {
            // No diagonals
            continue;
          }
          if (x === 0 && z === 0) {
            // No vertical jumps
            continue;
          }
          offsets.push([x, y, z]);
        }
      }
    }

    return offsets;
  }

  neighbors(node: Node, resources: BlockResources): [Edge, Node][] {
    const key = node.position.toString();
    if (this.adj.get(key)) {
      return this.adj.get(key)!;
    }

    const edges: [Edge, Node][] = [];
    const onFullBlock = isFullHeightBlockAtPosition(
      resources,
      add(node.position, [0, -1, 0])
    );
    const offsets = this.movementOffsets(onFullBlock);
    for (const offset of offsets) {
      const offsetPos = add(offset, node.position);
      if (this.canOccupyBlock(offsetPos, resources)) {
        const adjNode: Node = { position: offsetPos };
        let weight = 1;
        if (offset[1] !== 0) {
          weight = 3;
        }
        edges.push([{ weight }, adjNode]);
      }
    }
    this.adj.set(key, edges);
    return edges;
  }

  closestNode(pos: ReadonlyVec3): Node | undefined {
    return {
      position: [Math.round(pos[0]), Math.round(pos[1]), Math.round(pos[2])],
    };
  }
}

// Performs pathfinding. The idea is that if we want to change the pathfinding algorithm all we
// need to do is reimplement the Pathfinder for a different class.
abstract class Pathfinder {
  abstract findPath(): Path | undefined;
}

export class AStarPathfinder extends Pathfinder {
  private openSetNodes: Set<string>;
  private openSet: FastPriorityQueue<[Node, number]>;
  private closedSet: Set<string>;
  private costs: Map<string, number>;
  private parents: Map<string, Node | undefined>;

  constructor(
    private graph: Graph,
    private src: Node,
    private dest: Node,
    private resources: BlockResources
  ) {
    super();
    this.openSet = new FastPriorityQueue((a, b) => a[1] < b[1]); // MinPriorityQueue
    this.openSetNodes = new Set();
    this.closedSet = new Set();
    this.costs = new Map();
    this.parents = new Map();

    this.setCost(this.src, 0);
    this.addToOpenSet(this.src);
  }

  nodeToKey(node: Node): string {
    return node.position.toString();
  }

  parent(node: Node): Node | undefined {
    return this.parents.get(this.nodeToKey(node));
  }

  setParent(node: Node, parent: Node) {
    this.parents.set(this.nodeToKey(node), parent);
  }

  cost(node: Node): number | undefined {
    return this.costs.get(this.nodeToKey(node));
  }

  setCost(node: Node, cost: number) {
    this.costs.set(this.nodeToKey(node), cost);
  }

  inClosedSet(node: Node): boolean {
    return this.closedSet.has(this.nodeToKey(node));
  }

  inOpenSet(node: Node): boolean {
    return this.openSetNodes.has(this.nodeToKey(node));
  }

  addToClosedSet(node: Node) {
    this.closedSet.add(this.nodeToKey(node));
  }

  addToOpenSet(node: Node) {
    this.openSetNodes.add(this.nodeToKey(node));
    this.openSet.add([node, this.totalCost(node)]);
  }

  totalCost(node: Node): number {
    return (this.cost(node) ?? Infinity) + this.heuristic(node);
  }

  findNextNode(): Node {
    return this.openSet.poll()![0];
  }

  step(current: Node) {
    this.addToClosedSet(current);

    const neighbors = this.graph.neighbors(current, this.resources);
    for (const [edge, neighbor] of neighbors) {
      if (this.inClosedSet(neighbor)) {
        continue;
      }

      const cost = this.cost(current)! + edge.weight;
      const hasNeighbour = this.inOpenSet(neighbor);
      if (!hasNeighbour || cost < this.cost(neighbor)!) {
        this.setCost(neighbor, cost);
        this.setParent(neighbor, current);
        this.addToOpenSet(neighbor);
      }
    }

    return false;
  }

  findPath(): Path | undefined {
    while (this.closedSet.size < 2000) {
      if (this.openSet.size === 0) {
        break;
      }

      const candidate = this.findNextNode();
      if (equals(candidate.position, this.dest.position)) {
        break;
      }

      this.step(candidate);
    }

    return this.constructPath();
  }

  // Euclidean distance heuristic.
  private heuristic(node: Node): number {
    return dist(node.position, this.dest.position);
  }

  private constructPath(): Path | undefined {
    if (this.parent(this.dest) === undefined) {
      return undefined;
    }

    const path: Path = { nodes: [] };
    let current = this.dest;
    while (current) {
      path.nodes.push(current);
      current = this.parent(current)!;
    }

    path.nodes.reverse();
    return path;
  }
}

export function updatePathfindingPosition(
  state: PathfindingComponent,
  position: ReadonlyVec3
) {
  const distance = dist(position, state.position);
  if (!state.position || distance >= MIN_UPDATE_POSITION_DISTANCE) {
    state.position = position as Vec3;
    state.searchTime = secondsSinceEpoch();
  }
}

export function stuckWhilePathfinding(state: PathfindingComponent): boolean {
  const timeElapsed = secondsSinceEpoch() - state.searchTime;
  return timeElapsed >= STUCK_DURATION;
}

function isFullHeightBlockAtPosition(
  resources: BlockResources | BlockResourceDeps,
  worldPos: ReadonlyVec3
) {
  const [_, isomorphismId] = getTerrainIdAndIsomorphismAtPosition(
    resources,
    worldPos
  );
  const shapeId = toShapeId(isomorphismId ?? -1);
  return [shapeIDs.full, shapeIDs.step, shapeIDs.table].includes(shapeId);
}
