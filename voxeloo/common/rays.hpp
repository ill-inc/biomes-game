#pragma once

#include <cmath>
#include <utility>

#include "voxeloo/common/blocks.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/macros.hpp"
#include "voxeloo/common/spatial.hpp"
#include "voxeloo/common/utils.hpp"

namespace voxeloo::rays {

using ColorMap = spatial::Index<RGBA>;
using DensityMap = spatial::Index<float>;

template <typename Fn>
auto march_x(Vec3f from, bool sign, float dydx, float dzdx, int steps, Fn&& f) {
  auto x_s = sign ? -1 : 1;
  auto dtdx = std::sqrt(1.0f + dydx * dydx + dzdx * dzdx);

  auto [x, y, z] = from;
  auto x_i = ifloor(x);
  auto x_f = x - x_i;
  auto dtdx_0 = sign ? x_f * dtdx : (1 - x_f) * dtdx;
  for (int i = 0; i < steps; i += 1) {
    auto y_i = ifloor(y);
    auto z_i = ifloor(z);
    if (!f(x_i, y_i, z_i, i == 0 ? dtdx_0 : dtdx)) {
      break;
    }
    x_i += x_s;
    y += dydx;
    z += dzdx;
  }
}

template <typename Fn>
auto march_y(Vec3f from, bool sign, float dxdy, float dzdy, int steps, Fn&& f) {
  auto y_s = sign ? -1 : 1;
  auto dtdy = std::sqrt(1.0f + dxdy * dxdy + dzdy * dzdy);

  auto [x, y, z] = from;
  auto y_i = ifloor(y);
  auto y_f = y - y_i;
  auto dtdy_0 = sign ? y_f * dtdy : (1 - y_f) * dtdy;
  for (int i = 0; i < steps; i += 1) {
    auto x_i = ifloor(x);
    auto z_i = ifloor(z);
    if (!f(x_i, y_i, z_i, i == 0 ? dtdy_0 : dtdy)) {
      break;
    }
    x += dxdy;
    y_i += y_s;
    z += dzdy;
  }
}

template <typename Fn>
auto march_z(Vec3f from, bool sign, float dxdz, float dydz, int steps, Fn&& f) {
  auto z_s = sign ? -1 : 1;
  auto dtdz = std::sqrt(1.0f + dxdz * dxdz + dydz * dydz);

  auto [x, y, z] = from;
  auto z_i = ifloor(z);
  auto z_f = z - z_i;
  auto dtdz_0 = sign ? z_f * dtdz : (1 - z_f) * dtdz;
  for (int i = 0; i < steps; i += 1) {
    auto x_i = ifloor(x);
    auto y_i = ifloor(y);
    if (!f(x_i, y_i, z_i, i == 0 ? dtdz_0 : dtdz)) {
      break;
    }
    x += dxdz;
    y += dydz;
    z_i += z_s;
  }
}

// Performs a march along the dominant axis of the given ray. Each integer
// coordinate along the dominant axis is evaluated once. To march over all
// voxels intersected by the ray look at the voxels::march routine.
template <typename Fn>
void march(Vec3f from, Vec3f to, Fn&& f) {
  // Normalize by largest absolute component.
  auto dx = to[0] - from[0];
  auto dy = to[1] - from[1];
  auto dz = to[2] - from[2];

  if (std::abs(dx) >= std::abs(dy) && std::abs(dx) >= std::abs(dz)) {
    auto sign = std::signbit(dx);
    auto dydx = dy / std::abs(dx);
    auto dzdx = dz / std::abs(dx);
    auto steps = iceil(std::abs(dx));
    march_x(from, sign, dydx, dzdx, steps, std::forward<Fn>(f));
  } else if (std::abs(dy) >= std::abs(dz)) {
    auto sign = std::signbit(dy);
    auto dxdy = dx / std::abs(dy);
    auto dzdy = dz / std::abs(dy);
    auto steps = iceil(std::abs(dy));
    march_y(from, sign, dxdy, dzdy, steps, std::forward<Fn>(f));
  } else {
    auto sign = std::signbit(dz);
    auto dxdz = dx / std::abs(dz);
    auto dydz = dy / std::abs(dz);
    auto steps = iceil(std::abs(dz));
    march_z(from, sign, dxdz, dydz, steps, std::forward<Fn>(f));
  }
}

template <typename Fn>
void march(Vec3f from, Vec3f dir, float distance, Fn&& f) {
  Vec3f to = {
      from[0] + distance * dir[0],
      from[1] + distance * dir[1],
      from[2] + distance * dir[2],
  };
  march(from, to, std::forward<Fn>(f));
}

float integrate_depth(const DensityMap& dm, Vec3f src, Vec3f dir, float far);

}  // namespace voxeloo::rays
