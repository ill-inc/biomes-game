#pragma once

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include <array>
#include <cstdint>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/format.hpp"
#include "voxeloo/common/timers.hpp"

namespace voxeloo::js {

template <typename T>
auto as_ptr(emscripten::val ptr) {
  CHECK_ARGUMENT(ptr["$$"]["ptr"].as<std::uintptr_t>());
  return reinterpret_cast<T*>(ptr["$$"]["ptr"].as<std::uintptr_t>());
}

template <typename... Args>
void log(Args&&... args) {
  auto msg = stringify(std::forward<Args>(args)...);
  emscripten::val::global("console").call<void>("log", msg);
}

inline auto timer(const char* msg) {
  return timers::CallbackTimer([msg](float ms) {
    log("Timer[", msg, "]: ", ms, "ms");
  });
}

template <typename T, size_t k, size_t i>
void bind_array(emscripten::value_array<T>& array) {
  if constexpr (i < k) {
    bind_array<T, k, i + 1>(array.element(emscripten::index<i>()));
  }
}

template <typename T, size_t k>
void bind_array(const char* name) {
  emscripten::value_array<T> array(name);
  bind_array<T, k, 0>(array);
}

void bind();

}  // namespace voxeloo::js
