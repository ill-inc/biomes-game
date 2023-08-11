#pragma once

#include <array>
#include <cstdint>
#include <unordered_map>
#include <vector>

#include "cereal/archives/binary.hpp"
#include "cereal/types/tuple.hpp"
#include "cereal/types/vector.hpp"
#include "voxeloo/common/bits.hpp"
#include "voxeloo/common/colors.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/macros.hpp"
#include "voxeloo/common/meshes.hpp"
#include "voxeloo/common/quadifier.hpp"
#include "voxeloo/common/sparse.hpp"
#include "voxeloo/common/succinct.hpp"
#include "voxeloo/common/threads.hpp"
#include "voxeloo/common/voxels.hpp"

namespace voxeloo {
namespace blocks {

// Returns the remainder and quotient of x divided by 2**k.
template <typename L, typename U>
constexpr inline auto bit_mod(uint32_t x, uint32_t k) {
  return std::tuple{static_cast<L>(x & ((1 << k) - 1)), static_cast<U>(x >> k)};
}

// Packs 3 unsigned ints into a single one with the given part sizes.
template <typename In>
constexpr inline auto pack(In a, In b, In c, uint32_t q, uint32_t r) {
  return a | (b << q) | (c << (q + r));
}

// Unpacks 3 unsigned ints from a single one with the given part sizes.
template <typename In>
constexpr inline auto unpack(In in, uint32_t q, uint32_t r) {
  auto m_q = (1 << q) - 1;
  auto m_r = (1 << r) - 1;
  return std::tuple{in & m_q, (in >> q) & m_r, in >> (q + r)};
}

// Returns the (hi, lo)-index pair for a given world coordinate.
constexpr inline auto key(int32_t x, int32_t y, int32_t z) {
  union {
    int32_t s;
    uint32_t u;
  } b_x{x}, b_y{y}, b_z{z};
  auto [lo_x, hi_x] = bit_mod<uint32_t, uint64_t>(b_x.u, 12);
  auto [lo_y, hi_y] = bit_mod<uint32_t, uint64_t>(b_y.u, 8);
  auto [lo_z, hi_z] = bit_mod<uint32_t, uint64_t>(b_z.u, 12);
  return std::tuple{
      pack(hi_x, hi_y, hi_z, 20, 24),
      pack(lo_x, lo_y, lo_z, 12, 8),
  };
}

// Returns the world coordinate for a given (hi, lo)-index pair.
constexpr inline auto pos(uint64_t hi, uint32_t lo) {
  auto [lo_x, lo_y, lo_z] = unpack(lo, 12, 8);
  auto [hi_x, hi_y, hi_z] = unpack(hi, 20, 24);
  union {
    uint32_t u;
    int32_t s;
  } x{lo_x}, y{lo_y}, z{lo_z};
  x.u |= static_cast<uint32_t>(hi_x) << 12;
  y.u |= static_cast<uint32_t>(hi_y) << 8;
  z.u |= static_cast<uint32_t>(hi_z) << 12;
  return std::tuple(x.s, y.s, z.s);
}

// Enum defining the encoding format of the block list.
enum BlockFormat { DEFAULT_FORMAT = 1, DEPRECATED_TUPLE_FORMAT = 0 };

// Encapsulates a sparse 3D map of values in a (2**12 x 2**8 x 2**12)-space.
template <typename Val>
using Block = sparse::Array<uint32_t, Val>;

// Encapsulates a sparse 3D map of values in (2**32 x 2**32 x 2**32)-space.
template <typename Val>
struct BlockList {
  float scale;
  sparse::Array<uint64_t, Block<Val>> blocks;
};

// Returns the total number of non-empty coordinates in the block list.
template <typename Val>
inline auto size(const BlockList<Val>& bl) {
  size_t ret = 0;
  for (const auto& [_, block] : bl.blocks) {
    ret += block.size();
  }
  return ret;
}

// Routine to iterate over all values in a BlockList.
template <typename Val, typename Fn>
inline void for_each(const BlockList<Val>& bl, Fn&& fn) {
  for (const auto& [hi, b] : bl.blocks) {
    for (const auto& [lo, v] : b) {
      auto [x, y, z] = pos(hi, lo);
      fn(x, y, z, v);
    }
  }
}

// Extracts all of the values in a BlockList to a vector of tuples.
template <typename Val>
inline auto extract(const BlockList<Val>& bl) {
  std::vector<std::tuple<int, int, int, Val>> ret;
  ret.reserve(size(bl));
  for_each(bl, [&](int x, int y, int z, Val v) {
    ret.emplace_back(x, y, z, std::move(v));
  });
  return ret;
}

// Provides efficient read operations over a block list.
template <typename Val>
class BlockReader {
 public:
  explicit BlockReader(const BlockList<Val>& block_list)
      : blocks_(block_list.blocks), cache_(blocks_.end()) {}

