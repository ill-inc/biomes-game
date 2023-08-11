use core::fmt::{Display, Formatter, Result};
use std::ops::RangeBounds;
use std::ops::{Index, IndexMut};

pub mod erasure;
pub mod iters;
pub mod ranges;
pub mod routines;
pub mod views;

pub use iters::*;
pub use ranges::*;
pub use views::*;

#[derive(Clone, Debug)]
pub struct Array<T, const D: usize> {
    shape: [usize; D],
    data: Vec<T>,
}

impl<T, const D: usize> Array<T, D> {
    fn strides(&self) -> [usize; D] {
        let mut strides = [1; D];
        for i in 1..D {
            let dim = D - i - 1;
            strides[dim] = strides[dim + 1] * self.shape[dim + 1];
        }
        strides
    }

    fn offset(&self, pos: [usize; D]) -> usize {
        let mut ret = pos[0];
        for dim in 1..D {
            ret = ret * self.shape[dim] + pos[dim];
        }
        ret
    }
}

impl<T: Copy + Default, const D: usize> Array<T, D> {
    pub fn fill(shape: [usize; D], value: T) -> Array<T, D> {
        Array {
            shape,
            data: vec![value; shape.iter().product()],
        }
    }

    pub fn from_vec(shape: [usize; D], data: Vec<T>) -> Array<T, D> {
        assert_eq!(shape.iter().product::<usize>(), data.len());
        Array { shape, data }
    }

    pub fn from_slice(shape: [usize; D], data: &[T]) -> Array<T, D> {
        Self::from_vec(shape, data.to_vec())
    }

    pub fn from_iter<I: IntoIterator<Item = T>>(shape: [usize; D], values: I) -> Array<T, D> {
        Self::from_vec(shape, values.into_iter().collect())
    }

    pub fn shape(&self) -> [usize; D] {
        return self.shape;
    }

    pub fn view<'a, R>(&'a self, over: [R; D]) -> ArrayView<View<'a, T>, D>
    where
        R: RangeBounds<isize>,
    {
        let range = ArrayRange::for_shape(self.shape, over);
        ArrayView::new(
            range.shape(),
            self.strides().map(|s| isize::try_from(s).unwrap()),
            View::new(&self.data[..], self.offset(range.start())),
        )
    }

    pub fn into_shape<const K: usize>(self, shape: [usize; K]) -> Array<T, K> {
        assert!(shape.iter().product::<usize>() == self.shape.iter().product::<usize>());
        Array {
            shape,
            data: self.data,
        }
    }

    pub fn all<'a>(&'a self) -> ArrayView<View<'a, T>, D> {
        self.view([..; D])
    }

    pub fn assign<R, A>(&mut self, to: [R; D], values: A)
    where
        R: RangeBounds<isize>,
        A: ArrayIterable<D, Item = T>,
    {
        let range = ArrayRange::for_shape(self.shape, to);
        let shape = range.shape();
        assert_eq!(shape, values.shape());

        let strides = self.strides();
        let mut offsets = [0; D];
        let mut indices = [0; D];

        let offset = self.offset(range.start());
        let data = &mut self.data[offset..];
        for val in values.iter() {
            unsafe {
                *data.get_unchecked_mut(offsets[D - 1]) = val;
            }
            for i in 0..D {
                let dim = D - i - 1;
                indices[dim] += 1;
                if indices[dim] < shape[dim] {
                    offsets[dim] += strides[dim];
                    for i in dim + 1..D {
                        offsets[i] = offsets[dim];
                        indices[i] = 0;
                    }
                    break;
                }
            }
        }
    }

    pub fn assign_all<A>(&mut self, values: A)
    where
        A: ArrayIterable<D, Item = T>,
    {
        assert_eq!(self.shape(), values.shape());
        for (i, x) in values.iter().enumerate() {
            unsafe {
                *self.data.get_unchecked_mut(i) = x;
            }
        }
    }

    pub fn to_vec(self) -> Vec<T> {
        self.data
    }
}

impl<T: Copy + Default, const D: usize> Index<[usize; D]> for Array<T, D> {
    type Output = T;

