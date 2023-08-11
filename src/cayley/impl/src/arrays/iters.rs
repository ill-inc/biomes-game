use std::default::Default;

use super::Array;

// The ArrayAccessor trait is substituted for the Iterator trait for slightly
// different semantics. The shape is enforced externally, and the iterator is
// only responsible for return the current item and advancing to the next.
pub trait ArrayAccessor {
    type Item;
    fn init(&mut self, dim: usize);
    fn step(&mut self, dim: usize);
    unsafe fn item(&mut self) -> Self::Item;
}

pub struct Map<A, F> {
    a: A,
    f: F,
}

impl<A, F> Map<A, F> {
    fn new(a: A, f: F) -> Map<A, F> {
        Map { a, f }
    }
}

impl<A, F, R> ArrayAccessor for Map<A, F>
where
    A: ArrayAccessor,
    F: FnMut(A::Item) -> R,
{
    type Item = R;

    fn init(&mut self, dim: usize) {
        self.a.init(dim);
    }

    fn step(&mut self, dim: usize) {
        self.a.step(dim);
    }

    unsafe fn item(&mut self) -> Self::Item {
        (self.f)(self.a.item())
    }
}

pub struct Zip<A, B> {
    a: A,
    b: B,
}

impl<A, B> Zip<A, B> {
    fn new(a: A, b: B) -> Zip<A, B> {
        Zip { a, b }
    }
}

impl<A, B> ArrayAccessor for Zip<A, B>
where
    A: ArrayAccessor,
    B: ArrayAccessor,
{
    type Item = (A::Item, B::Item);

    fn init(&mut self, dim: usize) {
        self.a.init(dim);
        self.b.init(dim);
    }

    fn step(&mut self, dim: usize) {
        self.a.step(dim);
        self.b.step(dim);
    }

    unsafe fn item(&mut self) -> Self::Item {
        (self.a.item(), self.b.item())
    }
}

// A WithShape wraps an ArrayAccessor with shape information for composability.
pub struct WithShape<A, const D: usize> {
    shape: [usize; D],
    accessor: A,
}

impl<A, const D: usize> WithShape<A, D> {
    fn new(shape: [usize; D], accessor: A) -> WithShape<A, D> {
        WithShape { shape, accessor }
    }
}

impl<A: ArrayAccessor, const D: usize> ArrayIterable<D> for WithShape<A, D> {
    type Item = A::Item;
    type Accessor = A;

    fn shape(&self) -> [usize; D] {
        self.shape
    }

    fn accessor(self) -> A {
        self.accessor
    }
}

// An ArrayIter wraps an array accessor with shape information for iteration.
pub struct ArrayIter<A, const D: usize> {
    shape: [usize; D],
    index: [usize; D],
    count: usize,
    accessor: A,
}

impl<A: ArrayAccessor, const D: usize> ArrayIter<A, D> {
    pub fn new(shape: [usize; D], accessor: A) -> ArrayIter<A, D> {
        ArrayIter {
            shape,
            index: [0; D],
            count: shape.iter().product(),
            accessor,
        }
    }
}

impl<A: ArrayAccessor, const D: usize> Iterator for ArrayIter<A, D> {
    type Item = A::Item;

    fn next(&mut self) -> Option<Self::Item> {
        // TODO: We can substantially optimize this code by special casing flat
        // or partially-flat accessors. One way to do this is by flattening the
        // inner-most dimensions when their shape matches their stride. One way
        // to do this is by making the accessor define its own shape.
        if self.count == 0 {
            return None;
        } else {
            self.count -= 1;
            let ret = unsafe { Some(self.accessor.item()) };
            for i in 0..D {
                let dim = D - i - 1;
                self.index[dim] += 1;
                if self.index[dim] < self.shape[dim] {
                    self.accessor.step(dim);
                    for inner in dim + 1..D {
                        self.accessor.init(inner);
                        self.index[inner] = 0;
                    }
                    break;
                }
            }
            return ret;
        }
    }
}

pub trait ArrayIterable<const D: usize> {
    type Item;
    type Accessor: ArrayAccessor<Item = Self::Item>;

    fn shape(&self) -> [usize; D];
    fn accessor(self) -> Self::Accessor;

    fn iter(self) -> ArrayIter<Self::Accessor, D>
    where
        Self: Sized,
    {
        return ArrayIter::new(self.shape(), self.accessor());
    }

    fn map<R, F>(self, f: F) -> WithShape<Map<Self::Accessor, F>, D>
    where
        Self: Sized,
        F: FnMut(Self::Item) -> R,
    {
        WithShape::new(self.shape(), Map::new(self.accessor(), f))
    }

    fn zip<A, I>(self, other: I) -> WithShape<Zip<Self::Accessor, A>, D>
    where
        Self: Sized,
        A: ArrayAccessor,
        I: ArrayIterable<D, Accessor = A>,
    {
        assert_eq!(self.shape(), other.shape());
        WithShape::new(self.shape(), Zip::new(self.accessor(), other.accessor()))
    }

    fn fold<R, F>(self, init: R, f: F) -> R
    where
        Self: Sized,
        F: FnMut(R, Self::Item) -> R,
    {
        self.iter().fold(init, f)
    }

    fn to_vec(self) -> Vec<Self::Item>
    where
        Self: Sized,
        Self::Item: Copy + Default,
    {
        self.iter().collect()
    }

    fn to_array(self) -> Array<Self::Item, D>
    where
        Self: Sized,
        Self::Item: Copy + Default,
    {
        let mut ret = Array::fill(self.shape(), Default::default());
        ret.assign_all(self);
        ret
    }
}
