use crate::arrays::Array;

pub type Aabb = [[f32; 3]; 2];
pub type Quad = [[f32; 3]; 4];

impl From<Array<f32, 3>> for Vec<Aabb> {
    fn from(aabbs: Array<f32, 3>) -> Self {
        assert!(aabbs.shape()[1..3] == [2, 3]);
        let mut ret = vec![];
        for i in 0..aabbs.shape()[0] {
            ret.push([
                [aabbs[[i, 0, 0]], aabbs[[i, 0, 1]], aabbs[[i, 0, 2]]],
                [aabbs[[i, 1, 0]], aabbs[[i, 1, 1]], aabbs[[i, 1, 2]]],
            ]);
        }
        ret
    }
}

impl From<Vec<Quad>> for Array<f32, 3> {
    fn from(quads: Vec<Quad>) -> Self {
        let mut ret = Array::fill([quads.len(), 4, 3], 0.0);
        for (i, quad) in quads.into_iter().enumerate() {
            for j in 0..4 {
                // TODO: clean up this code by adding a range expressions macro
                let n = isize::try_from(i).map(|i| i..i + 1).unwrap();
                let v = isize::try_from(j).map(|j| j..j + 1).unwrap();
                ret.assign([n, v, 0..3], Array::from_slice([1, 1, 3], &quad[j]));
            }
        }
        ret
    }
}

type Rect = [[f32; 2]; 2];

#[derive(Clone, Copy, PartialOrd, Ord, PartialEq, Eq)]
enum FaceKind {
    Enter,
    Leave,
}

#[derive(Clone, Copy)]
struct Face {
    rank: f32,
    aabb: usize,
    kind: FaceKind,
    rect: Rect,
}

fn test_intersection([l0, l1]: Rect, [r0, r1]: Rect) -> bool {
    let x0 = f32::max(l0[0], r0[0]);
    let y0 = f32::max(l0[1], r0[1]);
    let x1 = f32::min(l1[0], r1[0]);
    let y1 = f32::min(l1[1], r1[1]);
    x0 < x1 && y0 < y1
}

fn subtract_rects<I>(from: Rect, exclude: I) -> Vec<Rect>
where
    I: IntoIterator<Item = Rect>,
{
    let mut difference = vec![from];
    for [s0, s1] in exclude {
        let mut new_difference = vec![];
        for [d0, d1] in difference {
            if test_intersection([d0, d1], [s0, s1]) {
                if d0[0] < s0[0] {
                    new_difference.push([[d0[0], d0[1]], [s0[0], d1[1]]]);
                }
                if d0[1] < s0[1] {
                    new_difference.push([[f32::max(d0[0], s0[0]), d0[1]], [d1[0], s0[1]]]);
                }
                if d1[0] > s1[0] {
                    new_difference.push([[s1[0], f32::max(d0[1], s0[1])], [d1[0], d1[1]]]);
                }
                if d1[1] > s1[1] {
                    new_difference.push([
                        [f32::max(d0[0], s0[0]), s1[1]],
                        [f32::min(d1[0], s1[0]), d1[1]],
                    ]);
                }
            } else {
                new_difference.push([d0, d1]);
            }
        }
        difference = new_difference;
    }
    difference
}

struct Pool<T> {
    pub values: Vec<T>,
}

impl<T: Copy> Pool<T> {
    fn new() -> Pool<T> {
        Pool { values: vec![] }
    }

    fn push(&mut self, value: T) {
        self.values.push(value);
    }

    fn drop(&mut self, index: usize) {
        if self.values.len() > 0 {
            self.values[index] = *self.values.last().unwrap();
        }
        self.values.pop();
    }
}

