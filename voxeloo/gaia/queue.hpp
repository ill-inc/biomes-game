#pragma once

#include <unordered_set>

#include "voxeloo/common/errors.hpp"

namespace voxeloo::gaia {

template <typename T>
class Queue {
 public:
  auto size() const {
    return enter_.size() + leave_.size();
  }

  auto empty() const {
    return size() == 0;
  }

  void push(T val) {
    enter_.push_back(std::move(val));
  }

  auto pop() {
    CHECK_ARGUMENT(size());
    if (!leave_.size()) {
      while (enter_.size()) {
        leave_.push_back(std::move(enter_.back()));
        enter_.pop_back();
      }
    }
    auto ret = std::move(leave_.back());
    leave_.pop_back();
    return ret;
  }

 private:
  std::vector<T> enter_;
  std::vector<T> leave_;
};

template <typename T, typename Range>
inline auto make_queue(Range&& range) {
  Queue<T> ret;
  for (auto&& val : std::forward<Range>(range)) {
    ret.push(val);
  }
  return ret;
}

template <typename T, typename Hash>
class UniqueQueue {
 public:
  auto size() const {
    return queue_.size();
  }

  auto empty() const {
    return queue_.empty();
  }

  void push(T val) {
    if (set_.insert(val).second) {
      queue_.push(std::move(val));
    }
  }

  auto pop() {
    auto ret = queue_.pop();
    set_.erase(ret);
    return ret;
  }

 private:
  Queue<T> queue_;
  std::unordered_set<T, Hash> set_;
};

}  // namespace voxeloo::gaia