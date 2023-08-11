use cayley::arrays::erasure::{AnyArray, TypedArray};
use js_sys::{Float64Array, Uint8Array};
use wasm_bindgen::prelude::*;

pub trait Buffer {
    unsafe fn data(&self) -> &[u8];
}

impl<T: 'static> Buffer for TypedArray<T> {
    unsafe fn data(&self) -> &[u8] {
        self.bytes()
    }
}

#[wasm_bindgen]
pub struct Bundle {
    numbers: Vec<f64>,
    strings: Vec<String>,
    buffers: Vec<Box<dyn Buffer>>,
}

#[wasm_bindgen]
impl Bundle {
    pub fn numbers(&self) -> Float64Array {
        unsafe { Float64Array::view(&self.numbers) }
    }

    pub fn strings(&self) -> String {
        if self.strings.len() > 0 {
            format!("[\"{}\"]", self.strings.join("\",\""))
        } else {
            String::from("[]")
        }
    }

    pub fn buffers(&self, index: usize) -> Uint8Array {
        unsafe { Uint8Array::view(self.buffers[index].data()) }
    }
}

impl Bundle {
    pub fn new() -> Bundle {
        Bundle {
            numbers: Vec::new(),
            strings: Vec::new(),
            buffers: Vec::new(),
        }
    }

    pub fn push_number<T>(&mut self, n: T)
    where
        f64: From<T>,
    {
        self.numbers.push(f64::from(n));
    }

    pub fn push_string(&mut self, s: String) {
        self.strings.push(s);
    }

    pub fn push_buffer(&mut self, b: Box<dyn Buffer>) {
        self.buffers.push(b);
    }
}

pub trait Bundler {
    fn bundle(self, bundle: &mut Bundle);
}

impl Bundler for &[usize] {
    fn bundle(self, bundle: &mut Bundle) {
        bundle.push_number(u32::try_from(self.len()).unwrap());
        for dim in self {
            bundle.push_number(u32::try_from(*dim).unwrap());
        }
    }
}

impl Bundler for TypedArray<bool> {
    fn bundle(self, bundle: &mut Bundle) {
        self.shape().bundle(bundle);
        bundle.push_string("Bool".to_string());
        bundle.push_buffer(Box::new(self));
    }
}

impl Bundler for TypedArray<u8> {
    fn bundle(self, bundle: &mut Bundle) {
        self.shape().bundle(bundle);
        bundle.push_string("U8".to_string());
        bundle.push_buffer(Box::new(self));
    }
}

impl Bundler for TypedArray<u16> {
    fn bundle(self, bundle: &mut Bundle) {
        self.shape().bundle(bundle);
        bundle.push_string("U16".to_string());
        bundle.push_buffer(Box::new(self));
    }
}

impl Bundler for TypedArray<u32> {
    fn bundle(self, bundle: &mut Bundle) {
        self.shape().bundle(bundle);
        bundle.push_string("U32".to_string());
        bundle.push_buffer(Box::new(self));
    }
}

impl Bundler for TypedArray<u64> {
    fn bundle(self, bundle: &mut Bundle) {
        self.shape().bundle(bundle);
        bundle.push_string("U64".to_string());
        bundle.push_buffer(Box::new(self));
    }
}

impl Bundler for TypedArray<i8> {
    fn bundle(self, bundle: &mut Bundle) {
        self.shape().bundle(bundle);
        bundle.push_string("I8".to_string());
        bundle.push_buffer(Box::new(self));
    }
}

impl Bundler for TypedArray<i16> {
    fn bundle(self, bundle: &mut Bundle) {
        self.shape().bundle(bundle);
        bundle.push_string("I16".to_string());
        bundle.push_buffer(Box::new(self));
    }
}

impl Bundler for TypedArray<i32> {
    fn bundle(self, bundle: &mut Bundle) {
        self.shape().bundle(bundle);
        bundle.push_string("I32".to_string());
        bundle.push_buffer(Box::new(self));
    }
}

impl Bundler for TypedArray<i64> {
    fn bundle(self, bundle: &mut Bundle) {
        self.shape().bundle(bundle);
        bundle.push_string("I64".to_string());
        bundle.push_buffer(Box::new(self));
    }
}

impl Bundler for TypedArray<f32> {
    fn bundle(self, bundle: &mut Bundle) {
        self.shape().bundle(bundle);
        bundle.push_string("F32".to_string());
        bundle.push_buffer(Box::new(self));
    }
}

impl Bundler for TypedArray<f64> {
    fn bundle(self, bundle: &mut Bundle) {
        self.shape().bundle(bundle);
        bundle.push_string("F64".to_string());
        bundle.push_buffer(Box::new(self));
    }
}

impl Bundler for AnyArray {
    fn bundle(self, bundle: &mut Bundle) {
        if self.is::<bool>() {
            self.typed::<bool>().unwrap().bundle(bundle)
        } else if self.is::<u8>() {
            self.typed::<u8>().unwrap().bundle(bundle)
        } else if self.is::<u16>() {
            self.typed::<u16>().unwrap().bundle(bundle)
        } else if self.is::<u32>() {
            self.typed::<u32>().unwrap().bundle(bundle)
        } else if self.is::<u64>() {
            self.typed::<u64>().unwrap().bundle(bundle)
        } else if self.is::<i8>() {
            self.typed::<i8>().unwrap().bundle(bundle)
        } else if self.is::<i16>() {
            self.typed::<i16>().unwrap().bundle(bundle)
        } else if self.is::<i32>() {
            self.typed::<i32>().unwrap().bundle(bundle)
        } else if self.is::<i64>() {
            self.typed::<i64>().unwrap().bundle(bundle)
        } else if self.is::<f32>() {
            self.typed::<f32>().unwrap().bundle(bundle)
        } else if self.is::<f64>() {
            self.typed::<f64>().unwrap().bundle(bundle)
        } else {
            panic!("Attempt to bundle an invalid array type!");
        }
    }
}

#[cfg(test)]
mod tests {
    use cayley::arrays::Array;

    use super::*;

    #[test]
    fn test_bundling() {
        let mut bundle = Bundle::new();

        let array = Array::from_vec([3, 2], vec![1, 2, 3, 4, 5, 6]);
        AnyArray::new(array).bundle(&mut bundle);

        let array = Array::from_vec([2, 1], vec![true, false]);
        AnyArray::new(array).bundle(&mut bundle);

        assert_eq!(bundle.numbers[0], 2.0);
        assert_eq!(bundle.numbers[1], 3.0);
        assert_eq!(bundle.numbers[2], 2.0);
        assert_eq!(bundle.strings[0], "I32");
        unsafe {
            let bytes = bundle.buffers[0].data();
            assert_eq!(
                std::slice::from_raw_parts(bytes.as_ptr() as *const i32, 6),
                [1, 2, 3, 4, 5, 6]
            );
        }

        assert_eq!(bundle.numbers[3], 2.0);
        assert_eq!(bundle.numbers[4], 2.0);
        assert_eq!(bundle.numbers[5], 1.0);
        assert_eq!(bundle.strings[1], "Bool");
        unsafe {
            let bytes = bundle.buffers[1].data();
            assert_eq!(
                std::slice::from_raw_parts(bytes.as_ptr() as *const bool, 2),
                [true, false]
            );
        }
    }
}
