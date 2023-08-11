import type { ClientContext, ClientContextSubset } from "@/client/game/context";
import type { GroupData } from "@/client/game/resources/groups";
import { groupMesh } from "@/client/game/resources/groups";
import type {
  ClientResourceDeps,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import type { Reflect } from "@/shared/asset_defs/shapes";
import type { ReadonlyBox } from "@/shared/ecs/gen/components";
import type {
  Item,
  OwnedItemReference,
  Vec2f,
  Vec3f,
} from "@/shared/ecs/gen/types";
import { groupTensorBox, rotateGroupTensor } from "@/shared/game/group";
import { playerAABB } from "@/shared/game/players";
import type { BiomesId } from "@/shared/ids";
import {
  add,
  centerAABB,
  max,
  min,
  reflect,
  round,
  roundAABB,
  sub,
} from "@/shared/math/linear";
import { orientationToRotation } from "@/shared/math/rotation";
import type { RegistryLoader } from "@/shared/registry";
import type { AABB } from "@/shared/wasm/types/biomes";
import type {
  BoxDict,
  BoxList,
  GroupIndex,
  GroupTensor,
} from "@/shared/wasm/types/galois";
import { ok } from "assert";
import * as THREE from "three";

export interface GroupPlacementTensor {
  item?: Item;
  itemReference?: OwnedItemReference;
  groupId?: BiomesId;
  blueprintId?: BiomesId;
  tensor?: GroupTensor;
  box?: ReadonlyBox;
}

export interface GroupPlacementMesh {
  three: THREE.Object3D;
}

export class GroupPlacementPreview {
  velocity: Vec3f = [0, 0, 0];
  position: Vec3f = [0, 0, 0];
  orientation: Vec2f = [0, 0];
  reflection: Reflect = [0, 0, 0];
  camOrientation: Vec2f = [0, 0];

  groupPlacementTensor: GroupPlacementTensor = {};
  groupPlacementBoxList: BoxList | undefined;
  groupPlacementBoxDict: BoxDict | undefined;
  groupsIndex: GroupIndex | undefined;
  cannotActualizeReason?: string;

  constructor(
    private readonly context: ClientContextSubset<"voxeloo">,
    deps: ClientResourceDeps
  ) {
    this.update(deps);
    void deps.get("/groups/index").then((idx) => {
      this.groupsIndex = idx;
    });
  }

  get centeredXZPosition() {
    return centerAABB(this.aabb());
  }

  set centeredXZPosition(position: Vec3f) {
    this.position = position;
    const oldCenter = centerAABB(this.aabb());
    const centerDelta = sub(oldCenter, position);
    this.position = [
      position[0] - centerDelta[0],
      position[1],
      position[2] - centerDelta[2],
    ];
  }

  get canActualize() {
    return this.cannotActualizeReason === undefined;
  }

  // You are taking ownership
  placementTensorTakeOwnership() {
    ok(this.groupPlacementTensor.tensor);
    ok(this.groupPlacementTensor.box);

    const box = groupTensorBox(this.groupPlacementTensor.tensor);
    const rotation = orientationToRotation(this.orientation);
    const rotatedTensor = rotateGroupTensor(
      this.context.voxeloo,
      this.groupPlacementTensor.tensor,
      rotation,
      this.reflection
    );

    const newBox = roundAABB(
      this.transformAABB([box.v0, box.v1], round(this.position))
    );

    return {
      tensor: rotatedTensor,
      box: newBox,
      rotation,
      reflection: this.reflection,
    };
  }

  transformAABB(aabb: AABB, overridePosition?: Vec3f): AABB {
    const baseEuler = new THREE.Euler(
      this.orientation[0],
      this.orientation[1],
      0,
      "YXZ"
    );

    const start = new THREE.Vector3(...reflect(aabb[0], this.reflection));
    const end = new THREE.Vector3(...reflect(aabb[1], this.reflection));

    start.applyEuler(baseEuler);
    end.applyEuler(baseEuler);

    const newBox = [
      min(start.toArray(), end.toArray()),
      max(start.toArray(), end.toArray()),
    ];
    return [
      add(overridePosition ?? this.position, newBox[0]),
      add(overridePosition ?? this.position, newBox[1]),
    ];
  }

  aabb(): AABB {
    if (!this.groupPlacementTensor.tensor) {
      return playerAABB(this.position);
    }
    const box = groupTensorBox(this.groupPlacementTensor.tensor);
    return this.transformAABB([box.v0, box.v1]);
  }

  active(): boolean {
    return !!this.groupPlacementTensor.tensor;
  }

  update(deps: ClientResourceDeps) {
    const tensor = deps.get("/groups/placement/tensor");
    this.groupPlacementTensor = tensor;
    if (tensor.tensor && this.groupsIndex) {
      this.groupPlacementBoxList = this.context.voxeloo.toGroupBoxList(
        this.groupsIndex,
        tensor.tensor,
        [0, 0, 0]
      );
      this.groupPlacementBoxDict = this.groupPlacementBoxList.toDict();
    } else {
      if (this.groupPlacementBoxList) {
        this.groupPlacementBoxList.delete();
      }
      if (this.groupPlacementBoxDict) {
        this.groupPlacementBoxDict.delete();
      }
      this.groupPlacementBoxList = undefined;
      this.groupPlacementBoxDict = undefined;
    }
  }
}

async function genGroupPlacementMesh(
  context: ClientContextSubset<"voxeloo">,
  deps: ClientResourceDeps
): Promise<GroupPlacementMesh | undefined> {
  const placementTensor = deps.get("/groups/placement/tensor");

  const groupData: GroupData | undefined =
    placementTensor.tensor && placementTensor.box
      ? {
          tensor: placementTensor.tensor,
          box: placementTensor.box,
        }
      : undefined;

  return groupMesh(context, deps, groupData, {
    transparent: true,
    blueprintId: placementTensor.blueprintId,
  });
}

async function genGroupPlacementErrorMesh(
  context: ClientContextSubset<"voxeloo">,
  deps: ClientResourceDeps
): Promise<GroupPlacementMesh | undefined> {
  const placementTensor = deps.get("/groups/placement/tensor");

  const groupData: GroupData | undefined =
    placementTensor.tensor && placementTensor.box
      ? {
          tensor: placementTensor.tensor,
          box: placementTensor.box,
        }
      : undefined;

  return groupMesh(context, deps, groupData, {
    transparent: true,
    colorOverride: [1, 0, 0],
  });
}

export function addNewGroupPlacementResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.addGlobal("/groups/placement/tensor", {});
  builder.add("/groups/placement/mesh", loader.provide(genGroupPlacementMesh));
  builder.add(
    "/groups/placement/error_mesh",
    loader.provide(genGroupPlacementErrorMesh)
  );
  builder.addDynamic(
    "/groups/placement/preview",
    loader.provide(
      (ctx: ClientContext, deps: ClientResourceDeps) =>
        new GroupPlacementPreview(ctx, deps)
    ),
    (deps: ClientResourceDeps, preview: GroupPlacementPreview) => {
      preview.update(deps);
    }
  );
}