fn to_quads_along_direction(aabbs: &Vec<Aabb>, [n, t, b]: [usize; 3]) -> Vec<Quad> {
    let mut faces = vec![];
    for (i, [v0, v1]) in aabbs.iter().copied().enumerate() {
        faces.push(Face {
            rank: v0[n],
            aabb: i,
            kind: FaceKind::Enter,
            rect: [[v0[t], v0[b]], [v1[t], v1[b]]],
        });
        faces.push(Face {
            rank: v1[n],
            aabb: i,
            kind: FaceKind::Leave,
            rect: [[v0[t], v0[b]], [v1[t], v1[b]]],
        });
    }

    faces.sort_by(|a, b| {
        if a.rank == b.rank {
            a.kind.cmp(&b.kind)
        } else {
            a.rank.partial_cmp(&b.rank).unwrap()
        }
    });

    let permute = |[x, y, z]: [f32; 3]| {
        let mut ret = [0f32; 3];
        ret[n] = x;
        ret[t] = y;
        ret[b] = z;
        ret
    };

    let mut ret = vec![];
    let mut pool = Pool::<(usize, Rect)>::new();
    for face in faces {
        match face.kind {
            FaceKind::Enter => {
                let rects = subtract_rects(face.rect, pool.values.iter().map(|f| f.1));
                for [lo, hi] in rects {
                    ret.push([
                        permute([face.rank, lo[0], lo[1]]),
                        permute([face.rank, lo[0], hi[1]]),
                        permute([face.rank, hi[0], hi[1]]),
                        permute([face.rank, hi[0], lo[1]]),
                    ]);
                }
                pool.push((face.aabb, face.rect));
            }
            FaceKind::Leave => {
                pool.drop(pool.values.iter().position(|f| face.aabb == f.0).unwrap());
                let rects = subtract_rects(face.rect, pool.values.iter().map(|f| f.1));
                for [lo, hi] in rects {
                    ret.push([
                        permute([face.rank, lo[0], hi[1]]),
                        permute([face.rank, lo[0], lo[1]]),
                        permute([face.rank, hi[0], lo[1]]),
                        permute([face.rank, hi[0], hi[1]]),
                    ]);
                }
            }
        }
    }

    ret
}

