import * as l from "@/galois/lang";

function write(value: number, box: l.BoxLike) {
  return l.Write(l.EmptyWaterTensor(), l.BoxMask([box]), value);
}

function merge(terrain: l.WaterTensor[]): l.WaterTensor {
  if (terrain.length == 0) {
    return l.EmptyWaterTensor();
  } else {
    return l.Merge(terrain.shift()!, merge(terrain));
  }
}

// Define a scene consistenting of a slab of grass on dirt.
const waterTensor = merge([
  write(8, [
    [0, 0, 0],
    [14, 5, 14],
  ]),
  write(8, [
    [4, 4, 4],
    [7, 7, 7],
  ]),
  write(8, [
    [9, 4, 11],
    [13, 8, 14],
  ]),
]);

const waterSurface = l.ToSurfaceTensor(waterTensor);

// Generate a light tensor to use in the water mesh.
const waterLighting = l.ToLightingBuffer(
  waterSurface,
  l.EmptyBlockShapeTensor()
);

// Build a mesh of the water.
const waterMesh = l.ToMesh(waterSurface, waterLighting);

export function getAssets(): Record<string, l.Asset> {
  return {
    "debug/water_lighting": waterLighting,
    "debug/water_mesh": waterMesh,
    "debug/water_surface": waterSurface,
    "debug/water_tensor": waterTensor,
  };
}
