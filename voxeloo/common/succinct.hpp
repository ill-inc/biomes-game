#pragma once

#include <algorithm>
#include <array>
#include <cstdint>
#include <memory>
#include <optional>
#include <tuple>
#include <type_traits>
#include <vector>

#include "cereal/types/vector.hpp"
#include "voxeloo/common/bits.hpp"
#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/format.hpp"
#include "voxeloo/common/transport.hpp"

namespace voxeloo::succinct {

struct Level {
  size_t size;
  std::unique_ptr<uint32_t[]> cumsums;
  std::unique_ptr<uint64_t[]> buckets;

  Level() : size(0) {}
  explicit Level(size_t n)
      : size(n), cumsums(new uint32_t[n]), buckets(new uint64_t[n]) {
    std::fill(&cumsums[0], &cumsums[n], 0);
    std::fill(&buckets[0], &buckets[n], 0);
  }

  Level(const Level& level) {
    *this = level;
  }

  Level& operator=(const Level& level) {
    size = level.size;
    cumsums.reset(new uint32_t[size]);
    buckets.reset(new uint64_t[size]);
    std::copy(&level.cumsums[0], &level.cumsums[size], &cumsums[0]);
    std::copy(&level.buckets[0], &level.buckets[size], &buckets[0]);
    return *this;
  }

  inline auto test(uint32_t bucket, uint32_t offset) const {
    // NOTE: Offset is assumed to be in the range [0, 63].
    return (buckets[bucket] & (1ull << static_cast<uint64_t>(offset))) != 0;
  }

  inline auto rank(uint32_t bucket, uint32_t offset) const {
    // NOTE: Offset is assumed to be in the range [0, 63].
    uint64_t mask = (1ull << static_cast<uint64_t>(offset)) - 1;
    return cumsums[bucket] + popcount(mask & buckets[bucket]);
  }

  inline uint32_t count() const {
    if (size == 0) {
      return 0;
    }
    return popcount(buckets[size - 1]) + cumsums[size - 1];
  }

  inline bool empty() const {
    return size == 0;
  }
};

struct Dict {
  Level level;
  uint32_t max_key;

  Dict() : Dict(0, 0) {}
  Dict(size_t n, uint32_t max_key) : level(n), max_key(max_key) {}

  auto count() const {
    return level.count();
  }

  auto test(uint32_t key) const {
    if (key > max_key) {
      return false;
    }
    auto bucket = (key >> 24) & 0xff;
    auto offset = (key >> 18) & 0x3f;
    auto ret = level.test(bucket, offset);
    bucket = level.rank(bucket, offset);
    offset = (key >> 12) & 0x3f;
    ret = ret && level.test(bucket, offset);
    bucket = level.rank(bucket, offset);
    offset = (key >> 6) & 0x3f;
    ret = ret && level.test(bucket, offset);
    bucket = level.rank(bucket, offset);
    offset = (key & 0x3f);
    return ret && level.test(bucket, offset);
  }

  auto rank(uint32_t key) const {
    if (key > max_key) {
      return level.count();
    }
    auto bucket = (key >> 24) & 0xff;
    auto offset = (key >> 18) & 0x3f;
    key &= -static_cast<uint32_t>(level.test(bucket, offset));
    bucket = level.rank(bucket, offset);
    offset = (key >> 12) & 0x3f;
    key &= -static_cast<uint32_t>(level.test(bucket, offset));
    bucket = level.rank(bucket, offset);
    offset = (key >> 6) & 0x3f;
    key &= -static_cast<uint32_t>(level.test(bucket, offset));
    bucket = level.rank(bucket, offset);
    offset = (key & 0x3f);
    return level.rank(bucket, offset);
  }

  template <typename Fn>
  void scan(Fn&& fn) const {
    static_assert(std::is_same_v<decltype(fn(0)), void>);
    uint32_t b_0 = 0;
    uint32_t b_1 = level.cumsums[b_0];
    uint32_t b_2 = level.cumsums[b_1];
    uint32_t b_3 = level.cumsums[b_2];
    while (b_0 < 256) {
      visit_bits(level.buckets[b_0], [&](int offset_0) {
        visit_bits(level.buckets[b_1], [&](int offset_1) {
          visit_bits(level.buckets[b_2], [&](int offset_2) {
            visit_bits(level.buckets[b_3], [&](int offset_3) {
              auto key = b_0;
              key = (key << 6) + offset_0;
              key = (key << 6) + offset_1;
              key = (key << 6) + offset_2;
              key = (key << 6) + offset_3;
              fn(key);
            });
            b_3 += 1;
          });
          b_2 += 1;
          b_3 = level.cumsums[b_2];
        });
        b_1 += 1;
        b_2 = level.cumsums[b_1];
      });
      b_0 += 1;
      b_1 = level.cumsums[b_0];
    }
  }

