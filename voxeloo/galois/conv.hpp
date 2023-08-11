#pragma once

#include <algorithm>
#include <vector>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/tensors/routines.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::galois::conv {

template <typename T>
struct Block {
  static constexpr auto kDim = tensors::kChunkDim + 2;
  std::array<T, kDim * kDim * kDim> data;

  Block() = default;

  explicit Block(T init) {
    data.fill(init);
  }

  auto index(Vec3i pos) const {
    return pos.x + 1 + kDim * (pos.y + 1 + kDim * (pos.z + 1));
  }

  auto get(Vec3i pos) const {
    return data[index(pos)];
  }

  void set(Vec3i pos, T val) {
    data[index(pos)] = val;
  }
};

template <typename Fn>
inline auto to_block(Fn&& fn) {
  using T = decltype(fn(vec3(0, 0, 0)));
  static constexpr int dim = static_cast<int>(tensors::kChunkDim);

  Block<T> block;
  for (auto z = -1; z < dim + 1; z += 1) {
    for (auto y = -1; y < dim + 1; y += 1) {
      for (auto x = -1; x < dim + 1; x += 1) {
        block.set({x, y, z}, fn(vec3(x, y, z)));
      }
    }
  }

  return block;
}

template <typename T>
inline auto to_block(const tensors::Chunk<T>& chunk) {
  Block<T> block;
  tensors::scan_dense(chunk.array, [&](auto pos, auto val) {
    block.set(to<int>(tensors::decode_tensor_pos(pos)), val);
  });
  return block;
}

template <typename T>
inline auto to_block(const tensors::Tensor<T>& tensor) {
  CHECK_ARGUMENT(tensor.shape == tensors::kChunkShape);
  return to_block(*tensor.chunks[0]);
}

template <typename T, typename BoundaryFn>
inline auto to_block(const tensors::Chunk<T>& chunk, BoundaryFn&& fn) {
  auto block = to_block(chunk);

  // Assign boundary voxels.
  static constexpr int dim = static_cast<int>(tensors::kChunkDim);
  for (auto z : {-1, dim}) {
    for (auto y = -1; y < dim + 1; y += 1) {
      for (auto x = -1; x < dim + 1; x += 1) {
        block.set({x, y, z}, fn(vec3(x, y, z)));
      }
    }
  }
  for (auto y : {-1, dim}) {
    for (auto z = -1; z < dim + 1; z += 1) {
      for (auto x = -1; x < dim + 1; x += 1) {
        block.set({x, y, z}, fn(vec3(x, y, z)));
      }
    }
  }
  for (auto x : {-1, dim}) {
    for (auto z = -1; z < dim + 1; z += 1) {
      for (auto y = -1; y < dim + 1; y += 1) {
        block.set({x, y, z}, fn(vec3(x, y, z)));
      }
    }
  }

  return block;
}

template <typename T, typename BoundaryFn>
inline auto to_block(const tensors::Tensor<T>& tensor, BoundaryFn&& fn) {
  return to_block(*tensor.chunks[0], std::forward<BoundaryFn>(fn));
}

// Provides lazy conv-block memoization, which is helpful when the points of
// evaluation determined on the fly (e.g. convolving around a surface tensor).
template <typename Fn>
class BlockCache {
  using Ret = decltype(std::declval<Fn>()(vec3(0, 0, 0)));

 public:
  explicit BlockCache(Fn&& fn)
      : cache_(), mask_(false), fn_(std::forward<Fn>(fn)) {}

  auto operator()(Vec3i pos) {
    if (!mask_.get(pos)) {
      auto ret = fn_(pos);
      cache_.set(pos, ret);
      mask_.set(pos, true);
      return ret;
    }
    return cache_.get(pos);
  }

 private:
  Block<Ret> cache_;
  Block<bool> mask_;
  Fn fn_;
};

}  // namespace voxeloo::galois::conv