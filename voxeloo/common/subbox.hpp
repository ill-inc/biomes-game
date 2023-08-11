#pragma once

#include <vector>

#include "voxeloo/common/geometry.hpp"

namespace voxeloo::subbox {

struct Box {
  Vec3u v0;
  Vec3u v1;
};

inline auto volume(const Box& box) {
  auto size = max(box.v1 - box.v0, 0u);
  return size.x * size.y * size.z;
}

// Returns the largest box contained in the on positions of the given 3D mask.
Box solve(const std::vector<bool>& mask, Vec3u shape);

// An approximate version of solve that is faster.
Box solve_approx(const std::vector<bool>& mask, Vec3u shape);

}  // namespace voxeloo::subbox
