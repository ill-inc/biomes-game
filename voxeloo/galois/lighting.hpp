#pragma once

#include <array>
#include <optional>
#include <span>
#include <vector>

#include "voxeloo/common/bits.hpp"
#include "voxeloo/common/errors.hpp"
#include "voxeloo/galois/gen/light_kernel.hpp"
#include "voxeloo/galois/sbo.hpp"
#include "voxeloo/galois/shapes.hpp"
#include "voxeloo/tensors/routines.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::galois::lighting {

struct Buffer {
  sbo::StorageBuffer rank;
  sbo::StorageBuffer data;
};

using LightSample = std::tuple<Vec3u, uint32_t>;
static_assert(sizeof(LightSample) == 16);
using LightTensor = tensors::Tensor<std::optional<LightSample>>;

struct LightMask {
  Vec3u value{0, 0, 0};

  auto offset(Vec3u pos) const {
    return (pos.x << 2) | (pos.y << 3) | (pos.z << 4);
  }

  auto get(Vec3u pos) {
    return (value >> offset(pos)) & 0xfu;
  }

  void del(Vec3u pos) {
    value &= ~(0xfu << offset(pos));
  }

  void set(Vec3u pos, Vec3u to) {
    del(pos);
    value |= ((to & 0xfu) << offset(pos));
  }
};

// A light kernel that averages all light values in the voxels incident to a
// given vertex and emits this value for each incident voxel corner.
template <typename VoxelLightFn>
inline auto make_vertex_fn(VoxelLightFn&& light_fn) {
  return [=](Vec3i pos) {
    auto p_000 = pos - vec3(1, 1, 1);
    auto p_100 = pos - vec3(0, 1, 1);
    auto p_010 = pos - vec3(1, 0, 1);
    auto p_110 = pos - vec3(0, 0, 1);
    auto p_001 = pos - vec3(1, 1, 0);
    auto p_101 = pos - vec3(0, 1, 0);
    auto p_011 = pos - vec3(1, 0, 0);
    auto p_111 = pos - vec3(0, 0, 0);

    return apply_light_kernel<LightMask>({
        light_fn(p_000),
        light_fn(p_100),
        light_fn(p_010),
        light_fn(p_110),
        light_fn(p_001),
        light_fn(p_101),
        light_fn(p_011),
        light_fn(p_111),
    });
  };
}

// A light kernel that averages all light values in the voxels incident to a
// given vertex and emits this value for each incident voxel corner.
template <typename VoxelOcclusionFn, typename VoxelLightFn>
inline auto make_vertex_fn(
    VoxelOcclusionFn&& occlusion_fn, VoxelLightFn&& light_fn) {
  return [=](Vec3i pos) {
    auto p_000 = pos - vec3(1, 1, 1);
    auto p_100 = pos - vec3(0, 1, 1);
    auto p_010 = pos - vec3(1, 0, 1);
    auto p_110 = pos - vec3(0, 0, 1);
    auto p_001 = pos - vec3(1, 1, 0);
    auto p_101 = pos - vec3(0, 1, 0);
    auto p_011 = pos - vec3(1, 0, 0);
    auto p_111 = pos - vec3(0, 0, 0);

    auto mask = static_cast<uint8_t>(0);
    mask |= static_cast<uint8_t>(!occlusion_fn(p_000) << 7);
    mask |= static_cast<uint8_t>(!occlusion_fn(p_100) << 6);
    mask |= static_cast<uint8_t>(!occlusion_fn(p_010) << 5);
    mask |= static_cast<uint8_t>(!occlusion_fn(p_110) << 4);
    mask |= static_cast<uint8_t>(!occlusion_fn(p_001) << 3);
    mask |= static_cast<uint8_t>(!occlusion_fn(p_101) << 2);
    mask |= static_cast<uint8_t>(!occlusion_fn(p_011) << 1);
    mask |= static_cast<uint8_t>(!occlusion_fn(p_111) << 0);

    return apply_light_kernel_with_occlusion<LightMask>(
        mask,
        {
            light_fn(p_000),
            light_fn(p_100),
            light_fn(p_010),
            light_fn(p_110),
            light_fn(p_001),
            light_fn(p_101),
            light_fn(p_011),
            light_fn(p_111),
        });
  };
}

template <typename T, typename IrradianceFn, typename SkyVisibilityFn>
inline auto to_light_tensor(
    const tensors::Tensor<T>& tensor,
    IrradianceFn&& irradiance_fn,
    SkyVisibilityFn&& sky_visibility_fn) {
  return tensors::map_sparse(tensor, [&](auto pos, ATTR_UNUSED auto val) {
    LightMask irr;
    LightMask sky;
    for (auto dz : {0u, 1u}) {
      for (auto dy : {0u, 1u}) {
        for (auto dx : {0u, 1u}) {
          auto vertex_pos = to<int>(pos + vec3(dx, dy, dz));
          {
            auto mask = irradiance_fn(vertex_pos);
            irr.set({dx, dy, dz}, mask.get({1 - dx, 1 - dy, 1 - dz}));
          }
          {
            auto mask = sky_visibility_fn(vertex_pos);
            sky.set({dx, dy, dz}, mask.get({1 - dx, 1 - dy, 1 - dz}));
          }
        }
      }
    }
    // We just take one component of the sky occlusion color value since it is
    // grayscale.
    return std::optional<LightSample>{{irr.value, sky.value.x}};
  });
}

template <typename T>
inline auto to_light_tensor(
    const tensors::Tensor<T>& surface, const shapes::Tensor& isomorphisms) {
  auto irr_fn = make_vertex_fn([&](Vec3i pos) {
    return Vec3f{0.0, 0.0, 0.0};
  });

  auto sky_fn = make_vertex_fn([&](Vec3i pos) {
    if (voxels::shape_contains(isomorphisms.shape, pos)) {
      return isomorphisms.get(to<uint32_t>(pos)) ? Vec3f{0.0, 0.0, 0.0}
                                                 : Vec3f{1.0, 1.0, 1.0};
    }
    return Vec3f{1.0, 1.0, 1.0};
  });

  return to_light_tensor(surface, irr_fn, sky_fn);
}

inline auto to_buffer(const LightTensor& tensor) {
  // Populate a buffer object with the light maps for each surface block.
  std::vector<LightSample> samples;
  tensors::BufferBuilder<tensors::DictKey> builder;
  tensors::scan_sparse(tensor, [&](auto pos, auto sample) {
    samples.push_back(sample.value());
    builder.add(tensors::encode_tensor_pos(pos));
  });
  return Buffer{
      sbo::to_sbo(tensors::make_dict(std::move(builder).build()).to_buffer()),
      sbo::to_sbo(std::as_bytes(std::span{samples})),
  };
}

template <typename T, typename IrradianceFn, typename SkyVisibilityFn>
inline auto to_buffer(
    const tensors::Tensor<T>& tensor,
    IrradianceFn&& irradiance_fn,
    SkyVisibilityFn&& sky_visibility_fn) {
  return to_buffer(to_light_tensor(
      tensor,
      std::forward<IrradianceFn>(irradiance_fn),
      std::forward<SkyVisibilityFn>(sky_visibility_fn)));
}

template <typename T>
inline auto to_buffer(
    const tensors::Tensor<T>& tensor, const shapes::Tensor& isomorphisms) {
  return to_buffer(to_light_tensor(tensor, isomorphisms));
}

}  // namespace voxeloo::galois::lighting
