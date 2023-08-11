import { EditCharacterColorPanel } from "@/client/components/character/EditCharacterColorPanel";
import { EditCharacterHairPanel } from "@/client/components/character/EditCharacterHairPanel";
import { EditCharacterHeadShapePanel } from "@/client/components/character/EditCharacterHeadShapePanel";
import { DialogButton } from "@/client/components/system/DialogButton";
import { SegmentedControl } from "@/client/components/system/SegmentedControl";
import { colorEntries } from "@/shared/asset_defs/color_palettes";
import { getBiscuits } from "@/shared/bikkie/active";
import { bikkie } from "@/shared/bikkie/schema/biomes";
import type {
  Appearance,
  Item,
  ReadonlyAppearance,
} from "@/shared/ecs/gen/types";
import { anItem } from "@/shared/game/item";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { sample } from "lodash";
import { useEffect, useRef, useState } from "react";

export const EditCharacterColorSelector: React.FunctionComponent<{
  previewAppearance: ReadonlyAppearance;
  setPreviewAppearance: (x: (old: Appearance) => Appearance) => void;
  previewHair?: Item;
  setPreviewHair: (x: Item | undefined) => void;
  showHeadShape?: boolean;
  showShuffleOption?: boolean;
}> = ({
  previewAppearance,
  setPreviewAppearance,
  previewHair,
  setPreviewHair,
  showHeadShape = false,
  showShuffleOption = true,
}) => {
  // Used to ensure that the view doesn't shrink in size when switching between tabs.
  const [minHeight, setMinHeight] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const colorFeatures = ["Skin", "Eyes", "Hair", "Hair Color"];
  if (showHeadShape) {
    colorFeatures.push("Head");
  }
  const showHeadSelector = showHeadShape && selectedIndex == 4;
  const [skinColor, hairColor, hairType, eyeColor] = [
    previewAppearance.skin_color_id,
    previewAppearance.hair_color_id,
    previewHair?.id ?? INVALID_BIOMES_ID,
    previewAppearance.eye_color_id,
  ];
  const skinColors = colorEntries("color_palettes/skin_colors");
  const eyeColors = colorEntries("color_palettes/eye_colors");
  const hairColors = colorEntries("color_palettes/hair_colors");
  const hairTypes = getBiscuits(bikkie.schema.items.wearables.hair).map(
    ({ id }) => id
  );

  useEffect(() => {
    const height = sectionRef.current?.clientHeight;
    if (height) {
      setMinHeight(Math.max(height, minHeight));
    }
  }, [sectionRef.current]);

  function onShuffleColor() {
    const newSkinColor =
      selectedIndex !== 0 ? skinColor : sample(skinColors)!.id;
    const newEyeColor = selectedIndex !== 1 ? eyeColor : sample(eyeColors)!.id;
    const newHairType = selectedIndex !== 2 ? hairType : sample(hairTypes)!;
    const newHairColor =
      selectedIndex !== 3 ? hairColor : sample(hairColors)!.id;

    setPreviewAppearance((x) => ({
      ...x,
      ...{
        eye_color_id: newEyeColor,
        hair_color_id: newHairColor,
        skin_color_id: newSkinColor,
      },
    }));
    setPreviewHair(anItem(newHairType));
  }

  return (
    <>
      <section>
        <label>&nbsp;</label>
        <SegmentedControl
          onClick={(index) => {
            setSelectedIndex(index);
          }}
          items={colorFeatures}
        />
      </section>

      <section style={{ minHeight }} ref={sectionRef}>
        {showShuffleOption && (
          <label className="flex">
            <div className="flex-grow">{`Edit ${colorFeatures[selectedIndex]}`}</div>
            <DialogButton
              size="small"
              extraClassNames="btn-inline w-max shrink-0 aspect-auto"
              onClick={() => onShuffleColor()}
            >
              🎲 Shuffle
            </DialogButton>
          </label>
        )}
        {selectedIndex == 0 && (
          <EditCharacterColorPanel
            palette="color_palettes/skin_colors"
            selectedId={skinColor}
            onSelect={(newId) =>
              setPreviewAppearance((x) => ({
                ...x,
                ...{ skin_color_id: newId },
              }))
            }
          />
        )}

        {selectedIndex == 1 && (
          <EditCharacterColorPanel
            selectedId={eyeColor}
            palette="color_palettes/eye_colors"
            onSelect={(newId) =>
              setPreviewAppearance((x) => ({
                ...x,
                ...{ eye_color_id: newId },
              }))
            }
          />
        )}

        {selectedIndex == 2 && (
          <EditCharacterHairPanel
            onSelect={(itemId) => {
              setPreviewHair(itemId ? anItem(itemId) : undefined);
            }}
            selectedId={previewHair?.id ?? INVALID_BIOMES_ID}
          />
        )}

        {selectedIndex == 3 && (
          <EditCharacterColorPanel
            selectedId={hairColor}
            palette="color_palettes/hair_colors"
            onSelect={(newId) =>
              setPreviewAppearance((x) => ({
                ...x,
                ...{ hair_color_id: newId },
              }))
            }
          />
        )}
        {showHeadSelector && (
          <EditCharacterHeadShapePanel
            selectedId={previewAppearance.head_id}
            previewAppearance={previewAppearance}
            showLabel={false}
            onSelect={(newId) => {
              setPreviewAppearance((x) => ({
                ...x,
                ...{ head_id: newId },
              }));
            }}
          />
        )}
      </section>
    </>
  );
};
