use super::gen::ops::OPS;
use crate::arrays::erasure::AnyArray;
use crate::io::{Reader, Writer};

use std::convert::TryFrom;
use std::ops::Range;

pub struct Stack {
    values: Vec<AnyArray>,
}

impl Stack {
    pub fn new() -> Stack {
        Stack { values: Vec::new() }
    }

    pub fn push(&mut self, array: AnyArray) {
        self.values.push(array);
    }

    pub fn pop(&mut self) -> Option<AnyArray> {
        self.values.pop()
    }

    pub fn get(&self, i: usize) -> Option<&AnyArray> {
        self.values.get(i)
    }
}

pub type Code = Reader;

impl Code {
    pub fn read_op(&mut self) -> usize {
        usize::try_from(self.read_u32().unwrap()).unwrap()
    }

    pub fn read_ref(&mut self) -> usize {
        usize::try_from(self.read_u16().unwrap()).unwrap()
    }

    pub fn read_shape<const D: usize>(&mut self) -> [usize; D] {
        let mut ret = [0; D];
        for i in 0..D {
            ret[i] = usize::try_from(self.read_u32().unwrap()).unwrap();
        }
        ret
    }

    pub fn read_range<const D: usize>(&mut self) -> [Range<isize>; D] {
        let mut ret: [Range<isize>; D] = core::array::from_fn(|_| 0..0);
        for i in 0..D {
            let s = isize::try_from(self.read_i32().unwrap()).unwrap();
            let e = isize::try_from(self.read_i32().unwrap()).unwrap();
            ret[i] = s..e;
        }
        ret
    }

    pub fn read_mask<const D: usize>(&mut self) -> [bool; D] {
        let mut ret = [false; D];
        for i in 0..D {
            ret[i] = self.read_bool().unwrap();
        }
        ret
    }
}

pub type CodeBuilder<'a> = Writer<'a>;

impl<'a> CodeBuilder<'a> {
    pub fn push_op(&mut self, code: u32) {
        self.push_u32(code)
    }

    pub fn push_ref(&mut self, index: u16) {
        self.push_u16(index)
    }

    pub fn push_shape<const D: usize>(&mut self, shape: [u32; D]) {
        for i in 0..D {
            self.push_u32(shape[i]);
        }
    }

    pub fn push_range<const D: usize>(&mut self, range: [Range<i32>; D]) {
        for i in 0..D {
            self.push_i32(range[i].start);
            self.push_i32(range[i].end);
        }
    }

    pub fn push_mask<const D: usize>(&mut self, mask: [bool; D]) {
        for i in 0..D {
            self.push_bool(mask[i]);
        }
    }
}

pub fn dispatch(code: &mut Code, stack: &mut Stack) {
    OPS[code.read_op()].0(code, stack);
}
