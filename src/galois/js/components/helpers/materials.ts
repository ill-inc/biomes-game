import * as THREE from "three";

export function makeColorMap(
  data: Uint8Array,
  h: number,
  w: number,
  c: 3 | 4,
  flip = false
) {
  if (c === 3) {
    const mappedData = new Uint8Array((data.length * 4) / 3);
    // remap RGB to RGBA with alpha as 255
    let i = 0;
    let j = 0;
    for (let idx = 0; idx < data.length / 3; idx += 1) {
      mappedData[j++] = data[i++];
      mappedData[j++] = data[i++];
      mappedData[j++] = data[i++];
      mappedData[j++] = 255;
    }
    data = mappedData;
  }
  const ret = new THREE.DataTexture(data, w, h);
  ret.format = THREE.RGBAFormat;
  ret.internalFormat = "SRGB8_ALPHA8";
  ret.magFilter = THREE.NearestFilter;
  ret.minFilter = THREE.LinearFilter;
  ret.type = THREE.UnsignedByteType;
  ret.wrapS = THREE.RepeatWrapping;
  ret.wrapT = THREE.RepeatWrapping;
  ret.flipY = flip;
  ret.needsUpdate = true;
  return ret;
}

export function makeColorMapArray(
  data: Uint8Array,
  d: number,
  h: number,
  w: number,
  c: 3 | 4,
  srgb: boolean = true
) {
  // TODO: Mip-map generation is not supported for the SRGB8 format but is
  // supported for the SRGB8_ALPHA8 format. We thus only have mip-mapping
  // enabled for RGBA textures. We should add CPU-side generation of mip-maps
  // and update the code here to use these pre-computed mip-mapped textures.
  if (c === 3) {
    const mappedData = new Uint8Array((data.length * 4) / 3);
    // remap RGB to RGBA with alpha as 255
    let i = 0;
    let j = 0;
    for (let idx = 0; idx < data.length / 3; idx += 1) {
      mappedData[j++] = data[i++];
      mappedData[j++] = data[i++];
      mappedData[j++] = data[i++];
      mappedData[j++] = 255;
    }
    data = mappedData;
  }
  const ret = new THREE.DataArrayTexture(data, w, h, d);
  ret.format = THREE.RGBAFormat;
  ret.internalFormat = srgb ? "SRGB8_ALPHA8" : "RGBA8";
  ret.minFilter = THREE.LinearMipMapLinearFilter;
  ret.magFilter = THREE.NearestFilter;
  ret.generateMipmaps = true;
  ret.type = THREE.UnsignedByteType;
  ret.wrapS = THREE.ClampToEdgeWrapping;
  ret.wrapT = THREE.ClampToEdgeWrapping;
  ret.needsUpdate = true;
  return ret;
}

export function makeColorMapFromArray(
  data: Uint8Array,
  d: number,
  h: number,
  w: number,
  c: 3 | 4
) {
  const k = Math.ceil(Math.sqrt(d));
  const ret = new Uint8Array(k * k * w * h * c);
  for (let z = 0; z < d; z += 1) {
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const rx = w * (z % k) + x;
        const ry = h * Math.floor(z / k) + y;
        const ri = (rx + ry * k * w) * c;
        const di = (x + (y + z * h) * w) * c;
        ret[ri] = data[di];
        ret[ri + 1] = data[di + 1];
        ret[ri + 2] = data[di + 2];
      }
    }
  }
  return makeColorMap(ret, k * h, k * w, c);
}

export function makeBufferTexture(data: Uint32Array, h: number, w: number) {
  const ret = new THREE.DataTexture(data, w, h);
  ret.format = THREE.RedIntegerFormat;
  ret.internalFormat = "R32UI";
  ret.type = THREE.UnsignedIntType;
  ret.needsUpdate = true;
  return ret;
}

export function makeBufferTextureFromBase64(
  data: string,
  h: number,
  w: number
) {
  return makeBufferTexture(
    new Uint32Array(Uint8Array.from(atob(data), (c) => c.charCodeAt(0)).buffer),
    h,
    w
  );
}
