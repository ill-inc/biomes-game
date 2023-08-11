#include "voxeloo/common/history.hpp"

#include <catch2/catch.hpp>

namespace voxeloo {
using Catch::Matchers::Equals;

TEST_CASE("Test update list empty operations", "[all]") {
  history::UpdateList<int> ul;

  REQUIRE(ul.time(0) == 0);
  REQUIRE(ul.time(1) == 0);
  REQUIRE(ul.time(2) == 0);

  int count = 0;
  ul.scan([&](...) {
    count += 1;
  });
  ul.scan(0, [&](...) {
    count += 1;
  });
  ul.scan(1, [&](...) {
    count += 1;
  });
  ul.scan(2, [&](...) {
    count += 1;
  });
  REQUIRE(count == 0);
};

TEST_CASE("Test update list one bump", "[all]") {
  history::UpdateList<int> ul;

  ul.bump(0);
  REQUIRE(ul.size() == 1);
  REQUIRE(ul.time() == 1);
  REQUIRE(ul.time(0) == 1);
  REQUIRE(ul.time(1) == 0);
  REQUIRE(ul.time(2) == 0);
  REQUIRE_THAT(
      ul.extract(),
      Equals(decltype(ul.extract()){
          {1, 0},
      }));

  ul.scan([](auto time, auto key) {
    REQUIRE(time == 1);
    REQUIRE(key == 0);
  });
};

TEST_CASE("Test update list many bumps", "[all]") {
  history::UpdateList<int> ul;
  ul.bump(0);
  ul.bump(1);
  ul.bump(0);
  ul.bump(2);
  ul.bump(0);
  ul.bump(1);

  REQUIRE(ul.size() == 3);
  REQUIRE(ul.time() == 6);
  REQUIRE(ul.time(0) == 5);
  REQUIRE(ul.time(1) == 6);
  REQUIRE(ul.time(2) == 4);
  REQUIRE_THAT(
      ul.extract(),
      Equals(decltype(ul.extract()){
          {4, 2},
          {5, 0},
          {6, 1},
      }));
};

TEST_CASE("Test update list scanning", "[all]") {
  history::UpdateList<int> ul;
  ul.bump(0);
  ul.bump(1);
  ul.bump(0);
  ul.bump(2);
  ul.bump(0);
  ul.bump(1);

  auto list = ul.extract();
  ul.scan([&, i = 0](auto time, auto key) mutable {
    REQUIRE(list[i++] == std::tuple(time, key));
  });
  ul.scan(0, [&, i = 0](auto time, auto key) mutable {
    REQUIRE(list[i++] == std::tuple(time, key));
  });
  ul.scan(1, [&, i = 0](auto time, auto key) mutable {
    REQUIRE(list[i++] == std::tuple(time, key));
  });
  ul.scan(4, [&, i = 0](auto time, auto key) mutable {
    REQUIRE(list[i++] == std::tuple(time, key));
  });
  ul.scan(5, [&, i = 1](auto time, auto key) mutable {
    REQUIRE(list[i++] == std::tuple(time, key));
  });
  ul.scan(6, [&, i = 2](auto time, auto key) mutable {
    REQUIRE(list[i++] == std::tuple(time, key));
  });
  ul.scan(7, [](...) {
    REQUIRE(false);
  });

  int n = 0;
  ul.scan(4, [&](...) {
    return ++n < 2;
  });
  REQUIRE(n == 2);
};

}  // namespace voxeloo