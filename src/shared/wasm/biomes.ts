import { using, usingAll } from "@/shared/deletable";
import type { Vec3i } from "@/shared/ecs/gen/types";
import { makeDynamicBuffer } from "@/shared/wasm/buffers";
import type { VoxelooModule } from "@/shared/wasm/types";
import type {
  SparseBlock,
  ValueType,
  VolumeBlock,
} from "@/shared/wasm/types/biomes";

type Block<T extends ValueType> = VolumeBlock<T> | SparseBlock<T>;

export function saveBlock<T extends ValueType, B extends Block<T>>(
  voxeloo: VoxelooModule,
  block: B
) {
  return using(makeDynamicBuffer(voxeloo, "U8"), (buffer) => {
    block.saveBuffer(buffer);
    return buffer.asArray().slice();
  });
}

export function loadBlock<T extends ValueType, B extends Block<T>>(
  voxeloo: VoxelooModule,
  block: B,
  source: string | Uint8Array
) {
  using(makeDynamicBuffer(voxeloo, "U8"), (buffer) => {
    if (typeof source === "string") {
      buffer.assign(Buffer.from(source, "base64"));
    } else {
      buffer.assign(source);
    }
    block.loadBuffer(buffer);
  });
  return block;
}

export function loadBlockWrapper<T extends ValueType, B extends Block<T>>(
  voxeloo: VoxelooModule,
  block: B,
  data?: { blob?: string } | { buffer?: Uint8Array }
) {
  if (data) {
    if ("buffer" in data && (data.buffer?.length ?? 0) > 0) {
      loadBlock(voxeloo, block, data.buffer!);
    } else if ("blob" in data && (data.blob?.length ?? 0) > 0) {
      loadBlock(voxeloo, block, data.blob!);
    }
  }
  return block;
}

export function lazyLoadBlockWrapper<T extends ValueType, B extends Block<T>>(
  voxeloo: VoxelooModule,
  blockCtor: () => B,
  data?: { blob?: string } | { buffer?: Uint8Array }
) {
  if (data) {
    return loadBlockWrapper(voxeloo, blockCtor(), data);
  }
}

export function saveBlockWrapper<T extends ValueType, B extends Block<T>>(
  voxeloo: VoxelooModule,
  block: B
) {
  return { buffer: Buffer.from(saveBlock(voxeloo, block)) };
}

export function scanBlock<T extends ValueType>(
  voxeloo: VoxelooModule,
  block: Block<T>,
  fn: (pos: Vec3i, val: number) => void
) {
  usingAll(
    [
      makeDynamicBuffer(voxeloo, "Vec3i"),
      makeDynamicBuffer(voxeloo, block.valueType()),
    ],
    (posBuffer, valBuffer) => {
      block.toList(posBuffer, valBuffer);
      const posArray = posBuffer.asArray();
      const valArray = valBuffer.asArray();
      let i = 0;
      for (const val of valArray) {
        fn([posArray[i], posArray[i + 1], posArray[i + 2]], Number(val));
        i += 3;
      }
    }
  );
}

// NOTE: Some benchmark tests showed that this generator approach was _much_
// slower than the scan method above (i.e. >2x slower).
export function* iterBlock<T extends ValueType>(
  voxeloo: VoxelooModule,
  block: Block<T>
) {
  const posBuffer = makeDynamicBuffer(voxeloo, "Vec3i");
  const valBuffer = makeDynamicBuffer(voxeloo, block.valueType());
  try {
    block.toList(posBuffer, valBuffer);
    const posArray = posBuffer.asArray();
    const valArray = valBuffer.asArray();
    let i = 0;
    for (const val of valArray) {
      yield [[posArray[i], posArray[i + 1], posArray[i + 2]], val] as const;
      i += 3;
    }
  } finally {
    posBuffer.delete();
    valBuffer.delete();
  }
}
