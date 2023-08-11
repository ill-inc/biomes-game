#pragma once

#include <vector>

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/galois/terrain.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::anima {

using galois::terrain::TerrainId;
using TerrainTensor = tensors::Tensor<TerrainId>;

struct SurfacePoint {
  Vec3i position;
  TerrainId terrain_id;
};

std::vector<SurfacePoint> find_surfaces(const TerrainTensor& terrain);

}  // namespace voxeloo::anima
