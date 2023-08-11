import type { ClientContext } from "@/client/game/context";
import {
  cloneMaterials,
  gltfToBasePassThree,
} from "@/client/game/renderers/util";
import type {
  ClientResourceDeps,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import {
  WORLD_TO_VOX_SCALE,
  gltfDispose,
  parseGltf,
} from "@/client/game/util/gltf_helpers";
import {
  makeBlockBufferGeometryFromBase64,
  makeFloraBufferGeometryFromBase64,
} from "@/client/game/util/meshes";
import { resolveAssetUrlUntyped } from "@/galois/interface/asset_paths";
import type {
  BlockItemMeshData,
  FloraItemMeshData,
  GlassItemMeshData,
  ItemMeshData,
} from "@/galois/interface/types/data";
import { makeBlockItemMaterial } from "@/gen/client/game/shaders/block_item";
import { makeFloraItemMaterial } from "@/gen/client/game/shaders/flora_item";
import { staticUrlForAttribute } from "@/shared/bikkie/schema/binary";
import type { Disposable } from "@/shared/disposable";
import { makeDisposable } from "@/shared/disposable";
import type { Item } from "@/shared/game/item";
import { log } from "@/shared/logging";
import { affineToMatrix } from "@/shared/math/affine";
import type { RegistryLoader } from "@/shared/registry";
import { AcceptableAsPathKey } from "@/shared/resources/path_map";
import {
  itemDyedColor,
  resolveBinaryAttribute,
} from "@/shared/util/dye_helpers";
import { binaryFetch, jsonFetch } from "@/shared/util/fetch_helpers";
import { ok } from "assert";
import * as THREE from "three";
import { DoubleSide, Mesh } from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

interface ItemMeshInstanceImpl {
  three: THREE.Object3D;
  handAttachmentTransform?: THREE.Matrix4;
}
export type ItemMeshInstance = Disposable<ItemMeshInstanceImpl>;

// Allows efficient creation of an instance of an item mesh.
export type ItemMeshFactory = () => ItemMeshInstance;

async function makeBlockItemMesh(
  _clientContext: ClientContext,
  deps: ClientResourceDeps,
  meshData: BlockItemMeshData
) {
  const [textures] = await Promise.all([deps.get("/terrain/block/textures")]);

  const geometry = makeBlockBufferGeometryFromBase64(
    meshData.vertices,
    meshData.indices
  );
  geometry.translate(-0.5, -0.5, -0.5);
  geometry.scale(10, 10, 10);

  return makeDisposable(
    () => {
      const material = makeBlockItemMaterial({
        colorMap: textures.colorMap,
        mreaMap: textures.mreaMap,
        sampleIndex: meshData.sample,
        textureIndex: textures.index,
      });
      return makeDisposable(
        {
          three: new Mesh(geometry, material),
        },
        () => material.dispose()
      );
    },
    () => {
      geometry.dispose();
    }
  );
}

async function makeGlassItemMesh(
  _clientContext: ClientContext,
  deps: ClientResourceDeps,
  meshData: GlassItemMeshData
) {
  const [textures] = await Promise.all([deps.get("/terrain/glass/textures")]);

  const geometry = makeBlockBufferGeometryFromBase64(
    meshData.vertices,
    meshData.indices
  );
  geometry.translate(-0.5, -0.5, -0.5);
  geometry.scale(10, 10, 10);

  return makeDisposable(
    () => {
      // TODO(matthew): Make this GlassItemMaterial. Currently can't since that results
      // in player and item having different scenes.
      const material = makeBlockItemMaterial({
        colorMap: textures.colorMap,
        mreaMap: textures.mreaMap,
        sampleIndex: meshData.sample,
        textureIndex: textures.index,
      });
      return makeDisposable(
        {
          three: new Mesh(geometry, material),
        },
        () => material.dispose()
      );
    },
    () => {
      geometry.dispose();
    }
  );
}

async function makeFloraItemMesh(
  _clientContext: ClientContext,
  deps: ClientResourceDeps,
  meshData: FloraItemMeshData
) {
  const [colorMap] = await Promise.all([deps.get("/terrain/flora/colors")]);

  const geometry = makeFloraBufferGeometryFromBase64(
    meshData.vertices,
    meshData.indices
  );
  geometry.translate(0, 0, 0);
  geometry.scale(8, 8, 8);

  return makeDisposable(
    () => {
      const material = makeFloraItemMaterial({ colorMap });
      material.side = DoubleSide;
      return makeDisposable(
        {
          three: new Mesh(geometry, material),
        },
        () => material.dispose()
      );
    },
    () => {
      geometry.dispose();
    }
  );
}

export async function loadItemGltf(
  item: Item
): Promise<Disposable<GLTF> | undefined> {
  ok(item.mesh);
  const buffer = await binaryFetch(
    staticUrlForAttribute(resolveBinaryAttribute(item.mesh, item))
  );

  const gltf = await parseGltf(buffer);

  return makeDisposable(gltf, () => {
    gltfDispose(gltf);
  });
}

async function gltfToItemMesh(
  data: string | ArrayBuffer,
  handAttachmentTransform: number[],
  inWorldScale: boolean
) {
  if (handAttachmentTransform.length !== 16) {
    throw new Error(
      "Expected GLTF item mesh hand attachment transform to be an array of 16 elements."
    );
  }
  const threeHandTransform = new THREE.Matrix4().fromArray(
    handAttachmentTransform
  );

  const gltf = await parseGltf(data);
  const [three, materials] = gltfToBasePassThree(gltf);

  const templateObject = (() => {
    if (!inWorldScale) {
      return three;
    }
    three.scale.setScalar(WORLD_TO_VOX_SCALE);
    const parent = new THREE.Object3D();
    parent.add(three);
    return parent;
  })();

  return makeDisposable(
    () => {
      const three = templateObject.clone();
      const [instMats, _oldMaterials] = cloneMaterials(three);
      return makeDisposable(
        {
          three,
          handAttachmentTransform: threeHandTransform,
        },
        () => {
          instMats.forEach((material) => material.dispose());
        }
      );
    },
    () => {
      gltfDispose(gltf);
      materials.forEach((m) => m.dispose());
    }
  );
}

function itemMeshPath(item: Item) {
  // Based on the item attributes, decide how to fetch or create the mesh.
  const meshPath = (() => {
    const meshGaloisPath = item.meshGaloisPath;
    if (meshGaloisPath) {
      return `item_meshes/${meshGaloisPath}`;
    }

    const galoisPath = item.galoisPath;
    if (galoisPath) {
      return `item_meshes/${galoisPath}`;
    }
  })();

  // Return the resolved asset URL for the mesh path if it exists.
  const url = meshPath ? resolveAssetUrlUntyped(meshPath) : undefined;
  if (url) {
    return url;
  }

  // Use backpack as a fallback mesh.
  log.error(`Failed to resolve mesh path "${meshPath}" for item "${item.id}"`);
  return resolveAssetUrlUntyped("item_meshes/items/cardboard_box")!;
}

async function resolveGaloisItemMesh(
  context: ClientContext,
  deps: ClientResourceDeps,
  item: Item,
  path: string
) {
  const mesh = await jsonFetch<ItemMeshData>(path);
  switch (mesh.kind) {
    case "GLTFItemMesh":
      {
        const handAttachmentTransform = item.attachmentTransform
          ? affineToMatrix(item.attachmentTransform)
          : mesh.hand_attachment_transform;
        switch (mesh.data.kind) {
          case "GLB":
            return gltfToItemMesh(
              Buffer.from(mesh.data.data, "base64").buffer,
              handAttachmentTransform,
              !!item.mesh
            );
          case "GLTF":
            return gltfToItemMesh(
              mesh.data.data,
              handAttachmentTransform,
              !!item.mesh
            );
        }
      }
      break;
    case "BlockItemMesh":
      return makeBlockItemMesh(context, deps, mesh);
    case "GlassItemMesh":
      return makeGlassItemMesh(context, deps, mesh);
    case "FloraItemMesh":
      return makeFloraItemMesh(context, deps, mesh);
  }
  throw new Error("Unknown item mesh kind.");
}

export class ItemMeshKey extends AcceptableAsPathKey {
  constructor(public readonly item: Item) {
    super();
  }

  toString() {
    return `${this.item.id}:${itemDyedColor(this.item)}`;
  }
}

async function makeItemMesh(
  context: ClientContext,
  deps: ClientResourceDeps,
  { item }: ItemMeshKey
): Promise<ItemMeshFactory> {
  if (item.mesh) {
    try {
      return await gltfToItemMesh(
        await binaryFetch(
          staticUrlForAttribute(resolveBinaryAttribute(item.mesh, item))
        ),
        affineToMatrix(item.attachmentTransform),
        true
      );
    } catch (error) {
      log.error("Failed to find item mesh", { id: item.id, error });
      return resolveGaloisItemMesh(
        context,
        deps,
        item,
        "item_meshes/items/cardboard_box"
      );
    }
  }
  return resolveGaloisItemMesh(context, deps, item, itemMeshPath(item));
}

export async function addItemMeshResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.add("/scene/item/mesh", loader.provide(makeItemMesh));
}
