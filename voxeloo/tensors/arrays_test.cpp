#include "voxeloo/tensors/arrays.hpp"

#include <catch2/catch.hpp>

#include "voxeloo/common/geometry.hpp"

using namespace voxeloo;           // NOLINT
using namespace voxeloo::tensors;  // NOLINT

TEST_CASE("Test arrays", "[all]") {
  auto array = [] {
    ArrayBuilder<char> builder(8);
    builder.add(1, 'a');
    builder.add(1, 'a');
    builder.add(1, 'a');
    builder.add(2, 'b');
    builder.add(1, 'a');
    builder.add(2, 'b');
    builder.add(1, 'b');
    builder.add(1, 'c');
    return std::move(builder).build();
  }();

  REQUIRE(array.get(0) == 'a');
  REQUIRE(array.get(1) == 'a');
  REQUIRE(array.get(2) == 'a');
  REQUIRE(array.get(3) == 'b');
  REQUIRE(array.get(4) == 'b');
  REQUIRE(array.get(5) == 'a');
  REQUIRE(array.get(6) == 'b');
  REQUIRE(array.get(7) == 'b');
  REQUIRE(array.get(8) == 'b');
  REQUIRE(array.get(9) == 'c');

  REQUIRE(array.size() == 10);
  REQUIRE(array.dict.count() == 5);
}

TEST_CASE("Test array builder resizing", "[all]") {
  auto array = [] {
    ArrayBuilder<char> builder;
    builder.add(1, 'a');
    builder.add(1, 'a');
    builder.add(1, 'a');
    builder.add(2, 'b');
    builder.add(1, 'a');
    builder.add(2, 'b');
    builder.add(1, 'b');
    builder.add(1, 'c');
    return std::move(builder).build();
  }();

  REQUIRE(array.get(0) == 'a');
  REQUIRE(array.get(1) == 'a');
  REQUIRE(array.get(2) == 'a');
  REQUIRE(array.get(3) == 'b');
  REQUIRE(array.get(4) == 'b');
  REQUIRE(array.get(5) == 'a');
  REQUIRE(array.get(6) == 'b');
  REQUIRE(array.get(7) == 'b');
  REQUIRE(array.get(8) == 'b');
  REQUIRE(array.get(9) == 'c');

  REQUIRE(array.size() == 10);
  REQUIRE(array.dict.count() == 5);
}

TEST_CASE("Test array scanner", "[all]") {
  auto array = [] {
    ArrayBuilder<char> builder;
    builder.add(1, 'a');
    builder.add(1, 'a');
    builder.add(1, 'a');
    builder.add(2, 'b');
    builder.add(1, 'a');
    builder.add(2, 'b');
    builder.add(1, 'b');
    builder.add(1, 'c');
    return std::move(builder).build();
  }();

  ArrayScanner<char> scanner(array);

  REQUIRE(!scanner.done());
  REQUIRE(scanner.end() == 3);
  REQUIRE(scanner.val() == 'a');
  scanner.next();

  REQUIRE(!scanner.done());
  REQUIRE(scanner.end() == 5);
  REQUIRE(scanner.val() == 'b');
  scanner.next();

  REQUIRE(!scanner.done());
  REQUIRE(scanner.end() == 6);
  REQUIRE(scanner.val() == 'a');
  scanner.next();

  REQUIRE(!scanner.done());
  REQUIRE(scanner.end() == 9);
  REQUIRE(scanner.val() == 'b');
  scanner.next();

  REQUIRE(!scanner.done());
  REQUIRE(scanner.end() == 10);
  REQUIRE(scanner.val() == 'c');
  scanner.next();

  REQUIRE(scanner.done());
}

TEST_CASE("Test array merge routine", "[all]") {
  auto array_1 = [] {
    ArrayBuilder<int> builder;
    builder.add(1, 1);
    builder.add(1, 1);
    builder.add(1, 1);
    builder.add(2, 2);
    builder.add(1, 1);
    builder.add(2, 2);
    builder.add(1, 2);
    builder.add(1, 3);
    return std::move(builder).build();
  }();

  auto array_2 = [] {
    ArrayBuilder<int> builder;
    builder.add(1, 0);
    builder.add(1, 0);
    builder.add(1, 0);
    builder.add(2, 4);
    builder.add(1, 0);
    builder.add(2, 4);
    builder.add(1, 4);
    builder.add(1, 0);
    return std::move(builder).build();
  }();

  auto array_3 = [&] {
    ArrayBuilder<int> builder;

    ArrayScanner<int> scanner_1(array_1);
    ArrayScanner<int> scanner_2(array_2);
    while (!scanner_1.done() && !scanner_2.done()) {
      auto end = std::min(scanner_1.end(), scanner_2.end());
      auto val = scanner_2.val() ? scanner_2.val() : scanner_1.val();
      builder.add(end - builder.back(), val);
      if (scanner_1.end() == end) {
        scanner_1.next();
      } else {
        scanner_2.next();
      }
    }

    return std::move(builder).build();
  }();

  REQUIRE(array_3.get(0) == 1);
  REQUIRE(array_3.get(1) == 1);
  REQUIRE(array_3.get(2) == 1);
  REQUIRE(array_3.get(3) == 4);
  REQUIRE(array_3.get(4) == 4);
  REQUIRE(array_3.get(5) == 1);
  REQUIRE(array_3.get(6) == 4);
  REQUIRE(array_3.get(7) == 4);
  REQUIRE(array_3.get(8) == 4);
  REQUIRE(array_3.get(9) == 3);

  REQUIRE(array_3.size() == 10);
  REQUIRE(array_3.dict.count() == 5);
}