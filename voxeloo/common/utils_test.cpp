#include "voxeloo/common/utils.hpp"

#include <catch2/catch.hpp>

namespace voxeloo {

using Catch::Detail::Approx;

TEST_CASE("Test lerp", "[all]") {
  REQUIRE(lerp(1.0f, 3.0f, 0.0f) == Approx(1.0f));
  REQUIRE(lerp(1.0f, 3.0f, 1.0f) == Approx(3.0f));
  REQUIRE(lerp(1.0f, 3.0f, 0.5f) == Approx(2.0f));
}

TEST_CASE("Test rounding routines", "[all]") {
  REQUIRE(ifloor(3.5f) == 3);
  REQUIRE(ifloor(0.5f) == 0);
  REQUIRE(ifloor(-0.5f) == -1);
  REQUIRE(ifloor(-3.5f) == -4);

  REQUIRE(iceil(3.5f) == 4);
  REQUIRE(iceil(0.5f) == 1);
  REQUIRE(iceil(-0.5f) == 0);
  REQUIRE(iceil(-3.5f) == -3);
}

}  // namespace voxeloo