#pragma once

#include <algorithm>
#include <cstdint>
#include <tuple>
#include <type_traits>
#include <unordered_map>
#include <vector>

namespace voxeloo::history {

using Time = uint64_t;

// Indexes keys with timestamps and provides a reverse look up.
template <typename Key>
class UpdateList {
 public:
  auto size() const {
    return list_.size();
  }

  auto extract() const {
    return list_;
  }

  void clear() {
    map_.clear();
    list_.clear();
  }

  auto time() const {
    return list_.empty() ? 0 : std::get<0>(list_.back());
  }

  Time time(const Key& key) const {
    if (auto it = map_.find(key); it != map_.end()) {
      return it->second;
    }
    return 0;
  }

  Time bump(const Key& key) {
    auto t = 1 + time();
    if (auto it = find_key(key); it != list_.end()) {
      list_.erase(it);
    }
    list_.emplace_back(t, key);
    map_[key] = t;
    return t;
  }

  template <typename Fn>
  void scan(Time from, Fn&& fn) const {
    for (auto it = find_time(from); it != list_.end(); ++it) {
      auto [time, key] = *it;
      using Ret = decltype(fn(time, key));
      static_assert(std::is_same_v<Ret, bool> || std::is_same_v<Ret, void>);
      if constexpr (std::is_same_v<Ret, void>) {
        fn(time, key);
      } else {
        if (!fn(time, key)) {
          break;
        }
      }
    }
  }

  template <typename Fn>
  void scan(Fn&& fn) const {
    scan(0, std::forward<Fn>(fn));
  }

 private:
  auto find_key(const Key& key) const {
    return std::find_if(list_.begin(), list_.end(), [&](const auto& t) {
      return std::get<1>(t) == key;
    });
  }

  auto find_time(Time time) const {
    return std::lower_bound(
        list_.begin(), list_.end(), time, [](const auto& l, const auto& r) {
          return std::get<0>(l) < r;
        });
  }

  std::unordered_map<Key, Time> map_;
  std::vector<std::tuple<Time, Key>> list_;
};

}  // namespace voxeloo::history
