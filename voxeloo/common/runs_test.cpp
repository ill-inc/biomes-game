#include "voxeloo/common/runs.hpp"

#include <algorithm>
#include <catch2/catch.hpp>

namespace voxeloo {

TEST_CASE("Test basic index usage", "[all]") {
  auto index = [] {
    runs::IndexBuilder<char> builder(6, '_');
    builder.add({0, 2}, 'X');
    builder.add(0, 'a');
    builder.add(1, 'b');
    builder.add({3, 5}, 'c');
    return std::move(builder).build();
  }();

  REQUIRE(index.run_count() == 5);
  REQUIRE(index.get(0) == 'a');
  REQUIRE(index.get(1) == 'b');
  REQUIRE(index.get(2) == '_');
  REQUIRE(index.get(3) == 'c');
  REQUIRE(index.get(4) == 'c');
  REQUIRE(index.get(5) == '_');
}

TEST_CASE("Test index usage with overwrites", "[all]") {
  auto index = [] {
    runs::IndexBuilder<int> builder(4'000'000'000, 0);
    builder.add({0, 12417}, 0);
    builder.add({12417, 12419}, 1);
    builder.add({12419, 4'000'000'000}, 0);
    builder.add(12417, 0);
    return std::move(builder).build();
  }();

  REQUIRE(index.run_count() == 3);
  REQUIRE(index.get(0) == 0);
  REQUIRE(index.get(12416) == 0);
  REQUIRE(index.get(12417) == 0);
  REQUIRE(index.get(12418) == 1);
  REQUIRE(index.get(12419) == 0);
  REQUIRE(index.get(12420) == 0);
}

TEST_CASE("Test index updating", "[all]") {
  auto base = [] {
    runs::IndexBuilder<char> builder(6, '_');
    builder.add({0, 2}, 'X');
    builder.add(0, 'a');
    builder.add(1, 'b');
    builder.add({3, 5}, 'c');
    return std::move(builder).build();
  }();

  auto index = [&] {
    runs::IndexBuilder<char> builder(base);
    builder.add({1, 3}, 'c');
    return std::move(builder).build();
  }();

  REQUIRE(index.run_count() == 3);
  REQUIRE(index.get(0) == 'a');
  REQUIRE(index.get(1) == 'c');
  REQUIRE(index.get(2) == 'c');
  REQUIRE(index.get(3) == 'c');
  REQUIRE(index.get(4) == 'c');
  REQUIRE(index.get(5) == '_');
}

}  // namespace voxeloo