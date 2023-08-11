#pragma once

#include <queue>
#include <vector>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/tensors/arrays.hpp"

namespace voxeloo::tensors {

namespace detail {
template <typename Data, typename Compare>
class PriorityQueue {
 public:
  PriorityQueue(std::vector<Data> data, Compare cmp)
      : top_(0), cmp_(cmp), data_(std::move(data)), pq_(cmp) {
    std::sort(data_.begin(), data_.end(), [&](auto& a, auto& b) {
      return cmp_(b, a);
    });
  }

  bool empty() {
    return top_ == data_.size() && pq_.empty();
  }

  auto pop() {
    if (pq_.empty() || (top_ < data_.size() && cmp_(pq_.top(), data_[top_]))) {
      auto ret = std::move(data_[top_]);
      top_ += 1;
      return ret;
    } else {
      auto ret = std::move(pq_.top());
      pq_.pop();
      return ret;
    }
  }

  void add(Data data) {
    pq_.emplace(std::move(data));
  }

 private:
  size_t top_;
  Compare cmp_;
  std::vector<Data> data_;
  std::priority_queue<Data, std::vector<Data>, Compare> pq_;
};
}  // namespace detail

template <typename Val>
class RangesArrayBuilder {
 public:
  using Range = std::pair<ArrayPos, ArrayPos>;

  explicit RangesArrayBuilder(ArrayPos size, Val fill = Val()) : size_(size) {
    add({0, size}, fill);
  }

  void add(Range range, Val val) {
    CHECK_ARGUMENT(range.first < range.second);
    CHECK_ARGUMENT(range.second <= size_);
    data_.push_back(
        Data{range.first, range.second, std::move(val), data_.size()});
  }
  void add(ArrayPos pos, Val val) {
    CHECK_ARGUMENT(pos < size_);
    add({pos, pos + 1}, std::move(val));
  }

  Array<Val> build() && {
    MultiBufferBuilder<ArrayPos, Val> builder{size_};

    auto emit_fn = [&](ArrayPos end, Val val) {
      if (!builder.size() || builder.template back<1>() != val) {
        builder.add({}, val);
      }
      builder.template back<0>() = end - 1;
    };

    // Heapify the input ranges.
    detail::PriorityQueue pq(std::move(data_), [](auto& l, auto& r) {
      return l.lo > r.lo || (l.lo == r.lo && l.time < r.time);
    });

    // Output the compressed ranges.
    auto cur = pq.pop();
    while (!pq.empty()) {
      auto top = pq.pop();
      if (top.lo == cur.hi) {
        emit_fn(cur.hi, cur.val);
        std::swap(top, cur);
      } else {
        if (top.time > cur.time) {
          emit_fn(top.lo, cur.val);
          std::swap(top, cur);
        }
        top.lo = cur.hi;
        if (top.lo < top.hi) {
          pq.add(top);
        }
      }
    }
    if (builder.size() == 0 || builder.template back<0>() < cur.hi - 1) {
      emit_fn(cur.hi, cur.val);
    }

    const auto& [ends, vals] = std::move(builder).build();
    return Array<Val>{make_dict(std::move(ends)), std::move(vals)};
  }

  Array<Val> build() const& {
    return RangesArrayBuilder<Val>(*this).build();
  }

 private:
  struct Data {
    ArrayPos lo;
    ArrayPos hi;
    Val val;
    size_t time;
  };

  ArrayPos size_;
  std::vector<Data> data_;
};

}  // namespace voxeloo::tensors