  template <typename Fn>
  void scan(uint32_t from, Fn&& fn) const {
    if (from > max_key) {
      return;
    }

    // Intialize masks so that the scan begins at the first element.
    auto b_0 = (from >> 24) & 0xff;
    auto i_0 = (from >> 18) & 0x3f;
    from &= -static_cast<uint32_t>(level.test(b_0, i_0));
    auto b_1 = level.rank(b_0, i_0);
    auto i_1 = (from >> 12) & 0x3f;
    from &= -static_cast<uint32_t>(level.test(b_1, i_1));
    auto b_2 = level.rank(b_1, i_1);
    auto i_2 = (from >> 6) & 0x3f;
    from &= -static_cast<uint32_t>(level.test(b_2, i_2));
    auto b_3 = level.rank(b_2, i_2);
    auto i_3 = from & 0x3f;

    // Depth first search the tree starting at the rank of from.
    auto rank = level.rank(b_3, i_3);
    while (b_0 < 256) {
      visit_bits(level.buckets[b_0], i_0, [&](int offset_0) {
        visit_bits(level.buckets[b_1], i_1, [&](int offset_1) {
          visit_bits(level.buckets[b_2], i_2, [&](int offset_2) {
            visit_bits(level.buckets[b_3], i_3, [&](int offset_3) {
              auto key = b_0;
              key = (key << 6) + offset_0;
              key = (key << 6) + offset_1;
              key = (key << 6) + offset_2;
              key = (key << 6) + offset_3;
              if (!fn(rank++, key)) {
                return;
              }
            });
            i_3 = 0;
            b_3 += 1;
          });
          i_2 = 0;
          b_2 += 1;
          b_3 = level.cumsums[b_2];
        });
        i_1 = 0;
        b_1 += 1;
        b_2 = level.cumsums[b_1];
      });
      i_0 = 0;
      b_0 += 1;
      b_1 = level.cumsums[b_0];
    }
  }

  auto extract() const {
    std::vector<uint32_t> ret;
    if (!level.empty()) {
      ret.reserve(count());
      scan([&](uint32_t key) {
        ret.push_back(key);
      });
    }
    return ret;
  }
};

uint64_t size_of_dict(const Dict& dict);

template <typename BucketFn, typename OffsetFn>
inline auto make_level(
    size_t size,
    BucketFn&& bucket_fn,
    OffsetFn&& offset_fn,
    const std::vector<uint32_t>& keys) {
  CHECK_ARGUMENT(size > 0);
  Level level(size);
  for (auto key : keys) {
    auto bucket = bucket_fn(key);
    auto offset = offset_fn(key);
    level.buckets[bucket] |= 1ull << offset;
  }

  uint32_t cumsum = 0;
  for (size_t i = 0; i < level.size; i += 1) {
    level.cumsums[i] = cumsum;
    cumsum += popcount(level.buckets[i]);
  }

  return level;
}

Dict make_dict(const std::vector<uint32_t>& keys);
Dict update_dict(const Dict& dict, std::vector<uint32_t> keys);
Dict delete_dict(const Dict& dict, std::vector<uint32_t> keys);

inline auto merge_dict(const Dict& a, const Dict& b) {
  return update_dict(a, b.extract());
}

template <typename T>
class IndexBuilder;

template <typename T>
class Index {
 public:
  Index() = default;
  Index(Dict dict, std::vector<std::tuple<uint32_t, T>> data)
      : dict_(std::move(dict)), data_(std::move(data)) {
    CHECK_ARGUMENT(dict_.count() == data_.size());
  }

  auto size() const {
    return data_.size();
  }

  auto rank(uint32_t key) const {
    return dict_.rank(key);
  }

  auto& data(uint32_t index) {
    return std::get<1>(data_[index]);
  }

  const auto& data(uint32_t index) const {
    return std::get<1>(data_[index]);
  }

  auto has(uint32_t key) const {
    return dict_.test(key);
  }

  auto get_ptr(uint32_t key) {
    T* ret = nullptr;
    if (auto i = rank(key); i < size() && std::get<0>(data_[i]) == key) {
      ret = &std::get<1>(data_[rank(key)]);
    }
    return ret;
  }

  auto get_ptr(uint32_t key) const {
    return const_cast<Index<T>*>(this)->get_ptr(key);
  }

  auto& get(uint32_t key) {
    return *get_ptr(key);
  }

  const auto& get(uint32_t key) const {
    return const_cast<Index<T>*>(this)->get(key);
  }

  auto get_or(uint32_t key, T fallback = T()) const {
    if (auto ptr = get_ptr(key)) {
      return *ptr;
    }
    return fallback;
  }

  template <typename Fn>
  auto scan(Fn&& fn) const {
    for (const auto& [key, val] : data_) {
      fn(key, val);
    }
  }

