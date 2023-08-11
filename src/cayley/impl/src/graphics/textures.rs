use image::{
    DynamicImage::{ImageLuma8, ImageRgb8, ImageRgba8},
    ImageBuffer, Luma, Rgb, Rgba,
};
use std::convert::TryFrom;
use std::io::Cursor;

use crate::arrays::Array;

pub fn decode_img(bytes: &[u8]) -> Array<u8, 3> {
    let img = image::io::Reader::new(Cursor::new(bytes))
        .with_guessed_format()
        .unwrap()
        .decode()
        .unwrap();

    let w = usize::try_from(img.width()).unwrap();
    let h = usize::try_from(img.height()).unwrap();

    match img {
        ImageLuma8(data) => Array::from_vec([h, w, 1], data.into_raw()),
        ImageRgb8(data) => Array::from_vec([h, w, 3], data.into_raw()),
        ImageRgba8(data) => Array::from_vec([h, w, 4], data.into_raw()),
        _ => panic!("Unknown pixel format"),
    }
}

pub fn encode_png(pixels: Array<u8, 3>) -> Vec<u8> {
    let mut out: Vec<u8> = Vec::new();
    let [h, w, c] = pixels.shape().map(|d| u32::try_from(d).unwrap());
    match c {
        1 => ImageBuffer::<Luma<u8>, _>::from_vec(w, h, pixels.to_vec())
            .unwrap()
            .write_to(&mut Cursor::new(&mut out), image::ImageOutputFormat::Png)
            .unwrap(),
        3 => ImageBuffer::<Rgb<u8>, _>::from_vec(w, h, pixels.to_vec())
            .unwrap()
            .write_to(&mut Cursor::new(&mut out), image::ImageOutputFormat::Png)
            .unwrap(),
        4 => ImageBuffer::<Rgba<u8>, _>::from_vec(w, h, pixels.to_vec())
            .unwrap()
            .write_to(&mut Cursor::new(&mut out), image::ImageOutputFormat::Png)
            .unwrap(),
        _ => panic!("Unsupported number of pixel channels"),
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode_and_decode() {
        let src = Array::<u8, 3>::from_vec([2, 2, 1], vec![100, 255, 0, 1]);
        let dst = decode_img(&encode_png(src));
        assert_eq!(dst[[0, 0, 0]], 100);
        assert_eq!(dst[[0, 1, 0]], 255);
        assert_eq!(dst[[1, 0, 0]], 0);
        assert_eq!(dst[[1, 1, 0]], 1);
    }
}
