#include "voxeloo/js_ext/march.hpp"

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/voxels.hpp"
#include "voxeloo/js_ext/common.hpp"

namespace voxeloo::march::js {

void march(Vec3f pos, Vec3f dir, emscripten::val callback) {
  voxels::march(pos, dir, [&](int x, int y, int z, float distance) {
    auto ret = callback(
        emscripten::val(x),
        emscripten::val(y),
        emscripten::val(z),
        emscripten::val(distance));
    return ret.as<bool>();
  });
}

void march_faces(Vec3f pos, Vec3f dir, emscripten::val callback) {
  voxels::march_faces(
      pos, dir, [&](int x, int y, int z, float distance, voxels::Dir dir) {
        auto ret = callback(
            emscripten::val(x),
            emscripten::val(y),
            emscripten::val(z),
            emscripten::val(distance),
            emscripten::val(static_cast<int>(dir)));
        return ret.as<bool>();
      });
}

void bind() {
  emscripten::function("march", &march);
  emscripten::function("march_faces", &march_faces);
}

}  // namespace voxeloo::march::js
