import { TreasureParticles } from "@/client/components/Particles";
import { ThreeBasicObjectPreview } from "@/client/components/ThreeBasicObjectPreview";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { InventoryCellContents } from "@/client/components/inventory/InventoryCellContents";
import { ItemTooltip } from "@/client/components/inventory/ItemTooltip";
import { useResolvedItemRef } from "@/client/components/inventory/helpers";
import { ChromelessModal } from "@/client/components/modals/ChromelessModal";
import { DialogButton } from "@/client/components/system/DialogButton";
import { placeableSystem } from "@/client/game/resources/placeables/types";
import type { AnimationSystem } from "@/client/game/util/animation_system";
import type { MixedMesh } from "@/client/game/util/animations";
import { gltfToThree, loadGltf } from "@/client/game/util/gltf_helpers";
import { TimelineMatcher } from "@/client/game/util/timeline_matcher";
import { useAnimation } from "@/client/util/animation";
import { useEffectAsync } from "@/client/util/hooks";
import { resolveAssetUrlUntyped } from "@/galois/interface/asset_paths";
import type { Disposable } from "@/shared/disposable";
import { makeDisposable } from "@/shared/disposable";
import {
  TreasureRollEvent,
  UnwrapWrappedItemEvent,
} from "@/shared/ecs/gen/events";
import type { ItemBag, OwnedItemReference } from "@/shared/ecs/gen/types";
import { stringToItemBag } from "@/shared/game/items_serde";
import { easeInOut } from "@/shared/math/easing";
import { fireAndForget } from "@/shared/util/async";
import { AnimatePresence, motion } from "framer-motion";
import { first } from "lodash";
import { useEffect, useRef, useState } from "react";
import { Mesh, Spherical, Vector3 } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils";

function getOrbitControlsSpherical(orbitControls: OrbitControls) {
  const spherical = new Spherical();
  spherical.radius = orbitControls.getDistance();
  spherical.phi = orbitControls.getPolarAngle();
  spherical.theta = orbitControls.getAzimuthalAngle();
  return spherical;
}

export function useAnimatedGaloisGLTFMesh<T extends AnimationSystem<any, any>>(
  galoisPath: string | undefined,
  animationSystem: T,
  options: {
    visible: boolean;
  } = {
    visible: true,
  }
) {
  const [meshAndAnimations, setMeshAndAnimations] = useState<
    Disposable<MixedMesh<T>> | null | undefined
  >();

  useEffectAsync(async () => {
    if (!galoisPath) {
      return;
    }
    const url = resolveAssetUrlUntyped(galoisPath);
    if (!url) {
      return;
    }
    const gltf = await loadGltf(url);
    const mesh = SkeletonUtils.clone(gltfToThree(gltf));
    const state = animationSystem.newState(mesh, gltf.animations);

    mesh.visible = options.visible;

    setMeshAndAnimations(
      makeDisposable(
        {
          three: mesh,
          animationMixer: state.mixer,
          animationSystem,
          animationSystemState: state,
          timelineMatcher: new TimelineMatcher(() => state.mixer.time),
        },
        () => {
          mesh.traverse((child) => {
            if (child instanceof Mesh) {
              child.geometry.dispose();
              child.material.dispose();
            }
          });
        }
      )
    );
  }, [galoisPath]);

  useEffect(() => {
    return () => {
      if (meshAndAnimations) {
        meshAndAnimations.dispose();
      }
    };
  }, [meshAndAnimations]);

  return meshAndAnimations;
}

