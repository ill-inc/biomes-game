#include "voxeloo/common/quadifier.hpp"

#include <vector>

#include "catch2/catch.hpp"
#include "voxeloo/common/geometry.hpp"

namespace voxeloo::quadifier {

TEST_CASE("Test merge on 3x2", "[all]") {
  auto quads = merge({
      {0, 0},
      {1, 0},
      {2, 0},
      {0, 1},
      {1, 1},
      {2, 1},
  });
  REQUIRE(quads.size() == 1);
  REQUIRE(quads[0] == Quad{{0, 0}, {3, 2}});
}

TEST_CASE("Test merge horizontal U", "[all]") {
  auto quads = merge({
      {0, 0},
      {1, 0},
      {2, 0},
      {3, 0},
      {3, 1},
      {0, 2},
      {1, 2},
      {2, 2},
      {3, 2},
  });
  REQUIRE(quads.size() == 3);
  REQUIRE(quads[0] == Quad{{0, 0}, {4, 1}});
  REQUIRE(quads[1] == Quad{{3, 1}, {4, 2}});
  REQUIRE(quads[2] == Quad{{0, 2}, {4, 3}});
}

TEST_CASE("Test merge vertical U", "[all]") {
  auto quads = merge({
      {0, 0},
      {1, 0},
      {2, 0},
      {0, 1},
      {2, 1},
      {0, 2},
      {2, 2},
      {0, 3},
      {2, 3},
  });
  REQUIRE(quads.size() == 3);
  REQUIRE(quads[0] == Quad{{0, 0}, {3, 1}});
  REQUIRE(quads[1] == Quad{{0, 1}, {1, 4}});
  REQUIRE(quads[2] == Quad{{2, 1}, {3, 4}});
}

TEST_CASE("Test merge disconnected", "[all]") {
  auto quads = merge({
      {0, 0},
      {1, 0},
      {0, 1},
      {1, 1},
      {3, 0},
      {3, 1},
      {3, 2},
      {0, 3},
      {1, 3},
      {2, 3},
      {3, 3},
  });
  REQUIRE(quads.size() == 3);
  REQUIRE(quads[0] == Quad{{0, 0}, {2, 2}});
  REQUIRE(quads[1] == Quad{{3, 0}, {4, 3}});
  REQUIRE(quads[2] == Quad{{0, 3}, {4, 4}});
}

}  // namespace voxeloo::quadifier