#include "voxeloo/common/subbox.hpp"

#include <catch2/catch.hpp>

namespace voxeloo::subbox {

using Catch::Matchers::Equals;

template <typename T>
inline auto extend(std::vector<T>& out, const std::vector<T>& in) {
  out.insert(out.end(), in.begin(), in.end());
}

TEST_CASE("Test maximum subquad solver [case 1]", "[all]") {
  std::vector<bool> mask;

  // Layer 0
  extend(mask, {0, 1, 1});
  extend(mask, {0, 1, 1});
  extend(mask, {0, 1, 0});

  // Layer 1
  extend(mask, {1, 1, 1});
  extend(mask, {1, 1, 1});
  extend(mask, {0, 0, 0});

  // Layer 2
  extend(mask, {0, 1, 1});
  extend(mask, {1, 1, 1});
  extend(mask, {1, 0, 1});

  auto solution = solve(mask, {3, 3, 3});
  REQUIRE(solution.v0 == vec3(1u, 0u, 0u));
  REQUIRE(solution.v1 == vec3(3u, 2u, 3u));
}

TEST_CASE("Test maximum subquad solver [case 2]", "[all]") {
  std::vector<bool> mask;

  // Layer 0
  extend(mask, {0, 0, 1});
  extend(mask, {0, 1, 0});
  extend(mask, {0, 1, 0});

  // Layer 1
  extend(mask, {1, 1, 1});
  extend(mask, {1, 1, 1});
  extend(mask, {0, 0, 0});

  // Layer 2
  extend(mask, {0, 0, 1});
  extend(mask, {1, 1, 0});
  extend(mask, {1, 0, 1});

  auto solution = solve(mask, {3, 3, 3});
  REQUIRE(solution.v0 == vec3(0u, 0u, 1u));
  REQUIRE(solution.v1 == vec3(3u, 2u, 2u));
}

TEST_CASE("Test maximum subquad solver with empty matrix", "[all]") {
  auto solution = solve({}, {0, 0, 0});
  REQUIRE(solution.v0 == vec3(0u, 0u, 0u));
  REQUIRE(solution.v1 == vec3(0u, 0u, 0u));
}

TEST_CASE("Test maximum subquad solver with unit matrix", "[all]") {
  auto solution = solve({true}, {1, 1, 1});
  REQUIRE(solution.v0 == vec3(0u, 0u, 0u));
  REQUIRE(solution.v1 == vec3(1u, 1u, 1u));
}

}  // namespace voxeloo::subbox