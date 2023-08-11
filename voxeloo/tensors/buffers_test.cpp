#include "voxeloo/tensors/buffers.hpp"

#include <catch2/catch.hpp>

#include "voxeloo/common/geometry.hpp"

using namespace voxeloo;           // NOLINT
using namespace voxeloo::tensors;  // NOLINT

TEST_CASE("Test buffers", "[all]") {
  auto buffer = [] {
    BufferBuilder<int> builder(5);
    builder.add(1);
    builder.add(2);
    builder.add(3);
    builder.add(4);
    builder.add(5);
    return std::move(builder).build();
  }();

  REQUIRE(buffer.size() == 5);
  REQUIRE(buffer[0] == 1);
  REQUIRE(buffer[1] == 2);
  REQUIRE(buffer[2] == 3);
  REQUIRE(buffer[3] == 4);
  REQUIRE(buffer[4] == 5);
}