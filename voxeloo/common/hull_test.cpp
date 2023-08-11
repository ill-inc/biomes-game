#include "voxeloo/common/hull.hpp"

#include <vector>

#include "catch2/catch.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/random.hpp"

namespace voxeloo::hull {

using Catch::Equals;
using Catch::Matchers::UnorderedEquals;

// Shifts the array until the lowest index is in the first position.
inline auto normalize(const std::vector<size_t>& in) {
  int min = 0;
  for (auto i = 1u; i < in.size(); i += 1) {
    if (in[min] > in[i]) {
      min = i;
    }
  }

  std::vector<size_t> out;
  for (auto i = 0u; i < in.size(); i += 1) {
    out.push_back(in[(min + i) % in.size()]);
  }
  return out;
}

// Generates random points in the unit triangle.
inline auto generate_tri_points(size_t n, size_t& u, size_t& v, size_t& w) {
  std::vector<Vec2d> points = {{0.0, 0.0}, {0.0, 1.0}, {1.0, 0.0}};
  for (auto i = 0u; i < 100; i += 1) {
    auto u = random::uniform_real<double>();
    auto v = random::uniform_real<double>() * (1.0 - u);
    auto w = 1.0 - u - v;
    points.push_back(u * points[0] + v * points[1] + w * points[2]);
  }

  // Shuffle the input points and record the indices of the expected hull.
  random::shuffle(points);
  for (auto i = 0u; i < points.size(); i += 1) {
    if (points[i] == vec2(0.0, 0.0)) {
      u = i;
    } else if (points[i] == vec2(1.0, 0.0)) {
      v = i;
    } else if (points[i] == vec2(0.0, 1.0)) {
      w = i;
    }
  }

  return points;
}

TEST_CASE("Test jarvis on 1 point", "[all]") {
  auto out = jarvis({{1.0, 1.0}});
  REQUIRE(out.size() == 1);
  REQUIRE_THAT(normalize(out), Equals<size_t>({0}));
}

TEST_CASE("Test jarvis on 2 points", "[all]") {
  auto out = jarvis({{1.0, 1.0}, {2.0, 2.0}});
  REQUIRE(out.size() == 2);
  REQUIRE_THAT(normalize(out), Equals<size_t>({0, 1}));
}

TEST_CASE("Test jarvis on 3 points", "[all]") {
  auto out = jarvis({{0.0, 0.0}, {1.0, 0.0}, {0.0, 1.0}});
  REQUIRE(out.size() == 3);
  REQUIRE_THAT(normalize(out), Equals<size_t>({0, 1, 2}));
}

TEST_CASE("Test jarvis on many points", "[all]") {
  // Generate a bunch of points inside a unit triangle.
  size_t u = 0u, v = 0u, w = 0u;
  auto points = generate_tri_points(100u, u, v, w);

  // Validate the output.
  auto out = jarvis(points);
  REQUIRE(out.size() == 3);
  REQUIRE_THAT(normalize(out), Equals<size_t>(normalize({u, v, w})));
}

TEST_CASE("Test jarvis on bad points", "[all]") {
  auto out = jarvis({{0.0, 0.0}, {0.0, 0.0}, {0.0, 0.0}});
  REQUIRE(out.size() > 0);
}

TEST_CASE("Test graham on 1 point", "[all]") {
  auto out = graham({{1.0, 1.0}});
  REQUIRE(out.size() == 1);
  REQUIRE_THAT(normalize(out), Equals<size_t>({0}));
}

TEST_CASE("Test graham on 2 points", "[all]") {
  auto out = graham({{1.0, 1.0}, {2.0, 2.0}});
  REQUIRE(out.size() == 2);
  REQUIRE_THAT(normalize(out), Equals<size_t>({0, 1}));
}

TEST_CASE("Test graham on 3 points", "[all]") {
  auto out = graham({{0.0, 0.0}, {1.0, 0.0}, {0.0, 1.0}});
  REQUIRE(out.size() == 3);
  REQUIRE_THAT(normalize(out), Equals<size_t>({0, 1, 2}));
}

TEST_CASE("Test graham on many points", "[all]") {
  // Generate a bunch of points inside a unit triangle.
  size_t u = 0u, v = 0u, w = 0u;
  auto points = generate_tri_points(100, u, v, w);

  // Validate the output.
  auto out = graham(points);
  REQUIRE(out.size() == 3);
  REQUIRE_THAT(normalize(out), Equals<size_t>(normalize({u, v, w})));
}

TEST_CASE("Test graham on bad points", "[all]") {
  auto out = graham({{0.0, 0.0}, {0.0, 0.0}, {0.0, 0.0}});
  REQUIRE(out.size() > 0);
}

}  // namespace voxeloo::hull