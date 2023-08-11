#pragma once

#include <array>
#include <bit>
#include <cmath>
#include <numeric>
#include <tuple>
#include <vector>

#include "voxeloo/common/geometry.hpp"

namespace voxeloo {

constexpr inline auto lerp(float a, float b, float t) {
  return a + t * (b - a);
}

template <typename T>
inline int ifloor(T x) {
  return static_cast<int>(std::floor(x));
}

template <typename T>
inline int iceil(T x) {
  return static_cast<int>(std::ceil(x));
}

template <typename T>
inline auto ifloor(const Vec2<T>& pos) {
  return Vec2i{
      static_cast<int>(std::floor(pos.x)),
      static_cast<int>(std::floor(pos.y)),
  };
}

template <typename T>
inline auto iceil(const Vec2<T>& pos) {
  return Vec2i{
      static_cast<int>(std::ceil(pos.x)),
      static_cast<int>(std::ceil(pos.y)),
  };
}

template <typename T>
inline auto ifloor(const Vec3<T>& pos) {
  return Vec3i{
      static_cast<int>(std::floor(pos.x)),
      static_cast<int>(std::floor(pos.y)),
      static_cast<int>(std::floor(pos.z)),
  };
}

template <typename T>
inline auto iceil(const Vec3<T>& pos) {
  return Vec3i{
      static_cast<int>(std::ceil(pos.x)),
      static_cast<int>(std::ceil(pos.y)),
      static_cast<int>(std::ceil(pos.z)),
  };
}

template <typename T>
inline auto ifloor(const Vec4<T>& pos) {
  return Vec4i{
      static_cast<int>(std::floor(pos.x)),
      static_cast<int>(std::floor(pos.y)),
      static_cast<int>(std::floor(pos.z)),
      static_cast<int>(std::floor(pos.w)),
  };
}

template <typename T>
inline auto iceil(const Vec4<T>& pos) {
  return Vec4i{
      static_cast<int>(std::ceil(pos.x)),
      static_cast<int>(std::ceil(pos.y)),
      static_cast<int>(std::ceil(pos.z)),
      static_cast<int>(std::ceil(pos.w)),
  };
}

inline auto floor_div(int x, int divisor) {
  return x >= 0 ? x / divisor : ~(~x / divisor);
}

inline auto floor_div(Vec2i pos, int divisor) {
  return Vec2i{
      floor_div(pos.x, divisor),
      floor_div(pos.y, divisor),
  };
}

inline auto floor_div(Vec3i pos, int divisor) {
  return Vec3i{
      floor_div(pos.x, divisor),
      floor_div(pos.y, divisor),
      floor_div(pos.z, divisor),
  };
}

inline auto floor_div(Vec4i pos, int divisor) {
  return Vec4i{
      floor_div(pos.x, divisor),
      floor_div(pos.y, divisor),
      floor_div(pos.z, divisor),
      floor_div(pos.w, divisor),
  };
}

inline constexpr auto is_power_of_two(uint32_t x) {
  // NOTE: Zero return true.
  return (x & (x - 1)) == 0;
}

inline constexpr uint32_t round_up_to_power_of_two(uint32_t x) {
  // NOTE: Zero is mapped to zero.
  x--;
  x |= x >> 1;
  x |= x >> 2;
  x |= x >> 4;
  x |= x >> 8;
  x |= x >> 16;
  return ++x;
}

inline constexpr uint32_t lg2(uint32_t x) {
  return x < 2 ? 0 : 1 + lg2(x >> 1);
}

template <typename T, typename... Indices>
inline auto gather(const std::vector<T>& t, Indices&&... i) {
  return std::array<T, sizeof...(Indices)>{t[i]...};
}

template <typename T, typename... Indices>
inline auto gather(const T* t, Indices&&... i) {
  return std::array<T, sizeof...(Indices)>{t[i]...};
}

template <typename T>
concept SizedEnum = std::is_enum_v<T> && static_cast<size_t>(T::Size) > 0;

// These functions pack/unpack enums into a given type based on the known
// cardinality of the input enums.

template <SizedEnum... Args>
inline constexpr auto get_bit_widths() {
  return std::array{std::bit_width(
      std::max<size_t>(1ul, static_cast<size_t>(Args::Size) - 1u))...};
}

template <std::unsigned_integral T, SizedEnum... Args>
constexpr T pack_enums(Args... args) {
  // Make sure that the args fit in T
  constexpr std::array bit_widths = get_bit_widths<Args...>();
  static_assert(
      std::accumulate(bit_widths.begin(), bit_widths.end(), 0u) <=
      std::numeric_limits<T>::digits);
  size_t i = 0;
  T acc = 0;
  (
      [&] {
        acc <<= bit_widths[i++];
        acc |= static_cast<T>(args);
      }(),
      ...);

  return acc;
}

template <std::unsigned_integral T, SizedEnum... Args>
constexpr std::tuple<Args...> unpack_enums(T t) {
  // Make sure that the args fit in T
  constexpr std::array bit_widths = get_bit_widths<Args...>();
  static_assert(
      std::accumulate(bit_widths.begin(), bit_widths.end(), 0u) <=
      std::numeric_limits<T>::digits);
  std::array<T, sizeof...(Args)> unpacked;
  for (int i = sizeof...(Args) - 1u; i >= 0u; --i) {
    T mask = (1u << (bit_widths[i] - 1u)) - 1u;
    unpacked[i] = mask & t;
    t >>= bit_widths[i];
  };
  size_t i = 0;
  return std::tuple{static_cast<Args>(unpacked[i++])...};
}

template <SizedEnum T>
inline constexpr T next(T t) {
  if (t == T::Size) {
    return t;
  } else {
    return static_cast<T>(static_cast<size_t>(t) + 1u);
  }
}

template <typename... Args>
constexpr bool all_equal(Args... args) {
  if constexpr (sizeof...(Args) < 2) {
    return true;
  } else {
    std::tuple a{args...};
    return [&]<size_t... Is>(std::index_sequence<Is...>) {
      return ((std::get<Is>(a) == std::get<Is + 1>(a)) && ...);
    }
    (std::make_index_sequence<sizeof...(Args) - 1>());
  }
}

}  // namespace voxeloo
