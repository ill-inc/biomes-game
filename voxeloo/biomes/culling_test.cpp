#include "voxeloo/biomes/culling.hpp"

#include <catch2/catch.hpp>
#include <cmath>

#include "voxeloo/common/geometry.hpp"

namespace voxeloo::culling {

inline auto perspective(double near, double far, double aspect, double fov) {
  auto n = near;
  auto f = far;
  auto t = std::tan(0.5 * fov) * near;
  auto b = -t;
  auto r = t * aspect;
  auto l = -r;

  // Row-major perspective matrix: https://bit.ly/300gYmf
  std::array<std::array<double, 4>, 4> components = {{
      {2.0 * n / (r - l), 0.0, (r + l) / (r - l), 0},
      {0.0, 2.0 * n / (t - b), (t + b) / (t - b), 0},
      {0.0, 0.0, -(f + n) / (f - n), -2.0 * f * n / (f - n)},
      {0.0, 0.0, -1, 0.0},
  }};

  // Copy the components to a column-major output matrix.
  Mat4x4d ret;
  for (auto row = 0u; row < 4; row += 1) {
    for (auto col = 0u; col < 4; col += 1) {
      ret[4 * col + row] = components[row][col];
    }
  }

  return ret;
}

TEST_CASE("Test rasterize AABB inclusive", "[all]") {
  OcclusionBuffer buffer{{5, 5}};

  auto proj = perspective(0.1, 256.0, 1.0, 0.5 * M_PI);
  auto aabb = AABB{{-1.1, -1.1, -2.0}, {1.1, 1.1, -3.0}};
  rasterize_aabb_inclusive(buffer, proj, aabb);

  // Check the final buffer.
  std::array<std::array<bool, 5>, 5> expected = {{
      {0, 0, 0, 0, 0},
      {0, 1, 1, 1, 0},
      {0, 1, 1, 1, 0},
      {0, 1, 1, 1, 0},
      {0, 0, 0, 0, 0},
  }};
  for (auto y = 0u; y < 5u; y += 1) {
    for (auto x = 0u; x < 5u; x += 1) {
      REQUIRE(buffer.get({x, y}) == expected[y][x]);
    }
  }
};

}  // namespace voxeloo::culling