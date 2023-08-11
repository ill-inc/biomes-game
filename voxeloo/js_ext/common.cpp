#include "voxeloo/js_ext/common.hpp"

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/metrics.hpp"

namespace voxeloo::js {
namespace {

template <typename T>
void bind_vec2(const char* name) {
  emscripten::value_array<Vec2<T>>(name)
      .element(&Vec2<T>::x)
      .element(&Vec2<T>::y);
}

template <typename T>
void bind_vec3(const char* name) {
  emscripten::value_array<Vec3<T>>(name)
      .element(&Vec3<T>::x)
      .element(&Vec3<T>::y)
      .element(&Vec3<T>::z);
}

template <typename T>
void bind_vec4(const char* name) {
  emscripten::value_array<Vec4<T>>(name)
      .element(&Vec4<T>::x)
      .element(&Vec4<T>::y)
      .element(&Vec4<T>::z)
      .element(&Vec4<T>::w);
}

template <typename T>
void bind_mat2x2(const char* name) {
  emscripten::value_array<Mat2x2<T>>(name)
      .element(emscripten::index<0>())
      .element(emscripten::index<1>())
      .element(emscripten::index<2>())
      .element(emscripten::index<3>());
}

template <typename T>
void bind_mat3x3(const char* name) {
  emscripten::value_array<Mat3x3<T>>(name)
      .element(emscripten::index<0>())
      .element(emscripten::index<1>())
      .element(emscripten::index<2>())
      .element(emscripten::index<3>())
      .element(emscripten::index<4>())
      .element(emscripten::index<5>())
      .element(emscripten::index<6>())
      .element(emscripten::index<7>())
      .element(emscripten::index<8>());
}

template <typename T>
void bind_mat4x4(const char* name) {
  emscripten::value_array<Mat4x4<T>>(name)
      .element(emscripten::index<0>())
      .element(emscripten::index<1>())
      .element(emscripten::index<2>())
      .element(emscripten::index<3>())
      .element(emscripten::index<4>())
      .element(emscripten::index<5>())
      .element(emscripten::index<6>())
      .element(emscripten::index<7>())
      .element(emscripten::index<8>())
      .element(emscripten::index<9>())
      .element(emscripten::index<10>())
      .element(emscripten::index<11>())
      .element(emscripten::index<12>())
      .element(emscripten::index<13>())
      .element(emscripten::index<14>())
      .element(emscripten::index<15>());
}

void register_error_logger(emscripten::val cb) {
  errors::register_error_logger([=](const std::string& s) {
    cb(s);
  });
}

auto get_exception_message(intptr_t exception_ptr) {
  return std::string(reinterpret_cast<std::exception*>(exception_ptr)->what());
}
}  // namespace

void bind() {
  // Bind vector types.
  bind_vec2<int>("Vec2i");
  bind_vec2<float>("Vec2f");
  bind_vec2<double>("Vec2d");
  bind_vec2<unsigned int>("Vec2u");
  bind_vec3<int>("Vec3i");
  bind_vec3<float>("Vec3f");
  bind_vec3<double>("Vec3d");
  bind_vec3<unsigned int>("Vec3u");
  bind_vec4<int>("Vec4i");
  bind_vec4<float>("Vec4f");
  bind_vec4<double>("Vec4d");
  bind_vec4<unsigned int>("Vec4u");

  // Bind matrix types.
  bind_mat2x2<int>("Mat2x2i");
  bind_mat2x2<float>("Mat2x2f");
  bind_mat2x2<double>("Mat2x2d");
  bind_mat3x3<int>("Mat3x3i");
  bind_mat3x3<float>("Mat3x3f");
  bind_mat3x3<double>("Mat3x3d");
  bind_mat4x4<int>("Mat4x4i");
  bind_mat4x4<float>("Mat4x4f");
  bind_mat4x4<double>("Mat4x4d");

  emscripten::function("registerErrorLogger", register_error_logger);
  emscripten::function("getExceptionMessage", get_exception_message);

  emscripten::function("exportMetrics", voxeloo::metrics::export_as_text);
}
}  // namespace voxeloo::js
