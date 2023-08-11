#pragma once

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/voxels.hpp"
#include "voxeloo/gaia/maps.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::gaia {

void update_muck_gradient_with_sphere(
    tensors::Tensor<int>& grad,
    const WorldMap<uint8_t>& muck,
    Vec3d unmuck_source,
    double unmuck_radius,
    uint32_t step_size);

void update_muck_gradient_with_aabb(
    tensors::Tensor<int>& grad,
    const WorldMap<uint8_t>& muck,
    Vec3d unmuck_source,
    Vec3d unmuck_size,
    uint32_t step_size);

void apply_muck_gradient(
    WorldMap<uint8_t>& muck, const tensors::Tensor<int>& grad);

}  // namespace voxeloo::gaia