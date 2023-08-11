#include "voxeloo/py_ext/galois.hpp"

#include <pybind11/numpy.h>
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/galois/csg.hpp"
#include "voxeloo/galois/florae.hpp"
#include "voxeloo/galois/groups.hpp"
#include "voxeloo/galois/lighting.hpp"
#include "voxeloo/galois/material_properties.hpp"
#include "voxeloo/galois/sbo.hpp"
#include "voxeloo/galois/shapes.hpp"
#include "voxeloo/galois/terrain.hpp"
#include "voxeloo/galois/transforms.hpp"
#include "voxeloo/galois/water.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace py = pybind11;

namespace voxeloo::galois::ext {

template <typename Val>
void bind_csg_for_type(py::module m) {
  using Tensor = tensors::Tensor<Val>;
  using Mask = tensors::Tensor<bool>;

  // Bind map overloads.
  m.def("clear", [](const Tensor& t, const Mask& m) {
    return csg::clear(t, m);
  });
  m.def("slice", [](const Tensor& t, const Mask& m) {
    return csg::slice(t, m);
  });
  m.def("merge", [](const Tensor& l, const Tensor& r) {
    return csg::merge(l, r);
  });
  m.def("write", [](const Tensor& t, const Mask& m, Val v) {
    return csg::write(t, m, v);
  });
}

void bind_csg(py::module m) {
  // Bind CSG routines for each type.
  bind_csg_for_type<bool>(m);
  bind_csg_for_type<int8_t>(m);
  bind_csg_for_type<int16_t>(m);
  bind_csg_for_type<int32_t>(m);
  bind_csg_for_type<uint8_t>(m);
  bind_csg_for_type<uint16_t>(m);
  bind_csg_for_type<uint32_t>(m);
}

template <typename T>
void bind_transforms_for_type(py::module m) {
  using transforms::Transform;

  m.def("apply", [](const tensors::Tensor<T>& t, const Transform& x) {
    return transforms::apply(t, x);
  });
}

void bind_transforms(py::module m) {
  using transforms::Transform;

  py::class_<Transform>(m, "Transform")
      .def_property(
          "permute",
          [](const Transform& transform) {
            return transform.permute.array();
          },
          [](Transform& transform, std::array<uint32_t, 3> permute) {
            transform.permute = permute;
          })
      .def_property(
          "reflect",
          [](const Transform& transform) {
            return transform.reflect.array();
          },
          [](Transform& transform, std::array<bool, 3> reflect) {
            transform.reflect = reflect;
          })
      .def_property(
          "shift",
          [](const Transform& transform) {
            return transform.shift.array();
          },
          [](Transform& transform, std::array<int, 3> shift) {
            transform.shift = shift;
          });

  m.def("shift", &transforms::shift);
  m.def("permute", &transforms::permute);
  m.def("reflect", &transforms::reflect);
  m.def("compose", &transforms::compose);

  bind_transforms_for_type<bool>(m);
  bind_transforms_for_type<uint8_t>(m);
  bind_transforms_for_type<uint16_t>(m);
  bind_transforms_for_type<uint32_t>(m);
  bind_transforms_for_type<int8_t>(m);
  bind_transforms_for_type<int16_t>(m);
  bind_transforms_for_type<int32_t>(m);
}

void bind_material_properties(py::module m) {
  using material_properties::Buffer;
  py::class_<Buffer>(m, "MaterialBuffer")
      .def_readonly("rank", &Buffer::rank)
      .def_readonly("data", &Buffer::data);
}

void bind_blocks(py::module m) {
  using blocks::CheckboardPosition;
  using blocks::Index;
  using blocks::IndexBuilder;
  using blocks::MoistureLevel;
  using blocks::Sampler;
  using blocks::Samples;

  py::enum_<CheckboardPosition>(m, "CheckboardPosition")
      .value("White", CheckboardPosition::White)
      .value("Black", CheckboardPosition::Black);

  py::enum_<MoistureLevel>(m, "MoistureLevel")
      .value("Zero", MoistureLevel::Zero)
      .value("Low", MoistureLevel::Low)
      .value("Moderate", MoistureLevel::Moderate)
      .value("High", MoistureLevel::High)
      .value("Full", MoistureLevel::Full);

  py::class_<Samples>(m, "Samples")
      .def_readonly("count", &Samples::count)
      .def_readonly("offsets", &Samples::offsets);

  py::class_<Sampler>(m, "Sampler")
      .def("size", &Sampler::size)
      .def("get", &Sampler::get);

  py::class_<Index>(m, "Index")
      .def("get_sampler", &Index::get_sampler)
      .def("dumps", &Index::save)
      .def("loads", &Index::load);

  py::class_<IndexBuilder>(m, "IndexBuilder")
      .def(py::init<uint32_t, uint32_t>())
      .def("add_block", &IndexBuilder::add_block)
      .def("build", &IndexBuilder::build);

  m.def("to_surface_tensor", &blocks::to_surface_tensor);
  m.def("to_block_sample_tensor", &blocks::to_block_sample_tensor);
  m.def("to_material_buffer", &blocks::to_material_buffer);
}

void bind_florae(py::module m) {
  using florae::GeometryBuffer;
  using florae::GrowthTensor;
  using florae::Index;
  using florae::IndexBuilder;
  using florae::Quads;
  using florae::QuadVertex;
  using florae::Tensor;

  py::class_<QuadVertex>(m, "QuadVertex")
      .def(py::init<
           std::array<float, 3>,
           std::array<float, 3>,
           std::array<float, 2>,
           float,
           uint32_t>())
      .def(
          "pos",
          [](const QuadVertex& v) {
            return v.pos.array();
          })
      .def(
          "normal",
          [](const QuadVertex& v) {
            return v.normal.array();
          })
      .def(
          "uv",
          [](const QuadVertex& v) {
            return v.uv.array();
          })
      .def("texture", [](const QuadVertex& v) {
        return v.texture;
      });

  py::class_<Quads>(m, "Quads")
      .def(py::init<std::vector<QuadVertex>, std::vector<uint32_t>>())
      .def_readonly("vertices", &Quads::vertices)
      .def_readonly("indices", &Quads::indices);

  py::class_<GeometryBuffer>(m, "GeometryBuffer")
      .def(py::init<>())
      .def_readonly("vertices", &GeometryBuffer::vertices)
      .def_readonly("indices", &GeometryBuffer::indices)
      .def(
          "vertex_data",
          [](const GeometryBuffer& buffer) {
            return py::memoryview::from_memory(
                buffer.vertices_view(), buffer.vertices_bytes());
          })
      .def("index_data", [](const GeometryBuffer& buffer) {
        return py::memoryview::from_memory(
            buffer.indices_view(), buffer.indices_bytes());
      });

  py::class_<Index>(m, "Index")
      .def_readonly("samples", &Index::samples)
      .def_readonly("quads", &Index::quads)
      .def("dumps", &Index::save)
      .def("loads", &Index::load);

  py::class_<IndexBuilder>(m, "IndexBuilder")
      .def(py::init<>())
      .def("set_fallback", &IndexBuilder::set_fallback)
      .def("add_samples", &IndexBuilder::add_samples)
      .def("set_animation", &IndexBuilder::set_animation)
      .def("add_quads", &IndexBuilder::add_quads)
      .def("build", &IndexBuilder::build);

  m.def(
      "to_geometry",
      py::overload_cast<
          const Tensor&,
          const GrowthTensor&,
          const muck::Tensor&,
          const Index&>(florae::to_geometry));
}

inline auto texture_from_numpy(const py::array_t<uint8_t>& array) {
  CHECK_ARGUMENT(array.ndim() == 3);
  CHECK_ARGUMENT(array.shape(2) == 4);

  auto h = static_cast<uint32_t>(array.shape(0));
  auto w = static_cast<uint32_t>(array.shape(1));
  std::vector<groups::RGBA> data;
  data.reserve(w * h);

  auto acc = array.template unchecked<3>();
  for (uint32_t y = 0; y < h; y += 1) {
    for (uint32_t x = 0; x < w; x += 1) {
      data.push_back({acc(y, x, 0), acc(y, x, 1), acc(y, x, 2), acc(y, x, 3)});
    }
  }

  return groups::Texture{vec2(h, w).template to<uint32_t>(), data};
}

void bind_groups(py::module m) {
  using groups::CombinedMesh;
  using groups::Index;
  using groups::Mesh;
  using groups::Tensor;
  using groups::Texture;
  using groups::Vertex;

  py::class_<Vertex>(m, "Vertex")
      .def_readonly("pos", &Vertex::pos)
      .def_readonly("normal", &Vertex::normal)
      .def_readonly("uv", &Vertex::uv);

  py::class_<Texture>(m, "Texture")
      .def(
          "shape",
          [](const Texture& texture) {
            return texture.shape.array();
          })
      .def_property_readonly(
          "data",
          [](const Texture& texture) {
            auto [h, w] = texture.shape.template to<int>();
            return py::array_t<uint8_t>{
                {h, w, 4},
                texture.ptr(),
                py::cast(texture),
            };
          })
      .def_static("fromarray", &texture_from_numpy);

  py::class_<Index>(m, "Index")
      .def("dumps", &Index::save)
      .def("loads", &Index::load);

  // TODO(tg): Add routines to scan, map, and rotate.
  py::class_<Tensor>(m, "Tensor")
      .def(py::init<>())
      .def("dumps", &Tensor::save)
      .def("loads", &Tensor::load);

  py::class_<Mesh>(m, "Mesh")
      .def_readonly("texture", &Mesh::texture)
      .def(
          "vertex_data",
          [](const Mesh& mesh) {
            return py::memoryview::from_memory(
                mesh.vertices_view(), mesh.vertices_bytes());
          })
      .def("index_data", [](const Mesh& mesh) {
        return py::memoryview::from_memory(
            mesh.indices_view(), mesh.indices_bytes());
      });

  py::class_<CombinedMesh>(m, "CombinedMesh")
      .def_readonly("blocks", &CombinedMesh::blocks)
      .def_readonly("florae", &CombinedMesh::florae)
      .def_readonly("glass", &CombinedMesh::glass);

  m.def("to_index", &groups::to_index);
  m.def("to_tensor", &groups::to_tensor);
  m.def("to_mesh", &groups::to_mesh);
  m.def("to_wireframe_mesh", &groups::to_wireframe_mesh);
}

template <typename T>
void bind_lighting_for_type(py::module m) {
  m.def(
      "to_buffer",
      [](const tensors::Tensor<T>& tensor, const shapes::Tensor& isomorphisms) {
        return lighting::to_buffer(tensor, isomorphisms);
      });
}

void bind_lighting(py::module m) {
  using lighting::Buffer;

  py::class_<Buffer>(m, "Buffer")
      .def_readonly("rank", &Buffer::rank)
      .def_readonly("data", &Buffer::data);

  bind_lighting_for_type<bool>(m);
  bind_lighting_for_type<int8_t>(m);
  bind_lighting_for_type<int16_t>(m);
  bind_lighting_for_type<int32_t>(m);
  bind_lighting_for_type<uint8_t>(m);
  bind_lighting_for_type<uint16_t>(m);
  bind_lighting_for_type<uint32_t>(m);
}

void bind_sbo(py::module m) {
  using sbo::StorageBuffer;

  py::class_<StorageBuffer>(m, "Buffer")
      .def_property_readonly(
          "shape",
          [](const StorageBuffer& buffer) {
            return buffer.shape.array();
          })
      .def_readonly("data", &StorageBuffer::data)
      .def("view", [](const StorageBuffer& buffer) {
        return py::memoryview::from_memory(buffer.view(), buffer.bytes());
      });
}

void bind_shapes(py::module m) {
  using shapes::Box;
  using shapes::Boxes;
  using shapes::BoxesBuilder;
  using shapes::Edge;
  using shapes::GeometryBuffer;
  using shapes::Index;
  using shapes::IndexBuilder;
  using shapes::Level;
  using shapes::Quad;
  using shapes::Quads;
  using shapes::QuadsBuilder;
  using shapes::Tensor;
  using shapes::WireframeMesh;
  using shapes::WireframeMeshBuilder;

  py::enum_<Level>(m, "Level")
      .value("MACRO", Level::MACRO)
      .value("MICRO", Level::MICRO)
      .export_values();

  py::class_<Quad>(m, "Quad")
      .def_property_readonly(
          "pos",
          [](const Quad& q) {
            return q.pos.array();
          })
      .def_readonly("lvl", &Quad::lvl);

  py::class_<Quads>(m, "Quads").def_readonly("dir", &Quads::dir);

  py::class_<QuadsBuilder>(m, "QuadsBuilder")
      .def(py::init<>())
      .def("add", &QuadsBuilder::add)
      .def("build", &QuadsBuilder::build);

  py::class_<Box>(m, "Box")
      .def_property_readonly(
          "pos",
          [](const Box& b) {
            return b.pos.array();
          })
      .def_readonly("len", &Box::len);

  py::class_<Boxes>(m, "Boxes");

  py::class_<BoxesBuilder>(m, "BoxesBuilder")
      .def(py::init<>())
      .def("add", &BoxesBuilder::add)
      .def("build", &BoxesBuilder::build);

  py::class_<Edge>(m, "Edge")
      .def_property_readonly(
          "v0",
          [](const Edge& edge) {
            return edge.v0.array();
          })
      .def_property_readonly("v1", [](const Edge& edge) {
        return edge.v1.array();
      });
  ;

  py::class_<WireframeMesh>(m, "WireframeMesh")
      .def(
          "vertex_data",
          [](const WireframeMesh& mesh) {
            return py::memoryview::from_memory(
                mesh.vertices_view(), mesh.vertices_bytes());
          })
      .def("index_data", [](const WireframeMesh& mesh) {
        return py::memoryview::from_memory(
            mesh.indices_view(), mesh.indices_bytes());
      });

  py::class_<WireframeMeshBuilder>(m, "WireframeMeshBuilder")
      .def(py::init<>())
      .def("add_triangles", &WireframeMeshBuilder::add_triangles)
      .def("build", &WireframeMeshBuilder::build);

  py::class_<Index>(m, "Index")
      .def_readonly("offsets", &Index::offsets)
      .def_readonly("quads", &Index::quads)
      .def_readonly("occlusion_masks", &Index::occlusion_masks)
      .def("dumps", &Index::save)
      .def("loads", &Index::load);

  py::class_<IndexBuilder>(m, "IndexBuilder")
      .def(py::init<uint32_t>())
      .def("set_offset", &IndexBuilder::set_offset)
      .def("add_isomorphism", &IndexBuilder::add_isomorphism)
      .def("build", &IndexBuilder::build);

  py::class_<GeometryBuffer>(m, "GeometryBuffer")
      .def(py::init<>())
      .def_readonly("vertices", &GeometryBuffer::vertices)
      .def_readonly("indices", &GeometryBuffer::indices)
      .def(
          "vertex_data",
          [](const GeometryBuffer& buffer) {
            return py::memoryview::from_memory(
                buffer.vertices_view(), buffer.vertices_bytes());
          })
      .def("index_data", [](const GeometryBuffer& buffer) {
        return py::memoryview::from_memory(
            buffer.indices_view(), buffer.indices_bytes());
      });

  m.def("to_isomorphism_id", &shapes::to_isomorphism_id);
  m.def("to_tensor", &shapes::to_tensor);
  m.def("to_occlusion_tensor", [](const Tensor& tensor, const Index& index) {
    return shapes::to_occlusion_tensor(tensor, index);
  });
  m.def(
      "to_glass_occlusion_tensor",
      [](const Tensor& shape_tensor,
         const glass::Tensor& glass_tensor,
         const blocks::DyeTensor& dye_tensor,
         const Index& index) {
        return shapes::to_glass_occlusion_tensor(
            shape_tensor, glass_tensor, dye_tensor, index);
      });
  m.def("to_geometry", &shapes::to_geometry_buffer);
}

void bind_terrain(py::module m) {
  // Block routines
  m.def("is_valid_block_id", &terrain::is_valid_block_id);
  m.def("from_block_id", &terrain::from_block_id);
  m.def("to_blocks", &terrain::to_blocks);

  // Flora routines
  m.def("is_valid_flora_id", &terrain::is_valid_flora_id);
  m.def("from_flora_id", &terrain::from_flora_id);
  m.def("to_florae", &terrain::to_florae);

  // Transparent routines
  m.def("is_valid_glass_id", &terrain::is_valid_glass_id);
  m.def("from_glass_id", &terrain::from_glass_id);
  m.def("to_glass", &terrain::to_glass);
}

void bind_water(py::module m) {
  using water::GeometryBuffer;
  using water::Tensor;

  py::class_<GeometryBuffer>(m, "GeometryBuffer")
      .def(py::init<>())
      .def_readonly("vertices", &GeometryBuffer::vertices)
      .def_readonly("indices", &GeometryBuffer::indices)
      .def(
          "vertex_data",
          [](const GeometryBuffer& buffer) {
            return py::memoryview::from_memory(
                buffer.vertices_view(), buffer.vertices_bytes());
          })
      .def("index_data", [](const GeometryBuffer& buffer) {
        return py::memoryview::from_memory(
            buffer.indices_view(), buffer.indices_bytes());
      });

  m.def("to_surface", [](const Tensor& tensor) {
    return water::to_surface(tensor);
  });
  m.def("to_geometry", [](const Tensor& tensor) {
    return water::to_geometry(tensor);
  });
}

void bind(py::module& vox_module) {
  auto m = vox_module.def_submodule("galois");

  // Bind modules.
  bind_csg(m.def_submodule("csg"));
  bind_transforms(m.def_submodule("transforms"));
  bind_material_properties(m.def_submodule("material_properties"));
  bind_blocks(m.def_submodule("blocks"));
  bind_florae(m.def_submodule("florae"));
  bind_groups(m.def_submodule("groups"));
  bind_lighting(m.def_submodule("lighting"));
  bind_sbo(m.def_submodule("sbo"));
  bind_shapes(m.def_submodule("shapes"));
  bind_terrain(m.def_submodule("terrain"));
  bind_water(m.def_submodule("water"));
}

}  // namespace voxeloo::galois::ext
