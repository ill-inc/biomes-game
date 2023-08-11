import type { BiomesId } from "@/shared/ids";

export function integralCurrencyAmount(id: BiomesId, amount: number): bigint {
  return BigInt(Math.floor(amount));
}
