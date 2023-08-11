import { isPaletteOption } from "@/galois/assets/color_palettes";
import type { WearableDescriptor } from "@/galois/assets/wearables";
import { animatedcharacterMeshFromWearables } from "@/galois/assets/wearables";
import type { AssetDataWithKind } from "@/galois/interface/types/data";
import { PoolAssetServer } from "@/galois/server/server";
import type { BinaryStore } from "@/server/shared/bikkie/binary";
import { colorStringToDescriptor } from "@/server/shared/bikkie/color";
import type { WearableClientDescriptor } from "@/shared/api/assets";
import {
  BIKKIE_ID_TO_WEARABLE_SLOT,
  type SlotToWearableMap,
} from "@/shared/api/assets";
import { APIError } from "@/shared/api/errors";
import type { PaletteOption } from "@/shared/asset_defs/color_palettes";
import type { CharacterWearableSlot } from "@/shared/asset_defs/wearables_list";
import type { Item } from "@/shared/game/item";
import { anItem } from "@/shared/game/item";
import { findItemEquippableSlot } from "@/shared/game/wearables";
import { mapMap } from "@/shared/util/collections";
import { ok } from "assert";
import { compact } from "lodash";

function slotForWearable(wearable: Item): CharacterWearableSlot | undefined {
  // This explicit check is required since facial items have no equippable slot.
  if (wearable.isHead) {
    return "head";
  }
  const slotId = findItemEquippableSlot(wearable);
  if (!slotId) {
    return;
  }
  return BIKKIE_ID_TO_WEARABLE_SLOT.get(slotId);
}

async function prepareWearableDescriptor(
  binaries: BinaryStore,
  clientDescriptor: WearableClientDescriptor
): Promise<WearableDescriptor | undefined> {
  if (clientDescriptor.primaryColor !== undefined) {
    ok(
      isPaletteOption(
        "color_palettes/item_primary_colors",
        clientDescriptor.primaryColor
      )
    );
  }
  ok(clientDescriptor.id, "Wearable descriptor must have an id.");
  const wearable = anItem(clientDescriptor.id);
  if (!wearable.vox) {
    if (wearable.galoisPath) {
      return {
        assetPath: wearable.galoisPath,
        primaryColor: clientDescriptor.primaryColor,
      };
    }
    return;
  }
  // New-style wearable,
  // - Derive properties from Biscuit attributes
  // - Derive the binary data from the vox attribute.
  const slot = slotForWearable(wearable);
  if (!slot) {
    return;
  }
  const data = await binaries.fetch(
    clientDescriptor.withHatVariant
      ? wearable.voxWithHatVariant ?? wearable.vox
      : wearable.vox
  );
  if (!data || data.length === 0) {
    return;
  }
  let palette: PaletteOption<"color_palettes/item_materials"> | undefined;
  const paletteFromAttribute = colorStringToDescriptor(wearable.paletteColor);
  if (paletteFromAttribute?.paletteId === "color_palettes/item_materials") {
    palette =
      paletteFromAttribute.colorId as PaletteOption<"color_palettes/item_materials">;
  }
  return {
    definition: {
      name: `data:,${data?.toString("base64")}`,
      slot,
      palette,
    } as const,
    primaryColor: clientDescriptor.primaryColor,
  };
}

async function prepareWearableDescriptors(
  binaries: BinaryStore,
  slotToWearableMap: SlotToWearableMap
): Promise<WearableDescriptor[]> {
  return compact(
    await Promise.all(
      mapMap(slotToWearableMap, (x) => prepareWearableDescriptor(binaries, x))
    )
  );
}

export interface AssetExportsServer {
  build(
    path: string,
    slotToWearableMap: SlotToWearableMap,
    skinColor?: string,
    eyeColor?: string,
    hairColor?: string
  ): Promise<AssetDataWithKind>;
  stop(): Promise<void>;
}

export class InvalidAssetExportServer implements AssetExportsServer {
  build(): Promise<AssetDataWithKind> {
    throw new APIError("not_found", "Asset server not enabled.");
  }
  async stop() {}
}

export class LazyAssetExportsServer implements AssetExportsServer {
  #delegate: AssetExportsServer | undefined;

  constructor(private readonly createFn: () => Promise<AssetExportsServer>) {}

  async build(
    path: string,
    slotToWearableMap: SlotToWearableMap,
    skinColor?: string,
    eyeColor?: string,
    hairColor?: string
  ): Promise<AssetDataWithKind> {
    if (!this.#delegate) {
      this.#delegate = await this.createFn();
    }
    return this.#delegate.build(
      path,
      slotToWearableMap,
      skinColor,
      eyeColor,
      hairColor
    );
  }

  async stop() {
    await this.#delegate?.stop();
  }
}

export class AssetExportsServerImpl implements AssetExportsServer {
  private assetServer: PoolAssetServer;

  constructor(private readonly binaries: BinaryStore, workerPoolSize: number) {
    this.assetServer = new PoolAssetServer(
      "./src/galois/",
      "./data",
      workerPoolSize
    );
  }

  async build(
    path: string,
    slotToWearableMap: SlotToWearableMap,
    skinColor?: string,
    eyeColor?: string,
    hairColor?: string
  ): Promise<AssetDataWithKind> {
    if (path !== "wearables/animated_player_mesh") {
      // TODO(top): Currently this is focused on wearable assets, but
      // this should be expanded to expose all "exported" assets.
      throw new Error(
        "Currently the Galois exports interface only works for wearables."
      );
    }

    ok(
      skinColor === undefined ||
        isPaletteOption("color_palettes/skin_colors", skinColor)
    );
    ok(
      eyeColor === undefined ||
        isPaletteOption("color_palettes/eye_colors", eyeColor)
    );
    ok(
      hairColor === undefined ||
        isPaletteOption("color_palettes/hair_colors", hairColor)
    );
    const assetData = await this.assetServer.build(
      animatedcharacterMeshFromWearables({
        wearableDescriptors: await prepareWearableDescriptors(
          this.binaries,
          slotToWearableMap
        ),
        skinColorId: skinColor,
        eyeColorId: eyeColor,
        hairColorId: hairColor,
      })
    );

    return assetData as AssetDataWithKind;
  }

  async stop() {
    await this.assetServer.stop();
  }
}

export type DataWithMimeType = [string | Buffer, string];

export function assetDataToDataWithMimeType(
  assetData: AssetDataWithKind
): DataWithMimeType {
  switch (assetData.kind) {
    case "GLTF":
      return [assetData.data, "model/gltf"];
    case "GLB":
      return [Buffer.from(assetData.data, "base64"), "model/gltf"];
    case "JSON":
      return [JSON.stringify(assetData.data), "application/json"];
    case "Block":
    case "BlockAtlas":
    case "BlockGeometryBuffer":
    case "BlockIndex":
    case "BlockMaterialBuffer":
    case "BlockMesh":
    case "BlockSample":
    case "BlockShape":
    case "BlockShapeIndex":
    case "BlockShapeTensor":
    case "BlockTensor":
    case "Flora":
    case "FloraAtlas":
    case "FloraGeometryBuffer":
    case "FloraIndex":
    case "FloraMesh":
    case "FloraSample":
    case "FloraTensor":
    case "LightingBuffer":
    case "Mask":
    case "OcclusionTensor":
    case "PNG":
    case "TerrainMesh":
    case "TerrainTensor":
    case "Texture":
    case "TextureAtlas":
    case "Transform":
    case "TypeScriptFile":
    case "VoxelMesh":
    case "WEBM":
    default:
      throw new Error(
        `Unimplemented conversion to content type for "${assetData.kind}".`
      );
  }
}
