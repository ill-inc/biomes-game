#include "voxeloo/common/format.hpp"

#include <catch2/catch.hpp>

namespace voxeloo {

TEST_CASE("Test basic string formatting", "[all]") {
  int x = 1;
  float y = 2.3f;
  std::string z = "hello";

  auto out = stringify(x, ":", y, ";", z);
  REQUIRE(out == "1:2.3;hello");
}

}  // namespace voxeloo