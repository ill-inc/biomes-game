#include "voxeloo/tensors/succinct.hpp"

#include <catch2/catch.hpp>

#include "voxeloo/common/geometry.hpp"

using namespace voxeloo;           // NOLINT
using namespace voxeloo::tensors;  // NOLINT

TEST_CASE("Test the succinct rank dictionary", "[all]") {
  auto dict = make_dict(buffer_of<DictKey>({1, 3, 5, 15, 33, 34, 1024, 13125}));

  REQUIRE(dict.rank(0) == 0);
  REQUIRE(dict.rank(1) == 0);
  REQUIRE(dict.rank(2) == 1);
  REQUIRE(dict.rank(3) == 1);
  REQUIRE(dict.rank(4) == 2);
  REQUIRE(dict.rank(5) == 2);
  REQUIRE(dict.rank(6) == 3);
  REQUIRE(dict.rank(15) == 3);
  REQUIRE(dict.rank(16) == 4);
  REQUIRE(dict.rank(33) == 4);
  REQUIRE(dict.rank(34) == 5);
  REQUIRE(dict.rank(35) == 6);
  REQUIRE(dict.rank(1024) == 6);
  REQUIRE(dict.rank(1025) == 7);
  REQUIRE(dict.rank(13125) == 7);
  REQUIRE(dict.rank(13126) == 8);

  REQUIRE(dict.max() == 13125);
  REQUIRE(dict.count() == 8);

  std::vector<DictKey> keys;
  dict.scan([&](DictKey key) {
    keys.push_back(key);
  });
  REQUIRE(keys.size() == 8);
  REQUIRE(keys[0] == 1);
  REQUIRE(keys[1] == 3);
  REQUIRE(keys[2] == 5);
  REQUIRE(keys[3] == 15);
  REQUIRE(keys[4] == 33);
  REQUIRE(keys[5] == 34);
  REQUIRE(keys[6] == 1024);
  REQUIRE(keys[7] == 13125);
}

TEST_CASE("Test scanning a rank dict", "[all]") {
  auto dict = make_dict(buffer_of<DictKey>({1, 3, 5, 15, 33, 34, 1024, 13125}));

  RankDictScanner scanner(dict);

  std::vector<DictKey> keys;
  for (auto i = 0u; i < 8; i += 1) {
    REQUIRE(!scanner.done());
    REQUIRE(scanner.curr().rank == i);
    keys.push_back(scanner.curr().key);
    scanner.next();
  }

  REQUIRE(scanner.done());
  REQUIRE(keys.size() == 8);
  REQUIRE(keys[0] == 1);
  REQUIRE(keys[1] == 3);
  REQUIRE(keys[2] == 5);
  REQUIRE(keys[3] == 15);
  REQUIRE(keys[4] == 33);
  REQUIRE(keys[5] == 34);
  REQUIRE(keys[6] == 1024);
  REQUIRE(keys[7] == 13125);
}

TEST_CASE("Test skipping over a rank dict", "[all]") {
  auto dict = make_dict(buffer_of<DictKey>({1, 3, 5, 15, 33, 34, 1024, 13125}));

  RankDictScanner scanner(dict);

  REQUIRE(scanner.curr().key == 1);
  scanner.next();

  REQUIRE(scanner.curr().key == 3);
  scanner.skip(4);

  REQUIRE(scanner.curr().key == 5);
  scanner.next();

  REQUIRE(scanner.curr().key == 15);
  scanner.skip(33);

  REQUIRE(scanner.curr().key == 34);
  scanner.skip(1024);

  REQUIRE(scanner.curr().key == 13125);
  scanner.next();

  REQUIRE(scanner.done());
  scanner.skip(33);

  REQUIRE(scanner.curr().key == 34);
  scanner.next();

  REQUIRE(scanner.curr().key == 1024);
  scanner.skip(13125);

  REQUIRE(scanner.done());
}

TEST_CASE("Test range-loop over a rank dict", "[all]") {
  auto dict = make_dict(buffer_of<DictKey>({1, 3, 5, 15, 33, 34, 1024, 13125}));

  int counter = 0;
  for (auto [i, key] : dict) {
    REQUIRE(i == counter++);
  }
}