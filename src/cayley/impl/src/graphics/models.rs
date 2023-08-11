use std::collections::HashMap;

use crate::arrays::{erasure::AnyArray, Array};

pub struct Material {
    pub textures: HashMap<String, Array<u8, 3>>,
}

pub struct Geometry {
    pub vertices: HashMap<String, AnyArray>,
    pub indices: Option<AnyArray>,
}

pub struct Mesh {
    pub material: Material,
    pub geometry: Geometry,
}

pub struct Transform {
    pub scale: [f32; 3],
    pub rotate: [f32; 4],
    pub translate: [f32; 3],
}

pub struct Node {
    pub transform: Transform,
    pub meshes: Vec<Mesh>,
}

pub struct Model {
    pub nodes: Vec<Node>,
}

impl Material {
    pub fn new() -> Material {
        Material {
            textures: HashMap::new(),
        }
    }
}

impl Geometry {
    pub fn new() -> Geometry {
        Geometry {
            vertices: HashMap::new(),
            indices: None,
        }
    }
}

impl Mesh {
    pub fn new() -> Mesh {
        Mesh {
            material: Material::new(),
            geometry: Geometry::new(),
        }
    }
}

impl Transform {
    pub fn new(scale: [f32; 3], rotate: [f32; 4], translate: [f32; 3]) -> Transform {
        Transform {
            scale,
            rotate,
            translate,
        }
    }

    pub fn identity() -> Transform {
        Transform::new([1.0, 1.0, 1.0], [1.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0])
    }
}

impl Node {
    pub fn new() -> Node {
        Node {
            transform: Transform::identity(),
            meshes: Vec::new(),
        }
    }
}

impl Model {
    pub fn new() -> Model {
        Model { nodes: Vec::new() }
    }

    pub fn from_gltf(gltf: &[u8]) -> Model {
        let mut ret = Model::new();

        let (document, buffers, images) = gltf::import_slice(&gltf).unwrap();
        for scene in document.scenes() {
            for scene_node in scene.nodes() {
                let mut node = Node::new();

                // Populate the node with its transform.
                let (trans, rot, scale) = scene_node.transform().decomposed();
                node.transform = Transform::new(scale, rot, trans);

                // Populate the node with meshes if present.
                if let Some(mesh) = scene_node.mesh() {
                    for primitive in mesh.primitives() {
                        assert!(primitive.mode() == gltf::mesh::Mode::Triangles);

                        let mut mesh = Mesh::new();

                        // Initialize the mesh's material. We assume the PBR metallic-roughness model.
                        if let Some(color) = primitive
                            .material()
                            .pbr_metallic_roughness()
                            .base_color_texture()
                        {
                            mesh.material.textures.insert(
                                String::from("color"),
                                load_texture(&images[color.texture().source().index()]),
                            );
                        }

                        // Intialize the mesh's vertex attributes.
                        for (semantic, accessor) in primitive.attributes() {
                            mesh.geometry
                                .vertices
                                .insert(semantic.to_string(), load_attributes(accessor, &buffers));
                        }

                        // Intialize the mesh's indices.
                        if let Some(accessor) = primitive.indices() {
                            assert_eq!(accessor.dimensions(), gltf::accessor::Dimensions::Scalar);
                            mesh.geometry.indices = Some(load_indices(accessor, &buffers));
                        }

                        node.meshes.push(mesh);
                    }
                }

                ret.nodes.push(node);
            }
        }

        ret
    }
}

fn load_texture(data: &gltf::image::Data) -> Array<u8, 3> {
    use gltf::image::Format;
    let w = usize::try_from(data.width).unwrap();
    let h = usize::try_from(data.height).unwrap();
    match data.format {
        Format::R8 => Array::from_vec([h, w, 1], data.pixels.clone()),
        Format::R8G8 => Array::from_vec([h, w, 2], data.pixels.clone()),
        Format::R8G8B8 => Array::from_vec([h, w, 3], data.pixels.clone()),
        Format::R8G8B8A8 => Array::from_vec([h, w, 4], data.pixels.clone()),
        _ => panic!("Unknown image format in GLTF"),
    }
}

fn load_scalar_attributes<T>(
    accessor: gltf::Accessor,
    buffers: &Vec<gltf::buffer::Data>,
) -> Array<T, 2>
where
    T: Copy + Default + gltf::accessor::Item,
{
    use gltf::accessor::Iter;

    let mut size = 0;
    let mut data = Vec::new();
    if let Some(iter) = Iter::<T>::new(accessor, |buffer| Some(&buffers[buffer.index()])) {
        for value in iter {
            size += 1;
            data.push(value);
        }
    }
    Array::from_vec([size, 1], data)
}

fn load_vector_attributes<T, const D: usize>(
    accessor: gltf::Accessor,
    buffers: &Vec<gltf::buffer::Data>,
) -> Array<T, 2>
where
    T: Copy + Default,
    [T; D]: gltf::accessor::Item,
{
    use gltf::accessor::Iter;

    let mut size = 0;
    let mut data = Vec::new();
    if let Some(iter) = Iter::<[T; D]>::new(accessor, |buffer| Some(&buffers[buffer.index()])) {
        for value in iter {
            size += 1;
            data.extend_from_slice(&value);
        }
    }
    Array::from_vec([size, D], data)
}

