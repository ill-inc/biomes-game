#pragma once

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/gaia/terrain.hpp"

namespace voxeloo::gaia {

WorldMap<uint8_t> update_water(const TerrainMapV2& map, Vec3i chunk_pos);

}  // namespace voxeloo::gaia