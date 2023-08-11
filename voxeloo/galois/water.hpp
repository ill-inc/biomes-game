#pragma once

#include <array>
#include <bitset>
#include <vector>

#include "voxeloo/common/bits.hpp"
#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/voxels.hpp"
#include "voxeloo/galois/conv.hpp"
#include "voxeloo/galois/sbo.hpp"
#include "voxeloo/galois/shapes.hpp"
#include "voxeloo/tensors/routines.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::galois::water {

using Tensor = tensors::Tensor<uint8_t>;
using SurfaceTensor = tensors::Tensor<uint8_t>;
using voxels::Dir;

static constexpr uint8_t kMaxLevel = 15;

struct FaceMask {
  uint8_t value;

  void set(Dir dir, bool exists) {
    value |= (exists << dir);
  }

  bool has(Dir dir) {
    return value & (1 << dir);
  }
};

struct HeightMask {
  uint16_t value = 0u;

  auto offset(Vec2u pos) const {
    return (pos.x << 2) | (pos.y << 3);
  }

  auto get(Vec2u pos) {
    return (value >> offset(pos)) & 0xfu;
  }

  void set(Vec2u pos, uint16_t to) {
    value |= ((to & 0xfu) << offset(pos));
  }

  bool flat() {
    return (value >> 8) == (value & 0xff) && (value >> 12) == (value & 0xf);
  }
};

inline auto flat_height_mask(uint16_t h) {
  return HeightMask{static_cast<uint16_t>(h | (h << 4) | (h << 8) | (h << 12))};
}

struct Cell {
  Dir dir;
  int plane;
  uint16_t heights;
};

inline bool operator==(const Cell& a, const Cell& b) {
  if (HeightMask{a.heights}.flat()) {
    return a.dir == b.dir && a.plane == b.plane && a.heights == b.heights;
  } else {
    return false;
  }
}

struct CellHash {
  size_t operator()(const Cell& cell) const {
    return cell.dir | (cell.plane << 3) | (cell.heights << 9);
  }
};

struct QuadVertex {
  Vec3f pos;
  Vec2f uv;
  float dir;
};

struct GeometryBuffer {
  Vec3i origin;
  std::vector<QuadVertex> vertices;
  std::vector<uint32_t> indices;

  auto vertices_view() const {
    return reinterpret_cast<const uint8_t*>(&vertices[0]);
  }

  auto indices_view() const {
    return reinterpret_cast<const uint8_t*>(&indices[0]);
  }

  auto vertices_bytes() const {
    return sizeof(QuadVertex) * vertices.size();
  }

  auto indices_bytes() const {
    return sizeof(uint32_t) * indices.size();
  }

  auto stride() const {
    return sizeof(QuadVertex) / sizeof(float);
  }
};

template <typename IsWaterFn>
inline auto to_surface(const Tensor& tensor, IsWaterFn&& water_fn) {
  // Convert the water tensor into a boolean mask of voxels containing water.
  auto mask = tensors::map_values(tensor, [&](auto val) {
    return val != 0;
  });

  // Convolve the water mask to find faces with a surface for each water voxel.
  auto block = conv::to_block(mask, water_fn);
  return tensors::map_sparse(mask, [&](auto pos, auto val) {
    FaceMask mask{0};
    auto i_pos = to<int>(pos);
    mask.set(voxels::X_NEG, !block.get(i_pos - vec3(1, 0, 0)));
    mask.set(voxels::X_POS, !block.get(i_pos + vec3(1, 0, 0)));
    mask.set(voxels::Y_NEG, !block.get(i_pos - vec3(0, 1, 0)));
    mask.set(voxels::Y_POS, !block.get(i_pos + vec3(0, 1, 0)));
    mask.set(voxels::Z_NEG, !block.get(i_pos - vec3(0, 0, 1)));
    mask.set(voxels::Z_POS, !block.get(i_pos + vec3(0, 0, 1)));
    return mask.value;
  });
}

inline auto to_surface(const Tensor& tensor) {
  return to_surface(tensor, [&](Vec3i pos) {
    if (voxels::box_contains(voxels::cube_box(tensors::kChunkDim), pos)) {
      return tensor.get(to<unsigned int>(pos)) != 0;
    }
    return false;
  });
}

