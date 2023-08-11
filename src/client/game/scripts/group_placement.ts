import type { Events } from "@/client/game/context_managers/events";
import type { ClientInput } from "@/client/game/context_managers/input";
import type { PermissionsManager } from "@/client/game/context_managers/permissions_manager";
import type { ClientTable } from "@/client/game/game";
import type { InteractContext } from "@/client/game/interact/types";
import type { GroupPlacementPreview } from "@/client/game/resources/group_placement";
import { slotRefFromSelection } from "@/client/game/resources/inventory";
import type {
  ClientReactResources,
  ClientResources,
} from "@/client/game/resources/types";
import type { Script } from "@/client/game/scripts/script_controller";
import type { Reflect } from "@/shared/asset_defs/shapes";
import { Box } from "@/shared/ecs/gen/components";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import {
  CloneGroupEvent,
  DeleteGroupPreviewEvent,
  PlaceBlueprintEvent,
  PlaceGroupEvent,
  UpdateGroupPreviewEvent,
} from "@/shared/ecs/gen/events";
import type { Item, OwnedItemReference, ShardId } from "@/shared/ecs/gen/types";
import { getBlueprintData } from "@/shared/game/blueprint";
import { CollisionHelper } from "@/shared/game/collision";
import { groupTensorBox, rotateGroupTensor } from "@/shared/game/group";
import { OwnedItemReferencesEqual } from "@/shared/game/inventory";
import type { BiomesId } from "@/shared/ids";
import {
  add,
  approxEquals,
  approxEquals2,
  centerAABB,
  centerAABBXZ,
  length,
  round,
  scale,
  shiftAABB,
  sub,
} from "@/shared/math/linear";
import {
  normalizeRotation,
  orientationToRotation,
  rotationToOrientation,
} from "@/shared/math/rotation";
import type { ReadonlyVec2, ReadonlyVec3, Vec3 } from "@/shared/math/types";
import { GROUP_PLACEMENT_ENVIRONMENT_PARAMS } from "@/shared/physics/environments";
import { verticalForce, walkingForce } from "@/shared/physics/forces";
import { isCollidingJoined, moveBodyJoined } from "@/shared/physics/movement";
import type { Force } from "@/shared/physics/types";
import { canClimbBlock, grounded } from "@/shared/physics/utils";
import { fireAndForget } from "@/shared/util/async";
import { EventThrottle, StateThrottle } from "@/shared/util/throttling";
import type { AABB } from "@/shared/wasm/types/biomes";

interface MoveState {
  position: ReadonlyVec3;
  orientation: ReadonlyVec2;
  reflection: Reflect;
}

export async function beginShowingPlaceablePreviewAtCoordinate(
  {
    table,
    resources,
    voxeloo,
  }: InteractContext<"table" | "resources" | "voxeloo">,
  position: Vec3,
  item: Item,
  inventoryRef: OwnedItemReference
) {
  let tensorBlob: string | undefined;

  let blueprintId: BiomesId | undefined;
  let groupId: BiomesId | undefined;

  const itemId = item.id;
  let tensorAssetRotation: number | undefined;
  if (itemId && item.isBlueprint) {
    blueprintId = itemId;
    const playerHasRequiredItems = resources.get(
      "/groups/blueprint/has_required_items",
      blueprintId
    );
    if (playerHasRequiredItems) {
      ({ tensor: tensorBlob } = getBlueprintData(itemId));
      tensorAssetRotation = item.rotation;
    }
  } else {
    groupId = item.groupId;
    if (groupId) {
      const groupEntity = await table.oob.oobFetchSingle(groupId);
      tensorBlob = groupEntity?.group_component?.tensor;
    }
  }

  if (tensorBlob) {
    resources.update("/groups/placement/tensor", (val) => {
      if (val.tensor) {
        val.tensor.delete();
      }
      val.tensor = new voxeloo.GroupTensor();
      val.tensor.load(tensorBlob!);
      if (tensorAssetRotation) {
        const rotatedTensor = rotateGroupTensor(
          voxeloo,
          val.tensor,
          normalizeRotation(tensorAssetRotation)
        );
        val.tensor.delete();
        val.tensor = rotatedTensor;
      }
      val.box = groupTensorBox(val.tensor);
      val.groupId = groupId;
      val.blueprintId = blueprintId;
      val.item = item;
      val.itemReference = inventoryRef;
      return val;
    });

    resources.update("/groups/placement/preview", (val) => {
      val.orientation = [0, 0];
      val.reflection = [0, 0, 0];
      val.centeredXZPosition = add(position, [0, 1, 0]);
    });
  }
}

