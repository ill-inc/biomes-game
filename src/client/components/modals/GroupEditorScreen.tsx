import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { InventoryCellContents } from "@/client/components/inventory/InventoryCellContents";
import { ItemTooltip } from "@/client/components/inventory/ItemTooltip";
import { DialogButton } from "@/client/components/system/DialogButton";
import { DialogCheckbox } from "@/client/components/system/DialogCheckbox";
import { DialogFeeListing } from "@/client/components/system/DialogFeeListing";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { useExistingMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import { LeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { PaneBottomDock } from "@/client/components/system/mini_phone/split_pane/PaneBottomDock";
import { RightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import {
  defaultObjectCameraRadius,
  ThreeObjectPreview,
} from "@/client/components/ThreeObjectPreview";
import type { GroupMesh } from "@/client/game/resources/groups";
import { useEffectAsync } from "@/client/util/hooks";
import type { CreateEnvironmentGroupRequest } from "@/pages/api/upload/build";
import type { TerrainID } from "@/shared/asset_defs/terrain";
import { BikkieIds } from "@/shared/bikkie/ids";
import { terrainIdToBlock } from "@/shared/bikkie/terrain";
import { Box } from "@/shared/ecs/gen/components";
import { groupBlingCost } from "@/shared/game/costs";
import { currencyBalance } from "@/shared/game/inventory";
import { countOf } from "@/shared/game/items";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { add, scale, sub } from "@/shared/math/linear";
import type { Vec3 } from "@/shared/math/types";
import type { GroupDetailBundle } from "@/shared/types";
import { reduceMap } from "@/shared/util/collections";
import { jsonPost } from "@/shared/util/fetch_helpers";
import { dataURLToBase64, displayUsername } from "@/shared/util/helpers";
import { groupTensorValueCounts } from "@/shared/util/voxels";
import { isEmptyGroupEntry } from "@/shared/wasm/types/galois";
import { ok } from "assert";
import { sortBy, trim } from "lodash";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Spherical, Vector3 } from "three";

const MINIMUM_GROUP_VOXELS = 1;

const MaterialCountDisplay: React.FunctionComponent<{
  materialCount: ReturnType<typeof groupTensorValueCounts>;
}> = ({ materialCount }) => {
  const groupMaterials = Array.from(materialCount);
  sortBy(groupMaterials, ([_, count]) => -count);
  return (
    <>
      {groupMaterials.map(([terrainID, count]) => {
        const item = terrainIdToBlock(terrainID);
        if (!item) {
          log.warn(`Unable to find block id for material: ${terrainID}`);
          return [];
        }
        return [
          <ItemTooltip item={item} key={terrainID}>
            <div className="cell">
              <InventoryCellContents
                slot={countOf(item, BigInt(Math.floor(count)))}
              />
            </div>
          </ItemTooltip>,
        ];
      })}
    </>
  );
};

export const GroupEditorScreen: React.FunctionComponent<{}> = ({}) => {
  const {
    clientConfig,
    reactResources,
    resources,
    rendererController,
    userId,
    voxeloo,
  } = useClientContext();
  const [error, setError] = useError();
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [allowWarping, setAllowWarping] = useState(true);
  const [groupMesh, setGroupMesh] = useState<GroupMesh>();
  const [groupCenter, setGroupCenter] = useState<THREE.Vector3>();
  const allowDeletion = useRef(true);
  const [materialCount, setMaterialCount] = useState<Map<TerrainID, number>>(
    new Map()
  );
  const objectPreviewRef = useRef<ThreeObjectPreview>(null);
  const [stage, setStage] = useState<"group" | "grouping" | "post-group">(
    "group"
  );
  const [groupId, setGroupId] = useState<BiomesId>();
  const [refinement, groupData, groupSrc] = reactResources.useAll(
    ["/groups/src/refinement"],
    ["/groups/src/data"],
    ["/groups/src"]
  );

  const nameField = useRef<HTMLInputElement>(null);
  const miniPhone = useExistingMiniPhoneContext();

  useEffect(() => {
    if (nameField.current) {
      nameField.current.focus();
    }
  }, []);

  useEffect(() => {
    if (stage === "group" && groupData?.tensor) {
      const counts = groupTensorValueCounts(groupData.tensor);
      setMaterialCount(counts);
      const total = reduceMap(0, counts, (acc, val, _) => acc + val);
      allowDeletion.current = total > MINIMUM_GROUP_VOXELS;
    }
  }, [groupData]);

  useEffectAsync(async () => {
    if (stage !== "grouping") {
      if (groupId) {
        setGroupCenter(undefined);
        setGroupMesh(await reactResources.get("/groups/mesh", groupId));
      } else if (groupData) {
        const src = reactResources.get("/groups/src");
        if (src.pos) {
          setGroupCenter(
            new THREE.Vector3(
              ...scale(0.5, sub(groupData.box.v1, groupData.box.v0))
            )
          );
          setGroupMesh(await reactResources.get("/groups/src/mesh"));
        }
      }
    }
  }, [groupData, groupId]);

  const onClick = (e: MouseEvent) => {
    if (!allowDeletion.current) {
      return;
    }
    const groupData = reactResources.get("/groups/src/data");
    if (!objectPreviewRef.current || !groupData) {
      return;
    }
    const tensor = groupData.tensor;
    const box = groupData.box;
    const shift = box.v0;
    const camera = objectPreviewRef.current.camera;
    const passRenderer = objectPreviewRef.current.passRenderer!;
    const maxDistance = 100;

    const raycaster = new THREE.Raycaster();
    const domElement = passRenderer.canvas;
    const rect = domElement.getBoundingClientRect();
    const offsetX = rect.left + window.scrollX;
    const offsetY = rect.top + window.scrollY;
    const viewWidth = domElement.clientWidth;
    const viewHeight = domElement.clientHeight;

    const pointer = new THREE.Vector2(
      ((e.clientX - offsetX) / viewWidth) * 2 - 1,
      (-(e.clientY - offsetY) / viewHeight) * 2 + 1
    );

    raycaster.setFromCamera(pointer, camera);

    // Display line for debugging.
    // const scene = objectPreviewRef.current.scene;
    // const points = [];
    // points.push(raycaster.ray.origin.clone());
    // points.push(
    //   raycaster.ray.origin
    //     .clone()
    //     .add(raycaster.ray.direction.clone().multiplyScalar(100))
    // );
    // const geometry = new THREE.BufferGeometry().setFromPoints(points);
    // const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    // const line = new THREE.Line(geometry, material);
    // scene.add(line);
    // renderer.render(scene, camera);

    let hit: Vec3 | undefined;
    voxeloo.march_faces(
      raycaster.ray.origin.toArray(),
      raycaster.ray.direction.toArray(),
      (x, y, z, d, _f) => {
        if (d > maxDistance) {
          return false;
        }
        const pos = add([x, y, z], shift);
        const val = tensor?.get(pos);
        if (val && !isEmptyGroupEntry(val)) {
          hit = pos;
          return false;
        } else {
          return true;
        }
      }
    );

    if (hit) {
      reactResources.update("/groups/src/refinement", (val) => {
        if (!val.deletions) {
          val.deletions = [];
        }
        val.deletions.push(hit!);
        return val;
      });
      reactResources.invalidate("/groups/src/data");
    }
  };

  const undoDeletion = () => {
    reactResources.update("/groups/src/refinement", (val) => {
      if (val.deletions) {
        val.deletions.pop();
        if (val.deletions.length == 0) {
          val.deletions = undefined;
        }
      }
      return val;
    });
  };

  const onDismissal = () => {
    reactResources.set("/groups/src/refinement", {}); // reset refinement
    miniPhone.close();
  };

  const renderScreenshot = () => {
    if (!objectPreviewRef.current) {
      return undefined;
    }

    return objectPreviewRef.current.renderScreenshot(1024, 1024, "image/png", {
      cameraSetPosition:
        groupMesh?.three &&
        new Vector3().setFromSpherical(
          new Spherical(
            defaultObjectCameraRadius(groupMesh.three),
            Math.PI / 4,
            Math.PI / 4
          )
        ),
    });
  };

  const createGroup = async () => {
    ok(stage === "group");
    ok(objectPreviewRef.current);
    ok(groupData);
    ok(groupSrc.pos);
    setStage("grouping");

    const screenshot = renderScreenshot()!;
    const localPlayer = reactResources.get("/scene/local_player");

    const placeableIds = groupData.attachedPlaceables
      ? groupData.attachedPlaceables.map((p) => p.id)
      : [];
    try {
      const group = await jsonPost<
        GroupDetailBundle,
        CreateEnvironmentGroupRequest
      >("/api/upload/build", {
        name,
        description,
        allowWarping: allowWarping,
        imageBlobB64: dataURLToBase64(screenshot),
        warpPosition: localPlayer.player.position,
        warpOrientation: localPlayer.player.orientation,
        gltfBlob: await reactResources.get("/groups/src/gltf"),
        box: Box.clone(groupData.box),
        tensor: groupData.tensor.save(),
        placeableIds: placeableIds,
        position: [...groupSrc.pos],
      });
      setGroupId(group.id);
      setStage("post-group");
    } catch (error: any) {
      setError(error);
    }
  };

  const username = reactResources.get("/scene/local_player").player.username;
  const inventory = reactResources.use("/ecs/c/inventory", userId);

  const cost = groupBlingCost();
  const balanceAfterSpend = inventory
    ? currencyBalance(inventory, BikkieIds.bling) - cost
    : 0n;

  let actionContainer!: JSX.Element;
  if (stage === "group") {
    actionContainer = (
      <div className="form">
        <section>
          <label>Name</label>
          <input
            type="text"
            ref={nameField}
            value={name}
            size={32}
            maxLength={32}
            placeholder="Name"
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
        </section>
        <section>
          <label>Description</label>
          <input
            type="text"
            value={description}
            size={200}
            maxLength={200}
            placeholder="Description"
            onChange={(e) => {
              setDescription(e.target.value);
            }}
          />
        </section>
        <section>
          <DialogCheckbox
            label="Allow warping"
            explanation="Others can warp here for 24 hours"
            checked={allowWarping}
            onCheck={(checked) => {
              setAllowWarping(checked);
            }}
          />
        </section>
        <section>
          <label>Contains</label>
          <div className="group-material-list">
            <MaterialCountDisplay materialCount={materialCount} />
          </div>
        </section>
      </div>
    );
  } else if (stage === "grouping") {
    actionContainer = <>Creating build... please wait</>;
  } else if (stage === "post-group") {
    actionContainer = (
      <div className="form">
        {description && (
          <section>
            <label>Description</label>
            <div>{description}</div>
          </section>
        )}
        <section>
          <label>Contains</label>
          <div className="material-list">
            <MaterialCountDisplay materialCount={materialCount} />
          </div>
        </section>
        <section>
          <label>Owner</label>
          <div className="creator">{displayUsername(username)}</div>
        </section>
      </div>
    );
  }

  return (
    <SplitPaneScreen>
      <ScreenTitleBar title={stage === "group" ? "Create Build" : name} />
      <LeftPane>
        <div className="padded-view">
          <MaybeError error={error} />
          {actionContainer}
        </div>
        <PaneBottomDock>
          {stage === "group" && (
            <div className="dialog-button-group">
              <DialogFeeListing
                cost={cost}
                tooltip="Biomes charges to create Builds"
              />

              <DialogButton
                type="primary"
                disabled={!trim(name ?? "") || balanceAfterSpend < 0n}
                onClick={() => {
                  if (!trim(name ?? "")) {
                    setError("Naming your group is required!");
                  } else {
                    setError("");
                    void createGroup();
                  }
                }}
              >
                Create Build
              </DialogButton>
              <DialogButton onClick={onDismissal}>Cancel</DialogButton>
            </div>
          )}

          {stage === "post-group" && (
            <div className="dialog-button-group">
              <DialogButton onClick={onDismissal}>Done</DialogButton>
            </div>
          )}
        </PaneBottomDock>
      </LeftPane>
      <RightPane type="center">
        <div className="preview-container">
          {groupMesh && (
            <ThreeObjectPreview
              object={groupMesh.three}
              controlTarget={groupCenter}
              ref={objectPreviewRef}
              autoRotate={true}
              allowZoom={true}
              allowPan={true}
              onClick={onClick}
              resources={resources}
              clientConfig={clientConfig}
              renderScale={rendererController.passRenderer?.pixelRatio()}
            ></ThreeObjectPreview>
          )}

          {stage == "group" && (
            <div className="editor-actions-container">
              <div className="editor-actions placeholder"></div>

              <div className="help">Click a voxel to remove from build</div>
              <div className="editor-actions editor-actions-right">
                <DialogButton
                  extraClassNames={refinement.deletions ? "" : "hide"}
                  onClick={undoDeletion}
                >
                  Undo
                </DialogButton>
              </div>
            </div>
          )}
        </div>
      </RightPane>
    </SplitPaneScreen>
  );
};
