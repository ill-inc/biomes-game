use rand::Rng;
use rand::{distributions::Uniform, thread_rng};

use crate::{arrays::Array, graphics::rays::march};
use std::cmp::{max, min};

fn quantize(intensity: f32) -> u8 {
    (255.0 * intensity) as u8
}

fn unquantize(intensity: u8) -> f32 {
    intensity as f32 / 255.0
}

fn clip(bounds: [usize; 2], src: [usize; 2], offset: [isize; 2]) -> [usize; 2] {
    let [h, w] = bounds.map(|b| isize::try_from(b).unwrap());
    return [
        max(0, min(h - 1, src[0] as isize + offset[0])) as usize,
        max(0, min(w - 1, src[1] as isize + offset[1])) as usize,
    ];
}

fn lerp(v0: f32, v1: f32, t: f32) -> f32 {
    v0 + t * (v1 - v0)
}

fn bilerp(v00: f32, v10: f32, v11: f32, v01: f32, [u, v]: [f32; 2]) -> f32 {
    lerp(lerp(v00, v10, u), lerp(v01, v11, u), v)
}

pub fn to_ao(heights: Array<i32, 2>) -> Array<u8, 3> {
    fn blend(samples: [bool; 4]) -> u8 {
        let mut ret = 0.0;
        for occlusive in samples {
            if occlusive {
                ret += 0.25;
            }
        }
        quantize(1.0 - ret)
    }

    let [h, w] = heights.shape();
    let mut ret = Array::fill([h, w, 4], 0);
    for y in 0..h {
        for x in 0..w {
            let height = heights[[y, x]];
            let sample = |dx, dy| heights[clip([h, w], [y, x], [dy, dx])] == height + 1;
            ret[[y, x, 0]] = blend([sample(-1, -1), sample(0, -1), sample(0, 0), sample(-1, 0)]);
            ret[[y, x, 1]] = blend([sample(0, -1), sample(1, -1), sample(1, 0), sample(0, 0)]);
            ret[[y, x, 2]] = blend([sample(0, 0), sample(1, 0), sample(1, 1), sample(0, 1)]);
            ret[[y, x, 3]] = blend([sample(-1, 0), sample(0, 0), sample(0, 1), sample(-1, 1)]);
        }
    }
    ret
}

fn random_vec(scale: f32) -> [f32; 3] {
    let mut rng = thread_rng();
    let distro = Uniform::new(-scale, scale);
    [rng.sample(distro), rng.sample(distro), rng.sample(distro)]
}

pub fn to_shadows(
    heights: Array<i32, 2>,
    light_dir: [f32; 3],
    jitter_intensity: f32,
    sample_distance: f32,
    sample_count: usize,
) -> Array<u8, 3> {
    fn in_shadow(heights: &Array<i32, 2>, src: [f32; 3], dir: [f32; 3], distance: f32) -> bool {
        let mut hit = false;
        let [h, w] = heights.shape().map(|b| isize::try_from(b).unwrap());
        march(src, dir, &mut |[x, y, z], d| {
            if x < 0 || z < 0 || x >= w || z >= h {
                return false;
            } else if heights[[z as usize, x as usize]] == y as i32 {
                hit = true;
                return false;
            }
            d < distance
        });
        hit
    }

    // Create a LUT of random jitters.
    let mut jitters = Vec::new();
    for _ in 0..sample_count {
        jitters.push(random_vec(jitter_intensity));
    }

    // Cast several rays for each vertex to compute their shadow density.
    let [h, w] = heights.shape();
    let mut ret = Array::fill([h, w, 4], 0);
    for y in 0..h {
        for x in 0..w {
            let src = [x as f32, heights[[y, x]] as f32 + 1.5, y as f32];
            let sample = |dx, dz| {
                let mut ret = 0.0;
                for jitter in jitters.iter() {
                    let pos = [src[0] + dx, src[1], src[2] + dz];
                    let dir = [
                        light_dir[0] + jitter[0],
                        light_dir[1] + jitter[1],
                        light_dir[2] + jitter[2],
                    ];
                    if in_shadow(&heights, pos, dir, sample_distance) {
                        ret += 1.0;
                    }
                }
                quantize(1.0 - ret / sample_count as f32)
            };
            ret[[y, x, 0]] = sample(0.25, 0.25);
            ret[[y, x, 1]] = sample(0.75, 0.25);
            ret[[y, x, 2]] = sample(0.75, 0.75);
            ret[[y, x, 3]] = sample(0.25, 0.75);
        }
    }
    ret
}

pub fn render_alpha(alpha: Array<u8, 3>, dpi: usize) -> Array<u8, 3> {
    let [h, w, _] = alpha.shape();
    let mut ret = Array::fill([dpi * h, dpi * w, 1], 0);
    for y in 0..h {
        for x in 0..w {
            let v00 = unquantize(alpha[[y, x, 0]]);
            let v10 = unquantize(alpha[[y, x, 1]]);
            let v11 = unquantize(alpha[[y, x, 2]]);
            let v01 = unquantize(alpha[[y, x, 3]]);
            let scale = 1.0 / dpi as f32;
            for j in 0..dpi {
                for i in 0..dpi {
                    let u = scale * (i as f32 + 0.5);
                    let v = scale * (j as f32 + 0.5);
                    let a = quantize(bilerp(v00, v10, v11, v01, [u, v]));
                    ret[[dpi * y + j, dpi * x + i, 0]] = a;
                }
            }
        }
    }
    ret
}
