#include "voxeloo/gaia/maps.hpp"

#include <catch2/catch.hpp>

#include "voxeloo/common/geometry.hpp"

using namespace voxeloo;  // NOLINT

TEST_CASE("Test the sparse map writer", "[all]") {
  gaia::WorldMap<int> map{
      {{-2, -2, -2}, {30, 30, 30}},
      tensors::make_tensor<int>({32, 32, 32}),
  };

  {
    gaia::SparseMapWriter<int> writer(map);
    writer.set({0, 0, 0}, 3);
    writer.set({-2, 1, -1}, 4);
    writer.set({5, 1, -2}, 5);
    writer.flush();
  }

  REQUIRE(map.get({0, 0, 0}) == 3);
  REQUIRE(map.get({-2, 1, -1}) == 4);
  REQUIRE(map.get({5, 1, -2}) == 5);

  {
    gaia::SparseMapWriter<int> writer(map);

    REQUIRE(writer.get({0, 0, 0}) == 3);
    REQUIRE(writer.get({-2, 1, -1}) == 4);
    REQUIRE(writer.get({5, 1, -2}) == 5);

    writer.set({0, 0, 0}, 6);
    writer.set({-2, -2, -2}, 7);
    writer.set({29, 29, 29}, 8);

    REQUIRE(writer.get({0, 0, 0}) == 6);
    REQUIRE(writer.get({-2, 1, -1}) == 4);
    REQUIRE(writer.get({5, 1, -2}) == 5);
    REQUIRE(writer.get({-2, -2, -2}) == 7);
    REQUIRE(writer.get({29, 29, 29}) == 8);

    writer.flush();
  }

  REQUIRE(map.get({0, 0, 0}) == 6);
  REQUIRE(map.get({-2, 1, -1}) == 4);
  REQUIRE(map.get({5, 1, -2}) == 5);
  REQUIRE(map.get({-2, -2, -2}) == 7);
  REQUIRE(map.get({29, 29, 29}) == 8);
}