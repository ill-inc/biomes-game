use std::marker::PhantomData;
use std::ops::Index;
use std::ops::Range;

use super::iters::*;
use super::ranges::*;

fn offset<const D: usize>(strides: [isize; D], pos: [usize; D]) -> isize {
    let mut ret = 0;
    for i in 0..D {
        ret += strides[i] * isize::try_from(pos[i]).unwrap();
    }
    ret
}

#[derive(Copy, Debug, Clone)]
pub struct View<'a, T> {
    data: &'a [T],
    offset: usize,
}

impl<'a, T> View<'a, T> {
    pub fn new(data: &'a [T], offset: usize) -> View<'a, T> {
        View { data, offset }
    }

    pub fn from_slice(data: &'a [T]) -> View<'a, T> {
        View::new(data, 0)
    }

    pub fn index(&self, of: isize) -> usize {
        usize::try_from(isize::try_from(self.offset).unwrap() + of).unwrap()
    }

    pub fn offset(self, by: isize) -> View<'a, T> {
        View::new(self.data, self.index(by))
    }

    pub fn ptr(&self) -> *const T {
        if self.index(0) == self.data.len() {
            std::ptr::null()
        } else {
            self.get(0) as *const T
        }
    }

    pub fn get(&self, at: isize) -> &T {
        &self.data[self.index(at)]
    }

    pub unsafe fn get_unchecked(&self, at: isize) -> &T {
        &self.data.get_unchecked(self.index(at))
    }
}

#[derive(Copy, Debug, Clone)]
pub struct ArrayView<B, const D: usize> {
    shape: [usize; D],
    strides: [isize; D],
    data: B,
}

impl<B, const D: usize> ArrayView<B, D> {
    pub fn new(shape: [usize; D], strides: [isize; D], data: B) -> ArrayView<B, D> {
        ArrayView {
            shape,
            strides,
            data,
        }
    }

    pub fn expand(self, shape: [usize; D]) -> ArrayView<B, D> {
        let mut strides = self.strides;
        for i in 0..D {
            if self.shape[i] == 1 {
                strides[i] = 0;
            } else {
                assert!(self.shape[i] == shape[i]);
            }
        }
        ArrayView::new(shape, strides, self.data)
    }
}

impl<'a, T, const D: usize> ArrayView<View<'a, T>, D> {
    pub fn from_slice(
        shape: [usize; D],
        strides: [isize; D],
        data: &'a [T],
    ) -> ArrayView<View<'a, T>, D> {
        ArrayView::new(shape, strides, View::from_slice(data))
    }

    pub fn view(self, over: [Range<isize>; D]) -> ArrayView<View<'a, T>, D> {
        let range = ArrayRange::for_shape(self.shape, over);
        ArrayView {
            shape: range.shape(),
            strides: self.strides,
            data: self.data.offset(offset(self.strides, range.start())),
        }
    }

    pub fn flip(self, mask: [bool; D]) -> ArrayView<View<'a, T>, D> {
        let mut pos = [0; D];
        let mut strides = self.strides;
        for i in 0..D {
            if mask[i] {
                pos[i] = self.shape[i] - 1;
                strides[i] = -strides[i];
            }
        }
        ArrayView::new(
            self.shape,
            strides,
            self.data.offset(offset(self.strides, pos)),
        )
    }

    pub fn step(self, by: [usize; D]) -> ArrayView<View<'a, T>, D> {
        let mut shape = self.shape;
        let mut strides = self.strides;
        for i in 0..D {
            assert!(by[i] > 0);
            shape[i] = (by[i] + shape[i] - 1) / by[i];
            strides[i] *= isize::try_from(by[i]).unwrap();
        }
        ArrayView::new(shape, strides, self.data)
    }
}

impl<'a, T, const D: usize> Index<[usize; D]> for ArrayView<View<'a, T>, D> {
    type Output = T;

    fn index(&self, pos: [usize; D]) -> &Self::Output {
        self.data.get(offset(self.strides, pos))
    }
}

// TODO: The accessor here may be partially flat.
impl<'a, T: Copy, const D: usize> ArrayIterable<D> for ArrayView<View<'a, T>, D> {
    type Item = T;
    type Accessor = ArrayViewAccessor<'a, T, D>;

    fn shape(&self) -> [usize; D] {
        self.shape
    }

    fn accessor(self) -> ArrayViewAccessor<'a, T, D> {
        ArrayViewAccessor::new(self.strides, self.data)
    }
}

pub struct ArrayViewAccessor<'a, T, const D: usize> {
    strides: [isize; D],
    offsets: [isize; D],
    data: *const T,
    phantom: PhantomData<&'a T>,
}

