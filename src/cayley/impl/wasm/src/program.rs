use super::arrays::*;
use cayley::program;
use js_sys::Uint8Array;
use std::convert::TryFrom;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Stack {
    base: program::Stack,
}

impl Stack {
    pub fn base_ref(&self) -> &program::Stack {
        &self.base
    }

    pub fn base_mut(&mut self) -> &mut program::Stack {
        &mut self.base
    }
}

#[wasm_bindgen]
impl Stack {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Stack {
        Stack {
            base: program::Stack::new(),
        }
    }

    pub fn push_bool(&mut self, array: ArrayBool) {
        self.base.push(array.unwrap().erase());
    }

    pub fn push_u8(&mut self, array: ArrayU8) {
        self.base.push(array.unwrap().erase());
    }

    pub fn push_u16(&mut self, array: ArrayU16) {
        self.base.push(array.unwrap().erase());
    }

    pub fn push_u32(&mut self, array: ArrayU32) {
        self.base.push(array.unwrap().erase());
    }

    pub fn push_u64(&mut self, array: ArrayU64) {
        self.base.push(array.unwrap().erase());
    }

    pub fn push_i8(&mut self, array: ArrayI8) {
        self.base.push(array.unwrap().erase());
    }

    pub fn push_i16(&mut self, array: ArrayI16) {
        self.base.push(array.unwrap().erase());
    }

    pub fn push_i32(&mut self, array: ArrayI32) {
        self.base.push(array.unwrap().erase());
    }

    pub fn push_i64(&mut self, array: ArrayI64) {
        self.base.push(array.unwrap().erase());
    }

    pub fn push_f32(&mut self, array: ArrayF32) {
        self.base.push(array.unwrap().erase());
    }

    pub fn push_f64(&mut self, array: ArrayF64) {
        self.base.push(array.unwrap().erase());
    }

    pub fn pop_bool(&mut self) -> ArrayBool {
        ArrayBool::from_any(self.base.pop().unwrap())
    }

    pub fn pop_u8(&mut self) -> ArrayU8 {
        ArrayU8::from_any(self.base.pop().unwrap())
    }

    pub fn pop_u16(&mut self) -> ArrayU16 {
        ArrayU16::from_any(self.base.pop().unwrap())
    }

    pub fn pop_u32(&mut self) -> ArrayU32 {
        ArrayU32::from_any(self.base.pop().unwrap())
    }

    pub fn pop_u64(&mut self) -> ArrayU64 {
        ArrayU64::from_any(self.base.pop().unwrap())
    }

    pub fn pop_i8(&mut self) -> ArrayI8 {
        ArrayI8::from_any(self.base.pop().unwrap())
    }

    pub fn pop_i16(&mut self) -> ArrayI16 {
        ArrayI16::from_any(self.base.pop().unwrap())
    }

    pub fn pop_i32(&mut self) -> ArrayI32 {
        ArrayI32::from_any(self.base.pop().unwrap())
    }

    pub fn pop_i64(&mut self) -> ArrayI64 {
        ArrayI64::from_any(self.base.pop().unwrap())
    }

    pub fn pop_f32(&mut self) -> ArrayF32 {
        ArrayF32::from_any(self.base.pop().unwrap())
    }

    pub fn pop_f64(&mut self) -> ArrayF64 {
        ArrayF64::from_any(self.base.pop().unwrap())
    }
}

#[wasm_bindgen]
pub struct Code {
    base: Vec<u8>,
}

#[wasm_bindgen]
impl Code {
    #[wasm_bindgen(constructor)]
    pub fn new(size: u32) -> Code {
        Code {
            base: vec![0; usize::try_from(size).unwrap()],
        }
    }

    pub fn view_mut(&mut self) -> Uint8Array {
        unsafe { Uint8Array::view_mut_raw(self.base.as_mut_ptr(), self.base.len()) }
    }
}

#[wasm_bindgen]
pub struct Runtime {
    base: program::Runtime,
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
impl Runtime {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Runtime {
        Runtime {
            base: program::Runtime::new(),
        }
    }

    pub fn link(&self, name: String) -> Option<u32> {
        self.base.link(name.as_str())
    }

    pub fn run(&self, stack: &mut Stack, code: Code) {
        self.base.run(&mut stack.base, code.base)
    }
}
