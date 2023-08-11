use cayley::arrays::{
    erasure::{AnyArray, TypedArray},
    Array,
};
use js_sys;
use std::convert::TryFrom;
use wasm_bindgen::{prelude::*, throw_str};

macro_rules! wasm_array {
    ($name:ident, $val:ty, $view:ty) => {
        #[wasm_bindgen]
        pub struct $name {
            base: TypedArray<$val>,
        }

        #[wasm_bindgen]
        impl $name {
            pub fn from_fill(shape: Vec<u32>, fill: $val) -> $name {
                $name {
                    base: array_from_fill(shape, fill),
                }
            }

            pub fn from_data(shape: Vec<u32>, data: &[$val]) -> $name {
                $name {
                    base: array_from_data(shape, data),
                }
            }

            pub fn view(&self) -> $view {
                unsafe { <$view>::view(self.base.data()) }
            }

            pub fn shape(&self) -> Vec<usize> {
                self.base.shape().to_vec()
            }
        }

        impl $name {
            pub fn from<const D: usize>(array: Array<$val, D>) -> $name {
                assert!(array.shape().len() >= 1);
                assert!(array.shape().len() <= 5);
                $name {
                    base: TypedArray::new(array),
                }
            }

            pub fn from_typed(array: TypedArray<$val>) -> $name {
                assert!(array.shape().len() >= 1);
                assert!(array.shape().len() <= 5);
                $name { base: array }
            }

            pub fn from_any(array: AnyArray) -> $name {
                match array.shape().len() {
                    1 => <$name>::from(array.array::<$val, 1>().unwrap()),
                    2 => <$name>::from(array.array::<$val, 2>().unwrap()),
                    3 => <$name>::from(array.array::<$val, 3>().unwrap()),
                    4 => <$name>::from(array.array::<$val, 4>().unwrap()),
                    5 => <$name>::from(array.array::<$val, 5>().unwrap()),
                    _ => throw_str("Attempt to create an Wasm array with an invalid dimension"),
                }
            }

            pub fn unwrap(self) -> TypedArray<$val> {
                self.base
            }
        }
    };
}

// Unsigned integer values
wasm_array!(ArrayU8, u8, js_sys::Uint8Array);
wasm_array!(ArrayU16, u16, js_sys::Uint16Array);
wasm_array!(ArrayU32, u32, js_sys::Uint32Array);
wasm_array!(ArrayU64, u64, js_sys::BigUint64Array);

// Signed integer values
wasm_array!(ArrayI8, i8, js_sys::Int8Array);
wasm_array!(ArrayI16, i16, js_sys::Int16Array);
wasm_array!(ArrayI32, i32, js_sys::Int32Array);
wasm_array!(ArrayI64, i64, js_sys::BigInt64Array);

// Floating point values
wasm_array!(ArrayF32, f32, js_sys::Float32Array);
wasm_array!(ArrayF64, f64, js_sys::Float64Array);

// Boolean values
#[wasm_bindgen]
pub struct ArrayBool {
    base: TypedArray<bool>,
}

#[wasm_bindgen]
impl ArrayBool {
    pub fn from_fill(shape: Vec<u32>, fill: u8) -> ArrayBool {
        ArrayBool {
            base: array_from_fill(shape, fill != 0),
        }
    }

    pub fn from_data(shape: Vec<u32>, data: &[u8]) -> ArrayBool {
        unsafe {
            ArrayBool {
                base: array_from_data(shape, std::mem::transmute::<&[u8], &[bool]>(data)),
            }
        }
    }

    pub fn view(&self) -> js_sys::Uint8Array {
        unsafe { js_sys::Uint8Array::view(std::mem::transmute::<&[bool], &[u8]>(self.base.data())) }
    }

    pub fn shape(&self) -> Vec<usize> {
        self.base.shape().to_vec()
    }
}

impl ArrayBool {
    pub fn from<const D: usize>(array: Array<bool, D>) -> ArrayBool {
        assert!(array.shape().len() >= 1);
        assert!(array.shape().len() <= 5);
        ArrayBool {
            base: TypedArray::new(array),
        }
    }

    pub fn from_typed(array: TypedArray<bool>) -> ArrayBool {
        assert!(array.shape().len() >= 1);
        assert!(array.shape().len() <= 5);
        ArrayBool { base: array }
    }

    pub fn from_any(array: AnyArray) -> ArrayBool {
        match array.shape().len() {
            1 => ArrayBool::from(array.array::<bool, 1>().unwrap()),
            2 => ArrayBool::from(array.array::<bool, 2>().unwrap()),
            3 => ArrayBool::from(array.array::<bool, 3>().unwrap()),
            4 => ArrayBool::from(array.array::<bool, 4>().unwrap()),
            5 => ArrayBool::from(array.array::<bool, 5>().unwrap()),
            _ => throw_str("Attempt to create an Wasm array with an invalid dimension"),
        }
    }

    pub fn unwrap(self) -> TypedArray<bool> {
        self.base
    }
}

fn to_fixed<const D: usize>(shape: Vec<u32>) -> [usize; D] {
    assert_eq!(shape.len(), D);
    let mut ret = [0; D];
    for i in 0..D {
        ret[i] = usize::try_from(shape[i]).unwrap();
    }
    ret
}

fn array_from_fill<T: Default + Copy + 'static>(shape: Vec<u32>, fill: T) -> TypedArray<T> {
    match shape.len() {
        1 => TypedArray::new(Array::<T, 1>::fill(to_fixed::<1>(shape), fill)),
        2 => TypedArray::new(Array::<T, 2>::fill(to_fixed::<2>(shape), fill)),
        3 => TypedArray::new(Array::<T, 3>::fill(to_fixed::<3>(shape), fill)),
        4 => TypedArray::new(Array::<T, 4>::fill(to_fixed::<4>(shape), fill)),
        5 => TypedArray::new(Array::<T, 5>::fill(to_fixed::<5>(shape), fill)),
        _ => throw_str("Invalid dimension. Must be between 1 and 5, inclusive."),
    }
}

fn array_from_data<T: Default + Copy + 'static>(shape: Vec<u32>, data: &[T]) -> TypedArray<T> {
    match shape.len() {
        1 => TypedArray::new(Array::<T, 1>::from_slice(to_fixed::<1>(shape), data)),
        2 => TypedArray::new(Array::<T, 2>::from_slice(to_fixed::<2>(shape), data)),
        3 => TypedArray::new(Array::<T, 3>::from_slice(to_fixed::<3>(shape), data)),
        4 => TypedArray::new(Array::<T, 4>::from_slice(to_fixed::<4>(shape), data)),
        5 => TypedArray::new(Array::<T, 5>::from_slice(to_fixed::<5>(shape), data)),
        _ => throw_str("Invalid dimension. Must be between 1 and 5, inclusive."),
    }
}
