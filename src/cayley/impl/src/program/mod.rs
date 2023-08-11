mod exec;
mod gen;

use crate::arrays::erasure::AnyArray;
use crate::io::Reader;
use std::collections::HashMap;
use std::convert::TryFrom;

pub use exec::*;
use gen::ops::OPS;

pub struct Runtime {
    linker: HashMap<String, u32>,
}

impl Runtime {
    pub fn new() -> Runtime {
        let mut linker = HashMap::new();
        for (i, (_, name)) in OPS.iter().enumerate() {
            linker.insert(String::from(*name), u32::try_from(i).unwrap());
        }
        Runtime { linker }
    }

    pub fn link(&self, name: &str) -> Option<u32> {
        match self.linker.get(name) {
            Some(&x) => Some(x),
            None => None,
        }
    }

    pub fn run(&self, stack: &mut Stack, code: Vec<u8>) {
        if code.len() > 0 {
            let mut reader = Reader::new(code);
            loop {
                dispatch(&mut reader, stack);
                if reader.done() {
                    return;
                }
            }
        }
    }

    pub fn eval(&self, code: Vec<u8>) -> Option<AnyArray> {
        let mut stack = Stack::new();
        self.run(&mut stack, code);
        stack.pop()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::io::Writer;

    fn push_fill(runtime: &Runtime, writer: &mut Writer, s: u32, v: u32) {
        writer.push_op(runtime.link("fill_u32_1").unwrap());
        writer.push_shape([s]);
        writer.push_u32(v);
    }

    fn push_ref(runtime: &Runtime, writer: &mut Writer, i: u16) {
        writer.push_op(runtime.link("ref_u32_1").unwrap());
        writer.push_ref(i);
    }

    fn push_slice(runtime: &Runtime, writer: &mut Writer, s: i32, e: i32) {
        writer.push_op(runtime.link("slice_u32_1").unwrap());
        writer.push_range([s..e]);
    }

    fn push_merge(runtime: &Runtime, writer: &mut Writer, s: i32, e: i32) {
        writer.push_op(runtime.link("merge_u32_1").unwrap());
        writer.push_range([s..e]);
    }

    fn push_mul(runtime: &Runtime, writer: &mut Writer) {
        writer.push_op(runtime.link("mul_u32_1").unwrap());
    }

    fn push_ne(runtime: &Runtime, writer: &mut Writer) {
        writer.push_op(runtime.link("ne_u32_1").unwrap());
    }

    #[test]
    fn test_fill() {
        let runtime = Runtime::new();
        let mut code = Vec::new();

        // Write some code.
        let mut writer = Writer::new(&mut code);
        push_fill(&runtime, &mut writer, 5, 1);

        // Run the program.
        let result = runtime.eval(code).unwrap().array::<u32, 1>().unwrap();
        assert_eq!(result.to_vec(), [1, 1, 1, 1, 1]);
    }

    #[test]
    fn test_mul() {
        let runtime = Runtime::new();
        let mut code = Vec::new();

        // Write some code.
        let mut writer = Writer::new(&mut code);
        push_fill(&runtime, &mut writer, 5, 2);
        push_fill(&runtime, &mut writer, 5, 3);
        push_mul(&runtime, &mut writer);

        // Run the program.
        let result = runtime.eval(code).unwrap().array::<u32, 1>().unwrap();
        assert_eq!(result.to_vec(), [6, 6, 6, 6, 6]);
    }

    #[test]
    fn test_merge() {
        let runtime = Runtime::new();
        let mut code = Vec::new();

        // Write some code.
        let mut writer = Writer::new(&mut code);
        push_fill(&runtime, &mut writer, 5, 2);
        push_ref(&runtime, &mut writer, 0);
        push_slice(&runtime, &mut writer, 1, 4);
        push_ref(&runtime, &mut writer, 0);
        push_slice(&runtime, &mut writer, 2, 5);
        push_mul(&runtime, &mut writer);
        push_merge(&runtime, &mut writer, 0, 3);

        // Run the program.
        let result = runtime.eval(code).unwrap().array::<u32, 1>().unwrap();
        assert_eq!(result.to_vec(), [4, 4, 4, 2, 2]);
    }

    #[test]
    fn test_ne() {
        let runtime = Runtime::new();
        let mut code = Vec::new();

        // Write some code.
        let mut writer = Writer::new(&mut code);
        push_fill(&runtime, &mut writer, 5, 2);
        push_fill(&runtime, &mut writer, 5, 3);
        push_ne(&runtime, &mut writer);

        // Run the program.
        let result = runtime.eval(code).unwrap().array::<bool, 1>().unwrap();
        assert_eq!(result.to_vec(), [true, true, true, true, true]);
    }
}
