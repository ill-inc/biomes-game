import type { Node } from "@/shared/resources/core";
import { NodeMap } from "@/shared/resources/core";

describe("NodeMap benchmarks", () => {
  const dummyNode = {
    free: () => {},
  } as unknown as Node<unknown>;
  const map = new Map<string, Node<unknown>>();
  const nodeMap = new NodeMap();
  const SHARDS = 1_000_000;

  beforeEach(() => {
    map.clear();
    nodeMap.clear();

    for (let i = 1; i < SHARDS; ++i) {
      map.set(`/terrain:${i}`, dummyNode);
      nodeMap.set(["/terrain", i], dummyNode);
    }
  });

  it("Test string map approach", async () => {
    for (let i = 1; i < SHARDS; ++i) {
      map.get(`/terrain:${i}`)?.free();
    }
  });

  it("Test nodemap approach", async () => {
    for (let i = 1; i < SHARDS; ++i) {
      nodeMap.get(["/terrain", i])?.free();
    }
  });
});
