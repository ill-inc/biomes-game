#pragma once

#include <algorithm>
#include <vector>

#include "voxeloo/common/errors.hpp"

namespace voxeloo::galois {

template <typename Range, typename Fn>
inline auto extract_max(Range&& range, Fn&& fn) {
  CHECK_ARGUMENT(range.begin() != range.end());
  auto it = std::max_element(range.begin(), range.end(), [&](auto& l, auto& r) {
    return fn(l) < fn(r);
  });
  return fn(*it);
}

template <typename Range, typename Fn>
inline auto sort_by(Range&& range, Fn&& fn) {
  std::sort(range.begin(), range.end(), [&](auto& l, auto& r) {
    return fn(l) < fn(r);
  });
}

template <typename Src, typename Dst>
inline auto extend(Src&& dst, Dst&& src) {
  dst.insert(dst.end(), src.begin(), src.end());
}

}  // namespace voxeloo::galois
