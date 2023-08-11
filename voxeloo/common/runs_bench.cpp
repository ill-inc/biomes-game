#include <algorithm>
#include <catch2/catch.hpp>

#include "voxeloo/common/runs.hpp"

namespace voxeloo {

template <typename Vector>
static auto shuffle(Vector&& v) {
  static std::random_device rd;
  static std::mt19937 g(rd());
  std::shuffle(v.begin(), v.end(), g);
}

TEST_CASE("Benchmark building", "[all]") {
  const auto n = 32 * 32 * 32;

  auto index = [&] {
    runs::IndexBuilder<uint32_t> builder(n, 0);
    for (uint32_t i = 0; i < n; i += 1) {
      builder.add(runs::Span{i, i + 1}, i + 1);
    }
    return std::move(builder).build();
  }();

  volatile int sum = 0;
  BENCHMARK("building") {
    runs::IndexBuilder<uint32_t> builder(index);
    std::move(builder).build();
    sum += 1;
  };

  struct Data {
    uint32_t lo;
    uint32_t hi;
    uint32_t val;
    size_t time;
  };

  BENCHMARK("sorting") {
    std::vector<Data> data;
    for (uint32_t i = 0; i < n; i += 1) {
      data.push_back(Data{i, i + 1, i + 1, i});
    }
    std::sort(data.begin(), data.end(), [](auto& a, auto& b) {
      return a.lo < b.lo || (a.lo == b.lo && a.time > b.time);
    });
    sum += 1;
  };
}

}  // namespace voxeloo