template <typename HeightFn>
inline auto to_geometry(
    const SurfaceTensor& tensor, const Vec3i& origin, HeightFn&& height_fn) {
  // Turn the masks into a mesh.
  quadifier::Quadifier<Cell, CellHash> quadifier;
  tensors::scan_sparse(tensor, [&](auto pos, auto val) {
    FaceMask mask{val};
    auto h = height_fn(pos).value;
    auto [x, y, z] = to<int>(pos);
    if (h) {
      if (mask.has(voxels::X_NEG)) {
        quadifier.add({voxels::X_NEG, x, h}, {z, y});
      }
      if (mask.has(voxels::X_POS)) {
        quadifier.add({voxels::X_POS, x + 1, h}, {z, y});
      }
      if (mask.has(voxels::Y_NEG)) {
        quadifier.add({voxels::Y_NEG, y, 0}, {x, z});
      }
      if (mask.has(voxels::Y_POS)) {
        quadifier.add({voxels::Y_POS, y + 1, h}, {x, z});
      }
      if (mask.has(voxels::Z_NEG)) {
        quadifier.add({voxels::Z_NEG, z, h}, {x, y});
      }
      if (mask.has(voxels::Z_POS)) {
        quadifier.add({voxels::Z_POS, z + 1, h}, {x, y});
      }
    }
  });

  GeometryBuffer ret{origin};
  uint32_t index_offset = 0;
  for (const auto& [cell, quad] : quadifier.build()) {
    auto dir = static_cast<float>(cell.dir);
    auto emit_vertex = [&](int x, int y, int z, float h, int u, int v) {
      ret.vertices.push_back({
          to<float>(vec3(x, y, z)) - vec3(0.0f, h, 0.0f),
          to<float>(vec2(u, v)),
          dir,
      });
    };

    // Generate the height displacements at each of the vertical edges.
    float scale = 1.0f / static_cast<float>(kMaxLevel);
    std::array<std::array<float, 2>, 2> h;
    h[0][0] = 1.0f - scale * HeightMask{cell.heights}.get({0, 0});
    h[0][1] = 1.0f - scale * HeightMask{cell.heights}.get({1, 0});
    h[1][0] = 1.0f - scale * HeightMask{cell.heights}.get({0, 1});
    h[1][1] = 1.0f - scale * HeightMask{cell.heights}.get({1, 1});

    switch (cell.dir) {
      case voxels::X_NEG:
        emit_vertex(cell.plane, quad.v0.y, quad.v0.x, 0, 0, 0);
        emit_vertex(cell.plane, quad.v0.y, quad.v1.x, 0, 1, 0);
        emit_vertex(cell.plane, quad.v1.y, quad.v1.x, h[1][0], 1, 1);
        emit_vertex(cell.plane, quad.v1.y, quad.v0.x, h[0][0], 0, 1);
        break;
      case voxels::X_POS:
        emit_vertex(cell.plane, quad.v0.y, quad.v1.x, 0, 0, 0);
        emit_vertex(cell.plane, quad.v0.y, quad.v0.x, 0, 1, 0);
        emit_vertex(cell.plane, quad.v1.y, quad.v0.x, h[0][1], 1, 1);
        emit_vertex(cell.plane, quad.v1.y, quad.v1.x, h[1][1], 0, 1);
        break;
      case voxels::Y_NEG:
        emit_vertex(quad.v0.x, cell.plane, quad.v0.y, 0, 0, 0);
        emit_vertex(quad.v1.x, cell.plane, quad.v0.y, 0, 1, 0);
        emit_vertex(quad.v1.x, cell.plane, quad.v1.y, 0, 1, 1);
        emit_vertex(quad.v0.x, cell.plane, quad.v1.y, 0, 0, 1);
        break;
      case voxels::Y_POS:
        emit_vertex(quad.v1.x, cell.plane, quad.v0.y, h[0][1], 0, 0);
        emit_vertex(quad.v0.x, cell.plane, quad.v0.y, h[0][0], 1, 0);
        emit_vertex(quad.v0.x, cell.plane, quad.v1.y, h[1][0], 1, 1);
        emit_vertex(quad.v1.x, cell.plane, quad.v1.y, h[1][1], 0, 1);
        break;
      case voxels::Z_NEG:
        emit_vertex(quad.v1.x, quad.v0.y, cell.plane, 0, 0, 0);
        emit_vertex(quad.v0.x, quad.v0.y, cell.plane, 0, 1, 0);
        emit_vertex(quad.v0.x, quad.v1.y, cell.plane, h[0][0], 1, 1);
        emit_vertex(quad.v1.x, quad.v1.y, cell.plane, h[0][1], 0, 1);
        break;
      case voxels::Z_POS:
        emit_vertex(quad.v0.x, quad.v0.y, cell.plane, 0, 0, 0);
        emit_vertex(quad.v1.x, quad.v0.y, cell.plane, 0, 1, 0);
        emit_vertex(quad.v1.x, quad.v1.y, cell.plane, h[1][1], 1, 1);
        emit_vertex(quad.v0.x, quad.v1.y, cell.plane, h[1][0], 0, 1);
        break;
    }

    for (const auto i : voxels::face_indices()) {
      ret.indices.emplace_back(index_offset + i);
    }

    index_offset += 4;
  }

  return ret;
}

