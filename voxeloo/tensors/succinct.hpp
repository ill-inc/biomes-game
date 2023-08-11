#pragma once

#include <optional>
#include <vector>

#include "voxeloo/common/bits.hpp"
#include "voxeloo/common/errors.hpp"
#include "voxeloo/tensors/buffers.hpp"

namespace voxeloo::tensors {

using DictKey = uint16_t;
static constexpr DictKey kMaxDictKey = static_cast<DictKey>(0x7fff);

namespace detail {

template <DictKey dim>
inline DictKey extract_key_part(DictKey key);

template <>
inline DictKey extract_key_part<0>(DictKey key) {
  return (key >> 10) & 0x1f;
}

template <>
inline DictKey extract_key_part<1>(DictKey key) {
  return (key >> 5) & 0x1f;
}

template <>
inline DictKey extract_key_part<2>(DictKey key) {
  return key & 0x1f;
}

inline DictKey combine_key_parts(DictKey k_0, DictKey k_1, DictKey k_2) {
  return (k_0 << 10) | (k_1 << 5) | k_2;
}

inline auto empty_levels() {
  return buffer_of<uint32_t>({1, 0, 3, 0, 3, 0, 0, 0, 0, 0});
}

}  // namespace detail

// Implements a rank/select data structure, which provides an space efficient
// building block for general-purpose indexing structures. Rank queries offer
// minimal overhead compared to random access in a dense array, but allow for
// sparse storage. This tradeoff is much more efficient when applications are
// memory bound and data is sufficiently sparse. The overhead is kept minimal
// by using 32-bit popcount instructions and bounding the array size to 32^3.
// For background, see: https://en.wikipedia.org/wiki/Succinct_data_structure
class RankDict {
 public:
  RankDict() : max_(0), levels_(detail::empty_levels()) {}
  explicit RankDict(DictKey max, Buffer<uint32_t> levels)
      : max_(max), levels_(std::move(levels)) {}

  // The maximum key in the data structure.
  auto max() const {
    return max_;
  }

  // The number of keys in the data structure.
  auto count() const {
    return next(static_cast<uint32_t>(levels_.size()) - 2, 31);
  }

  // The rank of the smallest key greater than or equal to the given key. If no
  // such key exists, then count() is returned (i.e. the total number of keys).
  auto rank(DictKey key) const {
    auto bucket = 0u;
    auto offset = detail::extract_key_part<0>(key);

    key &= -static_cast<DictKey>(test(bucket, offset));
    bucket = next(bucket, offset) << 1;
    offset = detail::extract_key_part<1>(key);

    key &= -static_cast<DictKey>(test(bucket, offset));
    bucket = next(bucket, offset) << 1;
    offset = detail::extract_key_part<2>(key);

    return next(bucket, offset);
  }

  template <typename Fn>
  void scan(Fn&& fn) const {
    auto b_1 = next(0u, 0) << 1u;
    auto b_2 = next(b_1, 0) << 1u;
    visit_bits(levels_[0u + 1], [&](int bit_0) {
      auto k_0 = static_cast<DictKey>(bit_0);
      visit_bits(levels_[b_1 + 1], [&](int bit_1) {
        auto k_1 = static_cast<DictKey>(bit_1);
        visit_bits(levels_[b_2 + 1], [&](int bit_2) {
          auto k_2 = static_cast<DictKey>(bit_2);
          fn(detail::combine_key_parts(k_0, k_1, k_2));
        });
        b_2 += 2;
      });
      b_1 += 2;
    });
  }

  auto to_buffer() const& {
    return levels_;
  }

  auto to_buffer() && {
    return Buffer<uint32_t>(std::move(levels_));
  }

  auto storage_size() const {
    return sizeof(max_) + sizeof(uint32_t) * levels_.size();
  }

 private:
  bool test(uint32_t bucket, uint32_t offset) const {
    return (levels_[bucket + 1] & (1 << offset)) != 0;
  }

  uint32_t mask(uint32_t offset) const {
    return static_cast<uint32_t>(1 << offset) - 1;
  }

  uint32_t next(uint32_t bucket, uint32_t offset) const {
    return levels_[bucket] + popcount(levels_[bucket + 1] & mask(offset));
  }

  uint32_t pred(uint32_t bucket, uint32_t offset) const {
    return 31 - lzcount(levels_[bucket + 1] & mask(offset + 1));
  }

