#pragma once

#include <array>
#include <cmath>
#include <limits>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/macros.hpp"
#include "voxeloo/common/quadifier.hpp"
#include "voxeloo/common/spatial.hpp"
#include "voxeloo/common/utils.hpp"

namespace voxeloo::voxels {

static constexpr int kDirCount = 6;

enum Dir { X_NEG, X_POS, Y_NEG, Y_POS, Z_NEG, Z_POS };

// TODO(taylor): Codegen a separate AABB library (similar to geometry.hpp).
struct Box {
  Vec3i v0 = {};
  Vec3i v1 = {};
};

inline bool operator==(const Box& b1, const Box& b2) {
  return b1.v0 == b2.v0 && b1.v1 == b2.v1;
}
inline bool operator!=(const Box& b1, const Box& b2) {
  return !(b1 == b2);
}

inline auto make_box(const Vec3i& v0, const Vec3i& v1) {
  return Box{v0, v1};
}

inline auto cube_box(int size) {
  return Box{{0, 0, 0}, {size, size, size}};
}

inline auto shape_box(Vec3u shape) {
  return Box{{0, 0, 0}, to<int>(shape)};
}

// Returns an box that includes an entire voxel space of any size.
inline Box infinite_box() {
  auto lo = std::numeric_limits<int>::min();
  auto hi = std::numeric_limits<int>::max();
  return Box{{lo, lo, lo}, {hi, hi, hi}};
}

// Returns an empty box that behaves correctly under set operations.
inline Box empty_box() {
  auto lo = std::numeric_limits<int>::max();
  auto hi = std::numeric_limits<int>::min();
  return Box{{lo, lo, lo}, {hi, hi, hi}};
}

// Returns a translated version of the given box.
inline Box shift_box(Box box, const Vec3i& shift) {
  box.v0 += shift;
  box.v1 += shift;
  return box;
}

// Returns the axis-aligned bounding box of the given boxes.
inline auto union_box(const Box& b1, const Box& b2) {
  return Box{min(b1.v0, b2.v0), max(b1.v1, b2.v1)};
}
inline auto union_box(std::initializer_list<Box> l) {
  auto ret = empty_box();
  for (const auto& box : l) {
    ret = union_box(ret, box);
  }
  return ret;
}

// Returns the largest axis-aligned bounding box inside the given boxes.
inline auto intersect_box(const Box& b1, const Box& b2) {
  return Box{max(b1.v0, b2.v0), min(b1.v1, b2.v1)};
}
inline auto intersect_box(std::initializer_list<Box> l) {
  auto ret = infinite_box();
  for (const auto& box : l) {
    ret = intersect_box(ret, box);
  }
  return ret;
}

// Returns a box at the given positions with unit size.
inline auto unit_box(Vec3i pos) {
  return Box{pos, pos + 1};
}
inline auto unit_box(Vec3f pos) {
  return unit_box(floor(pos).template to<int>());
}

// Returns the size of the given box in each dimension.
inline auto box_size(const Box& box) {
  return max(box.v1 - box.v0, 0);
}
inline auto box_norm(const Box& box) {
  return sum(box.v1 - box.v0);
}

// Returns whether or not the box is empty.
inline auto box_empty(const Box& box) {
  return box_norm(box) == 0;
}

// Returns whether the given position is inside the box.
inline auto box_contains(const Box& box, Vec3i pos) {
  return min(pos, box.v0) == box.v0 && max(pos + 1, box.v1) == box.v1;
}

// Returns whether the inner box in inside the outer box.
inline auto box_contains(const Box& outer, const Box& inner) {
  return voxels::intersect_box(outer, inner) == inner;
}

// Returns whether the given position is inside the zero-origin box.
inline auto shape_contains(Vec3u shape, Vec3i pos) {
  return box_contains(shape_box(shape), pos);
}

// Returns true if the two boxes intersect.
inline auto intersect_test(const Box& b1, const Box& b2) {
  return box_empty(Box{max(b1.v0, b2.v0), min(b1.v1, b2.v1)});
}

// Iterate over all cells in a box.
template <typename Fn>
inline auto box_scan(const Box& box, Fn&& fn) {
  for (int z = box.v0.z; z < box.v1.z; z += 1) {
    for (int y = box.v0.y; y < box.v1.y; y += 1) {
      for (int x = box.v0.x; x < box.v1.x; x += 1) {
        fn(x, y, z);
      }
    }
  }
}

// Returns a normal vector pointed in the given direction.
inline auto face_normal(Dir dir) {
  switch (dir) {
    case X_NEG:
      return Vec3f{-1.0f, 0.0f, 0.0f};
    case X_POS:
      return Vec3f{1.0f, 0.0f, 0.0f};
    case Y_NEG:
      return Vec3f{0.0f, -1.0f, 0.0f};
    case Y_POS:
      return Vec3f{0.0f, 1.0f, 0.0f};
    case Z_NEG:
      return Vec3f{0.0f, 0.0f, -1.0f};
    case Z_POS:
      return Vec3f{0.0f, 0.0f, 1.0f};
    default:
      CHECK_UNREACHABLE("Invalid direction.");
  }
}

// Returns the uv cordinates for a vertex on a face of the given direction.
inline auto face_uv_coords(const Vec3f& pos, Dir dir) {
  switch (dir) {
    case voxels::X_NEG:
      return pos.zy();
    case voxels::X_POS:
      return pos.zy();
    case voxels::Y_NEG:
      return pos.xz();
    case voxels::Y_POS:
      return pos.xz();
    case voxels::Z_NEG:
      return pos.xy();
    case voxels::Z_POS:
      return pos.xy();
    default:
      CHECK_UNREACHABLE("Invalid direction.");
  }
}

// Returns the uv cordinates for a vertex on a face of the given direction. The
// coordinates are truncated to be in the range 0 to 1.
inline auto face_modular_uv_coords(const Vec3f& pos, Dir dir) {
  return face_uv_coords(pos - floor(pos), dir);
}

// Returns the vertex positions for the given direction.
inline auto face_vertices(Dir dir) {
  using Ret = std::array<Vec3f, 4>;
  switch (dir) {
    case X_NEG:
      return Ret{{
          {0, 0, 0},
          {0, 0, 1},
          {0, 1, 1},
          {0, 1, 0},
      }};
    case X_POS:
      return Ret{{
          {1, 0, 1},
          {1, 0, 0},
          {1, 1, 0},
          {1, 1, 1},
      }};
    case Y_NEG:
      return Ret{{
          {0, 0, 0},
          {1, 0, 0},
          {1, 0, 1},
          {0, 0, 1},
      }};
    case Y_POS:
      return Ret{{
          {0, 1, 0},
          {0, 1, 1},
          {1, 1, 1},
          {1, 1, 0},
      }};
    case Z_NEG:
      return Ret{{
          {1, 0, 0},
          {0, 0, 0},
          {0, 1, 0},
          {1, 1, 0},
      }};
    case Z_POS:
      return Ret{{
          {0, 0, 1},
          {1, 0, 1},
          {1, 1, 1},
          {0, 1, 1},
      }};
    default:
      CHECK_UNREACHABLE("Invalid direction.");
  }
}

// Returns the vertex indices for the given face.
constexpr inline auto face_indices() {
  return std::array<int, 6>{0, 1, 3, 2, 3, 1};
}

template <typename Fn>
void march_faces(const Vec3f& pos, const Vec3f& dir, Fn&& fn) {
  const auto [x, y, z] = pos;
  const auto [r, s, t] = dir;

  // The signs of the ray direction vector components.
  auto sx = std::signbit(r) ? -1 : 1;
  auto sy = std::signbit(s) ? -1 : 1;
  auto sz = std::signbit(t) ? -1 : 1;

  // The ray distance traveled per unit in each direction.
  auto norm = std::sqrt(r * r + s * s + t * t);
  auto dx = norm / std::abs(r);
  auto dy = norm / std::abs(s);
  auto dz = norm / std::abs(t);

  // The ray distance to the next intersection in each direction.
  auto lx = (sx == -1 ? (x - std::floor(x)) : (1 + std::floor(x) - x)) * dx;
  auto ly = (sy == -1 ? (y - std::floor(y)) : (1 + std::floor(y) - y)) * dy;
  auto lz = (sz == -1 ? (z - std::floor(z)) : (1 + std::floor(z) - z)) * dz;

  // The face directions of each intersection.
  auto fx = std::signbit(r) ? X_POS : X_NEG;
  auto fy = std::signbit(s) ? Y_POS : Y_NEG;
  auto fz = std::signbit(t) ? Z_POS : Z_NEG;

  // Advance voxel indices that intersect with the given ray.
  auto ix = ifloor(x);
  auto iy = ifloor(y);
  auto iz = ifloor(z);
  for (auto done = false; !done;) {
    if (lx <= ly && lx <= lz) {
      ix += sx;
      done = !fn(ix, iy, iz, lx, fx);
      lx += dx;
    } else if (ly <= lz) {
      iy += sy;
      done = !fn(ix, iy, iz, ly, fy);
      ly += dy;
    } else {
      iz += sz;
      done = !fn(ix, iy, iz, lz, fz);
      lz += dz;
    }
  }
}

template <typename Fn>
void march(const Vec3f& pos, const Vec3f& dir, Fn&& fn) {
  if (!fn(ifloor(pos.x), ifloor(pos.y), ifloor(pos.z), 0.0f)) {
    return;
  }
  march_faces(pos, dir, [&](int x, int y, int z, float d, ATTR_UNUSED Dir f) {
    return fn(x, y, z, d);
  });
}

template <typename Fn>
void march_segment(const Vec3f& pos, const Vec3f& to, Fn&& fn) {
  auto dir = to - pos;
  auto len = norm(to - pos);
  march(pos, dir, [&](auto x, auto y, auto z, auto d) {
    if (d < len) {
      fn(x, y, z);
      return true;
    } else {
      return false;
    }
  });
}

namespace detail {
template <typename Key>
struct Plane {
  Key key;
  Dir dir;
  int lvl;
};

template <typename Key>
inline bool operator==(const Plane<Key>& a, const Plane<Key>& b) {
  return a.key == b.key && a.dir == b.dir && a.lvl == b.lvl;
}

template <typename Key>
struct PlaneHash {
  size_t operator()(const Plane<Key>& plane) const {
    auto x = static_cast<uint32_t>(plane.key);
    auto y = static_cast<uint32_t>(plane.dir);
    auto z = static_cast<uint32_t>(plane.lvl);
    return spatial::combine(x, y, z);
  }
};
}  // namespace detail

template <typename Key>
class VoxelQuadifier {
 public:
  using Output = quadifier::QuadifierOutput<detail::Plane<Key>>;

  template <typename EmptyFn>
  void push(int x, int y, int z, Key key, EmptyFn&& empty) {
    if (empty({x - 1, y, z})) {
      quadifier_.add({std::move(key), voxels::X_NEG, x}, {z, y});
    }
    if (empty({x + 1, y, z})) {
      quadifier_.add({std::move(key), voxels::X_POS, x + 1}, {z, y});
    }
    if (empty({x, y - 1, z})) {
      quadifier_.add({std::move(key), voxels::Y_NEG, y}, {x, z});
    }
    if (empty({x, y + 1, z})) {
      quadifier_.add({std::move(key), voxels::Y_POS, y + 1}, {x, z});
    }
    if (empty({x, y, z - 1})) {
      quadifier_.add({std::move(key), voxels::Z_NEG, z}, {x, y});
    }
    if (empty({x, y, z + 1})) {
      quadifier_.add({std::move(key), voxels::Z_POS, z + 1}, {x, y});
    }
  }

  auto build() {
    return quadifier_.build();
  }

 private:
  quadifier::Quadifier<detail::Plane<Key>, detail::PlaneHash<Key>> quadifier_;
};

}  // namespace voxeloo::voxels
