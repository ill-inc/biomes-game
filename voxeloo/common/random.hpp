#pragma once

#include <algorithm>
#include <random>

namespace voxeloo::random {

inline auto& default_rng() {
  static std::mt19937 g;
  return g;
}

template <typename Range>
inline void shuffle(Range&& range) {
  std::shuffle(range.begin(), range.end(), default_rng());
}

template <typename Range>
inline Range shuffled(Range range) {
  shuffle(range);
  return range;
}

template <typename T = int>
inline T uniform_int() {
  static std::uniform_int_distribution<T> d;
  return d(default_rng());
}

template <typename T = float>
inline T uniform_real() {
  static std::uniform_real_distribution<T> d;
  return d(default_rng());
}

template <typename T = float>
inline T uniform_normal() {
  static std::normal_distribution<T> d;
  return d(default_rng());
}

}  // namespace voxeloo::random
