#include "voxeloo/anima/find_surfaces.hpp"

namespace voxeloo::anima {

std::vector<SurfacePoint> find_surfaces(const TerrainTensor& terrain) {
  std::vector<SurfacePoint> surface_points;
  scan_sparse(terrain, [&](const Vec3u& pos, TerrainId val) {
    if (pos.y < 31 && terrain.get(Vec3u(pos.x, pos.y + 1, pos.z)) == 0) {
      surface_points.push_back(SurfacePoint{
          .position = Vec3i(pos.x, pos.y, pos.z), .terrain_id = val});
    }
  });
  return surface_points;
}

}  // namespace voxeloo::anima