    fn index(&self, pos: [usize; D]) -> &Self::Output {
        &self.data[self.offset(pos)]
    }
}

impl<T: Copy + Default, const D: usize> IndexMut<[usize; D]> for Array<T, D> {
    fn index_mut(&mut self, pos: [usize; D]) -> &mut Self::Output {
        let i = self.offset(pos);
        &mut self.data[i]
    }
}

impl<T: Copy, const D: usize> ArrayIterable<D> for Array<T, D> {
    type Item = T;
    type Accessor = FlatAccessor<Vec<T>, D>;

    fn shape(&self) -> [usize; D] {
        self.shape
    }

    fn accessor(self) -> Self::Accessor {
        FlatAccessor::new(self.data)
    }
}

pub struct FlatAccessor<B, const D: usize> {
    offset: usize,
    data: B,
}

impl<B, const D: usize> FlatAccessor<B, D> {
    fn new(data: B) -> FlatAccessor<B, D> {
        FlatAccessor { offset: 0, data }
    }
}

impl<T: Copy, const D: usize> ArrayAccessor for FlatAccessor<Vec<T>, D> {
    type Item = T;

    fn init(&mut self, _: usize) {}

    fn step(&mut self, _: usize) {
        self.offset += 1;
    }

    unsafe fn item(&mut self) -> Self::Item {
        *self.data.get_unchecked(self.offset)
    }
}

impl<T: Display, const D: usize> Display for Array<T, D> {
    fn fmt(&self, f: &mut Formatter) -> Result {
        let s = self
            .data
            .iter()
            .map(ToString::to_string)
            .collect::<Vec<String>>()
            .join(", ");
        write!(f, "[{s}]")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_views() {
        let a = Array::from_vec([4, 4], (0..16).collect::<Vec<i32>>());

        let r = a.view([0..2, 0..2]);
        assert_eq!(r.to_vec(), [0, 1, 4, 5]);

        let s = a.view([1..3, 1..3]);
        assert_eq!(s.to_vec(), [5, 6, 9, 10]);

        let sum = r.zip(s).map(|(x, y)| 2 * x + y).fold(0, |u, v| u + v);
        assert_eq!(sum, 50);
    }

    #[test]
    fn test_one_dim() {
        let a = Array::fill([5], 1);
        let b = Array::fill([5], 2);
        let sum = a.zip(b).map(|(x, y)| x + y).fold(0, |x, y| x + y);
        assert_eq!(sum, 15);
    }

    #[test]
    fn test_assignments() {
        let mut a = Array::from_vec([4, 4], (0..16).collect::<Vec<i32>>());
        a.assign([0..2, 0..2], a.view([1..3, 1..3]).to_array());
        assert_eq!(a.view([..2, ..2]).to_vec(), [5, 6, 9, 10]);

        let mut b = Array::fill([2, 2], 0);
        b.assign_all(a.view([..2, ..2]));
        assert_eq!(b.all().to_vec(), [5, 6, 9, 10]);
    }

    #[test]
    fn test_negative_indices() {
        let mut a = Array::from_vec([4, 4], (0..16).collect::<Vec<i32>>());
        println!("{:?}", a.view([-1.., -3..]).to_array());

        a.assign([..1, ..3], a.view([-1.., -3..]).to_array());
        assert_eq!(a.view([..1, ..3]).to_vec(), [13, 14, 15]);
    }

    #[test]
    fn test_sum() {
        let mut a = Array::fill([5], 1);
        {
            let b = Array::fill([5], 2);
            a.assign_all(a.all().zip(b).map(|(x, y)| x + y).to_array());
        }
        assert_eq!(a.to_vec(), [3, 3, 3, 3, 3]);
    }

    #[test]
    fn test_higher_dims() {
        let a = Array::from_vec([4, 4, 4], (0..64).collect::<Vec<i32>>());
        let r = a.view([2..4, 2..4, 2..4]);
        assert_eq!(r.to_vec(), [42, 43, 46, 47, 58, 59, 62, 63]);
    }
}
