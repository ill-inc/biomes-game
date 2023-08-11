#include "voxeloo/biomes/memoize.hpp"

#include <catch2/catch.hpp>

using voxeloo::MemoizeAll;
using voxeloo::MemoizeLast;
using voxeloo::MemoizeLastAll;

int test_global_function() {
  return 100;
}

TEST_CASE("Test MemoizeLast forwards function result", "[all]") {
  auto test_function = []() {
    return 42;
  };

  MemoizeLast memoized(test_function);
  REQUIRE(memoized() == 42);
}

TEST_CASE("Test MemoizeLast forwards global function result", "[all]") {
  MemoizeLast memoized(test_global_function);
  REQUIRE(memoized() == 100);
}

TEST_CASE("Test MemoizeLast forwards std::function result", "[all]") {
  std::function test_function([]() {
    return 42;
  });

  MemoizeLast memoized(test_function);
  REQUIRE(memoized() == 42);
}

TEST_CASE(
    "Test MemoizeLast does not call function with no args than once", "[all]") {
  int counter = 0;
  auto test_function = [&]() {
    ++counter;
    return 42;
  };

  MemoizeLast memoized(test_function);
  REQUIRE(memoized() == 42);
  REQUIRE(counter == 1);
  REQUIRE(memoized() == 42);
  REQUIRE(counter == 1);
}

TEST_CASE(
    "Test MemoizeLast forwards result of function with parameter", "[all]") {
  auto test_function = [](int x) {
    return 42 + x;
  };

  MemoizeLast memoized(test_function);
  REQUIRE(memoized(3) == 45);
}

TEST_CASE(
    "Test MemoizeLast does not call function with parameter more than once",
    "[all]") {
  int count = 0;
  auto test_function = [&](int x) {
    ++count;
    return 42 + x;
  };

  MemoizeLast memoized(test_function);
  REQUIRE(memoized(3) == 45);
  REQUIRE(count == 1);
  REQUIRE(memoized(3) == 45);
  REQUIRE(count == 1);
  REQUIRE(memoized(4) == 46);
  REQUIRE(count == 2);
  REQUIRE(memoized(4) == 46);
  REQUIRE(count == 2);
  REQUIRE(memoized(3) == 45);
  REQUIRE(count == 3);
}

TEST_CASE("Make sure memoizing can distinguish null from uncached", "[all]") {
  int counter = 0;
  auto test_function = [&]() -> int* {
    ++counter;
    return nullptr;
  };

  MemoizeLast memoized(test_function);
  REQUIRE(memoized() == nullptr);
  REQUIRE(counter == 1);
  REQUIRE(memoized() == nullptr);
  REQUIRE(counter == 1);
}

TEST_CASE("Test MemoizeLast caches with multiple parameters", "[all]") {
  int count = 0;
  auto test_function = [&](int x, int y, int z) {
    ++count;
    return x + y + z;
  };

  MemoizeLast memoized(test_function);
  REQUIRE(memoized(1, 2, 3) == 6);
  REQUIRE(count == 1);
  REQUIRE(memoized(1, 2, 3) == 6);
  REQUIRE(count == 1);
  REQUIRE(memoized(3, 2, 1) == 6);
  REQUIRE(count == 2);
  REQUIRE(memoized(3, 2, 1) == 6);
  REQUIRE(count == 2);
  REQUIRE(memoized(1, 2, 3) == 6);
  REQUIRE(count == 3);
  REQUIRE(memoized(10, 20, 30) == 60);
  REQUIRE(count == 4);
}

TEST_CASE("Test MemoizeAll caches all values", "[all]") {
  int count = 0;
  auto test_function = [&](int x) {
    ++count;
    return 42 + x;
  };

  MemoizeAll memoized(test_function);
  REQUIRE(memoized(3) == 45);
  REQUIRE(count == 1);
  REQUIRE(memoized(3) == 45);
  REQUIRE(count == 1);
  REQUIRE(memoized(4) == 46);
  REQUIRE(count == 2);
  REQUIRE(memoized(4) == 46);
  REQUIRE(count == 2);
  // And now when we lookup our original value again it should come from
  // the cache again.
  REQUIRE(memoized(3) == 45);
  REQUIRE(count == 2);
}

TEST_CASE("Test MemoizeLastAll caches all values", "[all]") {
  int count = 0;
  auto test_function = [&](int x) {
    ++count;
    return 42 + x;
  };

  MemoizeLastAll memoized(test_function);
  REQUIRE(memoized(3) == 45);
  REQUIRE(count == 1);
  REQUIRE(memoized(3) == 45);
  REQUIRE(count == 1);
  REQUIRE(memoized(4) == 46);
  REQUIRE(count == 2);
  REQUIRE(memoized(4) == 46);
  REQUIRE(count == 2);
  // And now when we lookup our original value again it should come from
  // the cache again.
  REQUIRE(memoized(3) == 45);
  REQUIRE(count == 2);
  REQUIRE(memoized(3) == 45);
  REQUIRE(count == 2);
  REQUIRE(memoized(5) == 47);
  REQUIRE(count == 3);
  REQUIRE(memoized(5) == 47);
  REQUIRE(count == 3);
}
