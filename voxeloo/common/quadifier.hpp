#pragma once

#include <functional>
#include <unordered_map>
#include <vector>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/geometry.hpp"

namespace voxeloo::quadifier {

struct Quad {
  Vec2i v0;
  Vec2i v1;
};

inline bool operator==(const Quad& a, const Quad& b) {
  return a.v0 == b.v0 && a.v1 == b.v1;
}

std::vector<Quad> merge(std::vector<Vec2i> cells);

template <typename Key>
using QuadifierOutput = std::vector<std::tuple<Key, Quad>>;

template <
    typename Key,
    typename Hash = std::hash<Key>,
    typename KeyEqual = std::equal_to<Key>>
class Quadifier {
 public:
  void add(const Key& key, const Vec2i& pos) {
    map_[key].push_back(pos);
  }

  auto build() {
    QuadifierOutput<Key> ret;
    for (auto& [key, cells] : map_) {
      auto quads = merge(std::move(cells));
      for (auto& quad : quads) {
        ret.emplace_back(std::move(key), std::move(quad));
      }
    }
    map_.clear();
    return ret;
  }

 private:
  std::unordered_map<Key, std::vector<Vec2i>, Hash, KeyEqual> map_;
};

}  // namespace voxeloo::quadifier