export function stopShowingPlaceablePreview(resources: ClientResources) {
  resources.update("/groups/placement/tensor", (val) => {
    if (val.tensor) {
      val.tensor.delete();
    }
    val.tensor = undefined;
    val.groupId = undefined;
    val.box = undefined;
    val.blueprintId = undefined;
    val.item = undefined;
    val.itemReference = undefined;
  });
}

export function aclAllowsPlacementForPlaceablePreview(
  resources: ClientResources | ClientReactResources,
  _permissionsManager: PermissionsManager
) {
  const newGroupPreview = resources.get("/groups/placement/preview");
  if (!newGroupPreview.active()) {
    return false;
  }
  return true;
}

export function actualizePlaceablePreview(
  resources: ClientResources | ClientReactResources,
  permissionsManager: PermissionsManager,
  events: Events,
  userId: BiomesId,
  item: Item,
  inventoryRef: OwnedItemReference,
  options: { clone: boolean } = { clone: false }
) {
  const newGroupPreview = resources.get("/groups/placement/preview");
  if (!newGroupPreview.active() || !newGroupPreview.canActualize) {
    return;
  }

  if (newGroupPreview.groupPlacementTensor.blueprintId) {
    const placementTensor = newGroupPreview.placementTensorTakeOwnership();
    const position = centerAABBXZ(placementTensor.box);
    if (
      permissionsManager.clientActionAllowedAABB("place", placementTensor.box)
    ) {
      void (async () => {
        await events.publish(
          new PlaceBlueprintEvent({
            id: userId,
            inventory_ref: inventoryRef,
            item: item.id,
            position: position,
            orientation: newGroupPreview.orientation,
          })
        );
      })();
      placementTensor.tensor.delete();
      resources.set("/groups/placement/tensor", {});
    }
  } else if (newGroupPreview.groupPlacementTensor.groupId) {
    const placementTensor = newGroupPreview.placementTensorTakeOwnership();
    const localPlayer = resources.get("/scene/local_player");
    const label = resources.get(
      "/ecs/c/label",
      newGroupPreview.groupPlacementTensor.groupId
    );

    if (options.clone) {
      fireAndForget(
        events.publish(
          new CloneGroupEvent({
            id: newGroupPreview.groupPlacementTensor.groupId,
            user_id: userId,
            inventory_ref: inventoryRef,
            tensor: placementTensor.tensor.save(),
            rotation: placementTensor.rotation,
            reflection: placementTensor.reflection as Vec3,
            box: Box.clone({
              v0: placementTensor.box[0],
              v1: placementTensor.box[1],
            }),
          })
        )
      );
    } else {
      if (
        permissionsManager.clientActionAllowedAABB("place", placementTensor.box)
      ) {
        const groupId = newGroupPreview.groupPlacementTensor.groupId;
        void (async () => {
          await events.publish(
            new PlaceGroupEvent({
              id: groupId,
              user_id: userId,
              inventory_ref: inventoryRef,
              tensor: placementTensor.tensor.save(),
              rotation: placementTensor.rotation,
              reflection: placementTensor.reflection as Vec3,
              name: label?.text,
              warp: {
                warp_to: localPlayer.player.position,
                orientation: localPlayer.player.orientation,
              },
              box: Box.clone({
                v0: placementTensor.box[0],
                v1: placementTensor.box[1],
              }),
            })
          );
        })();
        placementTensor.tensor.delete();
        resources.set("/groups/placement/tensor", {});
      }
    }
  }
}

export class GroupPlacementScript implements Script {
  readonly name = "groupPlacement";

  private desireFlip = false;
  private desireMirror = false;
  private flipCallback: (() => unknown) | undefined;
  private mirrorCallback: (() => unknown) | undefined;
  // A throttle to prevent sending
  private previewUpdatePositionThrottle = new StateThrottle(
    {
      position: [0, 0, 0],
      orientation: [0, 0],
      reflection: [0, 0, 0],
    } as MoveState,
    (prev, { position, orientation, reflection }: MoveState) => {
      return {
        state: { position, orientation, reflection },
        allow:
          !approxEquals(position, prev.position) ||
          !approxEquals2(orientation, prev.orientation) ||
          !approxEquals(reflection, prev.reflection),
      };
    }
  );

  private previewUpdateEventThrottle = new EventThrottle(100);

