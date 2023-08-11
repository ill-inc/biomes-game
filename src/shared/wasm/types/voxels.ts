import type { ReadonlyVec3f } from "@/shared/ecs/gen/types";
import type { Dir } from "@/shared/wasm/types/common";

export interface VoxelsModule {
  march(
    from: ReadonlyVec3f,
    to: ReadonlyVec3f,
    cb: (x: number, y: number, z: number, dist: number) => boolean
  ): void;

  march_faces(
    from: ReadonlyVec3f,
    dir: ReadonlyVec3f,
    cb: (x: number, y: number, z: number, dist: number, dir: Dir) => boolean
  ): void;
}
