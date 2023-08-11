#include "voxeloo/biomes/rasterization.hpp"

#include <catch2/catch.hpp>

#include "voxeloo/common/geometry.hpp"

using namespace voxeloo;                 // NOLINT
using namespace voxeloo::rasterization;  // NOLINT

TEST_CASE("Basic usage test", "[all]") {
  auto x = projected_point({0.5, 0.5, 0.5}, {0, 0, 0}, {0, 1, 0}, {1, 0, 0});
  REQUIRE(x == vec3(0.5, 0.5, 0.0));
}
