#include "voxeloo/js_ext/buffers.hpp"

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include <cstdint>
#include <vector>

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/tensors/buffers.hpp"

namespace voxeloo::buffers::js {

template <typename T>
void bind_array(const char* name) {
  emscripten::class_<BufferJs<T>>(name)
      .template constructor<>()
      .template constructor<size_t>()
      .function("size", &BufferJs<T>::size)
      .function("resize", &BufferJs<T>::resize)
      .function("asArray", &BufferJs<T>::as_array);
}

void bind() {
  bind_array<bool>("DynamicBuffer_Bool");
  bind_array<int8_t>("DynamicBuffer_I8");
  bind_array<int16_t>("DynamicBuffer_I16");
  bind_array<int32_t>("DynamicBuffer_I32");
  bind_array<uint8_t>("DynamicBuffer_U8");
  bind_array<uint16_t>("DynamicBuffer_U16");
  bind_array<uint32_t>("DynamicBuffer_U32");
  bind_array<float>("DynamicBuffer_F32");
  bind_array<double>("DynamicBuffer_F64");
  bind_array<Vec2i>("DynamicBuffer_Vec2i");
  bind_array<Vec3i>("DynamicBuffer_Vec3i");
  bind_array<Vec4i>("DynamicBuffer_Vec4i");
  bind_array<Vec2u>("DynamicBuffer_Vec2u");
  bind_array<Vec3u>("DynamicBuffer_Vec3u");
  bind_array<Vec4u>("DynamicBuffer_Vec4u");
}

}  // namespace voxeloo::buffers::js
