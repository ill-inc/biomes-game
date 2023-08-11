#include "voxeloo/common/spatial.hpp"

#include <array>
#include <catch2/catch.hpp>
#include <fstream>
#include <random>

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/random.hpp"

namespace voxeloo {

using random::uniform_int;

TEST_CASE("Test spatial map", "[all]") {
  spatial::Map<int> map;

  map[vec3(1, 3, 5)] = 1;
  map[vec3(2, 4, 0)] = 2;
  map[vec3(1, 0, 1)] = 3;
  map[vec3(0, 1, 1)] = 4;

  REQUIRE(map.at(vec3(1, 3, 5)) == 1);
  REQUIRE(map.at(vec3(2, 4, 0)) == 2);
  REQUIRE(map.at(vec3(1, 0, 1)) == 3);
  REQUIRE(map.at(vec3(0, 1, 1)) == 4);
}

TEST_CASE("Test spatial map vs an std::map", "[all]") {
  const auto n = 10'000;

  std::vector<std::array<int, 4>> data;
  for (int i = 0; i < n; i += 1) {
    auto x = uniform_int();
    auto y = uniform_int();
    auto z = uniform_int();
    data.push_back({x, y, z, uniform_int()});
    data.push_back({x, y, z, uniform_int()});
    data.push_back({x, y, z, uniform_int()});
  }

  // Insert the random points into the map.
  auto map_insertions = 0;
  auto map_overwrites = 0;
  spatial::Map<int> map;
  for (auto [x, y, z, v] : data) {
    if (!map.count(vec3(x, y, z))) {
      map[vec3(x, y, z)] = v;
      map_insertions++;
    } else if (map.at(vec3(x, y, z)) > v) {
      map[vec3(x, y, z)] = v;
      map_overwrites++;
    }
  }

  // Insert the random points into the std map.
  auto basic_map_insertions = 0;
  auto basic_map_overwrites = 0;
  std::map<std::array<int, 3>, int> basic_map;
  for (auto [x, y, z, v] : data) {
    std::array<int, 3> key = {x, y, z};
    auto iter = basic_map.find(key);
    if (iter == basic_map.end()) {
      basic_map[key] = v;
      basic_map_insertions++;
    } else if (iter->second > v) {
      basic_map.at(key) = v;
      basic_map_overwrites++;
    }
  }

  // Make sure that the points check out.
  for (auto [x, y, z, v] : data) {
    REQUIRE(map.at(vec3(x, y, z)) == basic_map.at({x, y, z}));
  }

  REQUIRE(map_insertions == basic_map_insertions);
  REQUIRE(map_overwrites == basic_map_overwrites);
}

TEST_CASE("Test spatial map with a bunch of values", "[all]") {
  const auto n = 1'000'000;

  std::vector<std::array<int, 4>> data;
  for (int i = 0; i < n; i += 1) {
    data.push_back(std::array{
        uniform_int(),
        uniform_int(),
        uniform_int(),
        uniform_int(),
    });
  }

  // Insert the random points into the map.
  spatial::Map<int> map;
  for (auto [x, y, z, v] : data) {
    map[vec3(x, y, z)] = v;
  }

  // Make sure that the points check out.
  for (auto [x, y, z, v] : data) {
    REQUIRE(map.at(vec3(x, y, z)) == v);
  }
}

TEST_CASE("Test spatial index", "[all]") {
  spatial::Index<int, 32> index;
  index.update({
      {{0, 312, -56}, 1},
      {{-27, -41, 0}, 2},
      {{-9, 128, -1}, 3},
      {{5, -342, 11}, 4},
  });
  index.remove({
      {0, 312, -56},
      {-9, 128, -1},
  });

  auto acc = index.access();
  REQUIRE(acc.has(-27, -41, 0));
  REQUIRE(acc.has(5, -342, 11));
  REQUIRE(!acc.has(0, 312, -56));
  REQUIRE(!acc.has(-9, 128, -1));
  REQUIRE(acc.get(-27, -41, 0) == 2);
  REQUIRE(acc.get(5, -342, 11) == 4);
}

TEST_CASE("Test spatial index vs an std::map", "[all]") {
  const auto n = 10'000;

  std::vector<std::array<int, 4>> data;
  for (int i = 0; i < n; i += 1) {
    auto x = uniform_int();
    auto y = uniform_int();
    auto z = uniform_int();
    data.push_back({x, y, z, uniform_int()});
    data.push_back({x, y, z, uniform_int()});
    data.push_back({x, y, z, uniform_int()});
  }

  // Insert the random points into the map.
  auto map_insertions = 0;
  auto map_overwrites = 0;
  spatial::Index<int> map;
  for (auto [x, y, z, v] : data) {
    auto acc = map.access();
    if (!acc.has(x, y, z)) {
      map.update({{{x, y, z}, v}});
      map_insertions++;
    } else if (acc.get(x, y, z) > v) {
      map.update({{{x, y, z}, v}});
      map_overwrites++;
    }
  }

  // Insert the random points into the std map.
  auto basic_map_insertions = 0;
  auto basic_map_overwrites = 0;
  std::map<std::array<int, 3>, int> basic_map;
  for (auto [x, y, z, v] : data) {
    std::array<int, 3> key = {x, y, z};
    auto iter = basic_map.find(key);
    if (iter == basic_map.end()) {
      basic_map[key] = v;
      basic_map_insertions++;
    } else if (iter->second > v) {
      basic_map.at(key) = v;
      basic_map_overwrites++;
    }
  }

  // Make sure that the points check out.
  for (auto [x, y, z, v] : data) {
    REQUIRE(map.access().get(x, y, z) == basic_map.at({x, y, z}));
  }

  REQUIRE(map_insertions == basic_map_insertions);
  REQUIRE(map_overwrites == basic_map_overwrites);
}

TEST_CASE("Test compact index", "[all]") {
  using Catch::Matchers::UnorderedEquals;

  spatial::RangeIndex<int, 32> index;
  index.update({
      {{1, 3, 5}, 1},
      {{2, 4, 0}, 2},
      {{1, 0, 1}, 3},
      {{0, 1, 1}, 4},
      {{-1, -1, -1}, 4},
      {{-123123, 1123123, -13143}, -123},
  });

  auto acc = index.access();
  REQUIRE(acc.get(1, 3, 5) == 1);
  REQUIRE(acc.get(2, 4, 0) == 2);
  REQUIRE(acc.get(1, 0, 1) == 3);
  REQUIRE(acc.get(0, 1, 1) == 4);
  REQUIRE(acc.get(-1, -1, -1) == 4);
  REQUIRE(acc.get(-123123, 1123123, -13143) == -123);

  REQUIRE(acc.get(1, 2, 5) == 0);
  REQUIRE(acc.get(0, 3, 5) == 0);
  REQUIRE(acc.get(1, 3, 4) == 0);
  REQUIRE(acc.get(2, 3, 5) == 0);
  REQUIRE(acc.get(1, 4, 5) == 0);
  REQUIRE(acc.get(1, 3, 6) == 0);
  REQUIRE(acc.get(-123124, 1123123, -13143) == 0);
  REQUIRE(acc.get(-123122, 1123123, -13143) == 0);

  std::vector<std::array<int, 4>> out;
  index.scan([&](int x, int y, int z, int v) {
    out.push_back(std::array{x, y, z, v});
  });
  REQUIRE_THAT(
      out,
      UnorderedEquals(std::vector<std::array<int, 4>>{
          {1, 3, 5, 1},
          {2, 4, 0, 2},
          {1, 0, 1, 3},
          {0, 1, 1, 4},
          {-1, -1, -1, 4},
          {-123123, 1123123, -13143, -123},
      }));
}

TEST_CASE("Test spatial range index vs an std::map", "[all]") {
  const auto n = 10'000;

  auto non_zero_uniform_int = []() {
    auto ret = uniform_int();
    while (!ret) {
      ret = uniform_int();
    }
    return ret;
  };

  std::vector<std::array<int, 4>> data;
  for (int i = 0; i < n; i += 1) {
    auto x = uniform_int();
    auto y = uniform_int();
    auto z = uniform_int();
    data.push_back({x, y, z, non_zero_uniform_int()});
    data.push_back({x, y, z, non_zero_uniform_int()});
    data.push_back({x, y, z, non_zero_uniform_int()});
  }

  // Insert the random points into the map.
  auto map_insertions = 0;
  auto map_overwrites = 0;
  spatial::RangeIndex<int> map;
  for (auto [x, y, z, v] : data) {
    auto acc = map.access();
    if (acc.get(x, y, z) == 0) {
      map.update({{{x, y, z}, v}});
      map_insertions++;
    } else if (acc.get(x, y, z) > v) {
      map.update({{{x, y, z}, v}});
      map_overwrites++;
    }
  }

  // Insert the random points into the std map.
  auto basic_map_insertions = 0;
  auto basic_map_overwrites = 0;
  std::map<std::array<int, 3>, int> basic_map;
  for (auto [x, y, z, v] : data) {
    std::array<int, 3> key = {x, y, z};
    auto iter = basic_map.find(key);
    if (iter == basic_map.end()) {
      basic_map[key] = v;
      basic_map_insertions++;
    } else if (iter->second > v) {
      basic_map.at(key) = v;
      basic_map_overwrites++;
    }
  }

  // Make sure that the points check out.
  for (auto [x, y, z, v] : data) {
    REQUIRE(map.access().get(x, y, z) == basic_map.at({x, y, z}));
  }

  REQUIRE(map_insertions == basic_map_insertions);
  REQUIRE(map_overwrites == basic_map_overwrites);
}

}  // namespace voxeloo