fn load_typed_attributes<T>(
    accessor: gltf::Accessor,
    buffers: &Vec<gltf::buffer::Data>,
) -> Array<T, 2>
where
    T: Copy + Default,
    T: gltf::accessor::Item,
    [T; 2]: gltf::accessor::Item,
    [T; 3]: gltf::accessor::Item,
    [T; 4]: gltf::accessor::Item,
{
    use gltf::accessor::Dimensions;
    match accessor.dimensions() {
        Dimensions::Scalar => load_scalar_attributes::<T>(accessor, buffers),
        Dimensions::Vec2 => load_vector_attributes::<T, 2>(accessor, buffers),
        Dimensions::Vec3 => load_vector_attributes::<T, 3>(accessor, buffers),
        Dimensions::Vec4 => load_vector_attributes::<T, 4>(accessor, buffers),
        _ => panic!("Unsupported GLTF attribute dimension"),
    }
}

fn load_attributes(accessor: gltf::Accessor, buffers: &Vec<gltf::buffer::Data>) -> AnyArray {
    use gltf::accessor::DataType;
    match accessor.data_type() {
        DataType::I8 => AnyArray::new(load_typed_attributes::<i8>(accessor, buffers)),
        DataType::I16 => AnyArray::new(load_typed_attributes::<i16>(accessor, buffers)),
        DataType::U8 => AnyArray::new(load_typed_attributes::<u8>(accessor, buffers)),
        DataType::U16 => AnyArray::new(load_typed_attributes::<u16>(accessor, buffers)),
        DataType::U32 => AnyArray::new(load_typed_attributes::<u32>(accessor, buffers)),
        DataType::F32 => AnyArray::new(load_typed_attributes::<f32>(accessor, buffers)),
    }
}

fn load_indices(accessor: gltf::Accessor, buffers: &Vec<gltf::buffer::Data>) -> AnyArray {
    use gltf::accessor::DataType;
    match accessor.data_type() {
        DataType::U8 => {
            let array = load_scalar_attributes::<u8>(accessor, buffers);
            let count = array.shape()[0] / 3;
            AnyArray::new(array.into_shape([count, 3]))
        }
        DataType::U16 => {
            let array = load_scalar_attributes::<u16>(accessor, buffers);
            let count = array.shape()[0] / 3;
            AnyArray::new(array.into_shape([count, 3]))
        }
        DataType::U32 => {
            let array = load_scalar_attributes::<u32>(accessor, buffers);
            let count = array.shape()[0] / 3;
            AnyArray::new(array.into_shape([count, 3]))
        }
        _ => panic!("Unsupported GLTF indices accessor type"),
    }
}

#[cfg(test)]
mod tests {
    use float_cmp::assert_approx_eq;

    use super::*;

    fn read_test_file(name: &str) -> Vec<u8> {
        std::fs::read(format!("data/{}", name))
            .or_else(|_| std::fs::read(format!("src/cayley/impl/data/{}", name)))
            .unwrap()
    }

    #[test]
    fn test_parse_gltf() {
        let blob = read_test_file("dandelion.gltf");
        let model = Model::from_gltf(&blob);

        assert_eq!(model.nodes.len(), 1);

        let s = model.nodes[0].transform.scale;
        assert_approx_eq!(f32, s[0], 1.0);
        assert_approx_eq!(f32, s[1], 1.0);
        assert_approx_eq!(f32, s[2], 1.0);

        let q = model.nodes[0].transform.rotate;
        assert_approx_eq!(f32, q[0], -0.43045929074287);
        assert_approx_eq!(f32, q[1], 0.092296011745929);
        assert_approx_eq!(f32, q[2], 0.560985565185546);
        assert_approx_eq!(f32, q[3], 0.701057374477386);

        let t = ultraviolet::transform::Isometry3::new(
            ultraviolet::Vec3::from(model.nodes[0].transform.translate),
            ultraviolet::Rotor3::from_quaternion_array(model.nodes[0].transform.rotate),
        );
        println!("{:?}", t.into_homogeneous_matrix());

        let t = model.nodes[0].transform.translate;
        assert_approx_eq!(f32, t[0], 0.0);
        assert_approx_eq!(f32, t[1], 1.6);
        assert_approx_eq!(f32, t[2], -9.0);

        assert_eq!(model.nodes[0].meshes.len(), 2);
        {
            let mesh = &model.nodes[0].meshes[0];

            // Validate material.
            assert_eq!(mesh.material.textures.len(), 1);
            match mesh.material.textures.get("color") {
                Some(texture) => assert_eq!(texture.shape(), [8, 8, 4]),
                None => panic!("Expected color texture is missing"),
            }

            // Validate geometry.
            assert_eq!(mesh.geometry.indices.as_ref().unwrap().shape(), [6, 3]);
            assert_eq!(mesh.geometry.vertices.len(), 3);
            for (name, array) in mesh.geometry.vertices.iter() {
                match name.as_str() {
                    "POSITION" => assert_eq!(array.shape(), [12, 3]),
                    "NORMAL" => assert_eq!(array.shape(), [12, 3]),
                    "TEXCOORD_0" => assert_eq!(array.shape(), [12, 2]),
                    _ => panic!("Unexpected attribute type {}", name),
                }
            }
        }
        {
            let mesh = &model.nodes[0].meshes[1];

            // Validate material.
            assert_eq!(mesh.material.textures.len(), 1);
            match mesh.material.textures.get("color") {
                Some(texture) => assert_eq!(texture.shape(), [24, 24, 4]),
                None => panic!("Expected color texture is missing"),
            }

            // Validate geometry.
            assert_eq!(mesh.geometry.indices.as_ref().unwrap().shape(), [6, 3]);
            assert_eq!(mesh.geometry.vertices.len(), 3);
            for (name, array) in mesh.geometry.vertices.iter() {
                match name.as_str() {
                    "POSITION" => assert_eq!(array.shape(), [12, 3]),
                    "NORMAL" => assert_eq!(array.shape(), [12, 3]),
                    "TEXCOORD_0" => assert_eq!(array.shape(), [12, 2]),
                    _ => panic!("Unexpected attribute type {}", name),
                }
            }
        }
    }
}
