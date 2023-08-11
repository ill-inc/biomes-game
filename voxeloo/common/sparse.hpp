#pragma once

#include <algorithm>
#include <cstdint>
#include <optional>
#include <tuple>
#include <utility>
#include <vector>

namespace voxeloo::sparse {

template <typename Pos, typename Val>
using Array = std::vector<std::tuple<Pos, Val>>;

// Returns an iterator at the lower-bound index of the position in the array.
template <typename Pos, typename Val>
inline auto bisect(const Array<Pos, Val>& array, const Pos& pos) {
  return std::lower_bound(
      array.begin(), array.end(), pos, [](const auto& l, const auto& r) {
        return std::get<0>(l) < r;
      });
}

// Returns an iterator at the entry in the array for the given position. If the
// entry is not set, an end iterator is returned.
template <typename Pos, typename Val>
inline auto find(const Array<Pos, Val>& array, const Pos& pos) {
  auto it = bisect(array, pos);
  if (it != array.end() && std::get<0>(*it) != pos) {
    return array.end();
  }
  return it;
}

// Returns the value in the array at the given position. An empty optional is
// returned if the position in the array is unset.
template <typename Pos, typename Val>
inline auto get_ptr(const Array<Pos, Val>& array, const Pos& pos) {
  const Val* ret = nullptr;
  if (auto it = find(array, pos); it != array.end()) {
    ret = std::addressof(std::get<1>(*it));
  }
  return ret;
}

// Returns the value in the array at the given position. An empty optional is
// returned if the position in the array is unset.
template <typename Pos, typename Val>
inline auto get_opt(const Array<Pos, Val>& array, const Pos& pos) {
  std::optional<Val> ret;
  if (auto it = find(array, pos); it != array.end()) {
    ret = std::get<1>(*it);
  }
  return ret;
}

// Provides an efficient pattern for building a sparse array.
template <typename Pos, typename Val>
class ArrayBuilder {
 public:
  explicit ArrayBuilder(size_t size_hint = 0) {
    if (size_hint) {
      data_.reserve(size_hint);
    }
  }

  void set(Pos pos, Val val) {
    data_.emplace_back(pos, std::move(val));
  }

  Array<Pos, Val> build() && {
    if (data_.empty()) {
      return data_;
    }

    // Move the accumulated data into the array to be returned.
    Array<Pos, Val> ret = std::move(data_);

    // Sort the array in place preserving assignment order.
    std::stable_sort(ret.begin(), ret.end(), [](auto& l, auto& r) {
      return std::get<0>(l) < std::get<0>(r);
    });

    // Collapse duplicates to their last-assigned value before returning.
    auto n = 0;
    for (size_t j = 1; j < ret.size(); j += 1) {
      if (std::get<0>(ret[j - 1]) != std::get<0>(ret[j])) {
        std::swap(ret[n++], ret[j - 1]);
      }
    }
    std::swap(ret[n++], ret.back());
    ret.resize(n);

    return ret;
  }

 private:
  Array<Pos, Val> data_;
};

// Creates a new array by merging the dst array on top of the src array.
template <typename Pos, typename Val>
inline auto merge(const Array<Pos, Val>& src, const Array<Pos, Val>& dst) {
  ArrayBuilder<Pos, Val> builder(src.size() + dst.size());
  for (const auto& [pos, val] : src) {
    builder.set(pos, val);
  }
  for (const auto& [pos, val] : dst) {
    builder.set(pos, val);
  }
  return builder.build();
}

}  // namespace voxeloo::sparse
