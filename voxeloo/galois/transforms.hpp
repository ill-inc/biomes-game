#pragma once

#include <vector>

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/macros.hpp"
#include "voxeloo/common/voxels.hpp"
#include "voxeloo/tensors/routines.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::galois::transforms {

template <typename T>
using Tensor = tensors::Tensor<T>;

struct Transform {
  Vec3u permute;
  Vec3b reflect;
  Vec3i shift;
};

inline auto permute(uint32_t x, uint32_t y, uint32_t z) {
  return Transform{
      Vec3u{x, y, z},
      Vec3b{false, false, false},
      Vec3i{0, 0, 0},
  };
}

inline auto reflect(bool x, bool y, bool z) {
  return Transform{
      Vec3u{0, 1, 2},
      Vec3b{x, y, z},
      Vec3i{0, 0, 0},
  };
}

inline auto shift(int x, int y, int z) {
  return Transform{
      Vec3u{0, 1, 2},
      Vec3b{false, false, false},
      Vec3i{x, y, z},
  };
}

inline auto compose(const Transform& outer, const Transform& inner) {
  Transform ret;

  // Compute the composed permutation.
  ret.permute.x = inner.permute[outer.permute[0]];
  ret.permute.y = inner.permute[outer.permute[1]];
  ret.permute.z = inner.permute[outer.permute[2]];

  // Compute the composed reflection.
  ret.reflect.x = outer.reflect.x ^ inner.reflect[outer.permute[0]];
  ret.reflect.y = outer.reflect.y ^ inner.reflect[outer.permute[1]];
  ret.reflect.z = outer.reflect.z ^ inner.reflect[outer.permute[2]];

  // Compute the composed shift.
  ret.shift.x = (outer.reflect.x ? -1 : 1) * inner.shift[outer.permute[0]];
  ret.shift.y = (outer.reflect.y ? -1 : 1) * inner.shift[outer.permute[1]];
  ret.shift.z = (outer.reflect.z ? -1 : 1) * inner.shift[outer.permute[2]];
  ret.shift += outer.shift;

  return ret;
}

template <typename T>
inline auto apply_permute(const Tensor<T>& tensor, Vec3u axes) {
  CHECK_ARGUMENT(axes.x < 3);
  CHECK_ARGUMENT(axes.y < 3);
  CHECK_ARGUMENT(axes.z < 3);
  return tensors::map_dense(tensor, [&](auto pos, ATTR_UNUSED auto old) {
    return tensor.get(pos[axes[0]], pos[axes[1]], pos[axes[2]]);
  });
}

template <typename T>
inline auto apply_reflect(const Tensor<T>& tensor, Vec3b axes) {
  return tensors::map_dense(tensor, [&](auto pos, ATTR_UNUSED auto old) {
    return tensor.get({
        axes.x ? tensors::kChunkDim - pos.x - 1 : pos.x,
        axes.y ? tensors::kChunkDim - pos.y - 1 : pos.y,
        axes.z ? tensors::kChunkDim - pos.z - 1 : pos.z,
    });
  });
}

template <typename T>
inline auto apply_shift(const Tensor<T>& tensor, Vec3i axes) {
  return tensors::map_dense(
      tensor, [&tensor, &axes](auto pos, ATTR_UNUSED auto old) {
        auto new_pos = pos.template to<int>() - axes;
        if (voxels::box_contains(voxels::cube_box(32), new_pos)) {
          return tensor.get(new_pos.template to<uint32_t>());
        } else {
          return static_cast<T>(0);
        }
      });
}

template <typename T>
inline auto apply(const Tensor<T>& tensor, const Transform& transform) {
  const auto& [p, r, s] = transform;
  return apply_shift(apply_reflect(apply_permute(tensor, p), r), s);
}

}  // namespace voxeloo::galois::transforms