pub fn to_quads(aabbs: Vec<Aabb>) -> Vec<Quad> {
    let mut ret = vec![];
    ret.extend(to_quads_along_direction(&aabbs, [0, 1, 2]));
    ret.extend(to_quads_along_direction(&aabbs, [1, 2, 0]));
    ret.extend(to_quads_along_direction(&aabbs, [2, 0, 1]));
    ret
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_to_quads() {
        let aabbs = vec![[[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]]];
        let quads = to_quads(aabbs);

        // quad 0
        assert_eq!(quads[0][0], [1.0, 2.0, 3.0]);
        assert_eq!(quads[0][1], [1.0, 2.0, 6.0]);
        assert_eq!(quads[0][2], [1.0, 5.0, 6.0]);
        assert_eq!(quads[0][3], [1.0, 5.0, 3.0]);

        // quad 1
        assert_eq!(quads[1][0], [4.0, 2.0, 6.0]);
        assert_eq!(quads[1][1], [4.0, 2.0, 3.0]);
        assert_eq!(quads[1][2], [4.0, 5.0, 3.0]);
        assert_eq!(quads[1][3], [4.0, 5.0, 6.0]);

        // quad 2
        assert_eq!(quads[2][0], [1.0, 2.0, 3.0]);
        assert_eq!(quads[2][1], [4.0, 2.0, 3.0]);
        assert_eq!(quads[2][2], [4.0, 2.0, 6.0]);
        assert_eq!(quads[2][3], [1.0, 2.0, 6.0]);

        // quad 3
        assert_eq!(quads[3][0], [4.0, 5.0, 3.0]);
        assert_eq!(quads[3][1], [1.0, 5.0, 3.0]);
        assert_eq!(quads[3][2], [1.0, 5.0, 6.0]);
        assert_eq!(quads[3][3], [4.0, 5.0, 6.0]);

        // quad 4
        assert_eq!(quads[4][0], [1.0, 2.0, 3.0]);
        assert_eq!(quads[4][1], [1.0, 5.0, 3.0]);
        assert_eq!(quads[4][2], [4.0, 5.0, 3.0]);
        assert_eq!(quads[4][3], [4.0, 2.0, 3.0]);

        // quad 5
        assert_eq!(quads[5][0], [1.0, 5.0, 6.0]);
        assert_eq!(quads[5][1], [1.0, 2.0, 6.0]);
        assert_eq!(quads[5][2], [4.0, 2.0, 6.0]);
        assert_eq!(quads[5][3], [4.0, 5.0, 6.0]);
    }

    #[test]
    fn test_to_quads_multiple() {
        let aabbs = vec![
            [[0.0, 0.0, 0.0], [2.0, 1.0, 2.0]],
            [[1.0, 0.0, 1.0], [3.0, 1.0, 3.0]],
        ];
        let quads = to_quads(aabbs);

        // x quads
        assert_eq!(quads[0][0], [0.0, 0.0, 0.0]);
        assert_eq!(quads[0][2], [0.0, 1.0, 2.0]);
        assert_eq!(quads[1][0], [1.0, 0.0, 2.0]);
        assert_eq!(quads[1][2], [1.0, 1.0, 3.0]);
        assert_eq!(quads[2][0], [2.0, 0.0, 1.0]);
        assert_eq!(quads[2][2], [2.0, 1.0, 0.0]);
        assert_eq!(quads[3][0], [3.0, 0.0, 3.0]);
        assert_eq!(quads[3][2], [3.0, 1.0, 1.0]);

        // y quads
        assert_eq!(quads[4][0], [0.0, 0.0, 0.0]);
        assert_eq!(quads[4][2], [2.0, 0.0, 2.0]);
        assert_eq!(quads[5][0], [1.0, 0.0, 2.0]);
        assert_eq!(quads[5][2], [3.0, 0.0, 3.0]);
        assert_eq!(quads[6][0], [2.0, 0.0, 1.0]);
        assert_eq!(quads[6][2], [3.0, 0.0, 2.0]);

        assert_eq!(quads[7][0], [2.0, 1.0, 0.0]);
        assert_eq!(quads[7][2], [0.0, 1.0, 1.0]);
        assert_eq!(quads[8][0], [1.0, 1.0, 1.0]);
        assert_eq!(quads[8][2], [0.0, 1.0, 2.0]);
        assert_eq!(quads[9][0], [3.0, 1.0, 1.0]);
        assert_eq!(quads[9][2], [1.0, 1.0, 3.0]);

        // z quads
        assert_eq!(quads[10][0], [0.0, 0.0, 0.0]);
        assert_eq!(quads[10][2], [2.0, 1.0, 0.0]);
        assert_eq!(quads[11][0], [2.0, 0.0, 1.0]);
        assert_eq!(quads[11][2], [3.0, 1.0, 1.0]);
        assert_eq!(quads[12][0], [0.0, 1.0, 2.0]);
        assert_eq!(quads[12][2], [1.0, 0.0, 2.0]);
        assert_eq!(quads[13][0], [1.0, 1.0, 3.0]);
        assert_eq!(quads[13][2], [3.0, 0.0, 3.0]);
    }

    #[test]
    fn test_to_quads_aligned() {
        let aabbs = vec![
            [[0.0, 0.0, 0.0], [2.0, 1.0, 1.0]],
            [[2.0, 0.0, 0.0], [4.0, 1.0, 1.0]],
        ];
        let quads = to_quads(aabbs);

        // quad 0
        assert_eq!(quads[0][0], [0.0, 0.0, 0.0]);
        assert_eq!(quads[0][2], [0.0, 1.0, 1.0]);

        // quad 1
        assert_eq!(quads[1][0], [4.0, 0.0, 1.0]);
        assert_eq!(quads[1][2], [4.0, 1.0, 0.0]);

        // quad 2
        assert_eq!(quads[2][0], [0.0, 0.0, 0.0]);
        assert_eq!(quads[2][2], [2.0, 0.0, 1.0]);

        // quad 3
        assert_eq!(quads[3][0], [2.0, 0.0, 0.0]);
        assert_eq!(quads[3][2], [4.0, 0.0, 1.0]);

        // quad 4
        assert_eq!(quads[4][0], [2.0, 1.0, 0.0]);
        assert_eq!(quads[4][2], [0.0, 1.0, 1.0]);

        // quad 5
        assert_eq!(quads[5][0], [4.0, 1.0, 0.0]);
        assert_eq!(quads[5][2], [2.0, 1.0, 1.0]);
    }

    #[test]
    fn test_array_conversions() {
        let array = Array::<f32, 3>::from_slice([1, 2, 3], &[1.0, 2.0, 3.0, 4.0, 5.0, 6.0]);
        let aabbs = Vec::<Aabb>::from(array);
        let quads = Array::<f32, 3>::from(to_quads(aabbs));

        let test_quad = |[q, v]: [usize; 2], expected: [f32; 3]| {
            assert_eq!(quads[[q, v, 0]], expected[0]);
            assert_eq!(quads[[q, v, 1]], expected[1]);
            assert_eq!(quads[[q, v, 2]], expected[2]);
        };

        // quad 0
        test_quad([0, 0], [1.0, 2.0, 3.0]);
        test_quad([0, 1], [1.0, 2.0, 6.0]);
        test_quad([0, 2], [1.0, 5.0, 6.0]);
        test_quad([0, 3], [1.0, 5.0, 3.0]);

        // quad 1
        test_quad([1, 0], [4.0, 2.0, 6.0]);
        test_quad([1, 1], [4.0, 2.0, 3.0]);
        test_quad([1, 2], [4.0, 5.0, 3.0]);
        test_quad([1, 3], [4.0, 5.0, 6.0]);

        // quad 2
        test_quad([2, 0], [1.0, 2.0, 3.0]);
        test_quad([2, 1], [4.0, 2.0, 3.0]);
        test_quad([2, 2], [4.0, 2.0, 6.0]);
        test_quad([2, 3], [1.0, 2.0, 6.0]);

        // quad 3
        test_quad([3, 0], [4.0, 5.0, 3.0]);
        test_quad([3, 1], [1.0, 5.0, 3.0]);
        test_quad([3, 2], [1.0, 5.0, 6.0]);
        test_quad([3, 3], [4.0, 5.0, 6.0]);

        // quad 4
        test_quad([4, 0], [1.0, 2.0, 3.0]);
        test_quad([4, 1], [1.0, 5.0, 3.0]);
        test_quad([4, 2], [4.0, 5.0, 3.0]);
        test_quad([4, 3], [4.0, 2.0, 3.0]);

        // quad 5
        test_quad([5, 0], [1.0, 5.0, 6.0]);
        test_quad([5, 1], [1.0, 2.0, 6.0]);
        test_quad([5, 2], [4.0, 2.0, 6.0]);
        test_quad([5, 3], [4.0, 5.0, 6.0]);
    }

    #[test]
    fn test_subtract_rects() {
        let result = subtract_rects(
            [[2.0, 2.0], [5.0, 5.0]],
            vec![
                [[3.0, 3.0], [4.0, 4.0]],
                [[1.0, 1.0], [3.0, 3.0]],
                [[4.5, 3.0], [6.0, 5.0]],
                [[2.5, 3.5], [3.5, 4.5]],
            ],
        );

        assert_eq!(result.len(), 7);
        assert_eq!(result[0], [[2.0, 3.0], [2.5, 5.0]]);
        assert_eq!(result[1], [[2.5, 3.0], [3.0, 3.5]]);
        assert_eq!(result[2], [[2.5, 4.5], [3.0, 5.0]]);
        assert_eq!(result[3], [[3.0, 2.0], [5.0, 3.0]]);
        assert_eq!(result[4], [[4.0, 3.0], [4.5, 5.0]]);
        assert_eq!(result[5], [[3.5, 4.0], [4.0, 5.0]]);
        assert_eq!(result[6], [[3.0, 4.5], [3.5, 5.0]]);
    }
}