export const TreasureRevealModal: React.FunctionComponent<{
  ownedItemRef: OwnedItemReference;
  onClose: () => unknown;
}> = ({ ownedItemRef, onClose }) => {
  const { reactResources, userId, events } = useClientContext();
  const item = useResolvedItemRef(reactResources, userId, ownedItemRef);
  const viewerRef = useRef<ThreeBasicObjectPreview | null>(null);
  const [t, setT] = useState(0);

  const treasureData = item?.item.wrappedItemBag ?? item?.item.data;
  const treasureContents: ItemBag = treasureData
    ? stringToItemBag(treasureData)
    : new Map();

  const firstItem = first([...treasureContents.values()]);
  const claimTitle =
    [...treasureContents.values()].length == 1 && firstItem
      ? `Claim ${firstItem.item.displayName}`
      : "Claim Items";

  const galoisMesh = useAnimatedGaloisGLTFMesh(
    item?.item.galoisPath,
    placeableSystem,
    { visible: false }
  );

  const animationLength = 3000;
  const animationStart = useRef(performance.now());
  useAnimation(() => {
    const newT = Math.min(
      1,
      (performance.now() - animationStart.current) / animationLength
    );
    setT(newT);
  });

  useEffect(() => {
    if (!item) {
      onClose();
      return;
    }

    if (item?.item.treasureChestDrop && !treasureData) {
      fireAndForget(
        events.publish(new TreasureRollEvent({ id: userId, ref: ownedItemRef }))
      );
    }
  }, [treasureData, item?.item?.id]);

  useEffect(() => {
    if (!galoisMesh) {
      return;
    }
    galoisMesh.three.position.set(
      galoisMesh.three.position.x,
      galoisMesh.three.position.y - 1,
      galoisMesh.three.position.z
    );
    galoisMesh.three.rotation.y = Math.PI / 2;
    galoisMesh.animationSystem.applySingleActionToState(
      {
        layers: { all: "apply" },
        state: { repeat: { kind: "repeat" }, startTime: 0 },
        weights: placeableSystem.singleAnimationWeight("idle", 1),
      },
      galoisMesh.animationSystemState
    );
    galoisMesh.three.visible = true;
  }, [galoisMesh?.three]);

  useEffect(() => {
    if (!galoisMesh?.animationSystemState || t < 0.9) {
      return;
    }

    const system = galoisMesh.animationSystemState;
    galoisMesh.animationSystem.applySingleActionToState(
      {
        layers: { all: "apply" },
        state: { repeat: { kind: "once" }, startTime: system.mixer.time },
        weights: placeableSystem.singleAnimationWeight("open", 1),
      },
      system
    );
  }, [galoisMesh, t >= 0.9]);

  return (
    <ChromelessModal extraClassNames="treasure-reveal">
      <TreasureParticles />

      <AnimatePresence>
        {galoisMesh && (
          <motion.div
            className="treasure-mesh"
            initial={{ y: "-50%", scale: 0 }}
            animate={{ y: "-50%", scale: 1 }}
          >
            <ThreeBasicObjectPreview
              ref={viewerRef}
              allowPan={false}
              allowZoom={false}
              allowRotate={false}
              animationMixer={galoisMesh.animationMixer}
              object={galoisMesh.three}
              cameraPos={new Vector3(0, 2.2, 2.2)}
              onAnimate={() => {
                const viewer = viewerRef.current;
                if (!viewer) {
                  return;
                }

                const spherical = getOrbitControlsSpherical(viewer.controls);
                spherical.theta = 20 * easeInOut(t * t);
                viewer.controls.object.position.setFromSpherical(spherical);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="treasure-section">
        {[...treasureContents.values()].map((e) => (
          <>
            <AnimatePresence key={e.item.id}>
              {t >= 1.0 && (
                <motion.div
                  initial={{ opacity: 0.5, scale: 0.25, y: "40%" }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: "-25%",
                  }}
                  transition={{
                    damping: 20,
                    stiffness: 180,
                    type: "spring",
                  }}
                >
                  <ItemTooltip key={e.item.id} item={e.item}>
                    <motion.div
                      className="cell"
                      animate={{
                        opacity: 1,
                        scale: 1,
                        y: ["0%", "3%"],
                        transition: {
                          y: { repeat: Infinity, repeatType: "mirror" },
                        },
                      }}
                    >
                      <InventoryCellContents slot={e} />
                    </motion.div>
                  </ItemTooltip>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ))}
      </div>

      <div className="action-buttons">
        <AnimatePresence>
          {t >= 1 && (
            <motion.div
              initial={{ opacity: 0, y: "10%" }}
              animate={{ opacity: 1, y: "0%" }}
            >
              <DialogButton
                size="large"
                type="primary"
                disabled={t < 1.0}
                onClick={() => {
                  fireAndForget(
                    events.publish(
                      new UnwrapWrappedItemEvent({
                        id: userId,
                        ref: ownedItemRef,
                      })
                    )
                  );
                }}
              >
                {claimTitle}
              </DialogButton>

              <DialogButton
                size="large"
                onClick={() => {
                  onClose();
                }}
              >
                Discard
              </DialogButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ChromelessModal>
  );
};
