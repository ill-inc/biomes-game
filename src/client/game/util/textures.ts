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
  ret.flipY = flip;
  ret.format = THREE.RGBAFormat;
  ret.internalFormat = "SRGB8_ALPHA8";
  ret.magFilter = THREE.NearestFilter;
  ret.minFilter = THREE.LinearFilter;
  ret.type = THREE.UnsignedByteType;
  ret.wrapS = THREE.RepeatWrapping;
  ret.wrapT = THREE.RepeatWrapping;
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
  ret.generateMipmaps = true;
  ret.internalFormat = srgb ? "SRGB8_ALPHA8" : "RGBA8";
  ret.magFilter = THREE.NearestFilter;
  ret.minFilter = THREE.LinearFilter;
  ret.type = THREE.UnsignedByteType;
  ret.wrapS = THREE.ClampToEdgeWrapping;
  ret.wrapT = THREE.ClampToEdgeWrapping;
  ret.needsUpdate = true;
  return ret;
}

export function makeAlphaMap(data: Uint8Array, w: number, h: number) {
  const ret = new THREE.DataTexture(data, w, h);
  ret.format = THREE.RedFormat;
  ret.generateMipmaps = false;
  ret.internalFormat = "R8";
  ret.magFilter = THREE.NearestFilter;
  ret.minFilter = THREE.LinearFilter;
  ret.type = THREE.UnsignedByteType;
  ret.wrapS = THREE.ClampToEdgeWrapping;
  ret.wrapT = THREE.ClampToEdgeWrapping;
  ret.needsUpdate = true;
  return ret;
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
