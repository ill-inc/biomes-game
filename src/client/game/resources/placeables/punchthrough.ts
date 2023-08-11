import type { ClientContext } from "@/client/game/context";
import { CSS3DObject } from "@/client/game/renderers/three_ext/css3d";
import { disposeObject3D } from "@/client/game/renderers/util";
import type { AnimatedPlaceableMesh } from "@/client/game/resources/placeables/types";
import type { ClientResourceDeps } from "@/client/game/resources/types";
import { makePunchthroughMaterial } from "@/gen/client/game/shaders/punchthrough";
import { anItem } from "@/shared/game/item";
import { squareVector } from "@/shared/math/linear";
import { normalizeAngle } from "@/shared/math/rotation";
import { Mesh, PlaneGeometry } from "three";

export async function updatePunchthroughInfo(
  context: ClientContext,
  deps: ClientResourceDeps,
  mesh: AnimatedPlaceableMesh
) {
  const placeableComponent = deps.get(
    "/ecs/c/placeable_component",
    mesh.placeableId
  );

  const item = anItem(placeableComponent?.item_id);

  if (!item?.isCSS3DElement || !placeableComponent) {
    return;
  }

  const element = deps.get("/scene/css3d_element", mesh.placeableId).element;
  if (!element) {
    disposeObject3D(mesh.punchthrough);
    mesh.punchthrough = undefined;
    mesh.css3d = undefined;
    return;
  }

  // Always update position and orientation
  const orientation = deps.get("/ecs/c/orientation", mesh.placeableId);
  const rotation = orientation
    ? normalizeAngle(orientation.v[1] - Math.PI / 2)
    : 0;
  const position = deps.get("/ecs/c/position", mesh.placeableId)?.v ?? [
    0, 0, 0,
  ];

  const placeableItem = anItem(placeableComponent.item_id);
  const boxSize =
    placeableItem.punchthroughSize ?? placeableItem.boxSize ?? squareVector;
  const translateX = placeableItem.punchthroughPosition?.[0] ?? 0;
  const translateY = placeableItem.punchthroughPosition?.[1] ?? boxSize[1] / 2;
  const translateZ = placeableItem.punchthroughPosition?.[2] ?? 0.01;

  const css3d = new CSS3DObject(element);
  css3d.scale.set(0.01, 0.01, 0.01);
  css3d.rotation.y = rotation;
  css3d.rotateY(-Math.PI / 2);
  css3d.position.fromArray(position);
  css3d.translateX(translateX);
  css3d.translateY(translateY);
  css3d.translateZ(translateZ);
  css3d.matrixWorldNeedsUpdate = true;

  const planeGeometry = new PlaneGeometry(boxSize[2], boxSize[1]);
  const punchthroughMaterial = makePunchthroughMaterial({});
  const punchthrough = new Mesh(planeGeometry, punchthroughMaterial);

  punchthrough.rotation.y = rotation;
  punchthrough.rotateY(-Math.PI / 2);
  punchthrough.position.fromArray(position);
  punchthrough.translateX(translateX);
  punchthrough.translateY(translateY);
  punchthrough.translateZ(translateZ);
  punchthrough.matrixWorldNeedsUpdate = true;

  disposeObject3D(mesh.punchthrough);
  mesh.punchthrough = punchthrough;
  mesh.css3d = css3d;
}
