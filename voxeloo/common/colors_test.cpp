#include "voxeloo/common/colors.hpp"

#include <catch2/catch.hpp>

namespace voxeloo {

using Catch::Detail::Approx;

TEST_CASE("Test color routines", "[all]") {
  float r = 0.1f;
  float g = 0.2f;
  float b = 0.3f;
  float a = 0.4f;

  // Test converting to RGBA format.
  RGBA rgba = colors::to_rgba(0.1f, 0.2f, 0.3f, 0.4f);
  REQUIRE(rgba == 0x19334c66);

  // Test converting to float format.
  auto [fr, fg, fb, fa] = colors::to_floats(rgba);
  REQUIRE(fr == Approx(r).margin(1.0f / 255));
  REQUIRE(fg == Approx(g).margin(1.0f / 255));
  REQUIRE(fb == Approx(b).margin(1.0f / 255));
  REQUIRE(fa == Approx(a).margin(1.0f / 255));

  // Test lerping.
  auto [lr, lg, lb, la] = colors::to_floats(colors::lerp(0, rgba, 0.5));
  REQUIRE(lr == Approx(0.05f).margin(1.0f / 255));
  REQUIRE(lg == Approx(0.10f).margin(1.0f / 255));
  REQUIRE(lb == Approx(0.15f).margin(1.0f / 255));
  REQUIRE(la == Approx(0.20f).margin(1.0f / 255));
}

}  // namespace voxeloo