#include <algorithm>
#include <catch2/catch.hpp>
#include <unordered_map>

#include "voxeloo/common/succinct.hpp"

namespace voxeloo {

static auto random_u32() {
  static std::random_device rd;
  static std::mt19937 gen(rd());
  static std::uniform_int_distribution<uint32_t> distrib;
  return distrib(gen);
}

TEST_CASE("Benchmark scanning", "[all]") {
  const auto n = 1'000'000;

  std::vector<uint32_t> keys;
  keys.reserve(n);
  for (int i = 0; i < n; i += 1) {
    keys.push_back(random_u32());
  }

  // Benchmark scanning over the sorted keys directly.
  volatile int sum = 0;
  BENCHMARK("scan_keys") {
    for (auto key : keys) {
      sum += key;
    }
  };
}

TEST_CASE("Benchmark copying", "[all]") {
  const auto n = 1'000'000;

  std::vector<uint32_t> keys;
  keys.reserve(n);
  for (int i = 0; i < n; i += 1) {
    keys.push_back(random_u32());
  }

  // Benchmark scanning over the sorted keys directly.
  BENCHMARK("copy_keys") {
    std::vector<uint32_t> copy;
    copy.reserve(keys.size());
    for (auto key : keys) {
      copy.push_back(key);
    }
  };
}

TEST_CASE("Benchmark sorting", "[all]") {
  const auto n = 1'000'000;

  std::vector<uint32_t> keys;
  keys.reserve(n);
  for (int i = 0; i < n; i += 1) {
    keys.push_back(random_u32());
  }

  BENCHMARK("copy_and_sort_keys") {
    std::vector<uint32_t> unsorted_keys = keys;
    std::sort(unsorted_keys.begin(), unsorted_keys.end());
  };
}

TEST_CASE("Benchmark binary search with unsorted queries", "[all]") {
  const auto n = 1'000'000;

  std::vector<uint32_t> keys;
  keys.reserve(n);
  for (int i = 0; i < n; i += 1) {
    keys.push_back(random_u32());
  }
  std::sort(keys.begin(), keys.end());

  std::vector<uint32_t> queries;
  queries.reserve(n);
  for (int i = 0; i < n; i += 1) {
    queries.push_back(random_u32());
  }

  volatile int64_t sum = 0;
  BENCHMARK("query_dict") {
    for (auto key : queries) {
      auto ub = std::upper_bound(keys.begin(), keys.end(), key);
      sum += std::distance(keys.begin(), ub);
    }
  };
}

TEST_CASE("Benchmark binary search with sorted queries", "[all]") {
  const auto n = 1'000'000;

  std::vector<uint32_t> keys;
  keys.reserve(n);
  for (int i = 0; i < n; i += 1) {
    keys.push_back(random_u32());
  }
  std::sort(keys.begin(), keys.end());

  std::vector<uint32_t> queries;
  queries.reserve(n);
  for (int i = 0; i < n; i += 1) {
    queries.push_back(random_u32());
  }
  std::sort(queries.begin(), queries.end());

  volatile int sum = 0;
  BENCHMARK("query_dict") {
    for (auto key : queries) {
      auto ub = std::upper_bound(keys.begin(), keys.end(), key);
      sum += static_cast<int>(std::distance(keys.begin(), ub));
    }
  };
}

TEST_CASE("Benchmark binary search with linear queries", "[all]") {
  const auto n = 1'000'000;

  std::vector<uint32_t> keys;
  keys.reserve(n);
  for (int i = 0; i < n; i += 1) {
    keys.push_back(random_u32());
  }
  std::sort(keys.begin(), keys.end());

  std::vector<uint32_t> queries;
  queries.reserve(n);
  queries.push_back(random_u32());
  for (int i = 1; i < n; i += 1) {
    queries.push_back(queries.back() + 1);
  }

  volatile int sum = 0;
  BENCHMARK("query_dict") {
    for (auto key : queries) {
      auto ub = std::upper_bound(keys.begin(), keys.end(), key);
      sum += static_cast<int>(std::distance(keys.begin(), ub));
    }
  };
}

TEST_CASE("Benchmark building dictionary with unsorted keys", "[all]") {
  const auto n = 1'000'000;

  std::vector<uint32_t> keys;
  keys.reserve(n);
  for (int i = 0; i < n; i += 1) {
    keys.push_back(random_u32());
  }

  succinct::Dict dict;
  BENCHMARK("build_dict") {
    dict = succinct::make_dict(keys);
  };

  std::cout << "\n"
            << "size of random dict: " << succinct::size_of_dict(dict)
            << " bytes" << std::endl;
}

TEST_CASE("Benchmark building dictionary with sorted keys", "[all]") {
  const auto n = 1'000'000;

  std::vector<uint32_t> keys;
  keys.reserve(n);
  for (int i = 0; i < n; i += 1) {
    keys.push_back(random_u32());
  }
  std::sort(keys.begin(), keys.end());

  succinct::Dict dict;
  BENCHMARK("build_dict") {
    dict = succinct::make_dict(keys);
  };

  std::cout << "\n"
            << "size of random dict: " << succinct::size_of_dict(dict)
            << " bytes" << std::endl;
}

TEST_CASE("Benchmark building dictionary with linear keys", "[all]") {
  const auto n = 1'000'000;

  std::vector<uint32_t> keys;
  keys.reserve(n);
  keys.push_back(random_u32());
  for (int i = 1; i < n; i += 1) {
    keys.push_back(keys.back() + 1);
  }

  succinct::Dict dict;
  BENCHMARK("build_dict") {
    dict = succinct::make_dict(keys);
  };

  std::cout << "\n"
            << "size of linear dict: " << succinct::size_of_dict(dict)
            << " bytes" << std::endl;
}

TEST_CASE("Benchmark unsorted random dictionary queries", "[all]") {
  const auto n = 1'000'000;

  std::vector<uint32_t> keys;
  keys.reserve(n);
  for (int i = 0; i < n; i += 1) {
    keys.push_back(random_u32());
  }

  succinct::Dict dict;
  BENCHMARK("build_dict") {
    dict = succinct::make_dict(keys);
  };

  std::vector<uint32_t> queries;
  queries.reserve(n);
  for (int i = 0; i < n; i += 1) {
    queries.push_back(random_u32());
  }

  volatile int sum = 0;
  BENCHMARK("query_dict") {
    for (auto key : queries) {
      sum |= dict.rank(key);
    }
  };
  BENCHMARK("test_dict") {
    for (auto key : queries) {
      sum |= static_cast<int>(dict.test(key));
    }
  };
}

TEST_CASE("Benchmark sorted random dictionary queries", "[all]") {
  const auto n = 1'000'000;

  std::vector<uint32_t> keys;
  keys.reserve(n);
  for (int i = 0; i < n; i += 1) {
    keys.push_back(random_u32());
  }

  succinct::Dict dict;
  BENCHMARK("build_dict") {
    dict = succinct::make_dict(keys);
  };

  std::vector<uint32_t> queries;
  queries.reserve(n);
  for (int i = 0; i < n; i += 1) {
    queries.push_back(random_u32());
  }
  std::sort(queries.begin(), queries.end());

  volatile int sum = 0;
  BENCHMARK("query_dict") {
    for (auto key : queries) {
      sum |= dict.rank(key);
    }
  };
  BENCHMARK("test_dict") {
    for (auto key : queries) {
      sum |= static_cast<int>(dict.test(key));
    }
  };
}

TEST_CASE("Benchmark linear dictionary queries", "[all]") {
  const auto n = 1'000'000;

  std::vector<uint32_t> keys;
  keys.reserve(n);
  keys.push_back(random_u32());
  for (int i = 1; i < n; i += 1) {
    keys.push_back(keys.back() + 1);
  }

  succinct::Dict dict;
  BENCHMARK("build_dict") {
    dict = succinct::make_dict(keys);
  };

  volatile int sum = 0;
  BENCHMARK("query_dict") {
    for (auto key : keys) {
      sum |= dict.rank(key);
    }
  };
  BENCHMARK("test_dict") {
    for (auto key : keys) {
      sum |= static_cast<int>(dict.test(key));
    }
  };
}

TEST_CASE("Benchmark merge of two dictionaries", "[all]") {
  const auto n = 500'000;

  std::vector<uint32_t> keys_1, keys_2;
  keys_1.reserve(n);
  keys_2.reserve(n);
  for (int i = 0; i < n; i += 1) {
    keys_1.push_back(random_u32());
    keys_2.push_back(random_u32());
  }

  // Build the initial dictionaries.
  auto dict_1 = succinct::make_dict(keys_1);
  auto dict_2 = succinct::make_dict(keys_2);

  // Benchmark merging the two dictionaries.
  succinct::Dict dict_3;
  BENCHMARK("merge_dicts") {
    dict_3 = succinct::merge_dict(dict_1, dict_2);
  };

  std::cout << "\n"
            << "size of merged dicts: " << succinct::size_of_dict(dict_3)
            << " bytes" << std::endl;
}

TEST_CASE("Benchmark dictionary extract", "[all]") {
  const auto n = 1'000'000;

  std::vector<uint32_t> keys;
  keys.reserve(n);
  for (int i = 0; i < n; i += 1) {
    keys.push_back(random_u32());
  }
  succinct::Dict dict = succinct::make_dict(keys);

  std::vector<uint32_t> results;
  BENCHMARK("extract") {
    results = dict.extract();
  };
}

TEST_CASE("Benchmark dictionary scanning", "[all]") {
  const auto n = 1'000'000;
  volatile int sum_1 = 0, sum_2 = 0;

  std::vector<uint32_t> keys;
  keys.reserve(n);
  for (int i = 0; i < n; i += 1) {
    keys.push_back(random_u32());
  }
  std::sort(keys.begin(), keys.end());

  // Benchmark scanning over the sorted keys directly.
  BENCHMARK("scan_vector") {
    for (auto key : keys) {
      sum_1 += key;
    }
  };

  // Benchmark scanning over a succinct dict of the same keys.
  auto dict = succinct::make_dict(keys);
  BENCHMARK("scan_dict") {
    for (auto key : keys) {
      sum_2 += key;
    }
  };

  REQUIRE(sum_1 == sum_2);
}

TEST_CASE("Benchmark sorting index data", "[all]") {
  const auto n = 1'000'000;

  using Features = std::array<float, 8>;
  std::vector<std::tuple<uint32_t, Features>> data;
  for (int i = 0; i < n; i += 1) {
    data.emplace_back(random_u32(), Features());
  }

  BENCHMARK("copy_index_data") {
    volatile auto copied_data = data;
  };

  BENCHMARK("copy_and_sort_index_data") {
    auto unsorted_data = data;
    std::sort(unsorted_data.begin(), unsorted_data.end(), [](auto& l, auto& r) {
      return std::get<0>(l) < std::get<0>(r);
    });
  };

  std::vector<uint64_t> inverted_index(data.size());
  for (uint64_t i = 0; i < data.size(); i += 1) {
    auto key = static_cast<uint64_t>(std::get<0>(data[i]));
    inverted_index[i] = (key << 32) | i;
  }
  std::sort(inverted_index.begin(), inverted_index.end());

  BENCHMARK("copy_index_data_to_sorted_positions") {
    std::vector<std::tuple<uint32_t, Features>> output;
    output.reserve(inverted_index.size());
    for (auto code : inverted_index) {
      auto pos = static_cast<size_t>(code & 0xFFFFFFFF);
      output.emplace_back(data[pos]);
    }
  };
}

TEST_CASE("Benchmark index queries", "[all]") {
  const auto n = 1'000'000;

  std::vector<std::tuple<uint32_t, uint32_t>> data;
  for (int i = 0; i < n; i += 1) {
    data.emplace_back(random_u32(), random_u32());
  }
  std::sort(data.begin(), data.end());

  succinct::Index<uint32_t> index;
  BENCHMARK("build_index") {
    succinct::IndexBuilder<uint32_t> builder;
    builder.reserve(n);
    for (auto [key, val] : data) {
      builder.add(key, val);
    }
    index = std::move(builder).build();
  };

  volatile int sum = 0;
  BENCHMARK("query_dict_hits") {
    for (const auto& [key, _] : data) {
      sum = sum + index.get_or(key, 0);
    }
  };
}

TEST_CASE("Benchmark index building", "[all]") {
  const auto n = 1'000'000;

  using Features = std::array<float, 8>;
  std::vector<std::tuple<uint32_t, Features>> data;
  for (int i = 0; i < n; i += 1) {
    data.emplace_back(random_u32(), Features());
  }
  std::sort(data.begin(), data.end(), [](auto& l, auto& r) {
    return std::get<0>(l) < std::get<0>(r);
  });

  succinct::Index<Features> index;
  BENCHMARK("build_index") {
    succinct::IndexBuilder<Features> builder;
    builder.reserve(n);
    for (auto [key, val] : data) {
      builder.add(key, std::move(val));
    }
    index = std::move(builder).build();
  };

  succinct::Index<Features> new_index;
  BENCHMARK("merge_10") {
    succinct::IndexBuilder<Features> builder(index);
    builder.reserve(10);
    for (int i = 0; i < 10; i += 1) {
      auto [key, val] = data[i];
      builder.add(key, std::move(val));
    }
    index = std::move(builder).build();
  };
  BENCHMARK("merge_1000") {
    succinct::IndexBuilder<Features> builder(index);
    builder.reserve(1000);
    for (int i = 0; i < 1000; i += 1) {
      auto [key, val] = data[i];
      builder.add(key, std::move(val));
    }
    index = std::move(builder).build();
  };
  BENCHMARK("merge_100000") {
    succinct::IndexBuilder<Features> builder(index);
    builder.reserve(100000);
    for (int i = 0; i < 100000; i += 1) {
      auto [key, val] = data[i];
      builder.add(key, std::move(val));
    }
    index = std::move(builder).build();
  };

  std::vector<uint32_t> queries;
  queries.reserve(n);
  for (int i = 0; i < n; i += 1) {
    queries.push_back(random_u32());
  }
  std::sort(queries.begin(), queries.end());

  volatile int sum_1 = 0;
  BENCHMARK("query_dict_random") {
    for (auto key : queries) {
      if (index.has(key)) {
        sum_1 = sum_1 + 1;
      }
    }
  };

  volatile int sum_2 = 0;
  BENCHMARK("query_dict_hits") {
    for (const auto& [key, _] : data) {
      if (index.has(key)) {
        sum_2 = sum_2 + 1;
      }
    }
  };
}

TEST_CASE("Benchmark naive hash map index", "[all]") {
  const auto n = 1'000'000;

  using Features = std::array<float, 8>;
  std::vector<std::tuple<uint32_t, Features>> data;
  for (int i = 0; i < n; i += 1) {
    data.emplace_back(random_u32(), Features());
  }
  std::sort(data.begin(), data.end());

  std::unordered_map<uint32_t, Features> index;
  BENCHMARK("build_hash_map") {
    std::unordered_map<uint32_t, Features> map;
    map.reserve(n);
    for (auto [key, val] : data) {
      map[key] = std::move(val);
    }
    index = std::move(map);
  };

  std::vector<uint32_t> queries;
  queries.reserve(n);
  for (int i = 0; i < n; i += 1) {
    queries.push_back(random_u32());
  }
  std::sort(queries.begin(), queries.end());

  volatile int sum_1 = 0;
  BENCHMARK("query_hash_map_random") {
    for (auto key : queries) {
      if (index.count(key)) {
        sum_1 = sum_1 + 1;
      }
    }
  };

  volatile int sum_2 = 0;
  BENCHMARK("query_hash_map_hits") {
    for (const auto& [key, _] : data) {
      if (index.count(key)) {
        sum_2 = sum_2 + 1;
      }
    }
  };
}

}  // namespace voxeloo