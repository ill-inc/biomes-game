use std::convert::TryFrom;
use std::ops::Bound;
use std::ops::Range;
use std::ops::RangeBounds;

pub struct ArrayRange<const D: usize> {
    pub ranges: [Range<usize>; D],
}

fn normalize(pos: isize, bound: usize) -> usize {
    if pos < 0 {
        bound - usize::try_from(-pos).unwrap()
    } else {
        usize::try_from(pos).unwrap()
    }
}

pub fn resolve<R>(range: &R, bound: usize) -> Range<usize>
where
    R: RangeBounds<isize>,
{
    Range {
        start: match range.start_bound() {
            Bound::Included(x) => normalize(*x, bound),
            Bound::Excluded(x) => normalize(*x, bound) + 1,
            Bound::Unbounded => 0,
        },

        end: match range.end_bound() {
            Bound::Included(x) => normalize(*x, bound) + 1,
            Bound::Excluded(x) => normalize(*x, bound),
            Bound::Unbounded => bound,
        },
    }
}

impl<const D: usize> ArrayRange<D> {
    pub fn for_shape<R>(shape: [usize; D], ranges: [R; D]) -> ArrayRange<D>
    where
        R: RangeBounds<isize>,
    {
        let mut normalized: [Range<usize>; D] = core::array::from_fn(|_| 0..0);
        for i in 0..D {
            normalized[i] = resolve(&ranges[i], shape[i]);
        }
        ArrayRange { ranges: normalized }
    }

    pub fn shape(&self) -> [usize; D] {
        let mut ret = [0; D];
        for i in 0..D {
            ret[i] = self.ranges[i].len();
        }
        ret
    }

    pub fn start(&self) -> [usize; D] {
        self.ranges.clone().map(|r| r.start)
    }
}