  template <typename Fn>
  auto scan(uint32_t from, Fn&& fn) const {
    for (size_t i = rank(from); i < data_.size(); i += 1) {
      const auto& [key, val] = data_[i];
      if (!fn(key, val)) {
        return;
      }
    }
  }

  auto storage_size() const {
    auto ret = size_of_dict(dict_);
    ret += sizeof(std::tuple<uint32_t, T>) * data_.capacity();
    return ret;
  }

  Dict dict_;
  std::vector<std::tuple<uint32_t, T>> data_;

  friend class IndexBuilder<T>;

  template <typename Archive, typename _T>
  friend void save(Archive, const Index<_T>&);

  template <typename Archive, typename _T>
  friend void load(Archive, Index<_T>&);
};

template <typename T>
class IndexBuilder {
 public:
  IndexBuilder() = default;
  explicit IndexBuilder(Index<T> index) : base_(std::move(index)) {}

  void reserve(size_t n) {
    data_.reserve(n);
  }

  void add(uint32_t key, T val) {
    data_.emplace_back(key, std::move(val));
  }

  auto build() && {
    auto sort_fn = [](const auto& l, const auto& r) {
      return std::get<0>(l) < std::get<0>(r);
    };

    // Initialize the combined data to the base index.
    std::vector<std::tuple<uint32_t, T>> data;
    if (base_) {
      data = std::move(base_->data_);
    }

    // Sort the new values and append them to the merged data vector.
    auto base_size = data.size();
    data.reserve(base_size + data_.size());
    std::stable_sort(data_.begin(), data_.end(), sort_fn);
    for (auto& [key, val] : data_) {
      data.emplace_back(key, std::move(val));
    }

    // Merge the data to preserve insertion order.
    std::inplace_merge(
        data.begin(), data.begin() + base_size, data.end(), sort_fn);

    // Remove duplicates.
    auto back = 0;
    for (size_t i = 1; i <= data.size(); i += 1) {
      auto key = std::get<0>(data[i - 1]);
      if (i == data.size() || key != std::get<0>(data[i])) {
        std::swap(data[back], data[i - 1]);
        back += 1;
      }
    }
    data.resize(back);

    // Extract the sorted keys.
    std::vector<uint32_t> keys;
    keys.reserve(back);
    for (auto& [key, _] : data) {
      keys.push_back(key);
    }

    // Return the new index.
    return Index<T>(make_dict(std::move(keys)), std::move(data));
  }

 private:
  std::optional<Index<T>> base_;
  std::vector<std::tuple<uint32_t, T>> data_;
};

template <typename T>
class IndexDeleter {
 public:
  IndexDeleter() = default;
  explicit IndexDeleter(Index<T> index) : base_(std::move(index)) {}

  void reserve(size_t n) {
    keys_.reserve(n);
  }

  void del(uint32_t key) {
    keys_.push_back(key);
  }

  auto build() && {
    std::sort(keys_.begin(), keys_.end());
    std::vector<std::tuple<uint32_t, T>> data = std::move(base_->data_);

    std::vector<uint32_t> keys;
    keys.reserve(data.size());
    for (size_t i = 0, j = 0; i < data.size(); i += 1) {
      auto key = std::get<0>(data[i]);
      while (j < keys_.size() && keys_[j] < key) {
        j += 1;
      }
      if (j == keys_.size() || keys_[j] > key) {
        std::swap(data[i], data[keys.size()]);
        keys.push_back(key);
      }
    }
    data.resize(keys.size());

    return data.size() ? Index<T>(make_dict(std::move(keys)), std::move(data))
                       : Index<T>();
  }

 private:
  std::optional<Index<T>> base_;
  std::vector<uint32_t> keys_;
};

template <typename Archive>
inline void save(Archive& ar, const Dict& dict) {
  const auto& level = dict.level;
  ar(static_cast<uint32_t>(level.size));
  ar(cereal::binary_data(&level.cumsums[0], sizeof(uint32_t) * level.size));
  ar(cereal::binary_data(&level.buckets[0], sizeof(uint64_t) * level.size));
  ar(dict.max_key);
}

template <typename Archive>
inline void load(Archive& ar, Dict& dict) {
  auto& level = dict.level;
  level.size = transport::get<uint32_t>(ar);
  level.cumsums.reset(new uint32_t[level.size]);
  level.buckets.reset(new uint64_t[level.size]);
  ar(cereal::binary_data(&level.cumsums[0], sizeof(uint32_t) * level.size));
  ar(cereal::binary_data(&level.buckets[0], sizeof(uint64_t) * level.size));
  ar(dict.max_key);
}

template <typename Archive, typename T>
inline void save(Archive& ar, const Index<T>& index) {
  ar(index.dict_);
  ar(index.data_);
}

template <typename Archive, typename T>
inline void load(Archive& ar, Index<T>& index) {
  ar(index.dict_);
  ar(index.data_);
}

}  // namespace voxeloo::succinct
