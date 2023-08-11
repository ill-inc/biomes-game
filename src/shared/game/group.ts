import type { Permute, Reflect } from "@/shared/asset_defs/shapes";
import {
  getIsomorphism,
  getPermuteReflect,
  getShapeName,
} from "@/shared/asset_defs/shapes";
import type { TerrainID } from "@/shared/asset_defs/terrain";
import { BikkieIds } from "@/shared/bikkie/ids";
import { attribs } from "@/shared/bikkie/schema/attributes";
import { using } from "@/shared/deletable";
import type { ReadonlyBox } from "@/shared/ecs/gen/components";
import { Box } from "@/shared/ecs/gen/components";

import type { Item } from "@/shared/ecs/gen/types";
import { fromBlockId, fromFloraId, fromGlassId } from "@/shared/game/ids";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import {
  add,
  containsAABB,
  floor,
  max,
  min,
  round,
  sizeAABB,
  sub,
} from "@/shared/math/linear";
import { Rotation } from "@/shared/math/rotation";
import type { ReadonlyAABB, ReadonlyVec3, Vec3 } from "@/shared/math/types";
import { assertNever } from "@/shared/util/type_helpers";
import type { DataType } from "@/shared/wasm/tensors";
import { Tensor, TensorUpdate } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { SparseMap } from "@/shared/wasm/types/biomes";
import type { EmptyGroupEntry } from "@/shared/wasm/types/galois";
import {
  isBlockGroupEntry,
  isEmptyGroupEntry,
  isFloraGroupEntry,
  isGlassGroupEntry,
  type BlockGroupEntry,
  type FloraGroupEntry,
  type GlassGroupEntry,
  type GroupEntry,
  type GroupTensor,
  type GroupTensorBuilder,
} from "@/shared/wasm/types/galois";

export function setGroupEntry(
  builder: GroupTensorBuilder,
  pos: ReadonlyVec3,
  val: GroupEntry
) {
  if (isBlockGroupEntry(val)) {
    builder.setBlock(
      pos,
      val.block.block_id,
      val.block.isomorphism_id,
      val.block.dye,
      val.block.moisture
    );
  } else if (isGlassGroupEntry(val)) {
    builder.setGlass(
      pos,
      val.glass.glass_id,
      val.glass.isomorphism_id,
      val.glass.dye,
      val.glass.moisture
    );
  } else if (isFloraGroupEntry(val)) {
    builder.setFlora(pos, val.flora.flora_id, val.flora.growth);
  }
}

export function terrainIdForTensorEntry(
  tensorEntry: BlockGroupEntry | GlassGroupEntry | FloraGroupEntry
): TerrainID {
  if (isBlockGroupEntry(tensorEntry)) {
    return fromBlockId(tensorEntry.block.block_id);
  } else if (isGlassGroupEntry(tensorEntry)) {
    return fromGlassId(tensorEntry.glass.glass_id);
  } else if (isFloraGroupEntry(tensorEntry)) {
    return fromFloraId(tensorEntry.flora.flora_id);
  }
  assertNever(tensorEntry);
}

export function isomorphismForTensorEntry(
  tensorEntry: FloraGroupEntry
): undefined;
export function isomorphismForTensorEntry(
  tensorEntry: BlockGroupEntry | GlassGroupEntry
): TerrainID;
export function isomorphismForTensorEntry(
  tensorEntry: BlockGroupEntry | GlassGroupEntry | FloraGroupEntry
): TerrainID | undefined;
export function isomorphismForTensorEntry(
  tensorEntry: BlockGroupEntry | GlassGroupEntry | FloraGroupEntry
): TerrainID | undefined {
  if (isBlockGroupEntry(tensorEntry)) {
    return tensorEntry.block.isomorphism_id;
  } else if (isGlassGroupEntry(tensorEntry)) {
    return tensorEntry.glass.isomorphism_id;
  }
}

export interface ScanGroupTensorResult {
  tensorPos: Vec3;
  tensorEntry: Exclude<GroupEntry, EmptyGroupEntry>;
}

