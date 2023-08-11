from typing import Tuple

import numpy as np
import numpy.typing as npt
from voxeloo import rays, spatial


def to_uint32(r, g, b, a):
    a = (
        ((r * 255).astype(np.uint32) << 24)
        | ((g * 255).astype(np.uint32) << 16)
        | ((b * 255).astype(np.uint32) << 8)
        | ((a * 255).astype(np.uint32) << 0)
    )
    return a


def normalize(x):
    lengths = np.sqrt(np.sum(x * x, axis=3))[:, :, :, np.newaxis]
    return np.divide(
        x,
        lengths,
        out=np.zeros_like(x),
        where=lengths != 0,
    )


def blur_radius(sigma):
    return int(sigma * 8)


def blur(x, sigma):
    window_radius = blur_radius(sigma)

    kernel = np.arange(-window_radius + 1, window_radius, 1)
    kernel = (
        1
        / (np.sqrt(2 * np.pi) * sigma)
        * np.exp(-(kernel ** 2) / (2.0 * sigma * sigma))
    )
    kernel = kernel / np.sum(kernel)
    blurred = x
    for i in range(3):
        blurred = np.apply_along_axis(
            lambda x: np.convolve(x, kernel, mode="same"), i, blurred
        )
    return blurred


def render_map(
    voxel_color_image: npt.NDArray,
    size: Tuple[int, int],
    src: Tuple[float, float, float],
    dir: Tuple[float, float, float],
    lighting_dir: Tuple[float, float, float],
    zoom: float,
    up: Tuple[float, float, float] = [0, 1, 0],
):
    BLUR_SIGMA = 0.5
    BLUR_WINDOW_RADIUS = blur_radius(BLUR_SIGMA)

    if voxel_color_image.dtype == np.uint8:
        voxel_color_image = voxel_color_image / 255.0

    # Blur the image to reduce artifacts around the discreteness of these
    # operations. Since we'll be bluring along all axes with the same kernel,
    # make sure they all have the same dimensions.
    DIM = max(
        int(BLUR_SIGMA * 64),
        voxel_color_image.shape[0] + BLUR_WINDOW_RADIUS * 2,
        voxel_color_image.shape[1] + BLUR_WINDOW_RADIUS * 2,
        voxel_color_image.shape[2] + BLUR_WINDOW_RADIUS * 2,
    )

    PAD_Z = (DIM - voxel_color_image.shape[0]) // 2
    PAD_Y = (DIM - voxel_color_image.shape[1]) // 2
    PAD_X = (DIM - voxel_color_image.shape[2]) // 2
    voxel_color_image = np.pad(
        voxel_color_image,
        (
            (PAD_Z, PAD_Z),
            (PAD_Y, PAD_Y),
            (PAD_X, PAD_X),
            (0, 0),
        ),
    )
    blurred_image = blur(voxel_color_image, BLUR_SIGMA)

    # Compute the normal field by taking the gradient of the alpha field.
    alpha = blurred_image[..., 3]
    grad = np.gradient(alpha)[::-1]
    dense_normals = -np.stack(grad, axis=-1)
    dense_normals = normalize(dense_normals)

    # Convert to a list of [x, y, z, c] values, where c is a uint32 representing
    # the rgba.
    rgba = to_uint32(
        blurred_image[..., 0],
        blurred_image[..., 1],
        blurred_image[..., 2],
        blurred_image[..., 3],
    )
    cm = spatial.ColorMap()
    z, y, x = np.where(blurred_image[..., 3] > 0)
    table = np.stack([x, y, z, rgba[z, y, x]], axis=-1).tolist()
    cm.update(table)

    # Adjust the position to account for the padding.
    src_after_padding = [src[0] + PAD_X, src[1] + PAD_Y, src[2] + PAD_Z]
    # Perform the ray-traced render.
    proj = rays.render_orthographic_color(
        cm=cm,
        normals=dense_normals,
        size=size,
        src=src_after_padding,
        dir=dir,
        lighting_dir=lighting_dir,
        up=up,
        far=1000.0,
        zoom=zoom,
        distance_capacity=0.5,
    )

    return (proj * 255).astype(np.uint8)
