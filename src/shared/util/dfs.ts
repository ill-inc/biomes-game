import type { ReadonlyVec3, Vec3 } from "@/shared/math/types";
import { Queue } from "@/shared/util/queue";

class PushOnce<T extends { push: (pos: Vec3) => void }> {
  private done = new Set<string>();
  constructor(readonly impl: T) {}

  push([x, y, z]: Vec3) {
    const key = `${x}:${y}:${z}`;
    if (!this.done.has(key)) {
      this.done.add(key);
      this.impl.push([x, y, z]);
    }
  }
}

type SearchStatus = boolean | undefined | "terminate";

export function dfsVoxels(
  pos: ReadonlyVec3,
  fn: (pos: ReadonlyVec3) => SearchStatus
) {
  const todo = new PushOnce([pos]);
  while (todo.impl.length > 0) {
    const pos = todo.impl.pop()!;
    switch (fn(pos)) {
      case true:
        const [x, y, z] = pos;
        todo.push([x + 1, y, z]);
        todo.push([x - 1, y, z]);
        todo.push([x, y - 1, z]);
        todo.push([x, y + 1, z]);
        todo.push([x, y, z - 1]);
        todo.push([x, y, z + 1]);
        break;
      case "terminate":
        return;
    }
  }
}

export function dfsVoxelsWithDiagonals(
  pos: ReadonlyVec3,
  fn: (pos: ReadonlyVec3) => SearchStatus
) {
  const todo = new PushOnce([pos]);
  while (todo.impl.length > 0) {
    const pos = todo.impl.pop()!;
    switch (fn(pos)) {
      case true:
        const [x, y, z] = pos;
        for (let dz = -1; dz <= 1; dz += 1) {
          for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              if (dx != 0 || dy != 0 || dz != 0) {
                todo.push([x + dx, y + dy, z + dz]);
              }
            }
          }
        }
        break;
      case "terminate":
        return;
    }
  }
}

export function bfsVoxels(
  pos: ReadonlyVec3,
  fn: (pos: ReadonlyVec3) => SearchStatus
) {
  const todo = new PushOnce(new Queue([pos]));
  while (todo.impl.size() > 0) {
    const pos = todo.impl.pop()!;
    switch (fn(pos)) {
      case true:
        const [x, y, z] = pos;
        todo.push([x + 1, y, z]);
        todo.push([x - 1, y, z]);
        todo.push([x, y - 1, z]);
        todo.push([x, y + 1, z]);
        todo.push([x, y, z - 1]);
        todo.push([x, y, z + 1]);
        break;
      case "terminate":
        return;
    }
  }
}

export function bfsVoxelsWithDiagonals(
  pos: ReadonlyVec3,
  fn: (pos: ReadonlyVec3) => SearchStatus
) {
  const todo = new PushOnce(new Queue([pos]));
  while (todo.impl.size() > 0) {
    const pos = todo.impl.pop()!;
    switch (fn(pos)) {
      case true:
        const [x, y, z] = pos;
        for (let dz = -1; dz <= 1; dz += 1) {
          for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              if (dx != 0 || dy != 0 || dz != 0) {
                todo.push([x + dx, y + dy, z + dz]);
              }
            }
          }
        }
        break;
      case "terminate":
        return;
    }
  }
}
