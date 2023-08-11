use byteorder::{LittleEndian, ReadBytesExt, WriteBytesExt};
use std::convert::TryFrom;
use std::io::Cursor;

type Buffer = Vec<u8>;

pub struct Reader {
    cursor: Cursor<Buffer>,
}

impl Reader {
    pub fn new(buffer: Buffer) -> Reader {
        Reader {
            cursor: Cursor::new(buffer),
        }
    }

    pub fn done(&self) -> bool {
        usize::try_from(self.cursor.position()).unwrap() >= self.cursor.get_ref().len()
    }

    pub fn read_bool(&mut self) -> Option<bool> {
        self.read_u8().and_then(|x| Some(x != 0))
    }

    pub fn read_i8(&mut self) -> Option<i8> {
        self.cursor.read_i8().ok()
    }

    pub fn read_u8(&mut self) -> Option<u8> {
        self.cursor.read_u8().ok()
    }

    pub fn read_i16(&mut self) -> Option<i16> {
        self.cursor.read_i16::<LittleEndian>().ok()
    }

    pub fn read_u16(&mut self) -> Option<u16> {
        self.cursor.read_u16::<LittleEndian>().ok()
    }

    pub fn read_i32(&mut self) -> Option<i32> {
        self.cursor.read_i32::<LittleEndian>().ok()
    }

    pub fn read_u32(&mut self) -> Option<u32> {
        self.cursor.read_u32::<LittleEndian>().ok()
    }

    pub fn read_i64(&mut self) -> Option<i64> {
        self.cursor.read_i64::<LittleEndian>().ok()
    }

    pub fn read_u64(&mut self) -> Option<u64> {
        self.cursor.read_u64::<LittleEndian>().ok()
    }

    pub fn read_f32(&mut self) -> Option<f32> {
        self.cursor.read_f32::<LittleEndian>().ok()
    }

    pub fn read_f64(&mut self) -> Option<f64> {
        self.cursor.read_f64::<LittleEndian>().ok()
    }
}

pub struct Writer<'a> {
    buffer: &'a mut Buffer,
}

impl<'a> Writer<'a> {
    pub fn new(buffer: &mut Buffer) -> Writer {
        Writer { buffer }
    }

    pub fn push_bool(&mut self, x: bool) {
        self.push_u8(if x { 1 } else { 0 })
    }

    pub fn push_i8(&mut self, x: i8) {
        self.buffer.write_i8(x).unwrap()
    }

    pub fn push_u8(&mut self, x: u8) {
        self.buffer.write_u8(x).unwrap()
    }

    pub fn push_i16(&mut self, x: i16) {
        self.buffer.write_i16::<LittleEndian>(x).unwrap()
    }

    pub fn push_u16(&mut self, x: u16) {
        self.buffer.write_u16::<LittleEndian>(x).unwrap()
    }

    pub fn push_i32(&mut self, x: i32) {
        self.buffer.write_i32::<LittleEndian>(x).unwrap()
    }

    pub fn push_u32(&mut self, x: u32) {
        self.buffer.write_u32::<LittleEndian>(x).unwrap()
    }

    pub fn push_i64(&mut self, x: i64) {
        self.buffer.write_i64::<LittleEndian>(x).unwrap()
    }

    pub fn push_u64(&mut self, x: u64) {
        self.buffer.write_u64::<LittleEndian>(x).unwrap()
    }

    pub fn push_f32(&mut self, x: f32) {
        self.buffer.write_f32::<LittleEndian>(x).unwrap()
    }

    pub fn push_f64(&mut self, x: f64) {
        self.buffer.write_f64::<LittleEndian>(x).unwrap()
    }
}
