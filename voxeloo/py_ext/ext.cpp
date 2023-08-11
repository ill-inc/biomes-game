#include <pybind11/numpy.h>
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include "voxeloo/py_ext/biomes.hpp"
#include "voxeloo/py_ext/blocks.hpp"
#include "voxeloo/py_ext/culling.hpp"
#include "voxeloo/py_ext/galois.hpp"
#include "voxeloo/py_ext/geometry.hpp"
#include "voxeloo/py_ext/meshes.hpp"
#include "voxeloo/py_ext/noise.hpp"
#include "voxeloo/py_ext/primitives.hpp"
#include "voxeloo/py_ext/rasterization.hpp"
#include "voxeloo/py_ext/rays.hpp"
#include "voxeloo/py_ext/runs.hpp"
#include "voxeloo/py_ext/shards.hpp"
#include "voxeloo/py_ext/spatial.hpp"
#include "voxeloo/py_ext/tensors.hpp"
#include "voxeloo/py_ext/voronoi.hpp"
#include "voxeloo/py_ext/voxels.hpp"

namespace py = pybind11;

PYBIND11_MODULE(voxeloo, m) {
  m.doc() = "Voxeloo CPP extensions";
  m.attr("__version__") = "0.1.0";

  // Bind all voxel data structures.
  voxeloo::biomes::ext::bind(m);
  voxeloo::blocks::ext::bind(m);
  voxeloo::culling::ext::bind(m);
  voxeloo::galois::ext::bind(m);
  voxeloo::geometry::ext::bind(m);
  voxeloo::meshes::ext::bind(m);
  voxeloo::noise::ext::bind(m);
  voxeloo::primitives::ext::bind(m);
  voxeloo::rasterization::ext::bind(m);
  voxeloo::rays::ext::bind(m);
  voxeloo::runs::ext::bind(m);
  voxeloo::shards::ext::bind(m);
  voxeloo::spatial::ext::bind(m);
  voxeloo::tensors::ext::bind(m);
  voxeloo::voronoi::ext::bind(m);
  voxeloo::voxels::ext::bind(m);
};