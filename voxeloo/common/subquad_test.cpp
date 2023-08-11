#include "voxeloo/common/subquad.hpp"

#include <catch2/catch.hpp>

namespace voxeloo::subquad {

using Catch::Matchers::Equals;

TEST_CASE("Test maximum subquad solver", "[all]") {
  std::array<std::array<bool, 4>, 5> matrix = {{
      {0, 1, 0, 1},
      {0, 1, 1, 1},
      {1, 1, 1, 1},
      {0, 1, 1, 0},
      {1, 1, 1, 0},
  }};

  // Create vector from example.
  std::vector<bool> mask;
  for (auto y : {0, 1, 2, 3, 4}) {
    for (auto x : {0, 1, 2, 3}) {
      mask.push_back(matrix[y][x]);
    }
  }

  auto solution = solve(mask, {4, 5});

  REQUIRE(solution.v0 == vec2(1u, 1u));
  REQUIRE(solution.v1 == vec2(3u, 5u));
}

TEST_CASE("Test maximum subquad solver with empty matrix", "[all]") {
  auto solution = solve({}, {0, 0});
  REQUIRE(solution.v0 == vec2(0u, 0u));
  REQUIRE(solution.v1 == vec2(0u, 0u));
}

TEST_CASE("Test maximum subquad solver with unit matrix", "[all]") {
  auto solution = solve({true}, {1, 1});
  REQUIRE(solution.v0 == vec2(0u, 0u));
  REQUIRE(solution.v1 == vec2(1u, 1u));
}

}  // namespace voxeloo::subquad