#pragma once

#include <sstream>
#include <string>

#include "voxeloo/common/macros.hpp"

namespace voxeloo {

template <typename... Args>
inline auto stringify(Args&&... args) {
  std::stringstream ss;
  (ss << ... << std::forward<Args>(args));
  return ss.str();
}

template <typename Head>
inline auto join(ATTR_UNUSED const char* separator, Head&& head) {
  return stringify(std::forward<Head>(head));
}

template <typename Head, typename... Tail>
inline auto join(const char* separator, Head&& head, Tail&&... tail) {
  return stringify(
      std::forward<Head>(head),
      separator,
      join(separator, std::forward<Tail>(tail)...));
}

template <typename Range>
inline auto join_range(const char* separator, Range&& range) {
  std::stringstream ss;
  ss << "[";
  auto it = range.begin();
  if (it != range.end()) {
    ss << stringify(*it++);
    while (it != range.end()) {
      ss << stringify(", ", *it++);
    }
  }
  ss << "]";
  return ss.str();
}

}  // namespace voxeloo
