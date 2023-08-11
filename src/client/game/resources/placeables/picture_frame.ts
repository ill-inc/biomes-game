import type { ClientContext } from "@/client/game/context";
import {
  isDoubleSidedFrame,
  isStandingFrameId,
} from "@/client/game/helpers/placeables";
import {
  gltfToBasePassThree,
  replaceBreakable,
} from "@/client/game/renderers/util";
import {
  getPlaceableSpatialLighting,
  loadPlaceableTypeMesh,
  setPlaceableOrientation,
} from "@/client/game/resources/placeables/helpers";
import type {
  AnimatedPlaceableMesh,
  PictureFrameInfo,
} from "@/client/game/resources/placeables/types";
import type { ClientResourceDeps } from "@/client/game/resources/types";
import {
  makeBasicMaterial,
  updateBasicMaterial,
} from "@/gen/client/game/shaders/basic";
import { makeDisposable } from "@/shared/disposable";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { squareVector } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";
import type { ImageSizes } from "@/shared/util/urls";
import { imageUrlForSize } from "@/shared/util/urls";
import { ok } from "assert";
import {
  BoxGeometry,
  CanvasTexture,
  ImageBitmapLoader,
  Mesh,
  Object3D,
  PlaneGeometry,
  Texture,
  sRGBEncoding,
} from "three";

function pictureSizeForBox(box: ReadonlyVec3): ImageSizes {
  if (box[2] <= 2) {
    return "grid";
  }
  return "big";
}

async function setPictureFrameUrl(
  pictureFrameInfo: PictureFrameInfo,
  url: string
) {
  pictureFrameInfo.imageBitmap?.close();
  try {
    // ImageBitmapLoader takes care of decoding the image ahead of texture
    // upload time, which is quite important for large picture frame images
    // which can cause stutters when the player gazes upon them for the first
    // time (as would be the case if we use TextureLoader).
    pictureFrameInfo.imageBitmap = await loadImageBitmap(url);
  } catch (error) {
    log.error(`Error while loading picture frame image from URL "${url}"`, {
      error,
    });
    pictureFrameInfo.picturePlane.visible = false;
    return;
  }
  const texture = new CanvasTexture(pictureFrameInfo.imageBitmap);
  texture.encoding = sRGBEncoding;
  pictureFrameInfo.pictureMaterial.uniforms.map?.value.dispose();
  updateBasicMaterial(pictureFrameInfo.pictureMaterial, {
    map: texture,
  });
  pictureFrameInfo.picturePlane.visible = true;
}

async function loadImageBitmap(url: string): Promise<ImageBitmap> {
  return new Promise<ImageBitmap>((resolve, reject) => {
    new ImageBitmapLoader().setOptions({ imageOrientation: "flipY" }).load(
      url,
      (imageBitmap) => resolve(imageBitmap),
      undefined,
      (error) => reject(error)
    );
  });
}

export async function makePlaceableFrameMesh(
  context: ClientContext,
  deps: ClientResourceDeps,
  id: BiomesId
): Promise<AnimatedPlaceableMesh> {
  const placeableComponent = deps.get("/ecs/c/placeable_component", id)!;
  const placeableItem = anItem(placeableComponent?.item_id);
  ok(placeableItem);

  const boxSize = anItem(placeableComponent.item_id)?.boxSize ?? squareVector;

  // Not re-using the same type mesh since we assume a new texture
  const gltf = await loadPlaceableTypeMesh(placeableItem);

  const destroyingMaterial = await deps.get("/materials/destroying_material");
  const [mesh, materials] = gltfToBasePassThree(
    gltf,
    replaceBreakable(destroyingMaterial.texture)
  );
  const pictureMaterial = makeBasicMaterial({
    map: new Texture(),
    baseColor: [1, 1, 1],
    useMap: true,
  });

  const pictureGeometry = isDoubleSidedFrame(placeableComponent.item_id)
    ? new BoxGeometry(boxSize[2], boxSize[2], 0.15)
    : new PlaneGeometry(boxSize[2], boxSize[2]);

  const picturePlane = new Mesh(pictureGeometry, pictureMaterial);
  picturePlane.visible = false;
  picturePlane.rotateY(-Math.PI / 2);

  const three = new Object3D();
  three.add(mesh);
  three.add(picturePlane);

  // Some frames are offset / standing
  if (isStandingFrameId(placeableComponent.item_id)) {
    mesh.position.set(0, 0, 0);
    picturePlane.position.set(0, 1.25, 0);
    picturePlane.scale.set(0.99, 0.99, 0.99);
  } else {
    // Nudge frame and picture plane outwards so we don't z-fight with voxels or the plane
    const zNudge = 0.02;
    mesh.position.set(-zNudge, 0, 0);
    mesh.scale.set(1.001, 1.001, 1.001);
    picturePlane.position.set(-2 * zNudge, boxSize[1] / 2, 0.0);
  }

  // Depend on position and orientation
  const orientation = deps.get("/ecs/c/orientation", id);
  const position = deps.get("/ecs/c/position", id);
  setPlaceableOrientation(three, orientation?.v);

  if (position) {
    three.position.fromArray(position.v);
  }

  // Cache spatial lighting since placeables won't move much
  const spatialLighting = getPlaceableSpatialLighting(deps, id);

  const pictureFrameInfo: PictureFrameInfo = {
    picturePlane,
    pictureMaterial,
    pictureComponentVersion: 0,
    pictureImageSize: pictureSizeForBox(boxSize),
    imageBitmap: undefined,
  };

  return makeDisposable(
    {
      placeableId: id,
      three,
      pictureFrameInfo,
      spatialLighting,
    },
    () => {
      materials.forEach((m) => m.dispose());
      pictureGeometry.dispose();
      pictureMaterial.uniforms.map?.value.dispose();
      pictureMaterial.dispose();
      pictureFrameInfo.imageBitmap?.close();
    }
  );
}

export async function updatePictureFrameInfo(
  context: ClientContext,
  deps: ClientResourceDeps,
  mesh: AnimatedPlaceableMesh
) {
  const pictureFrameInfo = mesh.pictureFrameInfo;
  if (!pictureFrameInfo) {
    return;
  }
  const frameComponent = deps.get(
    "/ecs/c/picture_frame_contents",
    mesh.placeableId
  );
  if (
    frameComponent &&
    frameComponent.photo_id &&
    pictureFrameInfo.pictureComponentVersion !== frameComponent.photo_id
  ) {
    pictureFrameInfo.pictureComponentVersion = frameComponent.photo_id;
    const postContents = await context.socialManager.postBundle(
      frameComponent.photo_id
    );
    if (postContents) {
      const imageSizeURL = imageUrlForSize(
        pictureFrameInfo.pictureImageSize,
        postContents.imageUrls
      );
      if (imageSizeURL) {
        await setPictureFrameUrl(pictureFrameInfo, imageSizeURL);
      }
    }
  } else if (frameComponent && frameComponent.minigame_id) {
    const minigame = await context.table.oob.oobFetchSingle(
      frameComponent.minigame_id
    );

    if (!minigame) return;

    if (!minigame?.minigame_component?.hero_photo_id) return;
    pictureFrameInfo.pictureComponentVersion =
      minigame?.minigame_component?.hero_photo_id;
    const postContents = await context.socialManager.postBundle(
      minigame?.minigame_component?.hero_photo_id
    );
    if (postContents) {
      const imageSizeURL = imageUrlForSize(
        pictureFrameInfo.pictureImageSize,
        postContents.imageUrls
      );
      if (imageSizeURL) {
        await setPictureFrameUrl(pictureFrameInfo, imageSizeURL);
      }
    }
  }
}
