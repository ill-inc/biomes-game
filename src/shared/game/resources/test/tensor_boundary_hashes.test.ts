import {
  getNeighborFaceHashes,
  neighborHashesMatch,
} from "@/shared/game/resources/tensor_boundary_hashes";
import type { ShardId } from "@/shared/game/shard";
import { shardEncode, shardNeighborsWithDiagonals } from "@/shared/game/shard";
import { add } from "@/shared/math/linear";
import type { Vec3 } from "@/shared/math/types";
import { Dir } from "@/shared/wasm/types/common";
import type { TensorBoundaryHashes } from "@/shared/wasm/types/tensors";
import assert from "assert";

function baseBoundaryHashes(): TensorBoundaryHashes[] {
  return Array.from(
    Array(26).keys(),
    (x) =>
      ({
        volumeHash: x + 1,
        faceHashes: Array.from(Array(6).keys(), (y) => y + 1),
      } as TensorBoundaryHashes)
  );
}

function baseBoundaryHashesWithTweak(
  neighborIndex: number,
  faceIndices: number[]
) {
  const ret = baseBoundaryHashes();
  ret[neighborIndex].volumeHash = 10000;
  for (const faceIndex of faceIndices) {
    ret[neighborIndex].faceHashes[faceIndex] = 10000;
  }
  return ret;
}

const CENTER_SHARD_POS: Vec3 = [0, 0, 0];
const CENTER_SHARD = shardEncode(...CENTER_SHARD_POS);
const NEIGHBOR_SHARDS = shardNeighborsWithDiagonals(CENTER_SHARD);

function getNeighborShardIndex(faces: Dir[]) {
  let shard = CENTER_SHARD_POS;
  const offsetForFace = (face: Dir): Vec3 => {
    switch (face) {
      case Dir.X_NEG:
        return [-1, 0, 0];
      case Dir.X_POS:
        return [1, 0, 0];
      case Dir.Y_NEG:
        return [0, -1, 0];
      case Dir.Y_POS:
        return [0, 1, 0];
      case Dir.Z_NEG:
        return [0, 0, -1];
      case Dir.Z_POS:
        return [0, 0, 1];
    }
  };
  for (const face of faces) {
    shard = add(shard, offsetForFace(face));
  }
  return NEIGHBOR_SHARDS.indexOf(shardEncode(...shard));
}

function getNeighborHashesForBoundaries(hashes: TensorBoundaryHashes[]) {
  return getNeighborFaceHashes((id: ShardId) => {
    return hashes[NEIGHBOR_SHARDS.indexOf(id)];
  }, NEIGHBOR_SHARDS);
}

describe("Tensor Boundary Hashes", () => {
  it("edgeChanges", async () => {
    const base = await getNeighborHashesForBoundaries(baseBoundaryHashes());
    // Test a corner.
    assert.ok(
      neighborHashesMatch(
        base,
        await getNeighborHashesForBoundaries(
          baseBoundaryHashesWithTweak(
            getNeighborShardIndex([Dir.Z_NEG, Dir.Y_NEG, Dir.X_NEG]),
            [Dir.X_NEG, Dir.Y_NEG, Dir.Z_POS]
          )
        )
      )
    );
    assert.ok(
      neighborHashesMatch(
        base,
        await getNeighborHashesForBoundaries(
          baseBoundaryHashesWithTweak(
            getNeighborShardIndex([Dir.Z_NEG, Dir.Y_NEG, Dir.X_NEG]),
            [Dir.X_POS, Dir.Y_POS]
          )
        )
      )
    );
    assert.ok(
      !neighborHashesMatch(
        base,
        await getNeighborHashesForBoundaries(
          baseBoundaryHashesWithTweak(
            getNeighborShardIndex([Dir.Z_NEG, Dir.Y_NEG, Dir.X_NEG]),
            [Dir.X_POS, Dir.Y_POS, Dir.Z_POS]
          )
        )
      )
    );

    // Test an edge.
    assert.ok(
      neighborHashesMatch(
        base,
        await getNeighborHashesForBoundaries(
          baseBoundaryHashesWithTweak(
            getNeighborShardIndex([Dir.Z_NEG, Dir.Y_NEG]),
            [Dir.Z_POS]
          )
        )
      )
    );
    assert.ok(
      !neighborHashesMatch(
        base,
        await getNeighborHashesForBoundaries(
          baseBoundaryHashesWithTweak(
            getNeighborShardIndex([Dir.Z_NEG, Dir.Y_NEG]),
            [Dir.Z_POS, Dir.Y_POS]
          )
        )
      )
    );

    // Test a face.
    assert.ok(
      !neighborHashesMatch(
        base,
        await getNeighborHashesForBoundaries(
          baseBoundaryHashesWithTweak(getNeighborShardIndex([Dir.Z_NEG]), [
            Dir.Z_POS,
          ])
        )
      )
    );
    assert.ok(
      neighborHashesMatch(
        base,
        await getNeighborHashesForBoundaries(
          baseBoundaryHashesWithTweak(getNeighborShardIndex([Dir.Z_NEG]), [
            Dir.Z_NEG,
          ])
        )
      )
    );
    assert.ok(
      neighborHashesMatch(
        base,
        await getNeighborHashesForBoundaries(
          baseBoundaryHashesWithTweak(getNeighborShardIndex([Dir.Z_NEG]), [
            Dir.X_POS,
          ])
        )
      )
    );
  });
});
