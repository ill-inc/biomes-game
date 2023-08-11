#pragma once

#include <robin_hood.h>

#include <functional>
#include <optional>
#include <tuple>
#include <utility>

// This file defines some function wrapper objects that will memoize the results
// of the function calls. The following types can be used, in order to switch
// on the desired caching strategy. Ultimately in the end the following types
// are available:
//
//   MemoizeLast:    Memoizes only the previous call to the function.
//   MemoizeAll:     Memoizes all previous calls to the function, caching them
//                   inside an unordered map.
//   MemoizeLastAll: A combination of the above two, in order to improve
//                   performance. If the MemoizeLast check fails, we fallback
//                   to MemoizeAll.

namespace voxeloo {

namespace internal {

// Unfortunately, std::tuple doesn't have a specialization of key_hash,
// so without this it can't be dropped into a unordered_map. So we define
// one quickly here.
// From https://stackoverflow.com/a/38140932
inline size_t hash_combine_with_seed(std::size_t seed) {
  return seed;
}
template <typename T, typename... Rest>
inline size_t hash_combine_with_seed(
    std::size_t seed, const T& v, Rest... rest) {
  std::hash<T> hasher;
  seed ^= hasher(v) + 0x9e3779b9 + (seed << 6) + (seed >> 2);
  return hash_combine_with_seed(seed, rest...);
}
template <typename... Args>
inline size_t hash_combine(Args... args) {
  return hash_combine_with_seed(0, args...);
}

template <typename T>
struct TupleHash {};

template <typename... Args>
struct TupleHash<std::tuple<Args...>> {
  size_t operator()(const std::tuple<Args...>& k) const {
    return std::apply(hash_combine<Args...>, k);
  }
};

// The value-added of MemoizeInternal over Memoize is that it breaks down the
// function type into its return value, R and arguments, Args, so that we can
// work with those directly.
template <
    typename Fn,
    typename FnAsStdFunction,
    template <typename, typename>
    class CacheStrategy>
class MemoizeInternal {};

template <
    typename Fn,
    typename R,
    typename... Args,
    template <typename, typename>
    class CacheStrategy>
class MemoizeInternal<Fn, std::function<R(Args...)>, CacheStrategy> {
 public:
  explicit MemoizeInternal(Fn fn) : fn_(fn) {}

  R operator()(Args... args) {
    auto key_cref = std::make_tuple(std::cref(args)...);
    const R* maybe_value = cache_.get_value_or_null(key_cref);
    if (!maybe_value) {
      maybe_value = &cache_.add(key_cref, fn_(args...));
    }
    return *maybe_value;
  }

 private:
  Fn fn_;
  CacheStrategy<std::tuple<Args...>, R> cache_;
};

}  // namespace internal

// Generic memoization class which handles the machinery of calling a function
// and caching its results. In subsequent calls it will check the cache first
// for a value before falling back to calling the function. This class is
// parameterized with a CacheStrategy to choose how the cache should work
// (e.g. cache only the last value computed, or cache all values we see, etc..)
template <template <typename, typename> class CacheStrategy, typename Fn>
class Memoize {
 public:
  using StdFunctionType = decltype(std::function(std::declval<Fn>()));

  using RetType = typename StdFunctionType::result_type;

  explicit Memoize(Fn fn) : impl_(fn) {}

  template <typename... Args>
  RetType operator()(Args... args) {
    return impl_(args...);
  }

 private:
  internal::MemoizeInternal<Fn, StdFunctionType, CacheStrategy> impl_;
};

template <typename Key, typename Value>
class CacheStrategyLast {
 public:
  // Returns a pointer to the value if it exists, otherwise returns nullptr.
  const Value* get_value_or_null(const Key& key) const {
    return (last_ && std::get<0>(*last_) == key) ? &std::get<1>(*last_)
                                                 : nullptr;
  }
  const Value& add(const Key& key, const Value& value) {
    last_ = {key, value};
    return std::get<1>(*last_);
  }

 private:
  std::optional<std::tuple<Key, Value>> last_;
};

template <typename Key, typename Value>
class CacheStrategyAll {
 public:
  // Returns a pointer to the value if it exists, otherwise returns nullptr.
  const Value* get_value_or_null(const Key& key) const {
    auto found = cache_.find(key);
    return found == cache_.end() ? nullptr : &found->second;
  }
  const Value& add(const Key& key, const Value& value) {
    auto inserted = cache_.insert({key, value});
    return inserted.first->second;
  }

 private:
  robin_hood::unordered_map<Key, Value, internal::TupleHash<Key>> cache_;
};

template <typename Key, typename Value>
class CacheStrategyLastAll {
 public:
  // Returns a pointer to the value if it exists, otherwise returns nullptr.
  const Value* get_value_or_null(const Key& key) const {
    auto last = last_.get_value_or_null(key);
    if (last) {
      return last;
    }
    return all_.get_value_or_null(key);
  }
  const Value& add(const Key& key, const Value& value) {
    all_.add(key, value);
    return last_.add(key, value);
  }

 private:
  CacheStrategyAll<Key, Value> all_;
  CacheStrategyLast<Key, Value> last_;
};

// Ideally this would be just this single using statement, but in that case C++
// doesn't deduce class template arguments from constructor calls.
template <typename Fn>
using MemoizeLastBase = Memoize<CacheStrategyLast, Fn>;
template <typename Fn>
class MemoizeLast : public MemoizeLastBase<Fn> {
 public:
  explicit MemoizeLast(Fn fn) : MemoizeLastBase<Fn>(fn){};
};

template <typename Fn>
using MemoizeAllBase = Memoize<CacheStrategyAll, Fn>;
template <typename Fn>
class MemoizeAll : public MemoizeAllBase<Fn> {
 public:
  explicit MemoizeAll(Fn fn) : MemoizeAllBase<Fn>(fn){};
};

template <typename Fn>
using MemoizeLastAllBase = Memoize<CacheStrategyLastAll, Fn>;
template <typename Fn>
class MemoizeLastAll : public MemoizeLastAllBase<Fn> {
 public:
  explicit MemoizeLastAll(Fn fn) : MemoizeLastAllBase<Fn>(fn){};
};

}  // namespace voxeloo
