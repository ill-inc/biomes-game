import type { Inventory } from "@/shared/ecs/gen/components";
import { currencyBalance } from "@/shared/game/inventory";
import type { BiomesId } from "@/shared/ids";

export function currencyBalanceF(inventory: Inventory, currency: BiomesId) {
  const numerator = currencyBalance(inventory, currency);
  return Number(numerator);
}

export async function resetSafeLocalData() {
  const indexedDbs = await globalThis.indexedDB.databases();
  for (const db of indexedDbs) {
    if (db.name) {
      globalThis.indexedDB.deleteDatabase(db.name);
    }
  }
  localStorage.clear();
}
