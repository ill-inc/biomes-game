#include "voxeloo/common/geometry.hpp"

#include <catch2/catch.hpp>

namespace voxeloo {
using Catch::Detail::Approx;

TEST_CASE("Test array indexing", "[all]") {
  Vec2i u = {1, 2};
  REQUIRE(u[0] == 1);
  REQUIRE(u[1] == 2);

  Vec3i v = {1, 2, 3};
  REQUIRE(v[0] == 1);
  REQUIRE(v[1] == 2);
  REQUIRE(v[2] == 3);

  Vec4i w = {1, 2, 3, 4};
  REQUIRE(w[0] == 1);
  REQUIRE(w[1] == 2);
  REQUIRE(w[2] == 3);
  REQUIRE(w[3] == 4);

  auto r = vec(1, 2, 3, 4, 5);
  REQUIRE(r[0] == 1);
  REQUIRE(r[1] == 2);
  REQUIRE(r[2] == 3);
  REQUIRE(r[3] == 4);
  REQUIRE(r[4] == 5);
}

TEST_CASE("Test field indexing", "[all]") {
  Vec2f u = {1.0f, 2.0f};
  REQUIRE(u.x == 1.0f);
  REQUIRE(u.y == 2.0f);

  Vec3f v = {1.0f, 2.0f, 3.0f};
  REQUIRE(v.x == 1.0f);
  REQUIRE(v.y == 2.0f);
  REQUIRE(v.z == 3.0f);

  Vec4f w = {1.0f, 2.0f, 3.0f, 4.0f};
  REQUIRE(w.x == 1.0f);
  REQUIRE(w.y == 2.0f);
  REQUIRE(w.z == 3.0f);
  REQUIRE(w.w == 4.0f);
}

TEST_CASE("Test structured binding", "[all]") {
  {
    auto [x, y] = vec2(1.0, 2.0);
    REQUIRE(x == 1.0);
    REQUIRE(y == 2.0);
  }

  {
    auto [x, y, z] = vec3(1.0, 2.0, 3.0);
    REQUIRE(x == 1.0);
    REQUIRE(y == 2.0);
    REQUIRE(z == 3.0);
  }

  {
    auto [x, y, z, w] = vec4(1.0, 2.0, 3.0, 4.0);
    REQUIRE(x == 1.0);
    REQUIRE(y == 2.0);
    REQUIRE(z == 3.0);
    REQUIRE(w == 4.0);
  }
}

TEST_CASE("Test formatting", "[all]") {
  REQUIRE("[1, 2]" == vec2(1, 2).str());
  REQUIRE("[1, 2, 3]" == vec3(1, 2, 3).str());
  REQUIRE("[1, 2, 3, 4]" == vec4(1, 2, 3, 4).str());
  REQUIRE("[1, 2, ..., 5]" == vec(1, 2, 3, 4, 5).str());
}

TEST_CASE("Test casting", "[all]") {
  REQUIRE(vec2(1.0f, 2.0f) == vec2(1, 2).to<float>());
  REQUIRE(vec3(1.0, 2.0, 3.0) == vec3(1.0f, 2.0f, 3.0f).to<double>());
  REQUIRE(vec4(1, 2, 3, 4) == vec4(1.0, 2.0, 3.0, 4.0).to<int>());
  REQUIRE(vec(1, 2, 3, 4, 5) == vec(1.0, 2.0, 3.0, 4.0, 5.0).to<int>());
}

TEST_CASE("Test inplace arithmetic", "[all]") {
  auto v = vec2(1, 2);
  v += 1;               // 2, 3
  v *= 2;               // 4, 6
  v /= 3;               // 1, 2
  v -= 1;               // 0, 1
  v += vec2(v.y, v.x);  // 1, 1
  v *= vec2(3, 4);      // 3, 4
  v /= vec2(1, 2);      // 3, 2
  v -= vec2(1, -1);     // 2, 3
  v *= v;               // 4, 9
  v %= 6;               // 4, 3
  REQUIRE(v == vec2(4, 3));
}

TEST_CASE("Test arithmetic operations", "[all]") {
  auto u = vec3(1, 2, 3);
  auto v = vec3(2, 3, 4);
  auto w = u * v - 2 * (v - u) / v + (11 * u % 3);
  REQUIRE(w == vec3(3, 7, 12));
}

TEST_CASE("Test dot product", "[all]") {
  auto u = vec3(1.0, 2.0, 3.0);
  auto v = vec3(2.0, -3.0, 4.0);
  REQUIRE(dot(u, v) == Approx(8.0));
}

TEST_CASE("Test cross product", "[all]") {
  auto u = vec3(-1.0, 1.0, 0.5);
  auto v = vec3(1.0, 2.0, -0.2);
  REQUIRE(cross(u, v) == vec3(-1.2, 0.3, -3.0));
}

TEST_CASE("Test min and max ", "[all]") {
  auto u = vec4(1, -2, 4, -2);
  auto v = vec4(2, 3, -1, -3);
  REQUIRE(min(u, v) == vec4(1, -2, -1, -3));
  REQUIRE(max(u, v) == vec4(2, 3, 4, -2));
}

TEST_CASE("Test clamp", "[all]") {
  auto u = vec3(-1.0f, 0.1f, 1.1f);
  REQUIRE(clamp(u, 0.0f, 1.0f) == vec3(0.0f, 0.1f, 1.0f));
}

TEST_CASE("Test norms", "[all]") {
  auto v = vec3(3.0, -4.0, 5.0);
  REQUIRE(sum(v) == Approx(4.0));
  REQUIRE(norm(v) == Approx(std::sqrt(50.0)));
  REQUIRE(square_norm(v) == Approx(50.0));
}

TEST_CASE("Test square", "[all]") {
  auto v = vec4(-2, 3, -4, 5);
  REQUIRE(square(v) == vec4(4, 9, 16, 25));
}

TEST_CASE("Test lerp", "[all]") {
  auto u = vec3(-1.0, 1.0, 0.5);
  auto v = vec3(1.0, 2.0, 0.2);
  REQUIRE(lerp(u, v, 0.2) == vec3(-0.6, 1.2, 0.44));
}

TEST_CASE("Test vec factory", "[all]") {
  REQUIRE(vec2(1, 2) == vec2(1, 2));
  REQUIRE(vec3(1.0f, 2.0f, 3.0f) == vec3(1.0f, 2.0f, 3.0f));
  REQUIRE(vec4(1.0, 2.0, 3.0, 4.0) == vec4(1.0, 2.0, 3.0, 4.0));
  REQUIRE(vec(1, 2, 3, 4, 5) == Vec<int, 5>({1, 2, 3, 4, 5}));
}

TEST_CASE("Test slicing operations", "[all]") {
  REQUIRE(vec4(1, 2, 3, 4).wzxy() == vec4(4, 3, 1, 2));
  REQUIRE(vec4(1, 2, 3, 4).yzx() == vec3(2, 3, 1));
  REQUIRE(vec4(1, 2, 3, 4).xw() == vec2(1, 4));
  REQUIRE(vec3(1, 2, 3).zxy() == vec3(3, 1, 2));
  REQUIRE(vec3(1, 2, 3).yz() == vec2(2, 3));
  REQUIRE(vec2(1, 2).yx() == vec2(2, 1));
  REQUIRE(vec(1, 2, 3, 4, 5, 6, 7, 8).slice<2, 6>() == vec(3, 4, 5, 6));
}

}  // namespace voxeloo