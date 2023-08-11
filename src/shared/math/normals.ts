import type { Vec2f } from "@/shared/ecs/gen/types";
import type { Vec3 } from "@/shared/math/types";
import { Dir } from "@/shared/wasm/types/common";

export function faceToOrientation(face: Dir): Vec2f {
  let rotY = 0;
  switch (face) {
    case Dir.Y_NEG:
    case Dir.Y_POS:
    case Dir.Z_NEG:
      rotY = 0;
      break;
    case Dir.Z_POS:
      rotY = Math.PI;
      break;
    case Dir.X_NEG:
      rotY = Math.PI * 0.5;
      break;
    case Dir.X_POS:
      rotY = Math.PI * 1.5;
      break;
  }
  return [0, rotY];
}

export function faceNormal(face: Dir): Vec3 {
  switch (face) {
    case Dir.X_POS:
      return [1, 0, 0];
    case Dir.X_NEG:
      return [-1, 0, 0];
    case Dir.Y_POS:
      return [0, 1, 0];
    case Dir.Y_NEG:
      return [0, -1, 0];
    case Dir.Z_POS:
      return [0, 0, 1];
    case Dir.Z_NEG:
      return [0, 0, -1];
  }
}

export function sideFaceRight(face: Dir): Vec3 {
  switch (face) {
    case Dir.X_POS:
      return [0, 0, -1];
    case Dir.X_NEG:
      return [0, 0, 1];
    case Dir.Z_POS:
      return [1, 0, 0];
    case Dir.Z_NEG:
      return [-1, 0, 0];
  }

  return [1, 0, 0];
}

export function faceNormalAxis(face: Dir): 0 | 1 | 2 {
  switch (face) {
    case Dir.X_POS:
    case Dir.X_NEG:
      return 0;
    case Dir.Y_POS:
    case Dir.Y_NEG:
      return 1;
    case Dir.Z_POS:
    case Dir.Z_NEG:
      return 2;
  }
}
