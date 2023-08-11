pub fn march<F>(src: [f32; 3], dir: [f32; 3], f: &mut F)
where
    F: FnMut([isize; 3], f32) -> bool,
{
    let [x, y, z] = src;
    let [r, s, t] = dir;

    // The signs of the ray direction vector components.
    let sx = if r.is_sign_negative() { -1 } else { 1 };
    let sy = if s.is_sign_negative() { -1 } else { 1 };
    let sz = if t.is_sign_negative() { -1 } else { 1 };

    // The ray distance traveled per unit in each direction.
    let norm = (r * r + s * s + t * t).sqrt();
    let dx = norm / r.abs();
    let dy = norm / s.abs();
    let dz = norm / t.abs();

    // The ray distance to the next intersection in each direction.
    let mut lx = if sx == 1 { x.ceil() - x } else { x - x.floor() } * dx;
    let mut ly = if sy == 1 { y.ceil() - y } else { y - y.floor() } * dy;
    let mut lz = if sz == 1 { z.ceil() - z } else { z - z.floor() } * dz;

    // Advance voxel indices that intersect with the given ray.
    let mut ix = x.floor() as isize;
    let mut iy = y.floor() as isize;
    let mut iz = z.floor() as isize;
    let mut distance = 0.0;
    while f([ix, iy, iz], distance) {
        if lx <= ly && lx <= lz {
            distance = lx;
            ix += sx;
            lx += dx;
        } else if ly <= lz {
            distance = ly;
            iy += sy;
            ly += dy;
        } else {
            distance = lz;
            iz += sz;
            lz += dz;
        }
    }
}
