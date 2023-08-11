import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { getCraftingStationNameForBlueprint } from "@/client/game/helpers/blueprint";
import type { BlueprintOverlay } from "@/client/game/resources/overlays";
import {
  isomorphismsEquivalent,
  shapesEquivalent,
} from "@/shared/asset_defs/shapes";
import { getTerrainName, safeGetTerrainId } from "@/shared/asset_defs/terrain";
import { BikkieIds } from "@/shared/bikkie/ids";
import { terrainIdToBlock } from "@/shared/bikkie/terrain";
import {
  blueprintTerrainMatch,
  getTerrainTypeName,
} from "@/shared/game/blueprint";
import { determineTakePattern } from "@/shared/game/inventory";
import { anItem } from "@/shared/game/item";
import {
  countOf,
  createBag,
  shapeIdForTool,
  toolForShapeId,
} from "@/shared/game/items";
import type { BiomesId } from "@/shared/ids";
import { article } from "@/shared/util/text";
import { ok } from "assert";
import { startCase } from "lodash";
import { useEffect, useState } from "react";
import checkmark from "/public/hud/icon-check-12.png";

export const BlueprintOverlayComponent: React.FunctionComponent<{
  overlay: BlueprintOverlay;
}> = ({ overlay }) => {
  const { reactResources, userId } = useClientContext();
  const [label, setLabel] = useState<string | JSX.Element>("");
  const [subLabel, setSubLabel] = useState("");
  const [selection, inventory] = reactResources.useAll(
    ["/hotbar/selection"],
    ["/ecs/c/inventory", userId]
  );

  const yourOrA = (id: BiomesId) => {
    return !!determineTakePattern(
      { inventory },
      createBag(countOf(anItem(id))),
      { respectPayload: false }
    )
      ? "your"
      : "a";
  };

  useEffect(() => {
    if (overlay.completed) {
      const wandName = anItem(BikkieIds.wand).displayName;
      const stationName =
        getCraftingStationNameForBlueprint(reactResources, overlay.entityId) ??
        "Crafting Station";
      setLabel(
        <>
          Use {yourOrA(BikkieIds.wand)}{" "}
          <span className="yellow">{wandName}</span> to finish the {stationName}
        </>
      );
      setSubLabel("");
      return;
    }

    const { requiredItem, voxelPos, cursorItem } = overlay;
    if (!requiredItem || !voxelPos) {
      setLabel("");
      setSubLabel("");
      return;
    }
    ok(requiredItem.kind === "terrain");

    if (cursorItem?.kind === "terrain") {
      if (
        !isomorphismsEquivalent(
          cursorItem.isomorphism ?? 0,
          requiredItem.isomorphism ?? 0
        )
      ) {
        const shapeId = (requiredItem.isomorphism ?? 0) >> 6;
        const toolItem = toolForShapeId(shapeId);
        let requiredToolName = toolItem?.displayName;
        // If the tool starts with "wooden", just remove the prefix
        if (requiredToolName?.startsWith("Wooden")) {
          requiredToolName = requiredToolName.slice(6);
        }
        const holdingCorrectTool =
          toolItem && shapeIdForTool(selection.item) === shapeId;
        if (
          !shapesEquivalent(
            cursorItem.isomorphism ?? 0,
            requiredItem.isomorphism ?? 0
          )
        ) {
          setLabel(
            <>
              Use {holdingCorrectTool ? "the" : "a"}{" "}
              <span className="yellow">{requiredToolName}</span> on the
              highlighted face to shape this block
            </>
          );
        } else {
          setLabel(
            <>
              Use the <span className="yellow">{requiredToolName}</span> again
              on the highlighted face to flip the block
            </>
          );
        }
        if (selection.item && !holdingCorrectTool) {
          const selectionName = selection.item.displayName;
          setSubLabel(
            `You're holding ${article(selectionName)} ${startCase(
              selectionName
            )}`
          );
        } else {
          setSubLabel("");
        }
      } else {
        const requiredName = getTerrainName(cursorItem.terrainId);
        setLabel(
          <>
            <img className="checkmark" src={checkmark.src} />
            &nbsp;&nbsp;
            <span className="white">{startCase(requiredName)}</span>
          </>
        );
        setSubLabel("");
      }
      return;
    }

    const terrainId = safeGetTerrainId(selection.item?.terrainName);
    const requiredName = terrainIdToBlock(requiredItem.terrainId)?.displayName;
    const requiredTypeName = anItem(requiredItem.blueprintId).isTemplate
      ? "block"
      : getTerrainTypeName(requiredItem.terrainId) ?? "block";

    if (
      terrainId &&
      blueprintTerrainMatch(
        requiredItem.blueprintId,
        terrainId,
        requiredItem.terrainId
      )
    ) {
      const selectionName = selection.item?.displayName;
      setLabel(
        <>
          Place <span className="yellow">{startCase(selectionName)}</span> here
        </>
      );
      setSubLabel("");
    } else {
      setLabel(
        <>
          Equip {requiredName !== requiredTypeName ? "any type of " : ""}
          <span className="yellow">{startCase(requiredTypeName)}</span> to place
          here
        </>
      );

      if (selection.item) {
        const selectionName = selection.item.displayName;
        setSubLabel(
          `You're holding ${
            !terrainId ? article(selectionName) : ""
          } ${startCase(selectionName)}`
        );
      } else {
        setSubLabel("");
      }
    }
  }, [selection, inventory, overlay]);

  return (
    <div className="inspect-overlay">
      <div className="inspect blueprint">
        <div className="instructions">{label}</div>
        <div className="secondary-gray">{subLabel}</div>
      </div>
    </div>
  );
};
