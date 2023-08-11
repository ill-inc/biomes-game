#pragma once

#include <cstdint>
#include <type_traits>
#include <utility>

#if defined(_MSC_VER) && !defined(__clang__)
#include <intrin.h>
#endif

namespace voxeloo {

#if defined(_MSC_VER) && !defined(__clang__)

inline int popcount(uint32_t x) {
  return static_cast<int>(__popcnt(x));
}

inline int popcount(uint64_t x) {
  return static_cast<int>(__popcnt64(x));
}

inline int lzcount(uint32_t x) {
  return static_cast<int>(_lzcnt_u32(x));
}

inline int lzcount(uint64_t x) {
  return static_cast<int>(_lzcnt_u64(x));
}

inline int tzcount(uint32_t x) {
  return static_cast<int>(_tzcnt_u32(x));
}

inline int tzcount(uint64_t x) {
  return static_cast<int>(_tzcnt_u64(x));
}

inline uint32_t byteswap(uint32_t x) {
  return _byteswap_ulong(x);
}

inline uint64_t byteswap(uint64_t x) {
  return _byteswap_uint64(x);
}

#else

inline int popcount(uint32_t x) {
  return __builtin_popcount(x);
}

inline int popcount(uint64_t x) {
  return __builtin_popcountll(x);
}

inline int lzcount(uint32_t x) {
  return __builtin_clz(x);
}

inline int lzcount(uint64_t x) {
  return __builtin_clzll(x);
}

inline int tzcount(uint32_t x) {
  return x == 0 ? 32 : __builtin_ctz(x);
}

inline int tzcount(uint64_t x) {
  return x == 0 ? 64 : __builtin_ctzll(x);
}

inline uint32_t byteswap(uint32_t x) {
  return __builtin_bswap32(x);
}

inline uint64_t byteswap(uint64_t x) {
  return __builtin_bswap64(x);
}

#endif

inline auto next_bit(uint32_t x, int from) {
  x &= ~((1u << from) - 1);
  return tzcount(x);
}

inline auto next_bit(uint64_t x, int from) {
  x &= ~((1ull << from) - 1);
  return tzcount(x);
}

inline auto last_bit(uint32_t x) {
  return 31 - lzcount(x);
}

inline auto last_bit(uint64_t x) {
  return 63 - lzcount(x);
}

template <typename Fn>
inline auto visit_bits(uint32_t x, int from, Fn&& fn) {
  x &= ~((1u << from) - 1);
  auto n = popcount(x);
  for (int i = 0; i < n; i += 1) {
    auto j = tzcount(x);
    x ^= 1ull << j;
    if constexpr (std::is_void_v<decltype(fn(j))>) {
      fn(j);
    } else if (fn(j)) {
      break;
    }
  }
}

template <typename Fn>
inline auto visit_bits(uint32_t x, Fn&& fn) {
  return visit_bits(x, 0, std::forward<Fn>(fn));
}

template <typename Fn>
inline auto visit_bits(uint64_t x, int from, Fn&& fn) {
  x &= ~((1ull << from) - 1);
  auto n = popcount(x);
  for (int i = 0; i < n; i += 1) {
    auto j = tzcount(x);
    x ^= 1ull << j;
    if constexpr (std::is_void_v<decltype(fn(j))>) {
      fn(j);
    } else if (fn(j)) {
      break;
    }
  }
}

template <typename Fn>
inline auto visit_bits(uint64_t x, Fn&& fn) {
  return visit_bits(x, 0, std::forward<Fn>(fn));
}

inline bool is_big_endian() {
  union {
    uint32_t i;
    char c[4];
  } b = {0x01020304};
  return b.c[0] == 1;
}

inline auto hton(uint32_t x) {
  return is_big_endian() ? x : byteswap(x);
}

inline auto ntoh(uint32_t x) {
  return is_big_endian() ? x : byteswap(x);
}

}  // namespace voxeloo