export function scanGroupTensor(
  tensor: GroupTensor
): Iterable<ScanGroupTensorResult> {
  // Maybe we can use buffers here instead of going through the array.
  const x: ScanGroupTensorResult[] = [];
  tensor.scan((pos, val) => {
    if (!isEmptyGroupEntry(val)) {
      x.push({
        tensorPos: pos,
        tensorEntry: val,
      });
    }
  });
  return x;
}

export function groupTensorBox(tensor: GroupTensor): Box {
  let v0: Vec3 | undefined;
  let v1: Vec3 | undefined;
  tensor.scan((pos, _val) => {
    if (!v0 || !v1) {
      v0 = [...pos];
      v1 = [...pos];
    } else {
      v0 = min(v0, pos);
      v1 = max(v1, pos);
    }
  });
  v1 = v1 ? add(v1, [1, 1, 1]) : undefined;
  return Box.create({ v0, v1 });
}

export function groupTensorLayers(tensor: GroupTensor) {
  const box = groupTensorBox(tensor);
  return box.v1[1] - box.v0[1];
}

export function groupTensorEntryAt(
  tensor: GroupTensor,
  box: ReadonlyBox,
  worldPos: ReadonlyVec3
): Exclude<GroupEntry, EmptyGroupEntry> | undefined {
  if (!containsAABB([box.v0, box.v1], worldPos)) {
    return;
  }
  const entry = tensor.get(sub(worldPos, box.v0));
  return isEmptyGroupEntry(entry) ? undefined : entry;
}

// Get box (extents of A SparseMap)
// Maybe could move this to C++ in the future
export function sparseMapBox(sparseMap: SparseMap<"U32">): Box {
  let v0: Vec3 | undefined;
  let v1: Vec3 | undefined;
  sparseMap.scan((x, y, z, _m) => {
    if (!v0 || !v1) {
      v0 = [x, y, z];
      v1 = [x, y, z];
    } else {
      v0[0] = Math.min(v0[0], x);
      v0[1] = Math.min(v0[1], y);
      v0[2] = Math.min(v0[2], z);

      v1[0] = Math.max(v1[0], x);
      v1[1] = Math.max(v1[1], y);
      v1[2] = Math.max(v1[2], z);
    }
  });
  v1 = v1 ? add(v1, [1, 1, 1]) : undefined;
  return Box.create({ v0, v1 });
}

export function groupItem(
  groupId: BiomesId,
  displayName?: string,
  rotation?: number
): Item {
  return anItem(BikkieIds.environmentGroup, {
    [attribs.groupId.id]: groupId,
    [attribs.displayName.id]: displayName ?? "",
    [attribs.rotation.id]: rotation ?? 0,
  });
}

export function rotatePositionWithinBox(
  pos: Vec3,
  rotation: Rotation,
  reflection: Reflect,
  oldBoxSize: ReadonlyVec3
): Vec3 {
  pos = [
    reflection[0] === 0 ? pos[0] : oldBoxSize[0] - pos[0],
    reflection[1] === 0 ? pos[1] : oldBoxSize[1] - pos[1],
    reflection[2] === 0 ? pos[2] : oldBoxSize[2] - pos[2],
  ];

  switch (rotation) {
    case Rotation.Z_NEG:
      return pos;
    case Rotation.X_NEG:
      return [pos[2], pos[1], oldBoxSize[0] - pos[0]];
    case Rotation.Z_POS:
      return [oldBoxSize[0] - pos[0], pos[1], oldBoxSize[2] - pos[2]];
    case Rotation.X_POS:
      return [oldBoxSize[2] - pos[2], pos[1], pos[0]];
    default:
      throw new Error(`Unsupported rotation ${rotation}`);
  }
}

