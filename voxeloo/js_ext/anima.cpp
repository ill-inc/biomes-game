#include "voxeloo/js_ext/anima.hpp"

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include <memory>
#include <string>

#include "voxeloo/anima/find_surfaces.hpp"

namespace voxeloo::anima::js {

auto find_surfaces_js(const TerrainTensor& terrain) {
  return find_surfaces(terrain);
};

void bind() {
  emscripten::value_object<SurfacePoint>("SurfacePoint")
      .field("position", &SurfacePoint::position)
      .field("terrainId", &SurfacePoint::terrain_id);
  emscripten::register_vector<SurfacePoint>("VectorSurfacePoint");

  emscripten::function("findSurfaces", &find_surfaces_js);
}

}  // namespace voxeloo::anima::js
