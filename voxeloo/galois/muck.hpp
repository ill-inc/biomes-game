#pragma once

#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::galois::muck {

using Muck = uint8_t;
using Tensor = tensors::Tensor<Muck>;
static const Muck kMaxMuck = std::numeric_limits<Muck>::max();
static const uint32_t kMuckCutoff = 8u;

}  // namespace voxeloo::galois::muck
