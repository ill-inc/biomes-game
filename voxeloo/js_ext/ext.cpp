#include <emscripten/bind.h>

#include "voxeloo/js_ext/anima.hpp"
#include "voxeloo/js_ext/biomes.hpp"
#include "voxeloo/js_ext/buffers.hpp"
#include "voxeloo/js_ext/common.hpp"
#include "voxeloo/js_ext/culling.hpp"
#include "voxeloo/js_ext/gaia.hpp"
#include "voxeloo/js_ext/galois.hpp"
#include "voxeloo/js_ext/mapping.hpp"
#include "voxeloo/js_ext/march.hpp"
#include "voxeloo/js_ext/shards.hpp"
#include "voxeloo/js_ext/tensors.hpp"
#include "voxeloo/js_ext/voxels.hpp"

EMSCRIPTEN_BINDINGS(voxeloo_module) {
  voxeloo::js::bind();
  voxeloo::anima::js::bind();
  voxeloo::biomes::js::bind();
  voxeloo::buffers::js::bind();
  voxeloo::culling::js::bind();
  voxeloo::gaia::js::bind();
  voxeloo::galois::js::bind();
  voxeloo::mapping::js::bind();
  voxeloo::march::js::bind();
  voxeloo::shards::js::bind();
  voxeloo::tensors::js::bind();
  voxeloo::voxels::js::bind();
}
