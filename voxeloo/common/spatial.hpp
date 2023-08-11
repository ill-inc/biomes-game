#pragma once

#include <robin_hood.h>

#include <cstdint>
#include <unordered_map>
#include <unordered_set>

#include "voxeloo/common/format.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/runs.hpp"
#include "voxeloo/common/succinct.hpp"

namespace voxeloo::spatial {

template <
    typename Key,
    typename Hash = std::hash<Key>,
    typename KeyEqual = std::equal_to<Key>>
using UnorderedSet = robin_hood::unordered_set<Key, Hash, KeyEqual>;

template <
    typename Key,
    typename Val,
    typename Hash = std::hash<Key>,
    typename KeyEqual = std::equal_to<Key>>
using UnorderedMap = robin_hood::unordered_map<Key, Val, Hash, KeyEqual>;

inline uint32_t shuffle(uint32_t x) {
  x = (x ^ (x << 16)) & 0xff0000ff;
  x = (x ^ (x << 8)) & 0x0f00f00f;
  x = (x ^ (x << 4)) & 0xc30c30c3;
  x = (x ^ (x << 2)) & 0x49249249;
  return x;
}

inline uint32_t combine(uint32_t x, uint32_t y, uint32_t z) {
  auto hasher = [](uint32_t x) {
    x ^= x >> 16;
    x *= 0x7feb352dul;
    x ^= x >> 15;
    x *= 0x846ca68bul;
    x ^= x >> 16;
    return x;
  };
  return hasher(x + hasher(y + hasher(z)));
}

template <uint32_t block_size = 256>
inline auto block_coord(int x, int y, int z) {
  static auto divisor = static_cast<int>(block_size);
  int g_x = x < 0 ? (x + 1) / divisor - 1 : x / divisor;
  int g_y = y < 0 ? (y + 1) / divisor - 1 : y / divisor;
  int g_z = z < 0 ? (z + 1) / divisor - 1 : z / divisor;
  return Vec3<int>{g_x, g_y, g_z};
}

template <uint32_t block_size = 256>
inline auto block_decode(uint32_t code) {
  auto x = (code % block_size);
  auto y = (code / block_size) % block_size;
  auto z = (code / block_size) / block_size;
  return Vec3<uint32_t>{x, y, z};
}

template <uint32_t block_size = 256>
inline auto block_encode(uint32_t x, uint32_t y, uint32_t z) {
  x = x % block_size;
  y = y % block_size;
  z = z % block_size;
  return x + block_size * (y + block_size * z);
}

template <uint32_t block_size = 256>
inline auto block_and_local(int x, int y, int z) {
  static_assert(block_size <= 1024);
  auto block = block_coord<block_size>(x, y, z);
  auto local = vec3(x, y, z) - static_cast<int>(block_size) * block;
  return std::tuple{
      block,
      block_encode<block_size>(local.x, local.y, local.z),
  };
}

inline auto morton_encode(uint32_t x, uint32_t y, uint32_t z) {
  return shuffle(x) | (shuffle(z) << 1) | (shuffle(y) << 2);
}

template <uint32_t block_size = 256>
inline auto morton_hash(int x, int y, int z) {
  static_assert(block_size <= 1024);
  auto l_x = static_cast<uint32_t>(x);
  auto l_y = static_cast<uint32_t>(y);
  auto l_z = static_cast<uint32_t>(z);
  auto l_hash = morton_encode(l_x, l_y, l_z);

  auto g_x = static_cast<uint32_t>(x) / block_size;
  auto g_y = static_cast<uint32_t>(y) / block_size;
  auto g_z = static_cast<uint32_t>(z) / block_size;
  auto g_hash = combine(g_x, g_y, g_z);

  return std::tuple<uint32_t, uint32_t>(g_hash, l_hash);
}

template <uint32_t block_size, typename Fn>
inline auto decompose_span(const runs::Span& span, Fn&& fn) {
  auto dim = static_cast<int>(block_size);
  auto lo = to<int>(block_decode<block_size>(span.lo));
  auto hi = to<int>(block_decode<block_size>(span.hi - 1));
  if (lo.yz() == hi.yz()) {
    fn(lo, hi.x - lo.x + 1);
    return;
  } else if (lo.z == hi.z) {
    fn(lo, dim - lo.x);
    for (auto y = lo.y + 1; y < hi.y; y += 1) {
      fn(Vec3i{0, y, lo.z}, dim);
    }
    fn(Vec3i{0, hi.y, hi.z}, hi.x + 1);
  } else {
    fn(lo, dim - lo.x);
    for (auto y = lo.y + 1; y < dim; y += 1) {
      fn(Vec3i{0, y, lo.z}, dim);
    }
    for (auto z = lo.z + 1; z < hi.z; z += 1) {
      for (auto y = 0; y < dim; y += 1) {
        fn(Vec3i{0, y, z}, dim);
      }
    }
    for (auto y = 0; y < hi.y; y += 1) {
      fn(Vec3i{0, y, hi.z}, dim);
    }
    fn(Vec3i{0, hi.y, hi.z}, hi.x + 1);
  }
}

struct SpatialMapHash {
  std::size_t operator()(const Vec3i& pos) const {
    auto [x, y, z] = pos.template to<uint32_t>();
    return combine(x, y, z);
  }
};

template <typename Val>
using Map = UnorderedMap<Vec3i, Val, SpatialMapHash>;

template <typename Val>
inline auto storage_size(const Map<Val>& map) {
  return map.calcNumBytesTotal(map.calcNumElementsWithBuffer(map.mask() + 1));
}

template <typename T, uint32_t block_size>
class IndexAccessor;

// Index provides a map of 3D integer coordinates to arbitrary values, but
// packs nearby values into sub-blocks. The block structure enables better
// cache locality (compared to the Map implementation) and enables a more
// compact representation by compressing coordinates of nearby values. Since
// blocks tend to have few values, we opted for a different implementation for
// their map implementation, which trades off write cost for read performance.
template <typename T, uint32_t block_size = 32>
struct Index {
  auto access() const {
    return IndexAccessor<T, block_size>(*this);
  }

