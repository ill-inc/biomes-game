import type { MapResourceDeps } from "@/server/map/resources";
import type { TileContext } from "@/server/map/tiles/types";
import type { ImageBox } from "@/server/map/tiles/utils";

import type { TileType } from "@/shared/map/types";

export type Preload = Promise<ImageBox | undefined>;

export async function genPreload(
  { preload }: TileContext,
  _: MapResourceDeps,
  type: TileType,
  level: number,
  u: number,
  v: number
) {
  const box = preload.get(type, level, [u, v]);
  if (box) {
    return box();
  }
}
