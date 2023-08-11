import { blockDefs } from "@/galois/assets/blocks";
import { glassDefs } from "@/galois/assets/glass";
import * as l from "@/galois/lang";

function toTexture(block: l.Block, side: l.DirLike, tile: "black" | "white") {
  if (tile === "black") {
    return l.ToPNG(
      l.FlipVertical(l.ToTexture(l.ToBlockSample(block, [0, 0, 0]), side))
    );
  } else {
    return l.ToPNG(
      l.FlipVertical(l.ToTexture(l.ToBlockSample(block, [1, 0, 0]), side))
    );
  }
}

function toMreaTexture(
  block: l.Block,
  side: l.DirLike,
  tile: "black" | "white"
) {
  if (tile === "black") {
    return l.ToPNG(
      l.FlipVertical(l.ToMreaTexture(l.ToBlockSample(block, [0, 0, 0]), side))
    );
  } else {
    return l.ToPNG(
      l.FlipVertical(l.ToMreaTexture(l.ToBlockSample(block, [1, 0, 0]), side))
    );
  }
}

const blockTextures: Record<string, l.Asset> = {};
function addBlocklikeTextures(
  defs: [string, l.GeneralNode<"Block"> | l.GeneralNode<"Glass">][],
  type: string
) {
  for (const [path, block] of defs) {
    if (l.isNode(block, "Block")) {
      const name = (suffix: string) => {
        return `textures/${type}/${path}_${suffix}`;
      };

      for (const t of ["black", "white"] as const) {
        blockTextures[name(`${t}_bottom`)] = toTexture(block, "y_neg", t);
        blockTextures[name(`${t}_side`)] = toTexture(block, "x_neg", t);
        blockTextures[name(`${t}_top`)] = toTexture(block, "y_pos", t);
      }
      for (const t of ["black", "white"] as const) {
        blockTextures[name(`${t}_mreabottom`)] = toMreaTexture(
          block,
          "y_neg",
          t
        );
        blockTextures[name(`${t}_mreaside`)] = toMreaTexture(block, "x_neg", t);
        blockTextures[name(`${t}_mreatop`)] = toMreaTexture(block, "y_pos", t);
      }
    }
  }
}

addBlocklikeTextures(Object.entries(blockDefs), "blocks");
addBlocklikeTextures(Object.entries(glassDefs), "glass");

const boundary = l.ToPNG(l.ImageRGBA("textures/boundary.png"));
const landClaimBoundary = l.ToPNG(
  l.ImageRGBA("textures/land_claim_boundary.png")
);

// Water textures.
const waterNormals = l.ToPNG(l.ImageRGBA("textures/water_normals.png"));
const waterDistortion = l.ToPNG(l.ImageRGBA("textures/water_distortion.png"));

export function getAssets(): Record<string, l.Asset> {
  return {
    ...blockTextures,
    "textures/boundary": boundary,
    "textures/land_claim_boundary": landClaimBoundary,
    "textures/water_distortion": waterDistortion,
    "textures/water_normals": waterNormals,
    "textures/white": l.ToPNG(l.ImageRGBA("textures/white.png")),
    "textures/protection_grid_experiment1": l.ToPNG(
      l.ImageRGBA("textures/protection_grid_experiment1.png")
    ),
    "textures/protection_grid_experiment2": l.ToPNG(
      l.ImageRGBA("textures/protection_grid_experiment2.png")
    ),
    "textures/protection_grid_experiment3": l.ToPNG(
      l.ImageRGBA("textures/protection_grid_experiment3.png")
    ),
    "textures/protection_grid_experiment4": l.ToPNG(
      l.ImageRGBA("textures/protection_grid_experiment4.png")
    ),
  };
}
