#pragma once

#include <algorithm>
#include <cereal/types/array.hpp>
#include <cereal/types/vector.hpp>
#include <map>
#include <numeric>
#include <vector>

#include "voxeloo/galois/blocks.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::galois::glass {

using GlassId = uint32_t;
using Tensor = tensors::Tensor<GlassId>;
using Index = blocks::Index;

}  // namespace voxeloo::galois::glass
