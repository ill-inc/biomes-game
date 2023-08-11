import { useMatchingBiscuits } from "@/client/components/admin/bikkie/search";
import { ITEM_TYPES } from "@/shared/bikkie/ids";
import { useMemo } from "react";

export function useItemTypes() {
  const allBiscuits = useMatchingBiscuits();
  return useMemo(
    () => allBiscuits.filter((b) => ITEM_TYPES.has(b.id)),
    [allBiscuits]
  );
}
