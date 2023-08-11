#include "voxeloo/common/sparse.hpp"

#include <catch2/catch.hpp>

namespace voxeloo::sparse {

using Catch::Matchers::Equals;

TEST_CASE("Test basic sparse array usage", "[all]") {
  ArrayBuilder<int, char> builder;

  // Assign a bunch of values with duplicates.
  builder.set(6, 'j');
  builder.set(3, 'l');
  builder.set(1, 'X');
  builder.set(9, '!');
  builder.set(4, 'X');
  builder.set(8, 'e');
  builder.set(0, 'X');
  builder.set(7, 'o');
  builder.set(2, 'l');
  builder.set(5, ' ');
  builder.set(1, 'e');
  builder.set(0, 'Y');
  builder.set(4, 'o');
  builder.set(0, 'h');

  // Assign a bunch of values with duplicates.
  std::string result = "XXXXXXXXXX";
  for (auto [pos, val] : std::move(builder).build()) {
    result[pos] = val;
  }

  REQUIRE(result == "hello joe!");
}

TEST_CASE("Test sparse array usage with non-trivial value types", "[all]") {
  ArrayBuilder<int, std::vector<int>> builder;

  // Assign a bunch of values with duplicates.
  builder.set(2, {7, 8, 9});
  builder.set(0, {1, 2, 3});
  builder.set(1, {4, 5, 6});

  // Assign a bunch of values with duplicates.
  auto array = std::move(builder).build();
  REQUIRE_THAT(*get_ptr(array, 0), Equals(std::vector<int>{1, 2, 3}));
  REQUIRE_THAT(*get_ptr(array, 1), Equals(std::vector<int>{4, 5, 6}));
  REQUIRE_THAT(*get_ptr(array, 2), Equals(std::vector<int>{7, 8, 9}));
}

}  // namespace voxeloo::sparse