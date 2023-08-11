#pragma once

#include <algorithm>
#include <array>
#include <cstdint>
#include <tuple>

#include "voxeloo/common/geometry.hpp"

namespace voxeloo {

using RGBA = uint32_t;

namespace colors {

inline constexpr auto to_rgba(uint8_t r, uint8_t g, uint8_t b, uint8_t a) {
  RGBA rgba = 0;
  rgba |= static_cast<RGBA>(r) << 24;
  rgba |= static_cast<RGBA>(g) << 16;
  rgba |= static_cast<RGBA>(b) << 8;
  rgba |= static_cast<RGBA>(a) << 0;
  return rgba;
}

inline constexpr auto to_rgba(float r, float g, float b, float a) {
  auto r_i = static_cast<uint8_t>(std::clamp(255.0f * r, 0.0f, 255.0f));
  auto g_i = static_cast<uint8_t>(std::clamp(255.0f * g, 0.0f, 255.0f));
  auto b_i = static_cast<uint8_t>(std::clamp(255.0f * b, 0.0f, 255.0f));
  auto a_i = static_cast<uint8_t>(std::clamp(255.0f * a, 0.0f, 255.0f));
  return to_rgba(r_i, g_i, b_i, a_i);
}

template <typename T = std::array<uint8_t, 4>>
inline constexpr auto to_rgba(const T& color) {
  auto [r, g, b, a] = color;
  return to_rgba(r, g, b, a);
}

template <typename T = std::array<uint8_t, 4>>
inline constexpr auto to_uint8s(RGBA rgba) {
  uint8_t r = (rgba >> 24) & 0xFF;
  uint8_t g = (rgba >> 16) & 0xFF;
  uint8_t b = (rgba >> 8) & 0xFF;
  uint8_t a = (rgba >> 0) & 0xFF;
  return T{r, g, b, a};
}

template <typename T = std::array<float, 4>>
inline constexpr auto to_floats(RGBA rgba) {
  auto [r, g, b, a] = to_uint8s(rgba);
  return T{r / 255.0f, g / 255.0f, b / 255.0f, a / 255.0f};
}

template <typename T = std::array<float, 4>>
inline constexpr auto grayscale(RGBA rgba) {
  auto [r, g, b, _] = to_uint8s(rgba);
  return 0.3f * r + 0.59f * g + 0.11f * b;
}

template <typename T = std::array<float, 4>>
inline constexpr auto grayscale(const T& color) {
  auto [r, g, b, _] = color;
  return 0.3f * r + 0.59f * g + 0.11f * b;
}

inline constexpr auto lerp(RGBA dst, RGBA src, float alpha) {
  auto [d_r, d_g, d_b, d_a] = to_floats(dst);
  auto [s_r, s_g, s_b, s_a] = to_floats(src);
  auto r = d_r + alpha * (s_r - d_r);
  auto g = d_g + alpha * (s_g - d_g);
  auto b = d_b + alpha * (s_b - d_b);
  auto a = d_a + alpha * (s_a - d_a);
  return to_rgba(r, g, b, a);
}

inline constexpr RGBA black() {
  return 0x000000FF;
}

inline constexpr RGBA white() {
  return 0xFFFFFFFF;
}

inline constexpr RGBA red() {
  return 0xFF0000FF;
}

inline constexpr RGBA green() {
  return 0x00FF00FF;
}

inline constexpr RGBA blue() {
  return 0x0000FFFF;
}

}  // namespace colors
}  // namespace voxeloo
