import type { PaletteOption } from "@/galois/assets/color_palettes";
import { colorPaletteDefs } from "@/galois/assets/color_palettes";

import {
  animatedcharacterMeshFromWearables,
  characterAnimationsGltf,
} from "@/galois/assets/wearables";
import { GLTFComponent } from "@/galois/components/GLTFComponent";
import {
  ReactDataLoadingOrError,
  dataIsError,
  renderError,
} from "@/galois/components/helpers/DataLoadingOrError";
import { ReloadCountContext } from "@/galois/components/helpers/ReloadButton";
import type { GLBData, GLTFData } from "@/galois/interface/types/data";
import type { BuildAssetFn } from "@/galois/server/interface";
import { Select } from "antd";
import { useContext, useState } from "react";

export function CharacterContent({
  buildAssetFn,
}: {
  buildAssetFn: BuildAssetFn;
}) {
  const [skinColor, setSkinColor] =
    useState<PaletteOption<"color_palettes/skin_colors">>("skin_color_3");
  const [eyeColor, setEyeColor] =
    useState<PaletteOption<"color_palettes/eye_colors">>("eye_color_0");
  const [hairColor, setHairColor] =
    useState<PaletteOption<"color_palettes/hair_colors">>("hair_color_8");
  const { reloadCount } = useContext(ReloadCountContext);

  // Create the states used to track the loading of both the main character
  // GLTF asset and the attachable item asset as well.
  const characterAnimationsAssetDataLoader = new ReactDataLoadingOrError(
    buildAssetFn,
    [reloadCount]
  );
  const characterMeshAssetDataLoader = new ReactDataLoadingOrError(
    buildAssetFn,
    [reloadCount, skinColor, eyeColor, hairColor]
  );
  const characterAnimationsAssetData =
    characterAnimationsAssetDataLoader.loadAsset(characterAnimationsGltf);
  // Load in the character mesh asset data.
  const characterMeshAssetData = characterMeshAssetDataLoader.loadAsset(
    animatedcharacterMeshFromWearables({
      wearableDescriptors: [],
      skinColorId: skinColor,
      eyeColorId: eyeColor,
      hairColorId: hairColor,
    })
  );

  const contentPage = (() => {
    // Check for errors during asset loading, and if so just dump the error.
    if (dataIsError(characterAnimationsAssetData)) {
      return renderError(characterAnimationsAssetData);
    }
    if (dataIsError(characterMeshAssetData)) {
      return renderError(characterMeshAssetData);
    }

    // Once everything's loaded, pass the data down and let GLTFComponent do
    // the rest.
    if (characterMeshAssetData && characterAnimationsAssetData) {
      return (
        <GLTFComponent
          data={getGLTFOrGLBData(characterMeshAssetData)}
          animationGltf={getGLTFOrGLBData(characterAnimationsAssetData)}
        />
      );
    } else {
      return <div>Loading...</div>;
    }
  })();

  return (
    <div className="character">
      <div className="character-options ui-overlay">
        <span>Skin color</span>
        <Select
          showSearch
          placeholder="Choose skin color..."
          optionFilterProp="children"
          onSelect={(value: PaletteOption<"color_palettes/skin_colors">) => {
            setSkinColor(value);
          }}
        >
          {colorPaletteDefs["color_palettes/skin_colors"].paletteEntries.map(
            (x) => (
              <Select.Option key={x}>{x}</Select.Option>
            )
          )}
        </Select>
        <span>Eye color</span>
        <Select
          showSearch
          placeholder="Choose eye color..."
          optionFilterProp="children"
          onSelect={(value: PaletteOption<"color_palettes/eye_colors">) => {
            setEyeColor(value);
          }}
        >
          {colorPaletteDefs["color_palettes/eye_colors"].paletteEntries.map(
            (x) => (
              <Select.Option key={x}>{x}</Select.Option>
            )
          )}
        </Select>
        <span>Hair color</span>
        <Select
          showSearch
          placeholder="Choose hair color..."
          optionFilterProp="children"
          onSelect={(value: PaletteOption<"color_palettes/hair_colors">) => {
            setHairColor(value);
          }}
        >
          {colorPaletteDefs["color_palettes/hair_colors"].paletteEntries.map(
            (x) => (
              <Select.Option key={x}>{x}</Select.Option>
            )
          )}
        </Select>
      </div>
      {contentPage}
    </div>
  );
}

function getGLTFOrGLBData(assetData: GLTFData | GLBData) {
  switch (assetData.kind) {
    case "GLTF":
      return assetData.data;
    case "GLB":
      return Uint8Array.from(atob(assetData.data), (c) => c.charCodeAt(0))
        .buffer;
  }
}
