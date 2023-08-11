import type { ClientContext } from "@/client/game/context";
import { changeRadius } from "@/client/game/interact/helpers";
import type {
  ClientResourceDeps,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import type { ReadonlyVec3f } from "@/shared/ecs/gen/types";
import { hitExistingTerrain } from "@/shared/game/spatial";
import { add, sizeAABB } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";
import type { RegistryLoader } from "@/shared/registry";
import { Dir } from "@/shared/wasm/types/common";
import * as THREE from "three";
import addHoverTexture from "/public/textures/hover/add_hover.png";
import destroyHoverTexture from "/public/textures/hover/destroy_hover.png";

export type EditPreview = {
  mesh: THREE.Object3D;
  nonColliding?: boolean;
  position?: ReadonlyVec3;
};

const syncFacePreviewToRaycast = (
  face: THREE.Object3D,
  faceDirection: Dir,
  x: number,
  y: number,
  z: number
) => {
  const eps = 0.0001;
  switch (faceDirection) {
    case Dir.X_NEG:
      face.setRotationFromEuler(new THREE.Euler(0, -Math.PI / 2, 0));
      face.position.set(x - eps, y, z);
      return;
    case Dir.X_POS:
      face.setRotationFromEuler(new THREE.Euler(0, -Math.PI / 2, 0));
      face.position.set(x + 1 + eps, y, z);
      return;
    case Dir.Y_NEG:
      face.setRotationFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
      face.position.set(x, y - eps, z);
      return;
    case Dir.Y_POS:
      face.setRotationFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
      face.position.set(x, y + 1 + eps, z);
      return;
    case Dir.Z_NEG:
      face.setRotationFromEuler(new THREE.Euler(0, 0, 0));
      face.position.set(x, y, z - eps);
      return;
    case Dir.Z_POS:
      face.setRotationFromEuler(new THREE.Euler(0, 0, 0));
      face.position.set(x, y, z + 1 + eps);
      return;
  }
};

const makeDestroyPreviewMesh = () => {
  const texture = new THREE.TextureLoader().load(destroyHoverTexture.src);
  const geometry = new THREE.BoxGeometry(1.02, 1.02, 1.02);
  geometry.translate(0.5, 0.5, 0.5);

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  return new THREE.Mesh(geometry, material);
};

function makeDestroyPreviewMeshAtCursor(
  deps: ClientResourceDeps,
  action: string
): EditPreview | undefined {
  const sel = deps.get("/hotbar/selection");
  if (sel.item?.action !== action) {
    return;
  }
  const { hit } = deps.get("/scene/cursor");
  if (!hitExistingTerrain(hit) || hit.distance > changeRadius(deps)) {
    return;
  }
  const camera = deps.get("/scene/camera");
  const dir = camera.three.getWorldDirection(new THREE.Vector3());
  const mesh: THREE.Object3D = deps.get("/scene/preview/del_mesh");
  mesh.position.set(...hit.pos).addScaledVector(dir, -0.02);

  return {
    mesh,
    position: hit.pos,
  };
}

function genShapePreview(deps: ClientResourceDeps): EditPreview | undefined {
  const sel = deps.get("/hotbar/selection");
  const action = sel.item ? sel.item.action : "destroy";
  if (action !== "shape") {
    return;
  }
  const { destroyInfo } = deps.get("/scene/local_player");
  if (destroyInfo) {
    return;
  }

  const { hit } = deps.get("/scene/cursor");
  if (!hitExistingTerrain(hit) || hit.distance > changeRadius(deps)) {
    return;
  }

  // Make a mesh containing both the add and del preview to show face
  const parentMesh = new THREE.Object3D();

  const camera = deps.get("/scene/camera");
  const dir = camera.three.getWorldDirection(new THREE.Vector3());
  const delMesh: THREE.Object3D = deps.get("/scene/preview/del_mesh");
  delMesh.position.set(...hit.pos).addScaledVector(dir, -0.02);

  parentMesh.add(delMesh);
  const addMesh = deps.get("/scene/preview/add_mesh");
  syncFacePreviewToRaycast(addMesh, hit.face, ...hit.pos);
  parentMesh.add(addMesh);
  return {
    mesh: parentMesh,
    position: hit.pos,
  };
}

function genTillPreview(deps: ClientResourceDeps): EditPreview | undefined {
  return makeDestroyPreviewMeshAtCursor(deps, "till");
}

function genDyePreview(deps: ClientResourceDeps): EditPreview | undefined {
  return makeDestroyPreviewMeshAtCursor(deps, "dye");
}

function genWaterPlantPreview(
  deps: ClientResourceDeps
): EditPreview | undefined {
  return makeDestroyPreviewMeshAtCursor(deps, "waterPlant");
}

function genPlantPreview(deps: ClientResourceDeps): EditPreview | undefined {
  const sel = deps.get("/hotbar/selection");
  const action = sel.item ? sel.item.action : "destroy";
  if (action !== "plant") {
    return;
  }
  const { hit } = deps.get("/scene/cursor");
  if (!hitExistingTerrain(hit) || hit.distance > changeRadius(deps)) {
    return;
  }
  const camera = deps.get("/scene/camera");
  const dir = camera.three.getWorldDirection(new THREE.Vector3());
  const mesh: THREE.Object3D = deps.get("/scene/preview/del_mesh");
  mesh.position.set(...hit.pos).addScaledVector(dir, -0.02);

  return {
    mesh,
    position: hit.pos,
  };
}

function genSpaceClipboardPreviewMesh() {
  const geometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
  geometry.translate(0.5, 0.5, 0.5);

  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    opacity: 0.75,
    color: 0xff0000,
  });
  return new THREE.Mesh(geometry, material);
}

