import { genAdmin } from "@/server/map/tiles/admin";
import type { Colors } from "@/server/map/tiles/colors";
import { genColors } from "@/server/map/tiles/colors";
import type { MapConfig } from "@/server/map/tiles/config";
import { genConfig } from "@/server/map/tiles/config";
import { genFog } from "@/server/map/tiles/fog";
import type { Heights } from "@/server/map/tiles/heights";
import { genHeights } from "@/server/map/tiles/heights";
import type { Lighting, Occlusions } from "@/server/map/tiles/lighting";
import { genLighting, genOcclusions } from "@/server/map/tiles/lighting";
import type { Materials } from "@/server/map/tiles/materials";
import { genMaterials } from "@/server/map/tiles/materials";
import type { Preload } from "@/server/map/tiles/preload";
import { genPreload } from "@/server/map/tiles/preload";
import type { Surface } from "@/server/map/tiles/surface";
import { genSurface } from "@/server/map/tiles/surface";
import {
  genWorldDye,
  genWorldMuck,
  genWorldTerrain,
  genWorldWater,
} from "@/server/map/tiles/terrain";
import type { MapTextures } from "@/server/map/tiles/textures";
import { genTextures } from "@/server/map/tiles/textures";
import type { Tile, TileContext } from "@/server/map/tiles/types";
import type { ImageBox } from "@/server/map/tiles/utils";
import { yielding } from "@/server/map/utils";
import type { TileType } from "@/shared/map/types";
import type { Vec3 } from "@/shared/math/types";
import type { RegistryLoader } from "@/shared/registry";
import type { Node, NodeCollector, NodeMap } from "@/shared/resources/core";
import type { PathDef } from "@/shared/resources/path_map";
import type {
  TypedResourceDeps,
  TypedResources,
} from "@/shared/resources/types";
import { TypedResourcesBuilder } from "@/shared/resources/types";
import type { Tensor } from "@/shared/wasm/tensors";

export interface MapResourceTypes {
  "/config": PathDef<[], MapConfig>;
  "/textures": PathDef<[], Promise<MapTextures>>;
  "/tiles/admin": PathDef<[], Promise<ImageBox>>;
  "/tiles/colors": PathDef<Tile, Promise<Colors>>;
  "/tiles/fog": PathDef<[number, ...Tile], Promise<ImageBox>>;
  "/tiles/heights": PathDef<Tile, Promise<Heights>>;
  "/tiles/lighting": PathDef<Tile, Promise<Lighting>>;
  "/tiles/materials": PathDef<Tile, Promise<Materials>>;
  "/tiles/occlusions": PathDef<Tile, Promise<Occlusions>>;
  "/tiles/preload": PathDef<[TileType, number, ...Tile], Preload>;
  "/tiles/surface": PathDef<[number, ...Tile], Promise<Surface>>;
  "/world/muck": PathDef<Vec3, Tensor<"U8"> | undefined>;
  "/world/signal": PathDef<Vec3, undefined>;
  "/world/terrain": PathDef<Vec3, Tensor<"U32"> | undefined>;
  "/world/water": PathDef<Vec3, Tensor<"U8"> | undefined>;
  "/world/dye": PathDef<Vec3, Tensor<"U8"> | undefined>;
}

export type MapResources = TypedResources<MapResourceTypes>;
export type MapResourceDeps = TypedResourceDeps<MapResourceTypes>;

export class MapCollector implements NodeCollector {
  nodes = new Set<Node<unknown>>();
  constructor(private readonly capacity: number) {}

  preserve(node: Node<unknown>) {
    this.nodes.add(node);
  }

  collect(nodes: NodeMap) {
    if (this.nodes.size > this.capacity) {
      this.nodes.clear();
      for (const [, node] of nodes) {
        node.free();
      }
      nodes.clear();
    }
  }
}

export async function registerResources<C extends TileContext>(
  loader: RegistryLoader<C>
) {
  const builder = new TypedResourcesBuilder<MapResourceTypes>();
  builder.setCollector(new MapCollector(100_000));
  builder.add("/config", loader.provide(genConfig));
  builder.add("/textures", genTextures);
  builder.add("/tiles/admin", yielding(genAdmin));
  builder.add("/tiles/colors", yielding(genColors));
  builder.add("/tiles/fog", yielding(genFog));
  builder.add("/tiles/heights", loader.provide(yielding(genHeights)));
  builder.add("/tiles/lighting", yielding(genLighting));
  builder.add("/tiles/materials", loader.provide(yielding(genMaterials)));
  builder.add("/tiles/occlusions", yielding(genOcclusions));
  builder.add("/tiles/preload", loader.provide(genPreload));
  builder.add("/tiles/surface", yielding(genSurface));
  builder.add("/world/muck", loader.provide(genWorldMuck));
  builder.add("/world/signal", () => undefined);
  builder.add("/world/terrain", loader.provide(genWorldTerrain));
  builder.add("/world/water", loader.provide(genWorldWater));
  builder.add("/world/dye", loader.provide(genWorldDye));
  return builder.build();
}
