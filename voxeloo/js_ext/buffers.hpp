#pragma once

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include <cstdint>

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/tensors/buffers.hpp"

namespace voxeloo::buffers::js {

template <typename T>
inline auto to_buffer(const uint8_t* data, size_t size) {
  auto ptr = reinterpret_cast<const T*>(data);
  auto cnt = size / sizeof(T);
  return emscripten::val(emscripten::typed_memory_view(cnt, ptr));
}

template <typename T>
struct BufferJs {
  tensors::Buffer<T> impl;

  BufferJs() = default;
  explicit BufferJs(size_t initial_size) : impl(initial_size) {}

  auto size() const {
    return impl.size();
  }

  auto resize(size_t size) {
    impl.resize(size);
  }

  auto data() {
    return impl.data();
  }

  auto data() const {
    return impl.data();
  }

  auto as_array() {
    auto bytes = sizeof(T) * size();
    return to_buffer<T>(reinterpret_cast<uint8_t*>(data()), bytes);
  }
};

template <>
inline auto BufferJs<Vec2i>::as_array() {
  auto bytes = sizeof(Vec2i) * size();
  return to_buffer<int>(reinterpret_cast<uint8_t*>(data()), bytes);
}

template <>
inline auto BufferJs<Vec3i>::as_array() {
  auto bytes = sizeof(Vec3i) * size();
  return to_buffer<int>(reinterpret_cast<uint8_t*>(data()), bytes);
}

template <>
inline auto BufferJs<Vec4i>::as_array() {
  auto bytes = sizeof(Vec4i) * size();
  return to_buffer<int>(reinterpret_cast<uint8_t*>(data()), bytes);
}

template <>
inline auto BufferJs<Vec2u>::as_array() {
  auto bytes = sizeof(Vec2u) * size();
  return to_buffer<unsigned int>(reinterpret_cast<uint8_t*>(data()), bytes);
}

template <>
inline auto BufferJs<Vec3u>::as_array() {
  auto bytes = sizeof(Vec3u) * size();
  return to_buffer<unsigned int>(reinterpret_cast<uint8_t*>(data()), bytes);
}

template <>
inline auto BufferJs<Vec4u>::as_array() {
  auto bytes = sizeof(Vec4u) * size();
  return to_buffer<unsigned int>(reinterpret_cast<uint8_t*>(data()), bytes);
}

void bind();

}  // namespace voxeloo::buffers::js