function genSpaceClipboardPreview(
  deps: ClientResourceDeps
): EditPreview | undefined {
  const box = deps.get("/space_clipboard/preview_box");
  if (!box.box) {
    return;
  }

  const [v0] = box.box;
  const size = sizeAABB(box.box);
  const mesh = deps.get("/scene/preview/space_clipboard_mesh");
  mesh.position.set(...v0);
  mesh.scale.set(...add(size, [0.01, 0.01, 0.01]));
  (mesh.material as THREE.MeshBasicMaterial).color = new THREE.Color(
    box.mode === "loaded" ? 0xadd8e6 : 0x90ee90
  );

  return {
    mesh,
    position: v0,
  };
}

function genDestroyPreview(
  { userId }: ClientContext,
  deps: ClientResourceDeps
): EditPreview | undefined {
  if (!userId) {
    return;
  }
  const sel = deps.get("/hotbar/selection");
  const action = sel.item ? sel.item.action : "destroy";
  if (action !== "destroy") {
    return;
  }
  const { destroyInfo } = deps.get("/scene/local_player");
  if (destroyInfo) {
    return;
  }

  const { hit } = deps.get("/scene/cursor");
  if (!hitExistingTerrain(hit) || hit.distance > changeRadius(deps)) {
    return;
  }

  const camera = deps.get("/scene/camera");
  const dir = camera.three.getWorldDirection(new THREE.Vector3());
  const mesh: THREE.Object3D = deps.get("/scene/preview/del_mesh");
  mesh.position.set(...hit.pos).addScaledVector(dir, -0.02);

  return {
    mesh,
    position: hit.pos,
  };
}

const makeAddPreviewMesh = () => {
  const geometry = new THREE.PlaneGeometry(1.0, 1.0);
  geometry.translate(0.5, 0.5, 0);
  const texture = new THREE.TextureLoader().load(addHoverTexture.src);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  return new THREE.Mesh(geometry, material);
};

export type AddPreviewSpec =
  | {
      kind: "replace" | "add";
      position: ReadonlyVec3f;
      face: Dir;
    }
  | {
      kind: "empty";
    };

function genAddPreview(deps: ClientResourceDeps): EditPreview | undefined {
  const spec = deps.get("/scene/preview/add_spec");
  if (spec.kind === "empty") {
    return;
  }

  let mesh: THREE.Mesh;
  if (spec.kind === "replace") {
    const camera = deps.get("/scene/camera");
    const dir = camera.three.getWorldDirection(new THREE.Vector3());
    mesh = deps.get("/scene/preview/del_mesh");
    mesh.position.set(...spec.position).addScaledVector(dir, -0.02);
  } else {
    mesh = deps.get("/scene/preview/add_mesh");
    syncFacePreviewToRaycast(mesh, spec.face, ...spec.position);
  }

  return {
    mesh,
    position: spec.position,
    nonColliding: spec.kind === "replace",
  };
}

export function addPreviewResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.add(
    "/scene/preview/space_clipboard_mesh",
    genSpaceClipboardPreviewMesh
  );
  builder.add("/scene/preview/space_clipboard", genSpaceClipboardPreview);
  builder.add("/scene/preview/del_mesh", makeDestroyPreviewMesh);
  builder.add("/scene/preview/del", loader.provide(genDestroyPreview));
  builder.add("/scene/preview/add_mesh", makeAddPreviewMesh);
  builder.add("/scene/preview/add", genAddPreview);
  builder.addGlobal("/scene/preview/add_spec", {
    kind: "empty",
  });
  builder.add("/scene/preview/shape", genShapePreview);
  builder.add("/scene/preview/till", genTillPreview);
  builder.add("/scene/preview/dye", genDyePreview);
  builder.add("/scene/preview/water_plant", genWaterPlantPreview);
  builder.add("/scene/preview/plant", genPlantPreview);
}
