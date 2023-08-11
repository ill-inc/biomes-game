#include "voxeloo/common/rays.hpp"

#include <catch2/catch.hpp>

namespace voxeloo {

using Catch::Detail::Approx;

TEST_CASE("Test ray integration", "[all]") {
  rays::DensityMap dm;
  dm.update({
      {{3, 4, 4}, 0.5f},
      {{4, 4, 4}, 1.0f},
      {{5, 4, 4}, 0.5f},
  });

  Vec3f src = {0.5f, 4.5f, 4.5f};
  Vec3f dir = Vec3f{1.0f, 0.0f, 0.0f};

  auto expected = 3.0f * (1.0f - std::exp(-0.5f));
  expected += 4.0f * std::exp(-0.5f) * (1.0f - std::exp(-1.0f));
  expected += 5.0f * std::exp(-1.5f) * (1.0f - std::exp(-0.5f));
  expected += 9.0f * std::exp(-2.0f);

  REQUIRE(rays::integrate_depth(dm, src, dir, 9.0f) == Approx(expected));
}

}  // namespace voxeloo