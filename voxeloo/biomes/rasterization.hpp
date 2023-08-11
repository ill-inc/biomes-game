#pragma once

#include <algorithm>
#include <array>
#include <cmath>
#include <tuple>
#include <vector>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/meshes.hpp"
#include "voxeloo/common/utils.hpp"
#include "voxeloo/common/voxels.hpp"
#include "voxeloo/third_party/tomasakeninemoeller/tribox3.h"

namespace voxeloo::rasterization {

template <size_t dim>
using Attrs = Vec<double, dim>;
using Index = uint32_t;

template <typename Attrs>
struct TriangleData {
  std::vector<Index> indices;
  std::vector<Vec3d> positions;
  std::vector<Attrs> attributes;
};

template <typename Attrs>
struct Voxelization {
  std::vector<Vec3i> coords;
  std::vector<Attrs> attributes;

  auto size() const {
    return coords.size();
  }
};

template <typename Attrs>
struct LinearSampler {
  Attrs operator()(Vec3d uvw, const std::array<Attrs, 3>& attrs) {
    return uvw[0] * attrs[0] + uvw[1] * attrs[1] + uvw[2] * attrs[2];
  }
};

template <typename Attrs>
struct LinearReducer {
  Attrs operator()(
      const std::tuple<Attrs, double>* begin,
      const std::tuple<Attrs, double>* end) {
    CHECK_ARGUMENT(begin < end);
    Attrs out = (1.0 - std::get<1>(*begin)) * std::get<0>(*begin);
    double sum = (1.0 - std::get<1>(*begin));
    for (auto it = ++begin; it != end; ++it) {
      out += (1.0 - std::get<1>(*it)) * std::get<0>(*it);
      sum += (1.0 - std::get<1>(*it));
    }
    return out / sum;
  }
};

template <typename Attrs>
struct NearestReducer {
  Attrs operator()(
      const std::tuple<Attrs, double>* begin,
      const std::tuple<Attrs, double>* end) {
    CHECK_ARGUMENT(begin < end);
    auto closest = begin;
    for (auto it = ++begin; it != end; ++it) {
      if (std::get<1>(*it) < std::get<1>(*closest)) {
        closest = it;
      }
    }
    return std::get<0>(*closest);
  }
};

// Returns the projection of p onto the triangle defined by (v_0, v_1, v_2).
inline auto projected_point(
    const Vec3d& p, const Vec3d& v_0, const Vec3d& v_1, const Vec3d& v_2) {
  auto normal = normalized(cross(v_1 - v_0, v_2 - v_0));
  return p - dot(normal, p - v_0) * normal;
}

// Returns the given barycentric coords over (v_0, v_1, v_2) to world coords.
inline auto barycentric_to_world(
    const Vec3d& uvw, const Vec3d& v_0, const Vec3d& v_1, const Vec3d& v_2) {
  return uvw.x * v_0 + uvw.y * v_1 + uvw.z * v_2;
}

// Returns the barycentric coords of p given vertices (v_0, v_1, v_2).
inline auto world_to_barycentric(
    const Vec3d& p, const Vec3d& v_0, const Vec3d& v_1, const Vec3d& v_2) {
  auto normal = normalized(cross(v_1 - v_0, v_2 - v_0));
  auto area_012 = dot(normal, cross(v_1 - v_0, v_2 - v_0));
  auto area_p12 = dot(normal, cross(v_1 - p, v_2 - p));
  auto area_p20 = dot(normal, cross(v_2 - p, v_0 - p));
  auto u = area_p12 / area_012;
  auto v = area_p20 / area_012;
  auto w = 1.0 - u - v;
  return Vec3d{u, v, w};
}

// Returns the nearest point on the triangle defined by (v_0, v_1, v_2) to p.
inline auto closest_point(
    const Vec3d& p, const Vec3d& v_0, const Vec3d& v_1, const Vec3d& v_2) {
  auto uvw = [&]() -> Vec3d {
    auto q = projected_point(p, v_0, v_1, v_2);
    auto [u, v, w] = world_to_barycentric(q, v_0, v_1, v_2);
    if (u < 0) {
      auto t = dot(p - v_1, v_2 - v_1) / dot(v_2 - v_1, v_2 - v_1);
      t = std::clamp(t, 0.0, 1.0);
      return {0.0, 1.0 - t, t};
    } else if (v < 0) {
      auto t = dot(p - v_2, v_0 - v_2) / dot(v_0 - v_2, v_0 - v_2);
      t = std::clamp(t, 0.0, 1.0);
      return {t, 0.0, 1.0 - t};
    } else if (w < 0) {
      auto t = dot(p - v_0, v_1 - v_0) / dot(v_1 - v_0, v_1 - v_0);
      t = std::clamp(t, 0.0, 1.0);
      return {1.0 - t, t, 0.0};
    } else {
      return {u, v, w};
    }
  }();
  return std::tuple(barycentric_to_world(uvw, v_0, v_1, v_2), uvw);
}

template <
    typename Attrs,
    typename Reducer = LinearReducer<Attrs>,
    typename Sampler = LinearSampler<Attrs>>
inline auto to_voxels(
    const TriangleData<Attrs>& triangles,
    double quantization = 1.0,
    voxels::Box bounding_box = voxels::infinite_box()) {
  Voxelization<Attrs> ret;

  // Compute all of the triangle fragments.
  using FragmentKey = std::array<int, 3>;
  using FragmentVal = std::tuple<Attrs, double>;
  using Fragment = std::tuple<FragmentKey, FragmentVal>;
  std::vector<Fragment> hits;
  for (size_t i = 0; i < triangles.indices.size(); i += 3) {
    auto [i_0, i_1, i_2] = gather(triangles.indices, i, i + 1, i + 2);

    Vec3d v_0 = triangles.positions[i_0] / quantization;
    Vec3d v_1 = triangles.positions[i_1] / quantization;
    Vec3d v_2 = triangles.positions[i_2] / quantization;

    // Create a bounding box for the triangle.
    auto box = voxels::union_box({
        voxels::unit_box(to<float>(v_0)),
        voxels::unit_box(to<float>(v_1)),
        voxels::unit_box(to<float>(v_2)),
    });

    // Restrict the rasterization box to the output bounding box.
    box = voxels::intersect_box(box, bounding_box);

    const double* vertices[3] = {v_0.ptr(), v_1.ptr(), v_2.ptr()};
    for (int iz = box.v0[2] - 1; iz <= box.v1[2]; iz += 1) {
      for (int iy = box.v0[1] - 1; iy <= box.v1[1]; iy += 1) {
        for (int ix = box.v0[0] - 1; ix <= box.v1[0]; ix += 1) {
          static double h_size[] = {0.5, 0.5, 0.5};
          Vec3d center = {ix + 0.5, iy + 0.5, iz + 0.5};
          if (tri_box_overlap(center.ptr(), h_size, vertices)) {
            auto [xyz, uvw] = closest_point(center, v_0, v_1, v_2);
            auto key = FragmentKey{ix, iy, iz};
            auto val = FragmentVal{
                Sampler()(uvw, gather(triangles.attributes, i_0, i_1, i_2)),
                norm(xyz - center),
            };
            hits.emplace_back(std::move(key), std::move(val));
          }
        }
      }
    }
  }

  if (hits.size()) {
    // Sort the triangle fragments by their voxel coordinate.
    std::sort(hits.begin(), hits.end(), [](const auto& l, const auto& r) {
      auto [lx, ly, lz] = std::get<0>(l);
      auto [rx, ry, rz] = std::get<0>(r);
      return lz < rz || (lz == rz && (ly < ry || (ly == ry && lx < rx)));
    });

    // Reduce all fragments with a common coordinate to one attribute vector.
    std::vector<FragmentVal> vals;
    auto reduce = [&](auto it) {
      ret.coords.emplace_back(std::get<0>(*it));
      ret.attributes.emplace_back(Reducer()(&vals[0], &vals[vals.size()]));
    };

    auto it_b = hits.begin();
    vals.emplace_back(std::move(std::get<1>(*it_b)));
    for (auto it_e = ++hits.begin(); it_e != hits.end(); ++it_e) {
      if (std::get<0>(*it_b) != std::get<0>(*it_e)) {
        reduce(it_b);
        vals.clear();
        it_b = it_e;
      }
      vals.emplace_back(std::move(std::get<1>(*it_e)));
    }
    reduce(it_b);
  }

  return ret;
}

inline auto to_voxels(const meshes::Mesh& mesh, double quantization = 1.0) {
  TriangleData<Attrs<3>> triangles;

  // Copy over the triangle indices.
  auto m = mesh.indices.size();
  triangles.indices.reserve(m);
  for (size_t i = 0; i < m; i += 1) {
    triangles.indices.emplace_back(mesh.indices.at(i));
  }

  // Copy over the triangle attributes.
  auto n = mesh.vertices.size();
  triangles.positions.reserve(n);
  triangles.attributes.reserve(n);
  for (size_t i = 0; i < n; i += 1) {
    const auto& vertex = mesh.vertices.at(i);
    triangles.positions.emplace_back(vertex.xyz.to<double>());
    triangles.attributes.emplace_back(vertex.rgb.to<double>().array());
  }

  return to_voxels(triangles, quantization);
}

}  // namespace voxeloo::rasterization
