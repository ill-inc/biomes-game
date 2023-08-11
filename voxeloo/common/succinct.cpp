#include "voxeloo/common/succinct.hpp"

namespace voxeloo::succinct {

uint64_t size_of_dict(const Dict& dict) {
  uint64_t ret = sizeof(dict.max_key);
  ret += sizeof(dict.level.size);
  ret += sizeof(uint32_t) * dict.level.size;
  ret += sizeof(uint64_t) * dict.level.size;
  return ret;
}

Dict make_dict(const std::vector<uint32_t>& keys) {
  CHECK_ARGUMENT(!keys.empty());
  Level levels[4];

  // Initialize level 0.
  levels[0] = make_level(
      256,
      [](uint32_t key) {
        return (key >> 24) & 0xff;
      },
      [](uint32_t key) {
        return (key >> 18) & 0x3f;
      },
      keys);

  // Initialize level 1.
  levels[1] = make_level(
      levels[0].count(),
      [&](uint32_t key) {
        auto bucket = (key >> 24) & 0xff;
        return levels[0].rank(bucket, (key >> 18) & 0x3f);
      },
      [](uint32_t key) {
        return (key >> 12) & 0x3f;
      },
      keys);

  // Initialize level 2.
  levels[2] = make_level(
      levels[1].count(),
      [&](uint32_t key) {
        auto bucket = (key >> 24) & 0xff;
        bucket = levels[0].rank(bucket, (key >> 18) & 0x3f);
        return levels[1].rank(bucket, (key >> 12) & 0x3f);
      },
      [](uint32_t key) {
        return (key >> 6) & 0x3f;
      },
      keys);

  // Initialize level 3.
  levels[3] = make_level(
      levels[2].count(),
      [&](uint32_t key) {
        auto bucket = (key >> 24) & 0xff;
        bucket = levels[0].rank(bucket, (key >> 18) & 0x3f);
        bucket = levels[1].rank(bucket, (key >> 12) & 0x3f);
        return levels[2].rank(bucket, (key >> 6) & 0x3f);
      },
      [](uint32_t key) {
        return key & 0x3f;
      },
      keys);

  size_t total_size = 0;
  for (int i = 0; i < 4; i += 1) {
    total_size += levels[i].size;
  }

  Dict dict(total_size, *std::max_element(keys.begin(), keys.end()));

  // Copy over buckets and cumsums.
  uint32_t back = 0;
  for (size_t j = 0; j < 4; j += 1) {
    auto cumsum = static_cast<uint32_t>(j == 3 ? 0 : back + levels[j].size);
    for (size_t i = 0; i < levels[j].size; i += 1) {
      dict.level.buckets[back] = levels[j].buckets[i];
      dict.level.cumsums[back] = levels[j].cumsums[i] + cumsum;
      back += 1;
    }
  }

  return dict;
}

Dict update_dict(const Dict& dict, std::vector<uint32_t> keys) {
  std::sort(keys.begin(), keys.end());

  // Push back a sorted list of all of keys in the dictionary.
  keys.reserve(keys.size() + dict.count());
  for (auto key : dict.extract()) {
    keys.push_back(key);
  }
  std::inplace_merge(keys.begin(), keys.end() - dict.count(), keys.end());

  return make_dict(std::move(keys));
}

Dict delete_dict(const Dict& dict, std::vector<uint32_t> keys) {
  std::sort(keys.begin(), keys.end());

  // Push back a sorted list of all of keys in the dictionary.
  std::vector<uint32_t> new_keys;
  new_keys.reserve(dict.count());
  dict.scan([&, it = keys.begin()](uint32_t key) mutable {
    while (it != keys.end() && *it < key) {
      ++it;
    }
    if (it == keys.end() || *it > key) {
      new_keys.push_back(key);
    }
  });

  return make_dict(std::move(new_keys));
}

}  // namespace voxeloo::succinct
