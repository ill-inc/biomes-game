#pragma once

#include <cstdint>
#include <limits>
#include <queue>
#include <tuple>
#include <vector>

#include "cereal/types/vector.hpp"
#include "voxeloo/common/succinct.hpp"
#include "voxeloo/common/transport.hpp"

namespace voxeloo::runs {

using Pos = uint32_t;

struct Span {
  Pos lo;
  Pos hi;
};

template <typename Val>
class Index {
 public:
  Index() = default;
  Index(const std::vector<Pos>& ends, std::vector<Val> vals)
      : ends_(succinct::make_dict(ends)), vals_(std::move(vals)) {
    CHECK_ARGUMENT(vals_.size());
    vals_.shrink_to_fit();
  }

  auto size() const {
    return ends_.max_key + 1;
  }

  auto run_count() const {
    return vals_.size();
  }

  auto rank(Pos pos) const {
    return ends_.rank(pos);
  }

  auto data(uint32_t rank) const {
    return static_cast<Val>(vals_[rank]);
  }

  auto get(Pos pos) const {
    CHECK_ARGUMENT(pos < size());
    return data(rank(pos));
  }

  template <typename Fn>
  void scan(Fn&& fn) const {
    Pos prev = 0;
    ends_.scan([&, i = 0](Pos key) mutable {
      fn(Span{prev, key + 1}, static_cast<Val>(vals_[i++]));
      prev = key + 1;
    });
  }

  auto storage_size() const {
    auto ret = size_of_dict(ends_);
    ret += sizeof(Val) * vals_.capacity();
    return ret;
  }

 private:
  succinct::Dict ends_;
  std::vector<Val> vals_;

  template <typename Archive, typename _T>
  friend void save(Archive&, const Index<_T>&);

  template <typename Archive, typename _T>
  friend void load(Archive&, Index<_T>&);
};

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
class IndexBuilder {
 public:
  explicit IndexBuilder(Pos size, Val fill = Val()) : size_(size) {
    add({0, size}, fill);
  }
  explicit IndexBuilder(const Index<Val>& index) : size_(index.size()) {
    index.scan([&](Span span, Val val) {
      add(span, std::move(val));
    });
  }

  bool updated() const {
    return data_.empty();
  }

  void add(Span span, Val val) {
    CHECK_ARGUMENT(span.lo < span.hi);
    CHECK_ARGUMENT(span.hi <= size_);
    data_.push_back(Data{span.lo, span.hi, std::move(val), data_.size()});
  }
  void add(Pos pos, Val val) {
    CHECK_ARGUMENT(pos < size_);
    add({pos, pos + 1}, std::move(val));
  }

  auto build() && {
    std::vector<Pos> ends;
    std::vector<Val> vals;
    ends.reserve(data_.size());
    vals.reserve(data_.size());

    auto emit_fn = [&](Pos end, Val val) {
      if (!vals.size() || vals.back() != val) {
        ends.emplace_back();
        vals.push_back(val);
      }
      ends.back() = end - 1;
    };

    // Heapify the input spans.
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
    if (ends.empty() || ends.back() < cur.hi - 1) {
      emit_fn(cur.hi, cur.val);
    }

    return Index(std::move(ends), std::move(vals));
  }

  auto build() const& {
    return IndexBuilder<Val>(*this).build();
  }

 private:
  struct Data {
    Pos lo;
    Pos hi;
    Val val;
    size_t time;
  };

  Pos size_;
  std::vector<Data> data_;
};

template <typename Val>
inline auto make_index(Pos size, Val fill = Val()) {
  return IndexBuilder<Val>(size, fill).build();
}

template <typename Archive, typename T>
inline void save(Archive& ar, const Index<T>& index) {
  ar(index.ends_);
  ar(index.vals_);
}

template <typename Archive, typename T>
inline void load(Archive& ar, Index<T>& index) {
  ar(index.ends_);
  ar(index.vals_);
}

}  // namespace voxeloo::runs
