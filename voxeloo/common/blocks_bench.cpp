#include <algorithm>
#include <catch2/catch.hpp>
#include <cmath>
#include <random>

#include "voxeloo/common/blocks.hpp"

namespace voxeloo {

TEST_CASE("Benchmark linear points", "[all]") {
  constexpr int n = 1'000'000;

  // Generate n points near the surface of a sphere cube.
  std::vector<std::tuple<int, int, int>> points;
  for (int i = 0; i < n; i += 1) {
    points.emplace_back(i, i, i);
  }

  blocks::BlockList<int> blocks;

  // Assign all points into a voxel map.
  BENCHMARK("assign_n") {
    blocks::BlockBuilder<int> bb(1.0f);
    for (auto [x, y, z] : points) {
      bb.add(x, y, z, 2);
    }
    blocks = std::move(bb).build();
  };

  // Make sure that all values are set correctly.
  blocks::BlockReader<int> reader(blocks);
  for (auto [x, y, z] : points) {
    REQUIRE(reader.get_or(x, y, z, 0) == 2);
  }

  // Iterate over all voxels.
  volatile int sum = 0;
  volatile int cnt = 0;
  BENCHMARK("each_n") {
    sum = 0;
    cnt = 0;
    blocks::for_each(blocks, [&](int x, int y, int z, int v) {
      sum += v;
      cnt += 1;
    });
  };
  REQUIRE(sum == 2 * n);
  REQUIRE(cnt == n);

  // Random read all voxels.
  std::random_device rd;
  std::mt19937 g(rd());
  std::shuffle(points.begin(), points.end(), g);
  BENCHMARK("read_n") {
    sum = 0;
    cnt = 0;
    blocks::BlockReader<int> reader2(blocks);
    for (auto [x, y, z] : points) {
      sum += reader2.get_or(x, y, z, 0);
      cnt += 1;
    }
  };
  REQUIRE(sum == 2 * n);
  REQUIRE(cnt == n);
}

}  // namespace voxeloo