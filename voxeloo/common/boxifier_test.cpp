#include "voxeloo/common/boxifier.hpp"

#include <catch2/catch.hpp>
#include <vector>

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/voxels.hpp"

namespace voxeloo::boxifier {

TEST_CASE("Test boxifier case 1", "[all]") {
  Boxifier boxifier;
  boxifier.push({{0, 0, 0}, 4});
  boxifier.push({{0, 1, 0}, 4});
  boxifier.push({{0, 3, 0}, 4});
  boxifier.push({{0, 0, 1}, 4});
  boxifier.push({{0, 1, 1}, 4});
  boxifier.push({{0, 2, 1}, 4});

  auto ret = boxifier.build();
  REQUIRE(ret.size() == 3);
  REQUIRE(ret[0] == Box{{0, 0, 0}, {4, 2, 1}});
  REQUIRE(ret[1] == Box{{0, 3, 0}, {4, 4, 1}});
  REQUIRE(ret[2] == Box{{0, 0, 1}, {4, 3, 2}});
}

TEST_CASE("Test boxifier case 2", "[all]") {
  Boxifier boxifier;
  boxifier.push({{2, 0, 0}, 1});
  boxifier.push({{2, 1, 0}, 1});
  boxifier.push({{2, 0, 1}, 1});
  boxifier.push({{0, 1, 1}, 1});
  boxifier.push({{2, 1, 1}, 1});

  auto ret = boxifier.build();
  REQUIRE(ret.size() == 2);
  REQUIRE(ret[0] == Box{{2, 0, 0}, {3, 2, 2}});
  REQUIRE(ret[1] == Box{{0, 1, 1}, {1, 2, 2}});
}

}  // namespace voxeloo::boxifier