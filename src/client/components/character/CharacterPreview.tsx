import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useCachedEntity } from "@/client/components/hooks/client_hooks";
import { useInventoryDraggerContext } from "@/client/components/inventory/InventoryDragger";
import { ThreeObjectPreview } from "@/client/components/ThreeObjectPreview";
import type { LoadedPlayerMesh } from "@/client/game/resources/player_mesh";
import { ecsWearablesToUrl } from "@/client/game/resources/player_mesh";
import type { PlayerAnimationName } from "@/client/game/util/player_animations";
import { playerSystem } from "@/client/game/util/player_animations";
import type { InventoryDragItem } from "@/client/util/drag_helpers";
import { useTimeout } from "@/client/util/hooks";
import type {
  ReadonlyAppearanceComponent,
  ReadonlyWearing,
} from "@/shared/ecs/gen/components";
import type { Appearance, ItemAssignment } from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";
import type { Variants } from "framer-motion";
import { AnimatePresence, motion } from "framer-motion";
import { isEqual } from "lodash";
import React, { useEffect, useRef, useState } from "react";
import { MathUtils, Spherical, Vector3 } from "three";

// Using the same PreviewSlot for two CharacterPreviews at the
// same time will lead to one CharacterPreview not loading.
// CharacterPreviews that are shown at the same time must have unique
// slots to work correctly.
// BiscuitId usage for head slots, though we should consider enumerating specific cases
// in the future.
export type PreviewSlot = string & {
  readonly "": unique symbol;
};

export function makePreviewSlot(typ: "humanoid_npc", id: BiomesId): PreviewSlot;
export function makePreviewSlot(typ: "dying", id: BiomesId): PreviewSlot;
export function makePreviewSlot(typ: "inventory", id: BiomesId): PreviewSlot;
export function makePreviewSlot(typ: "bikkie", id: BiomesId): PreviewSlot;
export function makePreviewSlot(typ: "appearencePreview"): PreviewSlot;
export function makePreviewSlot(typ: string, id?: BiomesId): PreviewSlot {
  return `${typ}:${id}` as PreviewSlot;
}

function useMaybeOOBWearingAndAppearence(
  biomesId: BiomesId
): [
  ReadonlyWearing | undefined,
  ReadonlyAppearanceComponent | undefined,
  boolean
] {
  const { reactResources } = useClientContext();
  const [wearing, appearance] = reactResources.useAll(
    ["/ecs/c/wearing", biomesId],
    ["/ecs/c/appearance_component", biomesId]
  );

  const oobVersion = useCachedEntity(biomesId);

  if (wearing || appearance) {
    return [wearing, appearance, true];
  }

  if (oobVersion) {
    return [oobVersion.wearing, oobVersion.appearance_component, true];
  }

  return [undefined, undefined, false];
}

