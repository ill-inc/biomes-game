#include "voxeloo/biomes/shards.hpp"

#include <algorithm>
#include <cstdint>
#include <tuple>
#include <vector>

#include "voxeloo/common/frustum.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/macros.hpp"
#include "voxeloo/common/transport.hpp"

namespace voxeloo::shards {

std::vector<Vec3i> FrustumSharder::get_positions(
    Vec3d origin, Vec3d view, const Mat4x4d& view_proj) {
  auto bounds = frustum::get_frustum_bounding_box(view_proj);
  auto [x0, y0, z0] = shard_div(level_, ifloor(bounds.v0));
  auto [x1, y1, z1] = shard_div(level_, ifloor(bounds.v1));
  auto s = static_cast<int>(1 << level_);

  // Identify all shards that intersect the frustum.
  std::vector<Vec3i> shards;
  frustum::IntersectionTest frustum(view_proj);
  for (auto z = z0; z <= z1; z += 1) {
    for (auto y = y0; y <= y1; y += 1) {
      for (auto x = x0; x <= x1; x += 1) {
        auto v0 = s * vec3(x, y, z);
        auto v1 = s * vec3(x + 1, y + 1, z + 1);
        if (frustum.test(voxels::Box{v0, v1})) {
          shards.emplace_back(x, y, z);
        }
      }
    }
  }

  // Sort the shards by their depth.
  std::sort(shards.begin(), shards.end(), [&](const auto& p, const auto& q) {
    auto d1 = dot(to<double>(s * p) - origin, view);
    auto d2 = dot(to<double>(s * q) - origin, view);
    return d1 < d2;
  });

  return shards;
}

}  // namespace voxeloo::shards