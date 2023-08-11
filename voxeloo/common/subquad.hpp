#pragma once

#include <bitset>
#include <cstdint>
#include <vector>

#include "voxeloo/common/geometry.hpp"

namespace voxeloo::subquad {

struct Quad {
  Vec2u v0;
  Vec2u v1;
};

// Returns the largest quad contained in the on positions of the given 2D mask.
Quad solve(const std::vector<bool>& mask, Vec2u shape);

}  // namespace voxeloo::subquad
