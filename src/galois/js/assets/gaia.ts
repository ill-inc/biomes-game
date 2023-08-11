import * as l from "@/galois/lang";

const waterChunkCoords: [number, number][] = [
  [0, 0],
  [-1, 0],
  [0, -1],
  [-1, -1],
];

const waterChunks: Record<string, l.Binary> = {};
for (const [x, z] of waterChunkCoords) {
  waterChunks[`gaia/water_${x}_${z}`] = l.ToBinary(
    `gaia/water_${x}_${z}.tensor`
  );
}

export function getAssets(): Record<string, l.Asset> {
  return {
    ...waterChunks,
  };
}