export function rotateGroupTensor(
  voxeloo: VoxelooModule,
  tensor: GroupTensor,
  rotation: Rotation,
  reflection: Reflect = [0, 0, 0]
): GroupTensor {
  const box = groupTensorBox(tensor);
  const oldSize = sizeAABB(boxToAabb(box));

  return using(new voxeloo.GroupTensorBuilder(), (builder) => {
    const voxalign: ReadonlyVec3 = [0.5, 0.5, 0.5];

    for (const { tensorPos, tensorEntry } of scanGroupTensor(tensor)) {
      // Rotate and translate voxel position.
      const newPos = floor(
        rotatePositionWithinBox(
          add(tensorPos, voxalign),
          rotation,
          reflection,
          oldSize
        )
      );

      // Permute and reflect shapes.
      if (isFloraGroupEntry(tensorEntry)) {
        builder.setFlora(
          newPos,
          tensorEntry.flora.flora_id,
          tensorEntry.flora.growth
        );
      } else {
        const horizontalRotation = [
          [
            [0, 0, 0],
            [0, 1, 2],
          ],
          [
            [1, 0, 0],
            [2, 1, 0],
          ],
          [
            [1, 0, 1],
            [0, 1, 2],
          ],
          [
            [0, 0, 1],
            [2, 1, 0],
          ],
        ];
        const iso = isomorphismForTensorEntry(tensorEntry);
        const shapeId = iso >> 6;
        const transformId = iso & 0x3f;
        const [permute, reflect] = getPermuteReflect(transformId);

        let newPermute: Permute = [...permute];
        let newReflect: Reflect = [...reflect];
        if (shapeId !== 0) {
          const [reflectTrans, permuteTrans] = horizontalRotation[rotation];
          newPermute = [
            permute[permuteTrans[0]],
            permute[permuteTrans[1]],
            permute[permuteTrans[2]],
          ];
          newReflect = [
            (reflect[permuteTrans[0]] ^ reflectTrans[permuteTrans[0]]) as 0 | 1,
            (reflect[permuteTrans[1]] ^ reflectTrans[permuteTrans[1]]) as 0 | 1,
            (reflect[permuteTrans[2]] ^ reflectTrans[permuteTrans[2]]) as 0 | 1,
          ];
          newReflect = [
            (newReflect[0] ^ reflection[permuteTrans[0]]) as 0 | 1,
            (newReflect[1] ^ reflection[permuteTrans[1]]) as 0 | 1,
            (newReflect[2] ^ reflection[permuteTrans[2]]) as 0 | 1,
          ];
        }

        const newIso = getIsomorphism(
          getShapeName(shapeId)!,
          newReflect as unknown as Reflect,
          newPermute as unknown as Permute
        );
        if (isBlockGroupEntry(tensorEntry)) {
          builder.setBlock(
            newPos,
            tensorEntry.block.block_id,
            newIso,
            tensorEntry.block.dye,
            tensorEntry.block.moisture
          );
        } else {
          builder.setGlass(
            newPos,
            tensorEntry.glass.glass_id,
            newIso,
            tensorEntry.glass.dye,
            tensorEntry.glass.moisture
          );
        }
      }
    }
    return builder.build();
  });
}

export function rotateTensor<T extends DataType>(
  voxeloo: VoxelooModule,
  tensor: Tensor<T>,
  rotation: Rotation,
  reflection: Reflect = [0, 0, 0]
): Tensor<T> {
  const oldSize = tensor.shape;
  const newSize: Vec3 =
    rotation === 0 || rotation === 2
      ? [...oldSize]
      : [oldSize[2], oldSize[1], oldSize[0]];

  const voxalign: ReadonlyVec3 = [0.5, 0.5, 0.5];
  const newTensor = Tensor.make(voxeloo, newSize, tensor.dtype);
  const writer = new TensorUpdate(newTensor);
  for (const [pos, val] of tensor) {
    // Rotate and translate voxel position.
    const newPos = floor(
      rotatePositionWithinBox(add(pos, voxalign), rotation, reflection, oldSize)
    );
    writer.set(newPos, val);
  }
  writer.apply();
  return newTensor;
}

export function aabbToBox(aabb: ReadonlyAABB): ReadonlyBox {
  return { v0: aabb[0], v1: aabb[1] };
}

export function boxToAabb(box: ReadonlyBox): ReadonlyAABB {
  return [box.v0, box.v1];
}

export function roundBox(box: ReadonlyBox): Box {
  return { v0: round(box.v0), v1: round(box.v1) };
}
