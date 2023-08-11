import type { BiomesId } from "@/shared/ids";

export type CrossbreedDef = {
  id: BiomesId;
  crosses: {
    seeds: BiomesId[];
    chance: number;
  }[];
};

export type CrossbreedEntry = {
  id: BiomesId;
  seeds: BiomesId[];
  chance: number;
};
