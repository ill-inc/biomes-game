import * as z from "zod";

export type TileType = "surface" | "fog";
export type TileZoom = number;
export type TilePos = [number, number];
export type TileKey =
  | `${TileType}/${TileZoom}_${TilePos[0]}_${TilePos[1]}`
  | "admin";

export const zTileMap = z.object({
  blob: z.string(),
});
export type TileMap = z.infer<typeof zTileMap>;
