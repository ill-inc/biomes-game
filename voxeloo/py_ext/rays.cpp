#include "voxeloo/py_ext/rays.hpp"

#include <pybind11/numpy.h>
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include <cstdint>
#include <unordered_map>

#include "voxeloo/common/blocks.hpp"
#include "voxeloo/common/colors.hpp"
#include "voxeloo/common/rays.hpp"
#include "voxeloo/common/spatial.hpp"
#include "voxeloo/common/succinct.hpp"
#include "voxeloo/common/utils.hpp"
#include "voxeloo/common/voxels.hpp"

namespace py = pybind11;

namespace voxeloo::rays::ext {

auto integrate_approx(const DensityMap& dm, Vec3f src, Vec3f dir, float far) {
  float depth = 0.0f;
  float discount = 1.0f;

  auto t = 0.0f;
  auto accessor = dm.access();
  rays::march(src, dir, far, [&](int x, int y, int z, float dt) {
    t += dt;

    // Figure out whether we should sample the current cell or not.
    if (accessor.has(x, y, z)) {
      auto density = accessor.get(x, y, z);
      auto integral = discount * density * dt;
      depth += integral * (t - 0.5f * dt);
      discount -= integral;
    }

    return discount >= 0.001f;
  });

  return depth + discount * far;
}

auto render_orthographic(
    const DensityMap& dm,
    Vec2i size,
    Vec3f src,
    Vec3f dir,
    Vec3f up = {0.0f, -1.0f, 0.0f},
    float far = 100.0f) {
  auto [w, h] = size;
  Vec3f z_dir = normalized(dir);
  Vec3f x_dir = normalized(cross(z_dir, up));
  Vec3f y_dir = normalized(cross(z_dir, x_dir));

  auto ret = py::array_t<float>({h, w});
  auto acc = ret.mutable_unchecked<2>();
  for (int i = 0; i < h; i += 1) {
    Vec3f pos = {
        src[0] - 0.5f * (w - 1) * x_dir[0] - (0.5f * (h - 1) - i) * y_dir[0],
        src[1] - 0.5f * (w - 1) * x_dir[1] - (0.5f * (h - 1) - i) * y_dir[1],
        src[2] - 0.5f * (w - 1) * x_dir[2] - (0.5f * (h - 1) - i) * y_dir[2],
    };
    for (int j = 0; j < w; j += 1) {
      auto val = integrate_depth(dm, pos, z_dir, far);
      acc(i, j) = val;
      pos += x_dir;
    }
  }

  return ret;
}

inline auto integrate_color(
    const ColorMap& cm,
    const py::array_t<float>& normals,
    Vec3f src,
    Vec3f dir,
    Vec3f lighting_dir,
    float far,
    // Capacity here refers to how far a ray can travel through a volume of
    // solid alpha (1.0) before it is fully saturated with opacity.
    float distance_capacity) {
  Vec4f color(0.0f, 0.0f, 0.0f, 0.0f);
  float t_prev = 0.0f;
  Vec4f c_prev(0.0f, 0.0f, 0.0f, 0.0f);
  Vec3f n_prev(0.0f, 0.0f, 0.0f);

  dir = normalized(dir);
  lighting_dir = normalized(lighting_dir);

  // We want to stop tracing once we've accumulated a specified amount of
  // accumulated opacity, or equivalently if we've reached a minimum remaining
  // transmittance. We define that here in terms of distance_capacity.
  float min_transmittance = std::exp(-distance_capacity);
  float max_opacity = 1 - min_transmittance;

  // A function that has the following properties:
  //  1. product([transmittance_fn(o, d) for d in distances]) ==
  //  transmittance_fn(o, sum(distances))
  //  2. transmittance_fn(o, 0) == 1
  //  3. transmittance_fn(0, d) == 1
  auto transmittance_fn = [](float opacity, float distance) {
    return std::exp(-opacity * distance);
  };

  float remaining_transmittance = 1.0f;
  auto normal_acc = normals.unchecked<4>();
  bool sampling = false;
  auto accessor = cm.access();
  voxels::march(src, dir, [&](int x, int y, int z, float t) {
    // If we sampled the previous location, update the depth integral.
    if (sampling && c_prev.w > 0) {
      float dt = t - t_prev;
      // Cap the integration distance (and therefore segment_transmittance) if
      // we're runnning up against the set minimum transmittance.
      float min_segment_transmittance =
          min_transmittance / remaining_transmittance;
      float segment_transmittance = transmittance_fn(c_prev.w, dt);
      if (segment_transmittance < min_segment_transmittance) {
        segment_transmittance = min_segment_transmittance;
      }

      // "cull" backfaces
      bool is_front_face = dot(n_prev, dir) < 0;
      if (is_front_face) {
        // Update the remaining transmittance and determine the opacity/alpha
        // contributions from this ray.
        float new_remaining_transmittance =
            remaining_transmittance * segment_transmittance;
        float opacity_increase =
            remaining_transmittance - new_remaining_transmittance;
        float alpha_increase = opacity_increase / max_opacity;
        remaining_transmittance = new_remaining_transmittance;

        float diffuse_lighting = std::max<float>(0, -dot(n_prev, lighting_dir));

        // The output will have pre-multiplied alpha (e.g. color values
        // will never be greater than the alpha value).
        color.x += (c_prev.x / c_prev.w) * diffuse_lighting * alpha_increase;
        color.y += (c_prev.y / c_prev.w) * diffuse_lighting * alpha_increase;
        color.z += (c_prev.z / c_prev.w) * diffuse_lighting * alpha_increase;
        color.w += alpha_increase;
      }
    }

    // Figure out whether we should sample the current cell or not.
    sampling = accessor.has(x, y, z);
    if (sampling) {
      t_prev = t;
      c_prev = colors::to_floats(accessor.get(x, y, z));
      n_prev = normalized(Vec3f(
          normal_acc(z, y, x, 0),
          normal_acc(z, y, x, 1),
          normal_acc(z, y, x, 2)));
    }

    return remaining_transmittance > min_transmittance && t < far;
  });

  return color;
}

auto render_orthographic_color(
    const ColorMap& cm,
    const py::array_t<float>& normals,
    Vec2i size,
    Vec3f src,
    Vec3f dir,
    Vec3f lighting_dir,
    Vec3f up = {0.0f, -1.0f, 0.0f},
    float far = 100.0f,
    float zoom = 1.0f,
    float distance_capacity = 0.5f) {
  auto [w, h] = size;
  Vec3f z_dir = normalized(dir);
  Vec3f x_dir = normalized(cross(z_dir, up));
  Vec3f y_dir = normalized(cross(x_dir, z_dir));

  auto ret = py::array_t<float>({h, w, 4});
  auto acc = ret.mutable_unchecked<3>();
  auto inv_zoom = 1.0f / zoom;

  for (int i = 0; i < h; i += 1) {
    auto x_shift = 0.5f * (w - 1) * x_dir;
    auto y_shift = (0.5f * (h - 1) - i) * y_dir;
    auto pos = src - inv_zoom * (x_shift - y_shift);
    for (int j = 0; j < w; j += 1) {
      auto val = integrate_color(
          cm, normals, pos, z_dir, lighting_dir, far, distance_capacity);
      acc(i, j, 0) = val.x;
      acc(i, j, 1) = val.y;
      acc(i, j, 2) = val.z;
      acc(i, j, 3) = val.w;
      pos += x_dir * inv_zoom;
    }
  }

  return ret;
}

auto render_orthographic_approx(
    const DensityMap& dm,
    Vec2i size,
    Vec3f src,
    Vec3f dir,
    Vec3f up = {0.0f, -1.0f, 0.0f},
    float far = 100.0f) {
  auto [w, h] = size;
  Vec3f z_dir = normalized(dir);
  Vec3f x_dir = normalized(cross(z_dir, up));
  Vec3f y_dir = normalized(cross(z_dir, x_dir));

  auto ret = py::array_t<float>({h, w});
  auto acc = ret.mutable_unchecked<2>();
  for (int i = 0; i < h; i += 1) {
    auto pos = src - 0.5f * (w - 1) * x_dir - (0.5f * (h - 1) - i) * y_dir;
    for (int j = 0; j < w; j += 1) {
      auto val = integrate_approx(dm, pos, z_dir, far);
      acc(i, j) = val;
      pos += x_dir;
    }
  }

  return ret;
}

auto render_camera_sequence(
    const DensityMap& dm,
    std::vector<std::array<float, 6>> cameras,
    Vec2i size,
    Vec3f up,
    float far) {
  auto [w, h] = size;
  auto n = static_cast<int>(cameras.size());
  auto ret = py::array_t<float>({n, h, w, 7});
  auto acc = ret.mutable_unchecked<4>();

  for (int i = 0; i < n; i += 1) {
    const auto& camera = cameras[i];
    Vec3f src = {camera[0], camera[1], camera[2]};
    Vec3f dir = normalized(Vec3f{camera[3], camera[4], camera[5]});
    Vec3f x_dir = normalized(cross(dir, up));
    Vec3f y_dir = normalized(cross(dir, x_dir));
    for (int y = 0; y < h; y += 1) {
      Vec3f pos = {
          src[0] - 0.5f * (w - 1) * x_dir[0] - (0.5f * (h - 1) - y) * y_dir[0],
          src[1] - 0.5f * (w - 1) * x_dir[1] - (0.5f * (h - 1) - y) * y_dir[1],
          src[2] - 0.5f * (w - 1) * x_dir[2] - (0.5f * (h - 1) - y) * y_dir[2],
      };
      for (int x = 0; x < w; x += 1) {
        acc(i, y, x, 0) = pos[0];
        acc(i, y, x, 1) = pos[1];
        acc(i, y, x, 2) = pos[2];
        acc(i, y, x, 3) = dir[0];
        acc(i, y, x, 4) = dir[1];
        acc(i, y, x, 5) = dir[2];
        acc(i, y, x, 6) = integrate_depth(dm, pos, dir, far);
        pos += x_dir;
      }
    }
  }

  return ret;
}

void bind(py::module& m) {
  auto rm = m.def_submodule("rays");

  rm.def(
      "integrate",
      [](const DensityMap& dm,
         std::array<float, 3> src,
         std::array<float, 3> dir,
         float far) {
        return rays::integrate_depth(dm, src, dir, far);
      },
      py::arg("dm"),
      py::arg("src"),
      py::arg("dir"),
      py::arg("max_distance") = 100.0f);

  rm.def(
      "integrate_approx",
      [](const DensityMap& dm,
         std::array<float, 3> src,
         std::array<float, 3> dir,
         float far) {
        return integrate_approx(dm, src, dir, far);
      },
      py::arg("dm"),
      py::arg("src"),
      py::arg("dir"),
      py::arg("max_distance") = 100.0f);

  rm.def(
      "render_orthographic",
      [](const DensityMap& dm,
         std::array<int, 2> size,
         std::array<float, 3> src,
         std::array<float, 3> dir,
         std::array<float, 3> up,
         float far) {
        return render_orthographic(dm, size, src, dir, up, far);
      },
      py::arg("dm"),
      py::arg("size"),
      py::arg("src"),
      py::arg("dir"),
      py::arg("up") = std::array<float, 3>{0.0f, -1.0f, 0.0f},
      py::arg("far") = 100.0f);

  rm.def(
      "render_orthographic_color",
      [](const ColorMap& cm,
         const py::array_t<float>& normals,
         std::array<int, 2> size,
         std::array<float, 3> src,
         std::array<float, 3> dir,
         std::array<float, 3> lighting_dir,
         std::array<float, 3> up,
         float far,
         float zoom,
         float distance_capacity) {
        return render_orthographic_color(
            cm,
            normals,
            size,
            src,
            dir,
            lighting_dir,
            up,
            far,
            zoom,
            distance_capacity);
      },
      py::arg("cm"),
      py::arg("normals"),
      py::arg("size"),
      py::arg("src"),
      py::arg("dir"),
      py::arg("lighting_dir"),
      py::arg("up") = std::array<float, 3>{0.0f, -1.0f, 0.0f},
      py::arg("far") = 100.0f,
      py::arg("zoom") = 1.0f,
      py::arg("distance_capacity") = 0.5f);

  rm.def(
      "render_orthographic_approx",
      [](const DensityMap& dm,
         std::array<int, 2> size,
         std::array<float, 3> src,
         std::array<float, 3> dir,
         std::array<float, 3> up,
         float far) {
        return render_orthographic_approx(dm, size, src, dir, up, far);
      },
      py::arg("dm"),
      py::arg("size"),
      py::arg("src"),
      py::arg("dir"),
      py::arg("up") = std::array<float, 3>{0.0f, -1.0f, 0.0f},
      py::arg("far") = 100.0f);

  rm.def(
      "render_camera_sequence",
      [](const DensityMap& dm,
         std::vector<std::array<float, 6>> cameras,
         std::array<int, 2> size,
         std::array<float, 3> up,
         float far) {
        return render_camera_sequence(dm, cameras, size, up, far);
      },
      py::arg("dm"),
      py::arg("cameras"),
      py::arg("size"),
      py::arg("up") = std::array<float, 3>{0.0f, -1.0f, 0.0f},
      py::arg("far") = 100.0f);

  rm.def(
      "reduce_rays",
      [](const DensityMap& dm,
         std::vector<std::array<float, 6>> cameras,
         std::array<int, 2> size,
         std::array<float, 3> up,
         float far) {
        return render_camera_sequence(dm, cameras, size, up, far);
      },
      py::arg("dm"),
      py::arg("cameras"),
      py::arg("size"),
      py::arg("up") = std::array<float, 3>{0.0f, -1.0f, 0.0f},
      py::arg("far") = 100.0f);
}

}  // namespace voxeloo::rays::ext
