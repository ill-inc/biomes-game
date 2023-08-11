#include "voxeloo/gaia/stream.hpp"

#include <catch2/catch.hpp>

#include "voxeloo/common/geometry.hpp"

using namespace voxeloo;  // NOLINT
using Catch::Matchers::Equals;

template <typename T, typename Range>
inline auto to_vector(Range&& range) {
  std::vector<T> out;
  for (auto val : range) {
    out.push_back(val);
  }
  return out;
}

TEST_CASE("Test the stream data structure", "[all]") {
  gaia::Stream<int> stream;

  auto sub1 = stream.subscribe();
  auto sub2 = stream.subscribe();

  stream.write(1);
  stream.write(2);

  auto sub3 = stream.subscribe();

  stream.write(3);
  stream.write(4);

  sub1.close();

  auto sub4 = stream.subscribe();

  stream.write(5);

  sub2.close();

  stream.write(6);

  sub3.close();
  sub4.close();

  REQUIRE(!sub1.open());
  REQUIRE(!sub2.open());
  REQUIRE(!sub3.open());
  REQUIRE(!sub4.open());

  REQUIRE(to_vector<int>(sub1.read()) == std::vector<int>({1, 2, 3, 4}));
  REQUIRE(to_vector<int>(sub2.read()) == std::vector<int>({1, 2, 3, 4, 5}));
  REQUIRE(to_vector<int>(sub3.read()) == std::vector<int>({3, 4, 5, 6}));
  REQUIRE(to_vector<int>(sub4.read()) == std::vector<int>({5, 6}));

  REQUIRE(sub1.read().empty());
  REQUIRE(sub2.read().empty());
  REQUIRE(sub3.read().empty());
  REQUIRE(sub4.read().empty());
}