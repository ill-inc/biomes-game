#include <algorithm>
#include <catch2/catch.hpp>
#include <unordered_map>

#include "voxeloo/common/random.hpp"
#include "voxeloo/tensors/succinct.hpp"

namespace voxeloo::tensors {

template <typename Key, typename Val>
inline auto storage_size(const std::unordered_map<Key, Val>& map) {
  return sizeof(void*) + 2 * sizeof(uint16_t) * map.bucket_count();
}

TEST_CASE("Benchmark iteration", "[all]") {
  const auto n = 32 * 32 * 32;

  volatile int guard = 0;

  std::vector<uint16_t> keys(n);
  std::iota(keys.begin(), keys.end(), 0);
  {
    int sum = 0;
    BENCHMARK("plain_vector_iteration") {
      for (auto key : keys) {
        sum += 3 * key + sum;
      }
      guard += sum;
    };
  }

  auto dict = make_dict(buffer_from(keys.begin(), keys.end()));
  {
    int sum = 0;
    BENCHMARK("rank_dict_iteration") {
      for (auto [i, key] : dict) {
        sum += 3 * key + sum;
      }
      guard += sum;
    };
  }
  {
    int sum = 0;
    BENCHMARK("rank_dict_scanner") {
      RankDictScanner scanner(dict);
      while (!scanner.done()) {
        sum += 3 * scanner.curr().key + sum;
        scanner.next();
      }
      guard += sum;
    };
  }
  {
    int sum = 0;
    BENCHMARK("rank_dict_scan") {
      dict.scan([&](auto key) {
        sum += key;
      });
      guard += sum;
    };
  }

  std::unordered_map<uint32_t, uint16_t> map;
  for (auto i = 0u; i < n; i += 1) {
    map[i] = keys[i];
  }
  {
    int sum = 0;
    BENCHMARK("unordered_map_iteration") {
      for (auto [i, key] : map) {
        sum += 3 * key + sum;
      }
      guard += sum;
    };
  }
  {
    int sum = 0;
    BENCHMARK("unordered_map_inorder_iteration") {
      for (auto i = 0u; i < n; i += 1) {
        sum += 3 * map[i] + sum;
      }
      guard += sum;
    };
  }

  std::cout << "\n";
  std::cout << "size of vector: " << sizeof(uint16_t) * keys.size() << "\n";
  std::cout << "size of dict: " << dict.storage_size() << "\n";
  std::cout << "size of map: " << storage_size(map) << "\n";
}

TEST_CASE("Benchmark random accesses", "[all]") {
  const auto n = 32 * 32 * 32;

  volatile int guard = 0;

  std::vector<uint16_t> keys(n);
  std::iota(keys.begin(), keys.end(), 0);

  auto dict = make_dict(buffer_from(keys.begin(), keys.end()));

  random::shuffle(keys);

  {
    int sum = 0;
    BENCHMARK("rank_dict_query") {
      for (auto key : keys) {
        sum += dict.rank(key);
      }
      guard += sum;
    };
  }

  std::unordered_map<uint32_t, uint16_t> map;
  for (auto i = 0u; i < n; i += 1) {
    map[i] = keys[i];
  }
  {
    int sum = 0;
    BENCHMARK("unordered_map_query") {
      for (auto key : keys) {
        sum += map[key];
      }
      guard += sum;
    };
  }
}

}  // namespace voxeloo::tensors