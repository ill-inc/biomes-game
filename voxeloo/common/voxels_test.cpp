#include "voxeloo/common/voxels.hpp"

#include <catch2/catch.hpp>

namespace voxeloo {

TEST_CASE("Test bounding box routines", "[all]") {
  auto b1 = voxels::unit_box(vec3(0, 0, 0));
  auto b2 = voxels::unit_box(vec3(1, 1, 1));
  auto b3 = voxels::unit_box(vec3(2, 2, 2));

  auto b4 = voxels::union_box({b1, b2, b3});

  REQUIRE(b4.v0 == Vec3i{0, 0, 0});
  REQUIRE(b4.v1 == Vec3i{3, 3, 3});

  REQUIRE(voxels::intersect_box(b1, b4) == b1);
  REQUIRE(voxels::intersect_box(b2, b4) == b2);
  REQUIRE(voxels::intersect_box(b3, b4) == b3);

  REQUIRE(voxels::box_size(b1) == Vec3i{1, 1, 1});
  REQUIRE(voxels::box_size(b2) == Vec3i{1, 1, 1});
  REQUIRE(voxels::box_size(b3) == Vec3i{1, 1, 1});
  REQUIRE(voxels::box_size(b4) == Vec3i{3, 3, 3});

  REQUIRE(voxels::box_contains(b1, vec3(0, 0, 0)));
  REQUIRE(!voxels::box_contains(b1, vec3(1, 0, 0)));
  REQUIRE(!voxels::box_contains(b1, vec3(0, 1, 0)));
  REQUIRE(!voxels::box_contains(b1, vec3(0, 0, 1)));
  REQUIRE(!voxels::box_contains(b1, vec3(0, 1, 1)));
  REQUIRE(!voxels::box_contains(b1, vec3(1, 0, 1)));
  REQUIRE(!voxels::box_contains(b1, vec3(1, 1, 0)));
  REQUIRE(!voxels::box_contains(b1, vec3(1, 1, 1)));

  REQUIRE(!voxels::box_contains(b2, vec3(0, 0, 0)));
  REQUIRE(!voxels::box_contains(b2, vec3(1, 0, 0)));
  REQUIRE(!voxels::box_contains(b2, vec3(0, 1, 0)));
  REQUIRE(!voxels::box_contains(b2, vec3(0, 0, 1)));
  REQUIRE(!voxels::box_contains(b2, vec3(0, 1, 1)));
  REQUIRE(!voxels::box_contains(b2, vec3(1, 0, 1)));
  REQUIRE(!voxels::box_contains(b2, vec3(1, 1, 0)));
  REQUIRE(voxels::box_contains(b2, vec3(1, 1, 1)));
}

}  // namespace voxeloo