  constructor(
    private readonly input: ClientInput,
    private readonly resources: ClientResources,
    private readonly table: ClientTable,
    private readonly events: Events,
    private readonly permissionsManager: PermissionsManager,
    private readonly tweaks = resources.get("/tweaks")
  ) {
    this.installListeners();
  }

  installListeners() {
    const flipCb = () => {
      if (this.isActive()) {
        this.desireFlip = true;
      }
    };
    const mirrorCb = () => {
      if (this.isActive()) {
        this.desireMirror = true;
      }
    };
    this.input.emitter.on("flip", flipCb);
    this.input.emitter.on("mirror", mirrorCb);
    this.flipCallback = flipCb;
    this.mirrorCallback = mirrorCb;
  }

  removeListeners() {
    if (this.flipCallback) {
      this.input.emitter.removeListener("flip", this.flipCallback);
    }
    if (this.mirrorCallback) {
      this.input.emitter.removeListener("mirror", this.mirrorCallback);
    }
  }

  clear() {
    this.removeListeners();
  }

  intersect([v0, v1]: AABB, fn: (hit: AABB) => boolean | void) {
    const ignoreSelfFn = (aabb: AABB, entity?: ReadonlyEntity) => {
      if (!entity) {
        fn(aabb);
      }
    };
    CollisionHelper.intersect(
      (id) => this.resources.get("/physics/boxes", id),
      this.table,
      this.resources.get("/ecs/metadata"),
      [v0, v1],
      ignoreSelfFn
    );
  }

  private climbable(aabb: AABB, dir: Vec3) {
    return canClimbBlock({
      index: (...args) => this.intersect(...args),
      aabb,
      dir,
    });
  }

  isActive() {
    const placementPreview = this.resources.get("/groups/placement/preview");
    return placementPreview.active();
  }

  updateSharedPreview() {
    const placementPreview = this.resources.get("/groups/placement/preview");
    const localPlayer = this.resources.get("/scene/local_player");
    if (placementPreview.active()) {
      if (
        this.previewUpdateEventThrottle.testAndSet() &&
        this.previewUpdatePositionThrottle.test({
          position: placementPreview.position,
          orientation: placementPreview.orientation,
          reflection: placementPreview.reflection,
        })
      ) {
        const place = placementPreview.placementTensorTakeOwnership();
        fireAndForget(
          this.events.publish(
            new UpdateGroupPreviewEvent({
              id: localPlayer.id,
              tensor: place.tensor.save(),
              box: { v0: place.box[0], v1: place.box[1] },
              blueprint_id: placementPreview.groupPlacementTensor.blueprintId,
            })
          )
        );
        place.tensor.delete();
      }
    } else {
      const pid = localPlayer.player.previewId;
      if (pid && this.previewUpdateEventThrottle.testAndSet()) {
        const cp = this.resources.get("/ecs/c/group_preview_component", pid);
        if (cp) {
          fireAndForget(
            this.events.publish(
              new DeleteGroupPreviewEvent({ id: localPlayer.id })
            )
          );
        }
      }
    }
  }

  preserveCenterPointDuringTransform(
    placementPreview: GroupPlacementPreview,
    transformFn: () => unknown
  ) {
    // Because the origin point is in the corner, we also need to move the position to keep centering
    const originalCenter = centerAABB(placementPreview.aabb());
    transformFn();
    const newCenter = centerAABB(placementPreview.aabb());
    placementPreview.position = add(
      placementPreview.position,
      sub(originalCenter, newCenter)
    );
  }

  handleCanActualize() {
    const placementPreview = this.resources.get("/groups/placement/preview");
    if (!placementPreview.active()) {
      placementPreview.cannotActualizeReason = "Inactive group";
      return;
    }

    if (
      !aclAllowsPlacementForPlaceablePreview(
        this.resources,
        this.permissionsManager
      )
    ) {
      placementPreview.cannotActualizeReason = "No permissions to place here";
      return;
    }

    const aabb = placementPreview.aabb();
    const colliding = isCollidingJoined(
      aabb,
      this.localCollisionBoxes(),
      (...args) => this.intersect(...args)
    );
    if (colliding) {
      placementPreview.cannotActualizeReason = "Colliding with other builds";
      return;
    }

    placementPreview.cannotActualizeReason = undefined;
  }

  localCollisionBoxes() {
    const placementPreview = this.resources.get("/groups/placement/preview");
    if (!placementPreview.active()) {
      return [];
    }

    const aabb = placementPreview.aabb();
    const localBoxes: AABB[] = [];
    placementPreview.groupPlacementBoxDict?.scan((a) => {
      localBoxes.push(
        shiftAABB(placementPreview.transformAABB(a), scale(-1.0, aabb[0]))
      );
    });
    return localBoxes;
  }