export const CharacterPreview: React.FunctionComponent<{
  previewSlot: PreviewSlot;
  entityId?: BiomesId;
  appearanceOverride?: Appearance;
  wearableOverrides?: ItemAssignment;
  onMeshChange?: (mesh: LoadedPlayerMesh, renderer: ThreeObjectPreview) => void;
  onClick?: () => void;
  controlTarget?: Vector3;
  cameraPos?: Vector3;
  cameraFOV?: number;
  extraClassName?: string;
  controls?: boolean;
  animation?: PlayerAnimationName | null;
  animate?: boolean;
  canShowWearableHint?: boolean;
}> = ({
  previewSlot,
  entityId,
  appearanceOverride,
  wearableOverrides,
  onMeshChange,
  onClick,
  controlTarget,
  cameraPos,
  cameraFOV,
  extraClassName,
  controls = true,
  animation,
  animate = true,
  canShowWearableHint = false,
}) => {
  const { reactResources, resources, clientConfig, userId } =
    useClientContext();
  const previewRenderRef = useRef<ThreeObjectPreview>(null);
  const [clearedMinMountTime, setClearedMinMountTime] = useState(false);

  useTimeout(
    () => {
      setClearedMinMountTime(true);
    },
    50,
    []
  );

  // Default camera/controls
  controlTarget = controlTarget || new Vector3(0, 1, 0);
  cameraPos =
    cameraPos ||
    new Vector3().setFromSpherical(
      new Spherical(3, MathUtils.degToRad(70), MathUtils.degToRad(180))
    );

  // Combine local entity with appearance overrides
  const previewBiomesId = entityId || userId;
  const [wearing, appearance, hasEntity] =
    useMaybeOOBWearingAndAppearence(previewBiomesId);
  const previewAppearance = appearanceOverride ?? appearance?.appearance;
  const previewWearables = wearableOverrides ?? wearing?.items;

  // Reconcile the local context with the shared react resource used to generate
  // the mesh for our given slot
  const currentPreview = reactResources.use("/player/preview", previewSlot);
  let meshUpToDate = true;

  if (
    hasEntity &&
    (!isEqual(currentPreview.wearing, previewWearables) ||
      !isEqual(currentPreview.appearance, previewAppearance) ||
      currentPreview.userId !== previewBiomesId ||
      currentPreview.animationKey !== animation)
  ) {
    reactResources.set("/player/preview", previewSlot, {
      userId: previewBiomesId,
      appearance: previewAppearance,
      wearing: previewWearables,
      animationKey: animation,
    });
    meshUpToDate = false;
  }

  // Every separate WebGL context needs their own resource, since
  // resources can't be shared between separate contexts
  const fulfilledMesh = reactResources.useResolved(
    "/scene/player/mesh_preview",
    previewSlot
  );

  useEffect(() => {
    if (!fulfilledMesh) {
      return;
    }
    playerSystem.applySingleActionToState(
      {
        layers: { arms: "apply", notArms: "apply" },
        state: { repeat: { kind: "repeat" }, startTime: 0 },
        weights: playerSystem.singleAnimationWeight("idle", 1),
      },
      fulfilledMesh.animationSystemState
    );
  }, [fulfilledMesh]);

  // Hacky stuff, when a wearable is equipped we want to hash the player's mesh
  useEffect(() => {
    if (onMeshChange && fulfilledMesh && previewRenderRef.current) {
      onMeshChange(fulfilledMesh, previewRenderRef.current);
    }
  }, [fulfilledMesh]);

  const isLoading =
    !meshUpToDate ||
    !hasEntity ||
    !fulfilledMesh ||
    fulfilledMesh.url !==
      ecsWearablesToUrl(previewWearables, previewAppearance);

  const containerVariant: Variants = {
    default: { filter: "blur(0) grayscale(0)" },
    loading: {
      filter: "blur(20px) grayscale(1)",
    },
    hover: { backgroundColor: "rgba(255, 255, 255, 0.05)" },
  };

  const helperTextVariant: Variants = {
    default: { opacity: 0, y: "100%" },
    hover: { opacity: 1, y: "0%" },
  };

  const { dragItem } = useInventoryDraggerContext();
  const inventoryDragItem = dragItem as InventoryDragItem;

  const isHoldingWearable =
    inventoryDragItem &&
    inventoryDragItem.slot &&
    inventoryDragItem.slot?.item.isWearable;

  return (
    <motion.div
      className={`avatar-viewer ${extraClassName ?? ""} ${
        isLoading ? "loading" : ""
      }`}
      onClick={onClick}
      initial={"default"}
      animate={clearedMinMountTime && isLoading ? "loading" : "default"}
      variants={containerVariant}
      whileHover={isHoldingWearable ? "hover" : "'"}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      {fulfilledMesh?.three && (
        <>
          <ThreeObjectPreview
            ref={previewRenderRef}
            object={fulfilledMesh.three}
            autoRotate={false}
            animationMixer={fulfilledMesh.animationMixer}
            controls={controls}
            animate={animate}
            /* keep this in sync with SelfInventoryScreen.tsx for avatar generation*/
            controlTarget={controlTarget}
            cameraPos={cameraPos}
            cameraFOV={cameraFOV}
            resources={resources}
            clientConfig={clientConfig}
          />

          {canShowWearableHint && (
            <AnimatePresence>
              {isHoldingWearable && (
                <motion.div
                  className="click-to-wear"
                  variants={helperTextVariant}
                >
                  Click to wear
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </>
      )}
    </motion.div>
  );
};