template <typename HeightFn>
inline auto to_geometry(const Tensor& tensor, HeightFn&& height_fn) {
  return to_geometry(tensor, {0, 0, 0}, std::forward<HeightFn>(height_fn));
}

inline auto to_geometry(const Tensor& tensor) {
  return to_geometry(tensor, {0, 0, 0}, [&](auto pos) {
    return flat_height_mask(kMaxLevel);
  });
}

// This function defines continuous height values along the surface of water by
// averaging water levels around voxel vertices. The heights take into account
// voxels that contain water and whether a voxel contains terrain or not.
template <typename AirFn, typename WaterFn>
inline auto make_kernel_fn(AirFn&& air_fn, WaterFn&& water_fn) {
  return [air_fn, water_fn](Vec3i pos) {
    auto p000 = pos - vec3(1, 0, 1);
    auto p100 = pos - vec3(0, 0, 1);
    auto p001 = pos - vec3(1, 0, 0);
    auto p101 = pos - vec3(0, 0, 0);
    auto p010 = p000 + vec3(0, 1, 0);
    auto p110 = p100 + vec3(0, 1, 0);
    auto p011 = p001 + vec3(0, 1, 0);
    auto p111 = p101 + vec3(0, 1, 0);

    // If any voxels above contain water, always return max water level.
    if (water_fn(p010) || water_fn(p110) || water_fn(p011) || water_fn(p111)) {
      return water::kMaxLevel;
    }

    // Average the water levels of the neighboring voxels.
    auto sum = 0.0f;
    auto cnt = 0.0f;
    auto air = false;
    if (auto w = water_fn(p000); w) {
      sum += static_cast<float>(w);
      cnt += 1.0f;
    } else {
      air |= air_fn(p000);
    }
    if (auto w = water_fn(p100); w) {
      sum += static_cast<float>(w);
      cnt += 1.0f;
    } else {
      air |= air_fn(p100);
    }
    if (auto w = water_fn(p001); w) {
      sum += static_cast<float>(w);
      cnt += 1.0f;
    } else {
      air |= air_fn(p001);
    }
    if (auto w = water_fn(p101); w) {
      sum += static_cast<float>(w);
      cnt += 1.0f;
    } else {
      air |= air_fn(p101);
    }

    // Taper off water that is next to air. Otherwise, use the average height
    // of the neighboring water voxels (also, handle air above the vertex).
    if (air) {
      return static_cast<uint8_t>(1);
    } else {
      auto avg = static_cast<uint8_t>(sum / cnt + 0.5f);
      if (avg == water::kMaxLevel) {
        if (air_fn(p010) || air_fn(p110) || air_fn(p011) || air_fn(p111)) {
          return static_cast<uint8_t>(water::kMaxLevel - 1);
        }
      }
      return avg;
    }
  };
}

inline uint32_t pack_properties(const muck::Muck& muck, auto pos) {
  // Packing must match water.fs
  uint32_t packed = 0;
  // Muck is 0-16; 4 bits
  packed |= muck & 0xf;
  return packed;
}

inline auto to_material_buffer(const Tensor& tensor, const muck::Tensor& muck) {
  return material_properties::to_buffer(
      tensors::map_sparse(tensor, [&](auto pos, auto encoded_offset) {
        return std::optional{pack_properties(muck.get(pos), pos)};
      }));
}

}  // namespace voxeloo::galois::water