  handlePhysics(dt: number) {
    const placementPreview = this.resources.get("/groups/placement/preview");
    if (!placementPreview.active()) {
      return;
    }

    const tweaks = this.resources.get("/tweaks");
    const aabb = placementPreview.aabb();

    const forward = Math.sign(this.input.motion("forward")) as -1 | 0 | 1;
    const lateral = Math.sign(this.input.motion("lateral")) as -1 | 0 | 1;
    const forces: Force[] = [];

    const speed =
      // Moving backwards is slower.
      (forward < 0
        ? this.tweaks.playerPhysics.reverse
        : this.tweaks.playerPhysics.forward) *
      // Moving sideways is slower.
      (lateral === 0 ? 1 : this.tweaks.playerPhysics.lateralMultiplier);

    // Figure out what direction the player is moving.
    const [_pitch, yaw] = placementPreview.camOrientation;

    if (forward || lateral) {
      forces.push(walkingForce(speed, yaw, forward, lateral));
    }

    const boxesIndex = (id: ShardId) =>
      this.resources.get("/physics/boxes", id);

    // Snapping force to be voxel aligned
    forces.push(() => {
      const nearestValidPosition = round(placementPreview.position);
      const delta = sub(nearestValidPosition, placementPreview.position);
      delta[1] = 0;

      if (length(delta) < 0.01 || forward !== 0 || lateral !== 0) {
        return [0, 0, 0];
      }

      const springForce = scale(
        tweaks.youAreTheGroupSnappingCharacteristic,
        delta
      );
      const dampingForce = scale(
        -tweaks.youAreTheGroupDamping,
        placementPreview.velocity
      );
      return add(springForce, dampingForce);
    });

    const localBoxes = this.localCollisionBoxes();
    if (this.input.action("jump")) {
      for (const box of localBoxes) {
        const globalBox = shiftAABB(box, aabb[0]);
        const onGround = grounded(
          (...args) => CollisionHelper.intersectAABB(boxesIndex, ...args),
          globalBox
        );
        if (onGround) {
          forces.push(verticalForce(this.tweaks.playerPhysics.groundJump));
        }
        break;
      }
    }

    const result = moveBodyJoined(
      dt,
      {
        aabb: aabb,
        velocity: [...placementPreview.velocity],
      },
      localBoxes,
      GROUP_PLACEMENT_ENVIRONMENT_PARAMS,
      (...args) => this.intersect(...args),
      forces,
      []
    );

    placementPreview.position = add(
      placementPreview.position,
      result.movement.impulse
    );
    placementPreview.velocity = [...result.movement.velocity];
  }

  hidePreviewIfInactive() {
    // If inventory selection has switched, stop showing placeable component
    const placementPreview = this.resources.get("/groups/placement/preview");
    const selection = this.resources.get("/hotbar/selection");
    const itemReference = placementPreview.groupPlacementTensor.itemReference;
    const slotRef = slotRefFromSelection(selection);
    if (
      placementPreview.active() &&
      ((!itemReference && slotRef) ||
        (itemReference && !slotRef) ||
        (itemReference &&
          slotRef &&
          !OwnedItemReferencesEqual(itemReference, slotRef)))
    ) {
      stopShowingPlaceablePreview(this.resources);
    }
  }

  handleFlipControls() {
    const placementPreview = this.resources.get("/groups/placement/preview");
    if (!placementPreview.active()) {
      return;
    }
    if (this.desireFlip) {
      this.preserveCenterPointDuringTransform(placementPreview, () => {
        placementPreview.orientation = rotationToOrientation(
          orientationToRotation([
            placementPreview.orientation[0],
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            placementPreview.orientation[1] + Math.PI / 2,
          ])
        );
      });

      this.desireFlip = false;
    }

    if (this.desireMirror) {
      this.preserveCenterPointDuringTransform(placementPreview, () => {
        placementPreview.reflection = [
          placementPreview.reflection[0] ? 0 : 1,
          placementPreview.reflection[1],
          placementPreview.reflection[2],
        ];
      });
      this.desireMirror = false;
    }
  }

  tick(dt: number) {
    this.handleFlipControls();
    this.handlePhysics(dt);
    this.handleCanActualize();
    this.updateSharedPreview();
    this.hidePreviewIfInactive();
  }
}
