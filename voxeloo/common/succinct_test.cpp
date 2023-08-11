#include "voxeloo/common/succinct.hpp"

#include <algorithm>
#include <catch2/catch.hpp>
#include <unordered_map>

#include "voxeloo/common/random.hpp"

namespace voxeloo {

uint32_t random_u32() {
  return random::uniform_int<uint32_t>();
}

template <typename T>
auto tail(const std::vector<T>& v, size_t start) {
  std::vector<T> ret;
  ret.reserve(std::max(start, v.size()) - start);
  for (size_t i = start; i < v.size(); i += 1) {
    ret.push_back(v[i]);
  }
  return ret;
}

TEST_CASE("Test basic succinct dictionary usage", "[all]") {
  std::vector<uint32_t> keys = {
      1,
      23,
      26,
      39,
      41,
      56,
      3124,
      2343425,
      343403413,
      343403414,
  };
  random::shuffle(keys);

  auto dict = succinct::make_dict(keys);

  REQUIRE(dict.rank(0) == 0);
  REQUIRE(dict.rank(1) == 0);
  REQUIRE(dict.rank(2) == 1);
  REQUIRE(dict.rank(23) == 1);
  REQUIRE(dict.rank(24) == 2);
  REQUIRE(dict.rank(26) == 2);
  REQUIRE(dict.rank(39) == 3);
  REQUIRE(dict.rank(41) == 4);
  REQUIRE(dict.rank(56) == 5);
  REQUIRE(dict.rank(3124) == 6);
  REQUIRE(dict.rank(2343425) == 7);
  REQUIRE(dict.rank(343403413) == 8);
  REQUIRE(dict.rank(343403414) == 9);
  REQUIRE(dict.rank(343403415) == 10);
}

TEST_CASE("Test dictionary boundary", "[all]") {
  using Catch::Matchers::Equals;

  auto n = std::numeric_limits<uint32_t>::max();
  auto dict = succinct::make_dict({0, 1, n, n - 1});

  REQUIRE(dict.rank(0) == 0);
  REQUIRE(dict.rank(1) == 1);
  REQUIRE(dict.rank(2) == 2);
  REQUIRE(dict.rank(n - 1) == 2);
  REQUIRE(dict.rank(n) == 3);
  REQUIRE_THAT(dict.extract(), Equals(std::vector<uint32_t>{0, 1, n - 1, n}));
}

TEST_CASE("Test succinct dictionary hits with large key set", "[all]") {
  std::vector<uint32_t> keys;
  for (int i = 0; i < 1'000'000; i += 1) {
    keys.push_back(random_u32());
  }

  // Sort the keys and remove duplicates.
  std::sort(keys.begin(), keys.end());
  keys.erase(std::unique(keys.begin(), keys.end()), keys.end());

  auto dict = succinct::make_dict(keys);

  for (uint32_t i = 0; i < keys.size(); i += 1) {
    REQUIRE(dict.rank(keys.at(i)) == i);
  }
}

TEST_CASE("Test succinct dictionary misses with large key set", "[all]") {
  std::vector<uint32_t> keys;
  for (int i = 0; i < 1'000'000; i += 1) {
    keys.push_back(random_u32());
  }

  // Sort the keys and remove duplicates.
  std::sort(keys.begin(), keys.end());
  keys.erase(std::unique(keys.begin(), keys.end()), keys.end());

  auto dict = succinct::make_dict(keys);

  // Add a bunch of random values into the queries set.
  keys.push_back(std::numeric_limits<uint32_t>::max());
  for (uint32_t i = 0; i < keys.size() - 1; i += 1) {
    uint32_t delta = static_cast<uint32_t>(keys[i + 1] - keys[i]);
    uint32_t shift = (random_u32() % delta) + 1;
    REQUIRE(dict.rank(keys.at(i) + shift) == i + 1);
  }
}

TEST_CASE("Test succinct dictionary scan routine", "[all]") {
  using Catch::Matchers::Equals;

  std::vector<uint32_t> keys{
      1,
      23,
      26,
      39,
      41,
      56,
      3124,
      2343425,
      343403413,
      343403414,
  };

  auto dict = succinct::make_dict(random::shuffled(keys));

  std::vector<uint32_t> results;
  dict.scan([&](uint32_t key) {
    results.push_back(key);
  });
  REQUIRE_THAT(results, Equals(keys));
}

TEST_CASE("Test succinct dictionary scan(from) routine", "[all]") {
  using Catch::Matchers::Equals;

  std::vector<uint32_t> keys{
      1,
      23,
      26,
      39,
      41,
      56,
      3124,
      2343425,
      343403413,
      343403414,
  };

  std::unordered_map<uint32_t, uint32_t> ranks;
  for (uint32_t i = 0; i < keys.size(); i += 1) {
    ranks[keys[i]] = i;
  }

  auto dict = succinct::make_dict(random::shuffled(keys));
  auto scan = [&](uint32_t from) {
    std::vector<uint32_t> results;
    dict.scan(from, [&](uint32_t rank, uint32_t key) {
      REQUIRE(ranks[key] == rank);
      results.push_back(key);
      return true;
    });
    return results;
  };

  REQUIRE_THAT(scan(0), Equals(keys));
  REQUIRE_THAT(scan(1), Equals(keys));
  REQUIRE_THAT(scan(2), Equals(tail(keys, 1)));
  REQUIRE_THAT(scan(23), Equals(tail(keys, 1)));
  REQUIRE_THAT(scan(24), Equals(tail(keys, 2)));
  REQUIRE_THAT(scan(26), Equals(tail(keys, 2)));
  REQUIRE_THAT(scan(27), Equals(tail(keys, 3)));
  REQUIRE_THAT(scan(39), Equals(tail(keys, 3)));
  REQUIRE_THAT(scan(40), Equals(tail(keys, 4)));
  REQUIRE_THAT(scan(41), Equals(tail(keys, 4)));
  REQUIRE_THAT(scan(42), Equals(tail(keys, 5)));
  REQUIRE_THAT(scan(56), Equals(tail(keys, 5)));
  REQUIRE_THAT(scan(57), Equals(tail(keys, 6)));
  REQUIRE_THAT(scan(3124), Equals(tail(keys, 6)));
  REQUIRE_THAT(scan(3125), Equals(tail(keys, 7)));
  REQUIRE_THAT(scan(2343425), Equals(tail(keys, 7)));
  REQUIRE_THAT(scan(2343426), Equals(tail(keys, 8)));
  REQUIRE_THAT(scan(343403413), Equals(tail(keys, 8)));
  REQUIRE_THAT(scan(343403414), Equals(tail(keys, 9)));
  REQUIRE_THAT(scan(343403415), Equals(tail(keys, 10)));
}

TEST_CASE("Test succinct dictionary extract routine", "[all]") {
  using Catch::Matchers::Equals;

  std::vector<uint32_t> keys = {
      1,
      23,
      26,
      39,
      41,
      56,
      3124,
      2343425,
      343403413,
      343403414,
  };
  random::shuffle(keys);

  auto result = succinct::make_dict(keys).extract();

  REQUIRE_THAT(
      result,
      Equals(std::vector<uint32_t>{
          1,
          23,
          26,
          39,
          41,
          56,
          3124,
          2343425,
          343403413,
          343403414,
      }));
}

TEST_CASE("Test succinct dictionary delete routine", "[all]") {
  using Catch::Matchers::Equals;

  auto base = [] {
    std::vector<uint32_t> keys = {
        1,
        23,
        26,
        39,
        41,
        56,
        3124,
        2343425,
        343403413,
        343403414,
    };
    random::shuffle(keys);

    return succinct::make_dict(keys);
  }();

  auto final = succinct::delete_dict(base, {56, 3124, 23, 343403414});

  REQUIRE_THAT(
      final.extract(),
      Equals(std::vector<uint32_t>{
          1,
          26,
          39,
          41,
          2343425,
          343403413,
      }));
}

TEST_CASE("Test succinct dictionary merge routine", "[all]") {
  using Catch::Matchers::Equals;

  std::vector<uint32_t> keys_1 = {
      1,
      23,
      26,
      39,
      41,
      56,
      3124,
      2343425,
      343403413,
      343403414,
  };
  random::shuffle(keys_1);

  auto dict_1 = succinct::make_dict(keys_1);

  std::vector<uint32_t> keys_2 = {
      1,
      2,
      14,
      21,
      42,
      3124,
      3125,
      2343428,
      343403412,
      343403416,
  };
  random::shuffle(keys_2);

  auto dict_2 = succinct::make_dict(keys_2);

  auto result = succinct::merge_dict(dict_1, dict_2).extract();

  REQUIRE_THAT(
      result,
      Equals(std::vector<uint32_t>{
          1,
          2,
          14,
          21,
          23,
          26,
          39,
          41,
          42,
          56,
          3124,
          3125,
          2343425,
          2343428,
          343403412,
          343403413,
          343403414,
          343403416,
      }));
}

TEST_CASE("Test succinct index usage", "[all]") {
  auto index = [] {
    succinct::IndexBuilder<std::string> builder;
    builder.add(3, "dog");
    builder.add(1324, "cat");
    builder.add(13654251, "frog");
    builder.add(1234, "pig");
    builder.add(9134, "elephant");
    return std::move(builder).build();
  }();

  // Test that all values are present.
  REQUIRE(index.has(3));
  REQUIRE(index.has(1324));
  REQUIRE(index.has(13654251));
  REQUIRE(index.has(1234));
  REQUIRE(index.has(9134));

  // Test that misses return unset optionals.
  REQUIRE(!index.has(0));
  REQUIRE(!index.has(1));
  REQUIRE(!index.has(4));
  REQUIRE(!index.has(3124));

  // Test that the ranks are correct.
  REQUIRE(index.rank(3) == 0);
  REQUIRE(index.rank(1234) == 1);
  REQUIRE(index.rank(1324) == 2);
  REQUIRE(index.rank(9134) == 3);
  REQUIRE(index.rank(13654251) == 4);
  REQUIRE(index.rank(13654252) == 5);

  // Test that the values are correct.
  REQUIRE(index.get(3) == "dog");
  REQUIRE(index.get(1324) == "cat");
  REQUIRE(index.get(13654251) == "frog");
  REQUIRE(index.get(1234) == "pig");
  REQUIRE(index.get(9134) == "elephant");
}

TEST_CASE("Test succinct index deletion", "[all]") {
  auto index = [] {
    succinct::IndexBuilder<std::string> builder;
    builder.add(3, "dog");
    builder.add(1324, "cat");
    builder.add(13654251, "frog");
    builder.add(1234, "pig");
    builder.add(9134, "elephant");

    succinct::IndexDeleter<std::string> deleter(std::move(builder).build());
    deleter.del(12);
    deleter.del(1324);
    deleter.del(13654251);
    return std::move(deleter).build();
  }();

  // Test that all values are present.
  REQUIRE(index.has(3));
  REQUIRE(index.has(1234));
  REQUIRE(index.has(9134));

  // Test that misses return unset optionals.
  REQUIRE(!index.has(0));
  REQUIRE(!index.has(1));
  REQUIRE(!index.has(12));
  REQUIRE(!index.has(4));
  REQUIRE(!index.has(1324));
  REQUIRE(!index.has(3124));
  REQUIRE(!index.has(13654251));

  // Test that the ranks are correct.
  REQUIRE(index.rank(3) == 0);
  REQUIRE(index.rank(1234) == 1);
  REQUIRE(index.rank(9134) == 2);

  // Test that the values are correct.
  REQUIRE(index.get(3) == "dog");
  REQUIRE(index.get(1234) == "pig");
  REQUIRE(index.get(9134) == "elephant");
}

TEST_CASE("Test succinct index scanning", "[all]") {
  using Catch::Matchers::Equals;

  std::vector<std::tuple<uint32_t, std::string>> data{
      {3, "dog"},
      {1324, "cat"},
      {13654251, "frog"},
      {1234, "pig"},
      {9134, "elephant"},
  };

  auto index = [&] {
    succinct::IndexBuilder<std::string> builder;
    for (const auto& [key, val] : data) {
      builder.add(key, val);
    }
    return std::move(builder).build();
  }();

  auto scan = [&](uint32_t from) {
    std::vector<std::tuple<uint32_t, std::string>> results;
    index.scan(from, [&](uint32_t key, std::string val) {
      results.emplace_back(key, std::move(val));
      return true;
    });
    return results;
  };

  std::sort(data.begin(), data.end());

  REQUIRE_THAT(scan(0), Equals(tail(data, 0)));
  REQUIRE_THAT(scan(3), Equals(tail(data, 0)));
  REQUIRE_THAT(scan(4), Equals(tail(data, 1)));
  REQUIRE_THAT(scan(1234), Equals(tail(data, 1)));
  REQUIRE_THAT(scan(1235), Equals(tail(data, 2)));
  REQUIRE_THAT(scan(1324), Equals(tail(data, 2)));
  REQUIRE_THAT(scan(1325), Equals(tail(data, 3)));
  REQUIRE_THAT(scan(9134), Equals(tail(data, 3)));
  REQUIRE_THAT(scan(9135), Equals(tail(data, 4)));
  REQUIRE_THAT(scan(13654251), Equals(tail(data, 4)));
  REQUIRE(scan(13654252).empty());
}

}  // namespace voxeloo