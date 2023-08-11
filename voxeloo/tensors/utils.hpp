#pragma once

#include <memory>
#include <vector>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/macros.hpp"
#include "voxeloo/tensors/arrays.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::tensors {

template <typename Fn>
inline auto partition_run(const ArrayRun& run, Fn&& fn) {
  auto lo = decode_tensor_pos(run.pos);
  auto hi = decode_tensor_pos(run.pos + run.len - 1);
  if (lo.yz() == hi.yz()) {
    fn(lo, hi.x - lo.x + 1);
  } else if (lo.y == hi.y) {
    fn(lo, kChunkDim - lo.x);
    for (auto z = lo.z + 1; z < hi.z; z += 1) {
      fn(Vec3u{0, lo.y, z}, kChunkDim);
    }
    fn(Vec3u{0, hi.y, hi.z}, hi.x + 1);
  } else {
    fn(lo, kChunkDim - lo.x);
    for (auto z = lo.z + 1; z < kChunkDim; z += 1) {
      fn(Vec3u{0, lo.y, z}, kChunkDim);
    }
    for (auto y = lo.y + 1; y < hi.y; y += 1) {
      for (auto z = 0u; z < kChunkDim; z += 1) {
        fn(Vec3u{0, y, z}, kChunkDim);
      }
    }
    for (auto z = 0u; z < hi.z; z += 1) {
      fn(Vec3u{0, hi.y, z}, kChunkDim);
    }
    fn(Vec3u{0, hi.y, hi.z}, hi.x + 1);
  }
}

}  // namespace voxeloo::tensors
