import terrainDefs from "@/shared/asset_defs/gen/terrain.json";
import { definedOrThrow } from "@/shared/util/helpers";
import * as z from "zod";

export type TerrainName = keyof typeof terrainDefs;
export type TerrainID = (typeof terrainDefs)[keyof typeof terrainDefs];

export const terrainIDs = Object.values(terrainDefs);
export const terrainNames = Object.keys(terrainDefs) as TerrainName[];

export const zTerrainName = z.enum(
  terrainNames as [TerrainName, ...TerrainName[]]
);

const nameToId = new Map(Object.entries(terrainDefs));
const idToName = new Map(Object.entries(terrainDefs).map(([n, i]) => [i, n]));

export function isTerrainID(id: number): id is TerrainID {
  return idToName.has(id);
}

export function isTerrainName(name?: string): name is TerrainName {
  return name !== undefined && nameToId.has(name);
}

export function getTerrainID(name: TerrainName): TerrainID {
  return definedOrThrow(nameToId.get(name));
}

export function safeGetTerrainId(name?: string): TerrainID | undefined {
  return name ? nameToId.get(name) : undefined;
}

export function getTerrainName(id: TerrainID) {
  return definedOrThrow(idToName.get(id)) as TerrainName;
}

export function safeGetTerrainName(id?: number) {
  return (id ? idToName.get(id) : undefined) as TerrainName | undefined;
}
