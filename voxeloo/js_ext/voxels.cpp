#include "voxeloo/js_ext/voxels.hpp"

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/voxels.hpp"

namespace voxeloo::voxels::js {

void bind() {
  // Bind shard position types and routines.
  emscripten::value_object<voxels::Box>("Box")
      .field("v0", &voxels::Box::v0)
      .field("v1", &voxels::Box::v1);
}

}  // namespace voxeloo::voxels::js
