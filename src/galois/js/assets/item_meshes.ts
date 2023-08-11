import * as color_palettes from "@/galois/assets/color_palettes";
import * as l from "@/galois/lang";

export interface ItemMeshProperties {
  name: string;
  baseName?: string;
  voxPath: string;
  colorPalette?: color_palettes.ColorDescriptor<color_palettes.PaletteKey>;
  attachmentTransform?: l.AffineTransformLike;
  iconSettings: l.IconSettingsLike;
}

// A place for putting a library of named affine transforms that can
// be re-used throughout the items.
export const namedAffineTransforms = l.LoadNamedAffineTransformsFromJSON(
  "item_meshes/transforms.json"
);

export function loadVox<P extends color_palettes.PaletteKey>(
  path: string,
  colorPalette?: color_palettes.ColorDescriptor<P>
) {
  let vox = l.LoadVox(path);
  if (colorPalette) {
    vox = l.ReplacePaletteEntries(
      ...color_palettes.paletteReplaceRange(colorPalette.paletteId),
      color_palettes.getColorEntry(colorPalette),
      vox
    );
  }
  return vox;
}

export function voxFromProperty(def: ItemMeshProperties) {
  return loadVox(def.voxPath, def.colorPalette);
}

// Transform from MagicaVoxel coordinates to Biomes coordinates.
const voxToBiomesTransform = l.AffineFromList([
  l.AffineFromAxisRotation([0, 1, 0], 180),
  l.AffineFromAxisRotation([1, 0, 0], -90),
]);

export function itemMeshFromProperty(def: ItemMeshProperties) {
  const vox = voxFromProperty(def);

  let gltf = l.ToGLTF(vox);

  // Initially our model is in MagicaVoxel vox coordinates. Transform it to
  // biomes coordinates where we apply our transformation. Then, transform it
  // into the model's animated pose space coordinates.
  const attachmentTransform = l.AffineFromList(
    def.attachmentTransform ? [def.attachmentTransform] : []
  );
  gltf = l.TransformGLTF(gltf, voxToBiomesTransform);

  return l.ToItemMesh(l.ToGLB(gltf), attachmentTransform);
}