  auto get(int x, int y, int z) const {
    auto [hi, lo] = key(x, y, z);
    if (cache_ == blocks_.end() || std::get<0>(*cache_) != hi) {
      cache_ = sparse::find(blocks_, hi);
    }
    std::optional<Val> ret;
    if (cache_ != blocks_.end()) {
      ret = sparse::get_opt(std::get<1>(*cache_), lo);
    }
    return ret;
  }

  auto get_or(int x, int y, int z, Val fallback) const {
    return get(x, y, z).value_or(std::move(fallback));
  }

  auto has(int x, int y, int z) const {
    return !!get(x, y, z);
  }

 private:
  const sparse::Array<uint64_t, Block<Val>>& blocks_;
  mutable decltype(blocks_.begin()) cache_;
};

// Builder pattern to generate a BlockList.
template <typename Val>
class BlockBuilder {
 public:
  explicit BlockBuilder(float scale) : scale_(scale) {}

  void add(int x, int y, int z, Val val) {
    auto [hi, lo] = key(x, y, z);
    blocks_[hi].set(lo, std::move(val));
  }

  auto build() && {
    sparse::ArrayBuilder<uint64_t, Block<Val>> builder(blocks_.size());
    for (auto&& [index, block] : std::move(blocks_)) {
      builder.set(index, std::move(block).build());
    }
    return BlockList<Val>{scale_, std::move(builder).build()};
  }

 private:
  float scale_;
  std::unordered_map<uint64_t, sparse::ArrayBuilder<uint32_t, Val>> blocks_;
};

template <typename Val>
inline auto bounding_box(const BlockList<Val>& block_list) {
  auto ret = voxels::empty_box();
  for_each(block_list, [&](int x, int y, int z, ATTR_UNUSED Val _) {
    ret = voxels::union_box(ret, voxels::unit_box(vec3(x, y, z)));
  });
  return ret;
}

template <typename Val>
inline auto center_of_mass(const BlockList<Val>& block_list) {
  auto n = 1e-5;
  auto center = vec3(0.0, 0.0, 0.0);
  for_each(block_list, [&](int x, int y, int z, ATTR_UNUSED Val _) {
    center += vec3(x, y, z).to<double>() + 0.5;
    n += 1;
  });
  return center / n;
}

template <typename Val, typename Fn>
inline auto map(const BlockList<Val>& block_list, Fn&& fn) {
  BlockBuilder<Val> builder(block_list.scale);
  for_each(block_list, [&](int x, int y, int z, Val val) {
    if (std::optional<Val> out = fn(x, y, z, val)) {
      builder.add(x, y, z, *out);
    }
  });
  return std::move(builder).build();
}

template <typename Val>
inline auto crop(const BlockList<Val>& block_list, const voxels::Box& box) {
  return map(block_list, [&](int x, int y, int z, Val val) {
    std::optional<Val> ret;
    if (voxels::box_contains(box, vec3(x, y, z))) {
      ret = val;
    }
    return ret;
  });
}

template <typename Val, typename Fn>
inline void march(
    const BlockList<Val>& block_list,
    Vec3f pos,
    Vec3f dir,
    float distance,
    Fn&& fn) {
  BlockReader<Val> reader(block_list);
  voxels::march(pos, dir, [&](int x, int y, int z, float d) {
    return d <= distance ? fn(x, y, z, reader.get(x, y, z)) : false;
  });
}

// Encodes a BlockList to the given archive.
template <typename Archive, typename Val>
inline void save(Archive& ar, const BlockList<Val>& block_list) {
  ar(DEFAULT_FORMAT);

  // Encode the blocks.
  ar(block_list.scale, static_cast<uint64_t>(block_list.blocks.size()));
  for (const auto& [index, block] : block_list.blocks) {
    ar(index, static_cast<uint64_t>(block.size()));
    for (const auto& [pos, val] : block) {
      ar(pos, val);
    }
  }
}

// Decodes a BlockList from the given archive.
template <typename Archive, typename Val>
inline void load(Archive& ar, BlockList<Val>& block_list) {
  BlockFormat format;
  ar(format);

  switch (format) {
    case DEFAULT_FORMAT: {
      uint64_t num_blocks;
      ar(block_list.scale, num_blocks);
      block_list.blocks.resize(num_blocks);
      for (auto& [index, block] : block_list.blocks) {
        uint64_t block_size;
        ar(index, block_size);
        block.resize(block_size);
        for (auto& [pos, val] : block) {
          ar(pos, val);
        }
      }
      break;
    }
    case DEPRECATED_TUPLE_FORMAT: {
      uint64_t num_blocks;
      ar(block_list.scale, num_blocks);
      block_list.blocks.resize(num_blocks);
      for (auto& [index, block] : block_list.blocks) {
        ar(index, block);
      }
      break;
    }
    default:
      CHECK_UNREACHABLE("Invalid block format");
  };
}

namespace detail {
struct Plane {
  RGBA rgba;
  voxels::Dir dir;
  int lvl;
};

inline bool operator==(const Plane& a, const Plane& b) {
  return a.rgba == b.rgba && a.dir == b.dir && a.lvl == b.lvl;
}

struct PlaneHash {
  size_t operator()(const Plane& plane) const {
    auto x = static_cast<uint32_t>(plane.rgba);
    auto y = static_cast<uint32_t>(plane.dir);
    auto z = static_cast<uint32_t>(plane.lvl);
    return std::get<1>(blocks::key(x, y, z));
  }
};
}  // namespace detail
}  // namespace blocks

namespace meshes {

// A MeshMaker implementation for a voxel surface representation.
template <typename Emitter>
class MeshMaker<blocks::BlockList<RGBA>, Emitter> {
 public:
  explicit MeshMaker(const blocks::BlockList<RGBA>& block_list)
      : block_list_(block_list) {}

