import primaryColorDefs from "@/shared/asset_defs/gen/primary_colors.json";

export type DyeID = number;
export type DyeName = keyof typeof primaryColorDefs;

const dyeSource = Object.entries(primaryColorDefs);
const nameToId = new Map(dyeSource);
const idToName = new Map(dyeSource.map(([k, v]) => [v, k as DyeName]));

export function getDyeID(name: DyeName): DyeID | undefined {
  return nameToId.get(name);
}

export function getDyeName(id: DyeID): DyeName | undefined {
  return idToName.get(id);
}

export function getDyeNames(): DyeName[] {
  return Array.from(nameToId.keys()) as DyeName[];
}
