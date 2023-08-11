use std::ops::RangeBounds;

use super::Array;

pub fn merge<R, T: Copy + Default, const D: usize>(
    mut dst: Array<T, D>,
    src: Array<T, D>,
    into: [R; D],
) -> Array<T, D>
where
    R: RangeBounds<isize>,
{
    dst.assign(into, src);
    dst
}
