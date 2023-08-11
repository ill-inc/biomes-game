#pragma once

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/utils.hpp"

namespace voxeloo::march {

template <typename Fn>
void march_2d(const Vec2d& from, const Vec2d& to, Fn&& fn) {
  const auto [x, y] = from;
  const auto [r, s] = to - from;

  // The signs of the ray direction vector components.
  auto sx = std::signbit(r) ? -1 : 1;
  auto sy = std::signbit(s) ? -1 : 1;

  // The ray distance traveled per unit in each direction.
  auto norm = std::sqrt(r * r + s * s);
  auto dtdx = (1e-8 + norm) / std::abs(r);
  auto dtdy = (1e-8 + norm) / std::abs(s);

  // The ray distance to the next intersection in each direction.
  auto tx = (sx == -1 ? (x - std::floor(x)) : (1 + std::floor(x) - x)) * dtdx;
  auto ty = (sy == -1 ? (y - std::floor(y)) : (1 + std::floor(y) - y)) * dtdy;

  // Advance pixel indices that intersect with the given ray.
  auto pos = vec2(ifloor(from.x), ifloor(from.y));

  // Rasterize.
  for (; fn(pos);) {
    if (tx < ty) {
      if (tx >= norm) {
        break;
      }
      pos.x += sx;
      tx += dtdx;
    } else {
      if (ty >= norm) {
        break;
      }
      pos.y += sy;
      ty += dtdy;
    }
  }
}

}  // namespace voxeloo::march