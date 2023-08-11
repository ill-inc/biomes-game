#pragma once

#include <unordered_map>
#include <vector>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/geometry.hpp"

namespace voxeloo::mapping {

struct Vec2Hash {
  size_t operator()(Vec2i point) const {
    return point.x + 7909 * point.y;
  }
};

struct Vec3Hash {
  size_t operator()(Vec3i point) const {
    return point.x + 7909 * (point.y + 7909 * point.z);
  }
};

template <typename T>
using Map2 = std::unordered_map<Vec2i, T, Vec2Hash>;

template <typename T>
using Map3 = std::unordered_map<Vec3i, T, Vec3Hash>;

template <typename T>
struct Array2 {
  Vec2u shape;
  std::vector<T> data;

  explicit Array2(const Vec2u& shape) : shape(shape), data(shape.x * shape.y) {}

  auto index(Vec2u pos) const {
    return pos.x + shape.x * pos.y;
  }

  auto& at(Vec2u pos) {
    return data[index(pos)];
  }

  auto get(Vec2u pos) const {
    return data[index(pos)];
  }

  auto set(Vec2u pos, T val) {
    return data[index(pos)] = val;
  }
};

template <typename T>
struct Array3 {
  Vec3u shape;
  std::vector<T> data;

  explicit Array3(const Vec3u& shape)
      : shape(shape), data(shape.x * shape.y * shape.z) {}

  auto index(Vec3u pos) const {
    return pos.x + shape.x * (pos.y + shape.y * pos.z);
  }

  auto& at(Vec3u pos) {
    return data[index(pos)];
  }

  auto get(Vec3u pos) const {
    return data[index(pos)];
  }

  auto set(Vec3u pos, T val) {
    return data[index(pos)] = val;
  }
};

template <typename T, typename Fn>
inline auto scan(const Array2<T>& array, Fn&& fn) {
  auto it = array.data.begin();
  for (auto y = 0u; y < array.shape.y; y += 1) {
    for (auto x = 0u; x < array.shape.x; x += 1) {
      fn(vec2(x, y), *it);
      ++it;
    }
  }
}

template <typename T, typename Fn>
inline auto scan(const Array3<T>& array, Fn&& fn) {
  auto it = array.data.begin();
  for (auto z = 0u; z < array.shape.z; z += 1) {
    for (auto y = 0u; y < array.shape.y; y += 1) {
      for (auto x = 0u; x < array.shape.x; x += 1) {
        fn(vec3(x, y, z), *it);
        ++it;
      }
    }
  }
}

}  // namespace voxeloo::mapping