#include "voxeloo/common/threads.hpp"

#include <catch2/catch.hpp>
#include <thread>

#include "voxeloo/common/macros.hpp"

namespace voxeloo {

TEST_CASE("Test parallel_for usage", "[all]") {
  uint32_t n = 1'000'000;
  std::atomic<uint32_t> count = 0;
  threads::parallel_for(n, [&](uint32_t i0, uint32_t i1) {
    for (uint32_t i = i0; i < i1; i += 1) {
      count += 1;
    }
  });
  REQUIRE(count == n);
}

TEST_CASE("Test that parallel_for distributes evenly", "[all]") {
  std::mutex mutex;
  int n = 1'000'000;
  std::vector<std::tuple<int, int>> spans;
  threads::parallel_for(n, [&](uint32_t i0, uint32_t i1) {
    std::lock_guard lock(mutex);
    spans.emplace_back(static_cast<int>(i0), static_cast<int>(i1));
  });

  // Sort the ranges.
  std::sort(spans.begin(), spans.end());

  // Validate the ranges.
  REQUIRE(std::get<0>(spans.front()) == 0);
  for (size_t i = 1; i < spans.size(); i += 1) {
    auto [l0, r0] = spans.at(i - 1);
    auto [l1, r1] = spans.at(i);
    REQUIRE(r0 == l1);
    REQUIRE(std::abs((r0 - l0) - (r1 - l1)) <= 1);
  }
  REQUIRE(std::get<1>(spans.back()) == n);
}

TEST_CASE("Test a parallel reduce", "[all]") {
  uint32_t n = 1'000'000;
  threads::Synchronized<int> sync;
  threads::parallel_for(
      n, 128, [&](ATTR_UNUSED uint32_t i0, ATTR_UNUSED uint32_t i1) {
        sync.apply([&](auto& num) {
          num += 1;
        });
      });
  REQUIRE(sync.get() == 128);
}

TEST_CASE("Test throttle", "[all]") {
  using namespace std::chrono_literals;

  std::atomic<int> counter = 0;
  threads::Throttle throttle(0.01f);

  auto start = std::chrono::steady_clock::now();
  threads::parallel_do([&](ATTR_UNUSED auto i) {
    while (std::chrono::steady_clock::now() - start <= 1000ms) {
      if (!throttle.gate()) {
        counter++;
      }
    }
  });

  REQUIRE(counter <= 100);
}

}  // namespace voxeloo