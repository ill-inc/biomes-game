import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  ownedItemVersions,
  useOwnedItems,
} from "@/client/components/inventory/helpers";
import type {
  Item,
  ItemAndCount,
  OwnedItemReference,
} from "@/shared/ecs/gen/types";
import {
  OwnedItemReferencesEqual,
  maybeGetSlotByRef,
} from "@/shared/game/inventory";
import { countOf } from "@/shared/game/items";
import { ok } from "assert";
import { isEqual } from "lodash";
import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface DeltaInventoryOverride {
  ref: OwnedItemReference;
  item: Item;
  delta: bigint;
}

export interface SetInventoryOverride {
  ref: OwnedItemReference;
  value: ItemAndCount | undefined;
}

export interface InventoryOverride {
  ref: OwnedItemReference;
  value: ItemAndCount | undefined;
  validFor: ItemAndCount | undefined;
}

export type InventoryOverrideContextType = {
  overrides: InventoryOverride[];
  clearOverrides: () => void;
  overrideAt: (ref: OwnedItemReference) => InventoryOverride | undefined;
  setInventoryOverride: (override: SetInventoryOverride) => void;
  eagerSetInventoryOverride: (override: SetInventoryOverride) => void;
  combineInventoryOverride: (deltaOverride: DeltaInventoryOverride) => void;
  eagerCombineInventoryOverride: (
    deltaOverride: DeltaInventoryOverride
  ) => void;
  removeInventoryOverride: (ref: OwnedItemReference) => void;
};

export const InventoryOverrideContext =
  createContext<InventoryOverrideContextType>({
    overrides: [],
    clearOverrides: () => {},
    overrideAt: () => undefined,
    setInventoryOverride: (_override: SetInventoryOverride) => {},
    eagerSetInventoryOverride: (_override: SetInventoryOverride) => {},
    combineInventoryOverride: (_override: DeltaInventoryOverride) => {},
    eagerCombineInventoryOverride: (_override: DeltaInventoryOverride) => {},
    removeInventoryOverride: (_ref: OwnedItemReference) => {},
  });

export const useInventoryOverrideContext = () =>
  useContext(InventoryOverrideContext);

export function useCreateInventoryOverrideContext(): InventoryOverrideContextType {
  const { reactResources, userId } = useClientContext();
  const ownedItems = useOwnedItems(reactResources, userId);

  const [overrides, setOverrides] = useState<InventoryOverride[]>([]);

  useEffect(() => {
    setOverrides((overrides) => {
      const newItems: InventoryOverride[] = [];
      const invalidatedItems: InventoryOverride[] = [];
      for (const override of overrides) {
        const curValue = maybeGetSlotByRef(ownedItems, override.ref);
        if (!isEqual(override.validFor, curValue)) {
          invalidatedItems.push(override);
        } else {
          newItems.push(override);
        }
      }

      if (invalidatedItems.length === 0) {
        return overrides;
      } else {
        return newItems;
      }
    });
  }, [ownedItems, ...ownedItemVersions(reactResources, userId)]);

  const setInventoryOverride = useCallback(
    (override: SetInventoryOverride) => {
      const inventoryValue = maybeGetSlotByRef(ownedItems, override.ref);
      setOverrides((overrides) => {
        const newOverrides: typeof overrides = [];
        for (const oldOverride of overrides) {
          if (!OwnedItemReferencesEqual(override.ref, oldOverride.ref)) {
            newOverrides.push(oldOverride);
          }
        }

        newOverrides.push({
          ref: override.ref,
          validFor: inventoryValue,
          value: override.value,
        });
        return newOverrides;
      });
    },
    [ownedItems, ...ownedItemVersions(reactResources, userId)]
  );

  const removingMatchingOverride = useCallback(
    (override: SetInventoryOverride) => {
      setOverrides((oldOverrides) => [
        ...oldOverrides.filter(
          (e) =>
            OwnedItemReferencesEqual(e.ref, override.ref) &&
            isEqual(e.value, override.value)
        ),
      ]);
    },
    []
  );

  const eagerSetInventoryOverride = useCallback(
    (override: SetInventoryOverride) => {
      setInventoryOverride(override);
      setTimeout(() => removingMatchingOverride(override), 2000);
    },
    [ownedItemVersions, ...ownedItemVersions(reactResources, userId)]
  );

  const combineInventoryOverride = useCallback(
    (delta: DeltaInventoryOverride) => {
      const inventoryValue = maybeGetSlotByRef(ownedItems, delta.ref);
      ok(!inventoryValue?.item || isEqual(delta.item, inventoryValue.item));
      setOverrides((overrides) => {
        const newOverrides = [...overrides];

        let combined = false;
        for (let i = 0; i < newOverrides.length; i += 1) {
          const newOverride = newOverrides[i];
          if (
            inventoryValue &&
            OwnedItemReferencesEqual(newOverride.ref, delta.ref)
          ) {
            combined = true;
            const newCount = (newOverride.value?.count ?? 0n) - delta.delta;

            newOverrides[i] = {
              validFor: newOverride.validFor,
              value: newCount > 0n ? countOf(delta.item, newCount) : undefined,
              ref: newOverride.ref,
            };

            break;
          }
        }

        if (!combined) {
          ok(inventoryValue);
          const newCount = inventoryValue.count - delta.delta;
          newOverrides.push({
            ref: delta.ref,
            validFor: inventoryValue,
            value:
              newCount > 0n
                ? countOf(
                    inventoryValue.item,
                    inventoryValue.count - delta.delta
                  )
                : undefined,
          });
        }

        return newOverrides;
      });
    },
    [ownedItems, ...ownedItemVersions(reactResources, userId)]
  );

  const eagerCombineInventoryOverride = useCallback(
    (delta: DeltaInventoryOverride) => {
      combineInventoryOverride(delta);
      setTimeout(() => removeInventoryOverride(delta.ref), 2000);
    },
    [ownedItemVersions, ...ownedItemVersions(reactResources, userId)]
  );

  const removeInventoryOverride = useCallback((ref: OwnedItemReference) => {
    setOverrides((oldOverrides) => [
      ...oldOverrides.filter((e) => !OwnedItemReferencesEqual(e.ref, ref)),
    ]);
  }, []);

  const overrideAt = useCallback(
    (ref: OwnedItemReference) => {
      for (const override of overrides) {
        if (OwnedItemReferencesEqual(override.ref, ref)) {
          return override;
        }
      }

      return undefined;
    },
    [overrides]
  );

  const clearOverrides = useCallback(() => {
    setOverrides([]);
  }, []);

  return {
    combineInventoryOverride,
    eagerCombineInventoryOverride,
    overrides,
    eagerSetInventoryOverride,
    setInventoryOverride,
    removeInventoryOverride,
    overrideAt,
    clearOverrides,
  };
}

export const InventoryOverrideContextProvider: React.FunctionComponent<
  PropsWithChildren<{}>
> = ({ children }) => {
  const inventoryOverride = useCreateInventoryOverrideContext();
  return (
    <InventoryOverrideContext.Provider value={inventoryOverride}>
      {children}
    </InventoryOverrideContext.Provider>
  );
};
