#include "voxeloo/common/bits.hpp"

#include <vector>

#include "catch2/catch.hpp"

namespace voxeloo {

TEST_CASE("Test next_bit and last_bit", "[all]") {
  uint32_t x = 0b10001010u;

  REQUIRE(next_bit(x, 0) == 1);
  REQUIRE(next_bit(x, 1) == 1);
  REQUIRE(next_bit(x, 2) == 3);
  REQUIRE(next_bit(x, 3) == 3);
  REQUIRE(next_bit(x, 4) == 7);
  REQUIRE(next_bit(x, 7) == 7);
  REQUIRE(next_bit(x, 8) == 32);

  uint64_t y = 0b10001010ull;

  REQUIRE(next_bit(y, 0) == 1);
  REQUIRE(next_bit(y, 1) == 1);
  REQUIRE(next_bit(y, 2) == 3);
  REQUIRE(next_bit(y, 3) == 3);
  REQUIRE(next_bit(y, 4) == 7);
  REQUIRE(next_bit(y, 7) == 7);
  REQUIRE(next_bit(y, 8) == 64);

  REQUIRE(last_bit(x) == 7);
  REQUIRE(last_bit(y) == 7);
}

TEST_CASE("Test bit visit algorithm", "[all]") {
  uint32_t x = 0b10001010u;

  std::vector<int> out;
  visit_bits(x, [&](int i) {
    out.push_back(i);
  });

  REQUIRE(out.size() == 3);
  REQUIRE(out[0] == 1);
  REQUIRE(out[1] == 3);
  REQUIRE(out[2] == 7);
}

}  // namespace voxeloo