use cayley::arrays::erasure::TypedArray;
use cayley::arrays::Array;
use cayley::graphics::aabbs;
use cayley::graphics::mapping;
use cayley::graphics::models;
use cayley::graphics::rects;
use cayley::graphics::textures;
use wasm_bindgen::prelude::*;

use crate::arrays::ArrayF32;
use crate::arrays::{ArrayI32, ArrayU8};
use crate::bundles::{Bundle, Bundler};

#[wasm_bindgen]
pub fn decode_img(bytes: &[u8]) -> ArrayU8 {
    ArrayU8::from(textures::decode_img(bytes))
}

#[wasm_bindgen]
pub fn encode_png(pixels: ArrayU8) -> Vec<u8> {
    textures::encode_png(pixels.unwrap().array::<3>().unwrap())
}

#[wasm_bindgen]
pub fn to_quads(boxed: ArrayF32) -> ArrayF32 {
    let aabbs = Vec::<aabbs::Aabb>::from(boxed.unwrap().array::<3>().unwrap());
    let quads = aabbs::to_quads(aabbs);
    ArrayF32::from(Array::<f32, 3>::from(quads))
}

#[wasm_bindgen]
pub fn to_lines(boxed: ArrayF32) -> ArrayF32 {
    let rects = Vec::<rects::Rect>::from(boxed.unwrap().array::<3>().unwrap());
    let lines = rects::to_lines(rects);
    ArrayF32::from(Array::<f32, 3>::from(lines))
}

#[wasm_bindgen]
pub struct Mapping {}

#[wasm_bindgen]
impl Mapping {
    #[wasm_bindgen]
    pub fn to_ao(heights: ArrayI32) -> ArrayU8 {
        ArrayU8::from(mapping::to_ao(heights.unwrap().array::<2>().unwrap()))
    }

    #[wasm_bindgen]
    pub fn to_shadows(
        heights: ArrayI32,
        light_dir: &[f32],
        jitter_intensity: f32,
        sample_distance: f32,
        sample_count: usize,
    ) -> ArrayU8 {
        assert_eq!(light_dir.len(), 3);
        ArrayU8::from(mapping::to_shadows(
            heights.unwrap().array::<2>().unwrap(),
            [light_dir[0], light_dir[1], light_dir[2]],
            jitter_intensity,
            sample_distance,
            sample_count,
        ))
    }

    #[wasm_bindgen]
    pub fn render_alpha(alpha: ArrayU8, dpi: usize) -> ArrayU8 {
        ArrayU8::from(mapping::render_alpha(
            alpha.unwrap().array::<3>().unwrap(),
            dpi,
        ))
    }
}

#[wasm_bindgen]
pub struct Model {
    base: models::Model,
}

#[wasm_bindgen]
impl Model {
    #[wasm_bindgen]
    pub fn from_gltf(bytes: &[u8]) -> Model {
        Model {
            base: models::Model::from_gltf(bytes),
        }
    }

    #[wasm_bindgen]
    pub fn bundle(self) -> Bundle {
        let mut bundle = Bundle::new();
        self.base.bundle(&mut bundle);
        bundle
    }
}

impl Bundler for models::Material {
    fn bundle(self, bundle: &mut Bundle) {
        bundle.push_number(u32::try_from(self.textures.len()).unwrap());
        for (name, array) in self.textures.into_iter() {
            bundle.push_string(name);
            TypedArray::new(array).bundle(bundle);
        }
    }
}

impl Bundler for models::Geometry {
    fn bundle(self, bundle: &mut Bundle) {
        bundle.push_number(u32::try_from(self.vertices.len()).unwrap());
        for (name, array) in self.vertices.into_iter() {
            bundle.push_string(name);
            array.bundle(bundle);
        }
        if let Some(array) = self.indices {
            bundle.push_number(1);
            array.bundle(bundle);
        } else {
            bundle.push_number(0);
        }
    }
}

impl Bundler for models::Mesh {
    fn bundle(self, bundle: &mut Bundle) {
        self.material.bundle(bundle);
        self.geometry.bundle(bundle);
    }
}

impl Bundler for models::Transform {
    fn bundle(self, bundle: &mut Bundle) {
        bundle.push_number(self.scale[0]);
        bundle.push_number(self.scale[1]);
        bundle.push_number(self.scale[2]);
        bundle.push_number(self.rotate[0]);
        bundle.push_number(self.rotate[1]);
        bundle.push_number(self.rotate[2]);
        bundle.push_number(self.rotate[3]);
        bundle.push_number(self.translate[0]);
        bundle.push_number(self.translate[1]);
        bundle.push_number(self.translate[2]);
    }
}

impl Bundler for models::Node {
    fn bundle(self, bundle: &mut Bundle) {
        self.transform.bundle(bundle);
        bundle.push_number(u32::try_from(self.meshes.len()).unwrap());
        for mesh in self.meshes.into_iter() {
            mesh.bundle(bundle);
        }
    }
}

impl Bundler for models::Model {
    fn bundle(self, bundle: &mut Bundle) {
        bundle.push_number(u32::try_from(self.nodes.len()).unwrap());
        for node in self.nodes.into_iter() {
            node.bundle(bundle);
        }
    }
}