  void emit(Emitter& emitter) {
    using namespace blocks::detail;
    quadifier::Quadifier<Plane, PlaneHash> quadifier;

    // Emit faces along each direction adjacent to an empty voxel.
    for_each(block_list_, [&](int x, int y, int z, RGBA rgba) {
      blocks::BlockReader<RGBA> reader(block_list_);
      auto empty = [&](int x, int y, int z) {
        return !reader.has(x, y, z);
      };

      if (empty(x - 1, y, z)) {
        quadifier.add({rgba, voxels::X_NEG, x}, {y, z});
      }
      if (empty(x + 1, y, z)) {
        quadifier.add({rgba, voxels::X_POS, x + 1}, {y, z});
      }
      if (empty(x, y - 1, z)) {
        quadifier.add({rgba, voxels::Y_NEG, y}, {x, z});
      }
      if (empty(x, y + 1, z)) {
        quadifier.add({rgba, voxels::Y_POS, y + 1}, {x, z});
      }
      if (empty(x, y, z - 1)) {
        quadifier.add({rgba, voxels::Z_NEG, z}, {x, y});
      }
      if (empty(x, y, z + 1)) {
        quadifier.add({rgba, voxels::Z_POS, z + 1}, {x, y});
      }
    });

    // Generate the compressed quads.
    int offset = 0;
    for (const auto& [p, q] : quadifier.build()) {
      auto scale = block_list_.scale;
      auto color = colors::to_floats<Vec4f>(p.rgba).xyz();
      auto emit_vertex = [&](int x, int y, int z) {
        emitter.emit_vertex(scale * vec3(x, y, z).to<float>(), color);
      };

      if (p.dir == voxels::X_NEG) {
        emit_vertex(p.lvl, q.v0.x, q.v0.y);
        emit_vertex(p.lvl, q.v0.x, q.v1.y);
        emit_vertex(p.lvl, q.v1.x, q.v1.y);
        emit_vertex(p.lvl, q.v1.x, q.v0.y);
      }
      if (p.dir == voxels::X_POS) {
        emit_vertex(p.lvl, q.v0.x, q.v1.y);
        emit_vertex(p.lvl, q.v0.x, q.v0.y);
        emit_vertex(p.lvl, q.v1.x, q.v0.y);
        emit_vertex(p.lvl, q.v1.x, q.v1.y);
      }
      if (p.dir == voxels::Y_NEG) {
        emit_vertex(q.v0.x, p.lvl, q.v0.y);
        emit_vertex(q.v1.x, p.lvl, q.v0.y);
        emit_vertex(q.v1.x, p.lvl, q.v1.y);
        emit_vertex(q.v0.x, p.lvl, q.v1.y);
      }
      if (p.dir == voxels::Y_POS) {
        emit_vertex(q.v0.x, p.lvl, q.v0.y);
        emit_vertex(q.v0.x, p.lvl, q.v1.y);
        emit_vertex(q.v1.x, p.lvl, q.v1.y);
        emit_vertex(q.v1.x, p.lvl, q.v0.y);
      }
      if (p.dir == voxels::Z_NEG) {
        emit_vertex(q.v0.x, q.v0.y, p.lvl);
        emit_vertex(q.v0.x, q.v1.y, p.lvl);
        emit_vertex(q.v1.x, q.v1.y, p.lvl);
        emit_vertex(q.v1.x, q.v0.y, p.lvl);
      }
      if (p.dir == voxels::Z_POS) {
        emit_vertex(q.v0.x, q.v0.y, p.lvl);
        emit_vertex(q.v1.x, q.v0.y, p.lvl);
        emit_vertex(q.v1.x, q.v1.y, p.lvl);
        emit_vertex(q.v0.x, q.v1.y, p.lvl);
      }

      for (const auto i : voxels::face_indices()) {
        emitter.emit_index(offset + i);
      }

      offset += 4;
    }
  }

 private:
  const blocks::BlockList<RGBA>& block_list_;
};

}  // namespace meshes
}  // namespace voxeloo