  void clear() {
    blocks_.clear();
  }

  auto size() const {
    size_t ret = 0;
    for (const auto& [_, index] : blocks_) {
      ret += index.size();
    }
    return ret;
  }

  template <typename Fn>
  void scan(Fn&& fn) const {
    for (const auto& [pos, index] : blocks_) {
      auto outer = static_cast<int>(block_size) * pos;
      index.scan([&](uint32_t local, const T& value) {
        auto inner = block_decode<block_size>(local);
        fn(outer + inner.template to<int>(), value);
      });
    }
  }

  void update(const std::vector<std::tuple<Vec3i, T>>& values) {
    Map<succinct::IndexBuilder<T>> builders;

    auto iter = builders.end();
    for (auto& [pos, v] : values) {
      auto [block, local] = block_and_local<block_size>(pos.x, pos.y, pos.z);
      if (iter == builders.end() || iter->first != block) {
        iter = builders.find(block);
        if (iter == builders.end()) {
          auto block_it = blocks_.try_emplace(block).first;
          iter = builders.emplace(block, block_it->second).first;
        }
      }
      iter->second.add(local, std::move(v));
    }

    for (auto& [key, builder] : builders) {
      blocks_[key] = std::move(builder).build();
    }
  }

  void remove(const std::vector<Vec3i>& values) {
    Map<succinct::IndexDeleter<T>> deleters;

    auto iter = deleters.end();
    for (auto& pos : values) {
      auto [block, local] = block_and_local<block_size>(pos.x, pos.y, pos.z);
      if (iter == deleters.end() || iter->first != block) {
        iter = deleters.find(block);
        if (iter == deleters.end()) {
          iter = deleters.emplace(block, blocks_[block]).first;
        }
      }
      iter->second.del(local);
    }

    for (auto& [key, deleter] : deleters) {
      blocks_[key] = std::move(deleter).build();
    }
  }

  void update_block(int x, int y, int z, succinct::Index<T> index) {
    auto [block, _] = block_and_local<block_size>(x, y, z);
    blocks_[block] = std::move(index);
  }

  auto storage_size() const {
    size_t ret = spatial::storage_size(blocks_);
    for (auto& [key, index] : blocks_) {
      ret += index.storage_size();
    }
    return ret;
  }

 private:
  Map<succinct::Index<T>> blocks_;

