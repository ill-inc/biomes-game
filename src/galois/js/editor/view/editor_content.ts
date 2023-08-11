import { matchingAssets } from "@/galois//assets";
import { colorPaletteDefs } from "@/galois/assets/color_palettes";

import { animatedGltfEntries } from "@/galois/assets/npcs";
import { placeableGltfEntries } from "@/galois/assets/placeables";
import { animatedcharacterMeshFromWearables } from "@/galois/assets/wearables";
import { AssetView } from "@/galois/components/AssetView";
import type { AssetServerConnection } from "@/galois/editor/view/api";
import { createBlocksAssets } from "@/galois/editor/view/components/blocks";
import { CharacterContent } from "@/galois/editor/view/components/content/Character";
import { trieSplitBySlash } from "@/galois/editor/view/trie_split";
import type * as l from "@/galois/lang";
import type { BuildAssetFn } from "@/galois/server/interface";

// This file contains logic on determining the set of content that will be
// visible in the editor. The results are returned in the form of a tree,
// to hint to the UI on how to display the assets in an organized way.

export type ContentPage = ({ build }: { build: BuildAssetFn }) => JSX.Element;
type PathContentPagePair = [string, ContentPage];

function assetViewOfAsset(asset: l.Asset): ContentPage {
  return ({ build }: { build: BuildAssetFn }) =>
    AssetView({ asset: asset, buildAssetFn: build });
}

const iconEntries = matchingAssets(new RegExp("icons/.*")).map(
  ([assetPath, asset]) =>
    [
      assetPath.substring("icons/".length),
      assetViewOfAsset(asset),
    ] as PathContentPagePair
);

const wearableEditorPreviewAssetEntries: PathContentPagePair[] = [
  ...colorPaletteDefs["color_palettes/skin_colors"].paletteEntries.map((x) => ({
    path: `skin_color/${x}`,
    wearableParams: { wearableDescriptors: [], skinColorId: x },
  })),
  ...colorPaletteDefs["color_palettes/eye_colors"].paletteEntries.map((x) => ({
    path: `eye_color/${x}`,
    wearableParams: {
      wearableDescriptors: [],
      eyeColorId: x,
    },
  })),
  ...colorPaletteDefs["color_palettes/hair_colors"].paletteEntries.map((x) => ({
    path: `hair_color/${x}`,
    wearableParams: {
      wearableDescriptors: [
        { assetPath: "wearables/hair/curly_long" },
        { assetPath: "wearables/face/beard" },
      ],
      hairColorId: x,
    },
  })),
].map(
  ({ path, wearableParams }) =>
    [
      path,
      assetViewOfAsset(animatedcharacterMeshFromWearables(wearableParams)),
    ] as PathContentPagePair
);

const npcEditorPreviewAssetEntries: PathContentPagePair[] =
  animatedGltfEntries.map(([n, a]) => [n, assetViewOfAsset(a)]);

const placeableEditorPreviewAssetEntries: PathContentPagePair[] =
  placeableGltfEntries.map(([n, a]) => [n, assetViewOfAsset(a)]);

function characterContent(): ContentPage {
  return ({ build }: { build: BuildAssetFn }) =>
    CharacterContent({ buildAssetFn: build });
}

async function getBlockAssetEntries(
  assetServer: AssetServerConnection
): Promise<PathContentPagePair[]> {
  const textures = await assetServer.glob(/blocks\/textures\/[^\/]*\.png/);
  const sharedTextures = await assetServer.glob(
    /blocks\/textures\/shared\/[^\/.]*\.png/
  );
  return createBlocksAssets(textures, sharedTextures).map(([name, block]) => [
    name,
    assetViewOfAsset(block),
  ]);
}

export async function getEditorAssets(assetServer: AssetServerConnection) {
  return trieSplitBySlash([
    ["Blocks", await getBlockAssetEntries(assetServer)],
    ["Character View", characterContent()],
    ["Icons", iconEntries],
    ["NPCs", npcEditorPreviewAssetEntries],
    ["Placeables", placeableEditorPreviewAssetEntries],
    ["Wearables", wearableEditorPreviewAssetEntries],
  ]);
}