  DictKey max_;
  Buffer<uint32_t> levels_;

  template <typename Archive>
  friend void save(Archive& ar, const RankDict& dict);

  template <typename Archive>
  friend void load(Archive& ar, RankDict& dict);

  friend class RankDictScanner;
};

// Provides iterataion over the keys in a RankDict. Scanners implement the range
// interface and are optimized for sequential forward iteration. Skipping to any
// key is also supported and is as efficient as a typical rank query.
class RankDictScanner {
  struct Entry {
    uint32_t rank;
    DictKey key;
  };

 public:
  explicit RankDictScanner(const RankDict& dict)
      : dict_(dict),
        sentinel_(dict.count()),
        b_1_(dict_.next(0, 0) << 1u),
        b_2_(dict_.next(b_1_, 0) << 1u),
        k_0_(static_cast<DictKey>(next_bit(dict_.levels_[1], 0))),
        k_1_(static_cast<DictKey>(next_bit(dict_.levels_[b_1_ + 1], 0))),
        k_2_(static_cast<DictKey>(next_bit(dict_.levels_[b_2_ + 1], 0))),
        entry_{0, detail::combine_key_parts(k_0_, k_1_, k_2_)} {}

  auto sentinel() const {
    return sentinel_;
  }

  auto curr() const {
    return entry_;
  }

  bool done() const {
    return entry_.rank == sentinel_;
  }

  void next() {
    const auto& l = dict_.levels_;
    if (k_2_ == last_bit(l[b_2_ + 1])) {
      b_2_ += 2;
      if (k_1_ == last_bit(l[b_1_ + 1])) {
        b_1_ += 2;
        k_0_ = next_bit(dict_.levels_[1], k_0_ + 1);
        k_1_ = next_bit(dict_.levels_[b_1_ + 1], 0);
      } else {
        k_1_ = next_bit(l[b_1_ + 1], k_1_ + 1);
      }
      k_2_ = next_bit(dict_.levels_[b_2_ + 1], 0);
    } else {
      k_2_ = next_bit(l[b_2_ + 1], k_2_ + 1);
    }
    entry_.rank += 1;
    entry_.key = detail::combine_key_parts(k_0_, k_1_, k_2_);
  }

  void skip(DictKey key) {
    auto offset = detail::extract_key_part<0>(key);

    key &= -static_cast<DictKey>(dict_.test(0, offset));
    k_0_ = dict_.pred(0, offset);
    b_1_ = dict_.next(0, offset) << 1;
    offset = detail::extract_key_part<1>(key);

    key &= -static_cast<DictKey>(dict_.test(b_1_, offset));
    k_1_ = dict_.pred(b_1_, offset);
    b_2_ = dict_.next(b_1_, offset) << 1;
    offset = detail::extract_key_part<2>(key);

    k_2_ = dict_.pred(b_2_, offset);

    entry_.rank = dict_.next(b_2_, k_2_);
    entry_.key = detail::combine_key_parts(k_0_, k_1_, k_2_);

    next();
  }

 private:
  const RankDict& dict_;
  const uint32_t sentinel_;

  uint32_t b_1_, b_2_;
  DictKey k_0_, k_1_, k_2_;
  Entry entry_;
};

// Implements the required interface to allow range-loops over rank dicts.
class RankDictIterator {
 public:
  explicit RankDictIterator(RankDict& dict) : scanner_(dict) {}

  auto operator*() {
    return scanner_.curr();
  }

  auto& operator++() {
    scanner_.next();
    return *this;
  }

  bool operator!=(uint32_t rank) {
    return scanner_.curr().rank != rank;
  }

 private:
  RankDictScanner scanner_;
};

inline auto begin(RankDict& dict) {
  return RankDictIterator(dict);
}

inline auto end(RankDict& dict) {
  return RankDictScanner(dict).sentinel();
}

// Builds rank/select data structure over the given keys. The keys must be in
// ascending order (or this method will throw an argument error).
RankDict make_dict(const Buffer<DictKey>& keys);

template <typename Archive>
inline void save(Archive& ar, const RankDict& dict) {
  ar(dict.max_);
  ar(dict.levels_);
}

template <typename Archive>
inline void load(Archive& ar, RankDict& dict) {
  ar(dict.max_);
  ar(dict.levels_);
}

}  // namespace voxeloo::tensors