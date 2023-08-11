import base64
import io
import math
from typing import Dict, List, Tuple, Union

import impl.types as t
import numpy as np
from impl.repo import open_file
from PIL import Image, ImageEnhance

TextureOrPixels = Union[t.Texture, np.ndarray]
Color = Union[Tuple[int, int, int], Tuple[int, int, int, int]]


def texture_to_array(texture: TextureOrPixels) -> np.ndarray:
    if isinstance(texture, t.Texture):
        return texture.data
    else:
        return texture


def build_atlas(images: List[TextureOrPixels]):
    images = [texture_to_array(image) for image in images]
    assert len(images) > 0
    assert len(set(img.shape for img in images)) == 1
    return t.TextureAtlas(
        data=np.stack(images, axis=0),
    )


def load_image(path: str, mode: str = "RGB"):
    with open_file(path, binary=True) as f:
        return t.Texture(data=np.array(Image.open(f).convert(mode)))


def load_image_from_bytes(data: bytes, mode: str = "RGB"):
    return t.Texture(np.array(Image.open(io.BytesIO(data)).convert(mode=mode)))


def load_image_from_base64(data: str, mode: str = "RGB"):
    return load_image_from_bytes(base64.b64decode(data), mode)


def to_image_data(texture: TextureOrPixels, format: str):
    pixels = texture_to_array(texture)
    with io.BytesIO() as output:
        Image.fromarray(pixels).save(output, format=format)
        return output.getvalue()


def pad_to_size(texture: TextureOrPixels, size: Tuple[int, int], color: Color):
    pixels = texture_to_array(texture)
    assert len(color) == pixels.shape[2]
    assert pixels.shape[1] <= size[0]
    assert pixels.shape[0] <= size[1]
    (w, h), c = size, len(color)
    pad_y0 = (h - pixels.shape[0]) // 2
    pad_y1 = pad_y0 + pixels.shape[0]
    pad_x0 = (w - pixels.shape[1]) // 2
    pad_x1 = pad_x0 + pixels.shape[1]
    out = np.zeros(shape=(h, w, c), dtype=np.uint8)
    out[...] = np.array(color)[np.newaxis, np.newaxis, :]
    out[pad_y0:pad_y1, pad_x0:pad_x1] = pixels
    return t.Texture(out)


def to_pil_image(texture: TextureOrPixels):
    return Image.fromarray(texture_to_array(texture))


def adjust_brightness(texture: TextureOrPixels, amount: float):
    img = to_pil_image(texture)
    img = ImageEnhance.Brightness(img).enhance(amount)
    return t.Texture(data=np.array(img))


def adjust_contrast(texture: TextureOrPixels, amount: float):
    img = to_pil_image(texture)
    img = ImageEnhance.Contrast(img).enhance(amount)
    return t.Texture(data=np.array(img))


def adjust_saturation(texture: TextureOrPixels, amount: float):
    img = to_pil_image(texture)
    img = ImageEnhance.Color(img).enhance(amount)
    return t.Texture(data=np.array(img))


def hue_shift(texture: TextureOrPixels, hue: float):
    data = texture_to_array(texture)
    rgb = data[..., 0:3]
    hsv = np.array(Image.fromarray(rgb, mode="RGB").convert("HSV"))
    hsv[..., 0] = hue
    rgb = np.array(Image.fromarray(hsv, mode="HSV").convert("RGB"))
    return t.Texture(data=np.concatenate([rgb, data[..., 3:4]], axis=-1))


def flatten_atlas(atlas: t.TextureAtlas):
    # Pad the input array with zeros
    d = atlas.data.shape[0]
    k = int(math.sqrt(d - 1)) + 1
    data = np.pad(atlas.data, ((0, k * k - d), (0, 0), (0, 0), (0, 0)))

    # Compute the re-indexing arrays.
    d, h, w, c = data.shape
    index = np.arange(d * h * w * c)
    z = (index // (c * w)) % k + k * (index // (c * w * k * h))
    y = (index // (c * w * k)) % h
    x = (index // c) % w
    i = index % c

    out = data[z, y, x, i].flatten()
    return t.Texture(out.reshape(k * w, k * w, c))


def obj_to_cube_texture(obj: Dict[str, str], mode: str = "RGB"):
    return t.CubeTexture(
        x_neg=load_image_from_base64(obj["x_neg"], mode),
        x_pos=load_image_from_base64(obj["x_pos"], mode),
        y_neg=load_image_from_base64(obj["y_neg"], mode),
        y_pos=load_image_from_base64(obj["y_pos"], mode),
        z_neg=load_image_from_base64(obj["z_neg"], mode),
        z_pos=load_image_from_base64(obj["z_pos"], mode),
    )


def cube_texture_to_rgba_array(color: t.CubeTexture):
    swap_dim = lambda x: np.transpose(x, (1, 0, 2))
    dim = color.x_neg.data.shape[0]

    out = np.full((dim, dim, dim, 4), 255, dtype=np.uint8)
    out[:, :, :, :] = swap_dim(color.x_neg.data)[::-1, :]
    out[:, :, -1, :] = swap_dim(color.x_pos.data)[::-1, :]
    out[:, 0, :, :] = color.y_neg.data[::-1, ::-1]
    out[:, -1, :, :] = color.y_pos.data[::-1, ::-1]
    out[0, :, :, :] = color.z_neg.data
    out[-1, :, :, :] = color.z_pos.data
    return out
