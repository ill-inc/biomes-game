use crate::arrays::Array;

pub type Rect = [[f32; 2]; 2];
pub type Line = [[f32; 2]; 2];

impl From<Array<f32, 3>> for Vec<Rect> {
    fn from(rects: Array<f32, 3>) -> Self {
        assert!(rects.shape()[1..3] == [2, 2]);
        let mut ret = vec![];
        for i in 0..rects.shape()[0] {
            ret.push([
                [rects[[i, 0, 0]], rects[[i, 0, 1]]],
                [rects[[i, 1, 0]], rects[[i, 1, 1]]],
            ]);
        }
        ret
    }
}

impl From<Vec<Line>> for Array<f32, 3> {
    fn from(lines: Vec<Line>) -> Self {
        let mut ret = Array::fill([lines.len(), 2, 2], 0.0);
        for (i, line) in lines.into_iter().enumerate() {
            for j in 0..2 {
                // TODO: clean up this code by adding a range expressions macro
                let n = isize::try_from(i).map(|i| i..i + 1).unwrap();
                let v = isize::try_from(j).map(|j| j..j + 1).unwrap();
                ret.assign([n, v, 0..2], Array::from_slice([1, 1, 2], &line[j]));
            }
        }
        ret
    }
}

type Interval = [f32; 2];

#[derive(Clone, Copy, PartialOrd, Ord, PartialEq, Eq)]
enum EdgeKind {
    Enter,
    Leave,
}

#[derive(Clone, Copy)]
struct Edge {
    rank: f32,
    rect: usize,
    kind: EdgeKind,
    interval: Interval,
}

fn test_intersection(a: Interval, b: Interval) -> bool {
    f32::max(a[0], b[0]) < f32::min(a[1], b[1])
}

fn subtract_intervals<I>(from: Interval, exclude: I) -> Vec<Interval>
where
    I: IntoIterator<Item = Interval>,
{
    let mut difference = vec![from];
    for s in exclude {
        let mut new_difference = vec![];
        for d in difference {
            if test_intersection(d, s) {
                if d[0] < s[0] {
                    new_difference.push([d[0], s[0]]);
                }
                if d[1] > s[1] {
                    new_difference.push([s[1], d[1]]);
                }
            } else {
                new_difference.push(d);
            }
        }
        difference = new_difference;
    }
    difference
}

// TODO(tg): For the 2D case, this can be replaced with an interval tree.
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

fn to_lines_along_direction(rects: &Vec<Rect>, [n, t]: [usize; 2]) -> Vec<Line> {
    let mut edges = vec![];
    for (i, [v0, v1]) in rects.iter().copied().enumerate() {
        edges.push(Edge {
            rank: v0[n],
            rect: i,
            kind: EdgeKind::Enter,
            interval: [v0[t], v1[t]],
        });
        edges.push(Edge {
            rank: v1[n],
            rect: i,
            kind: EdgeKind::Leave,
            interval: [v0[t], v1[t]],
        });
    }

    edges.sort_by(|a, b| {
        if a.rank == b.rank {
            a.kind.cmp(&b.kind)
        } else {
            a.rank.partial_cmp(&b.rank).unwrap()
        }
    });

    let permute = |[x, y]: [f32; 2]| {
        let mut ret = [0f32; 2];
        ret[n] = x;
        ret[t] = y;
        ret
    };

    let mut ret = vec![];
    let mut pool = Pool::<(usize, Interval)>::new();
    for edge in edges {
        match edge.kind {
            EdgeKind::Enter => {
                let intervals = subtract_intervals(edge.interval, pool.values.iter().map(|f| f.1));
                for [lo, hi] in intervals {
                    ret.push([permute([edge.rank, lo]), permute([edge.rank, hi])]);
                }
                pool.push((edge.rect, edge.interval));
            }
            EdgeKind::Leave => {
                pool.drop(pool.values.iter().position(|f| edge.rect == f.0).unwrap());
                let intervals = subtract_intervals(edge.interval, pool.values.iter().map(|f| f.1));
                for [lo, hi] in intervals {
                    ret.push([permute([edge.rank, lo]), permute([edge.rank, hi])]);
                }
            }
        }
    }

    ret
}

pub fn to_lines(rects: Vec<Rect>) -> Vec<Line> {
    let mut ret = vec![];
    ret.extend(to_lines_along_direction(&rects, [0, 1]));
    ret.extend(to_lines_along_direction(&rects, [1, 0]));
    ret
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_to_lines() {
        let rects = vec![[[1.0, 2.0], [4.0, 5.0]]];
        let lines = to_lines(rects);

        // line 0
        assert_eq!(lines[0][0], [1.0, 2.0]);
        assert_eq!(lines[0][1], [1.0, 5.0]);

        // line 1
        assert_eq!(lines[1][0], [4.0, 2.0]);
        assert_eq!(lines[1][1], [4.0, 5.0]);

        // line 2
        assert_eq!(lines[2][0], [1.0, 2.0]);
        assert_eq!(lines[2][1], [4.0, 2.0]);

        // line 3
        assert_eq!(lines[3][0], [1.0, 5.0]);
        assert_eq!(lines[3][1], [4.0, 5.0]);
    }
}