  template <typename _T, uint32_t _block_size>
  friend class IndexAccessor;
};

template <typename T, uint32_t block_size>
class IndexAccessor {
 public:
  explicit IndexAccessor(const Index<T, block_size>& index)
      : index_(index), iter_(index_.blocks_.end()) {}

  bool has(int x, int y, int z) const {
    auto local = cache(x, y, z);
    return iter_ != index_.blocks_.end() && iter_->second.has(local);
  }

  const auto& get(int x, int y, int z) const {
    auto local = cache(x, y, z);
    CHECK_ARGUMENT(iter_ != index_.blocks_.end());
    return iter_->second.get(local);
  }

 private:
  auto cache(int x, int y, int z) const {
    auto [block, local] = block_and_local<block_size>(x, y, z);
    if (iter_ == index_.blocks_.end() || iter_->first != block) {
      iter_ = index_.blocks_.find(block);
    }
    return local;
  }

  const Index<T, block_size>& index_;
  mutable decltype(index_.blocks_.end()) iter_;
};

template <typename T, uint32_t block_size, T empty>
class RangeIndexAccessor;

// A RangeIndex is equivalent in implementation to an Index except that it
// stores volumetric data instead of point data. The entire integer range is
// initialized to zero everywhere, and runs of given value will be compressed.
template <typename T, uint32_t block_size = 512, T empty = T()>
class RangeIndex {
 public:
  static const auto kLocalSize = block_size * block_size * block_size;

  auto access() const {
    return RangeIndexAccessor<T, block_size, empty>(blocks_);
  }

  void clear() {
    blocks_.clear();
  }

  template <typename Fn>
  void scan_runs(Fn&& fn) const {
    for (const auto& [pos, index] : blocks_) {
      auto outer = static_cast<int>(block_size) * pos;
      index.scan([&](const auto& span, const auto& value) {
        if (value != empty) {
          auto wrap_fn = [&value, &outer, &fn](auto pos, auto len) {
            fn(outer + pos.template to<int>(), len, value);
          };
          decompose_span<block_size>(span, wrap_fn);
        }
      });
    }
  }

  template <typename Fn>
  void scan(Fn&& fn) const {
    scan_runs([&](Vec3i pos, uint32_t len, const auto& value) {
      for (uint32_t i = 0; i < len; i += 1) {
        fn(pos.x + static_cast<int>(i), pos.y, pos.z, value);
      }
    });
  }

  void update(const std::vector<std::tuple<Vec3i, T>>& values) {
    Map<runs::IndexBuilder<T>> builders;

    auto iter = builders.end();
    for (auto& [pos, v] : values) {
      auto [block, local] = block_and_local<block_size>(pos.x, pos.y, pos.z);
      if (iter == builders.end() || iter->first != block) {
        iter = builders.find(block);
        if (iter == builders.end()) {
          auto block_it = blocks_.try_emplace(block, default_block()).first;
          iter = builders.emplace(block, block_it->second).first;
        }
      }
      iter->second.add(local, std::move(v));
    }

    for (auto& [block, builder] : builders) {
      blocks_[block] = std::move(builder).build();
    }
  }

  void update_block(int x, int y, int z, runs::Index<T> index) {
    auto [block, _] = block_and_local<block_size>(x, y, z);
    blocks_[block] = std::move(index);
  }

  auto storage_size() const {
    size_t ret = spatial::storage_size(blocks_);
    for (auto& [key, index] : blocks_) {
      ret += index.storage_size();
    }
    return ret;
  }

 private:
  auto default_block() const {
    return runs::make_index(kLocalSize, empty);
  }

  Map<runs::Index<T>> blocks_;
};

template <typename T, uint32_t block_size, T empty>
class RangeIndexAccessor {
 public:
  explicit RangeIndexAccessor(const Map<runs::Index<T>>& blocks)
      : blocks_(blocks), iter_(blocks_.end()) {}

  T get(int x, int y, int z) const {
    auto [block, local] = block_and_local<block_size>(x, y, z);
    if (iter_ == blocks_.end() || iter_->first != block) {
      iter_ = blocks_.find(block);
      if (iter_ == blocks_.end()) {
        return empty;
      }
    }
    return iter_->second.get(local);
  }

 private:
  const Map<runs::Index<T>>& blocks_;
  mutable decltype(blocks_.end()) iter_;
};

}  // namespace voxeloo::spatial
