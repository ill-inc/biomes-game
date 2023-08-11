#pragma once

#include <vector>

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/macros.hpp"
#include "voxeloo/tensors/routines.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::galois::csg {

using Mask = tensors::Tensor<bool>;

template <typename T>
using Tensor = tensors::Tensor<T>;

template <typename T>
inline auto empty() {
  return tensors::make_tensor<T>(tensors::kChunkShape);
}

template <typename T>
inline auto filled(T val) {
  return tensors::make_tensor<T>(tensors::kChunkShape, val);
}

template <typename T>
inline auto clear(const Tensor<T>& map, const Mask& mask) {
  return tensors::map_dense(map, [&](auto pos, auto old) {
    return mask.get(pos) ? static_cast<T>(0) : old;
  });
}

template <typename T>
inline auto slice(const Tensor<T>& map, const Mask& mask) {
  return tensors::map_dense(map, [&](auto pos, auto old) {
    return mask.get(pos) ? old : static_cast<T>(0);
  });
}

template <typename T>
inline auto write(const Tensor<T>& map, const Mask& mask, T val) {
  return tensors::map_dense(map, [&](auto pos, auto old) {
    return mask.get(pos) ? val : old;
  });
}

template <typename T>
inline auto merge(const Tensor<T>& lhs, const Tensor<T>& rhs) {
  return tensors::map_dense(lhs, [&](auto pos, auto old) {
    if (auto val = rhs.get(pos); val) {
      return val;
    }
    return old;
  });
}

template <typename T>
inline auto sparse_merge(const Tensor<T>& lhs, const Tensor<T>& rhs) {
  return tensors::map_sparse(lhs, [&](auto pos, auto old) {
    if (auto val = rhs.get(pos); val) {
      return val;
    }
    return old;
  });
}

}  // namespace voxeloo::galois::csg