impl<'a, T, const D: usize> ArrayViewAccessor<'a, T, D> {
    fn new(strides: [isize; D], data: View<'a, T>) -> ArrayViewAccessor<'a, T, D> {
        ArrayViewAccessor {
            strides,
            offsets: [0; D],
            data: data.ptr(),
            phantom: PhantomData,
        }
    }
}

impl<'a, T: Copy, const D: usize> ArrayAccessor for ArrayViewAccessor<'a, T, D> {
    type Item = T;

    fn init(&mut self, dim: usize) {
        if dim == 0 {
            self.offsets[0] = 0;
        } else {
            self.offsets[dim] = self.offsets[dim - 1];
        }
    }

    fn step(&mut self, dim: usize) {
        self.offsets[dim] += self.strides[dim];
    }

    unsafe fn item(&mut self) -> Self::Item {
        *self.data.clone().offset(self.offsets[D - 1])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_view_indexing() {
        let x = (0..16).collect::<Vec<i32>>();

        let a = ArrayView::new([4, 4], [4, 1], View::from_slice(&x));
        assert_eq!(a.shape(), [4, 4]);
        assert_eq!(a[[1, 1]], 5);

        let b = a.view([1..3, 0..3]);
        assert_eq!(b.shape(), [2, 3]);
        assert_eq!(b[[0, 0]], 4);
    }

    #[test]
    fn test_view_iteration() {
        let x = (0..16).collect::<Vec<i32>>();
        let v = ArrayView::new([4, 4], [4, 1], View::from_slice(&x))
            .view([1..3, 0..3])
            .map(|x| 2 * x)
            .to_vec();
        assert_eq!(v, [8, 10, 12, 16, 18, 20]);
    }

    #[test]
    fn test_expand() {
        let u = ArrayView::new([1, 3], [3, 1], View::from_slice(&[1, 2, 3]))
            .expand([2, 3])
            .to_vec();
        assert_eq!(u, [1, 2, 3, 1, 2, 3]);

        let v = ArrayView::new([2, 1, 1], [1, 1, 1], View::from_slice(&[1, 2]))
            .expand([2, 2, 3])
            .to_vec();
        assert_eq!(v, [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2]);
    }

    #[test]
    fn test_flip() {
        let x = (0..4).collect::<Vec<i32>>();

        let u = ArrayView::new([2, 2], [2, 1], View::from_slice(&x))
            .flip([false, true])
            .to_vec();
        assert_eq!(u, [1, 0, 3, 2]);

        let v = ArrayView::new([2, 2], [2, 1], View::from_slice(&x))
            .flip([true, false])
            .to_vec();
        assert_eq!(v, [2, 3, 0, 1]);

        let w = ArrayView::new([2, 2], [2, 1], View::from_slice(&x))
            .flip([true, true])
            .to_vec();
        assert_eq!(w, [3, 2, 1, 0]);
    }

    #[test]
    fn test_step() {
        let x = (0..16).collect::<Vec<i32>>();

        let u = ArrayView::new([4, 4], [4, 1], View::from_slice(&x))
            .step([2, 1])
            .to_vec();
        assert_eq!(u, [0, 1, 2, 3, 8, 9, 10, 11]);

        let v = ArrayView::new([4, 4], [4, 1], View::from_slice(&x))
            .step([1, 2])
            .to_vec();
        assert_eq!(v, [0, 2, 4, 6, 8, 10, 12, 14]);

        let w = ArrayView::new([4, 4], [4, 1], View::from_slice(&x))
            .step([2, 2])
            .to_vec();
        assert_eq!(w, [0, 2, 8, 10]);
    }

    #[test]
    fn test_flip_and_flip() {
        let x = (0..4).collect::<Vec<i32>>();

        let u = ArrayView::new([2, 2], [2, 1], View::from_slice(&x))
            .flip([false, true])
            .flip([false, true])
            .to_vec();
        assert_eq!(u, [0, 1, 2, 3]);

        let v = ArrayView::new([2, 2], [2, 1], View::from_slice(&x))
            .flip([true, false])
            .flip([true, false])
            .to_vec();
        assert_eq!(v, [0, 1, 2, 3]);

        let w = ArrayView::new([2, 2], [2, 1], View::from_slice(&x))
            .flip([true, true])
            .flip([true, true])
            .to_vec();
        assert_eq!(w, [0, 1, 2, 3]);

        let x = ArrayView::new([2, 2], [2, 1], View::from_slice(&x))
            .flip([true, false])
            .flip([false, true])
            .to_vec();
        assert_eq!(x, [3, 2, 1, 0]);
    }

    #[test]
    fn test_flip_and_step() {
        let x = (0..16).collect::<Vec<i32>>();

        let u = ArrayView::new([4, 4], [4, 1], View::from_slice(&x))
            .flip([false, true])
            .step([2, 1])
            .to_vec();
        assert_eq!(u, [3, 2, 1, 0, 11, 10, 9, 8]);

        let v = ArrayView::new([4, 4], [4, 1], View::from_slice(&x))
            .flip([true, false])
            .step([2, 1])
            .to_vec();
        assert_eq!(v, [12, 13, 14, 15, 4, 5, 6, 7]);

        let v = ArrayView::new([4, 4], [4, 1], View::from_slice(&x))
            .flip([true, false])
            .step([1, 2])
            .to_vec();
        assert_eq!(v, [12, 14, 8, 10, 4, 6, 0, 2]);

        let w = ArrayView::new([4, 4], [4, 1], View::from_slice(&x))
            .flip([true, true])
            .step([2, 2])
            .to_vec();
        assert_eq!(w, [15, 13, 7, 5]);
    }

    #[test]
    fn test_view_and_flip() {
        let x = (0..16).collect::<Vec<i32>>();

        let u = ArrayView::new([4, 4], [4, 1], View::from_slice(&x))
            .view([1..3, 0..3])
            .flip([false, true])
            .to_vec();
        assert_eq!(u, [6, 5, 4, 10, 9, 8]);

        let v = ArrayView::new([4, 4], [4, 1], View::from_slice(&x))
            .view([1..3, 0..3])
            .flip([true, false])
            .to_vec();
        assert_eq!(v, [8, 9, 10, 4, 5, 6]);

        let w = ArrayView::new([4, 4], [4, 1], View::from_slice(&x))
            .view([1..3, 0..3])
            .flip([true, true])
            .to_vec();
        assert_eq!(w, [10, 9, 8, 6, 5, 4]);
    }

    #[test]
    fn test_expand_and_flip() {
        let u = ArrayView::new([1, 3], [3, 1], View::from_slice(&[1, 2, 3]))
            .expand([2, 3])
            .flip([false, true])
            .to_vec();
        assert_eq!(u, [3, 2, 1, 3, 2, 1]);

        let v = ArrayView::new([1, 3], [3, 1], View::from_slice(&[1, 2, 3]))
            .expand([2, 3])
            .flip([true, false])
            .to_vec();
        assert_eq!(v, [1, 2, 3, 1, 2, 3]);

        let w = ArrayView::new([1, 3], [3, 1], View::from_slice(&[1, 2, 3]))
            .expand([2, 3])
            .flip([true, true])
            .to_vec();
        assert_eq!(w, [3, 2, 1, 3, 2, 1]);
    }

    #[test]
    fn test_flip_and_view() {
        let x = (0..16).collect::<Vec<i32>>();

        let u = ArrayView::new([4, 4], [4, 1], View::from_slice(&x))
            .flip([false, true])
            .view([1..3, 0..3])
            .to_vec();
        assert_eq!(u, [7, 6, 5, 11, 10, 9]);

        let v = ArrayView::new([4, 4], [4, 1], View::from_slice(&x))
            .flip([true, false])
            .view([1..3, 0..3])
            .to_vec();
        assert_eq!(v, [8, 9, 10, 4, 5, 6]);

        let w = ArrayView::new([4, 4], [4, 1], View::from_slice(&x))
            .flip([true, true])
            .view([1..3, 0..3])
            .to_vec();
        assert_eq!(w, [11, 10, 9, 7, 6, 5]);
    }

    #[test]
    fn test_flip_and_expand() {
        let u = ArrayView::new([1, 3], [3, 1], View::from_slice(&[1, 2, 3]))
            .flip([false, true])
            .expand([2, 3])
            .to_vec();
        assert_eq!(u, [3, 2, 1, 3, 2, 1]);

        let v = ArrayView::new([1, 3], [3, 1], View::from_slice(&[1, 2, 3]))
            .flip([true, false])
            .expand([2, 3])
            .to_vec();
        assert_eq!(v, [1, 2, 3, 1, 2, 3]);

        let w = ArrayView::new([1, 3], [3, 1], View::from_slice(&[1, 2, 3]))
            .flip([true, true])
            .expand([2, 3])
            .to_vec();
        assert_eq!(w, [3, 2, 1, 3, 2, 1]);
    }

    #[test]
    fn test_empty_slices() {
        let x = Vec::<i32>::new();
        let v = ArrayView::new([0, 0], [2, 1], View::new(&x, 0)).to_vec();
        assert_eq!(v, Vec::<i32>::new());

        let x = vec![1];
        let v = ArrayView::new([0, 0], [2, 1], View::new(&x, 1)).to_vec();
        assert_eq!(v, Vec::<i32>::new());
    }
}
