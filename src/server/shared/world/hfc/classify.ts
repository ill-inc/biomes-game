import type { ChangeToApply } from "@/shared/api/transaction";
import type { ProposedUpdate } from "@/shared/ecs/change";
import { HFC_COMPONENT_IDS } from "@/shared/ecs/gen/components";
import type { AsDelta, Entity } from "@/shared/ecs/gen/entities";
import {
  COMPONENT_ID_TO_PROP_NAME,
  type ComponentName,
} from "@/shared/ecs/gen/entities";
import { mapSet } from "@/shared/util/collections";

export const HFC_COMPONENT_NAMES = new Set<ComponentName>(
  mapSet(HFC_COMPONENT_IDS, (id) => COMPONENT_ID_TO_PROP_NAME[id])
);

// Classify a given change to apply by which component sets are affected:
// - undefined: Neither notably, can apply to both safely.
// - hfc: High frequency components are used, must go to that World
// - rc: Only regular components are used, must go to that World
// - mixed: A blend of components are used, the current implementation doesn't support this.
export function classifyChangeToApply(
  changeToApply: ChangeToApply
): "hfc" | "rc" | "mixed" | undefined {
  if (changeToApply.iffs) {
    for (const iff of changeToApply.iffs) {
      if (iff.length <= 2) {
        continue;
      }
      for (const componentId of iff.slice(2)) {
        // HFC does not support iff at all, but this check is for whether a change
        // involves HFC components in an iff (marking it as a mixed transaction).
        if (HFC_COMPONENT_IDS.has(componentId as number)) {
          return "mixed";
        }
      }
    }
  }
  let rcChange = Boolean(
    changeToApply.iffs || changeToApply.events || changeToApply.catchups
  );
  if (!changeToApply.changes) {
    return rcChange ? "rc" : undefined;
  }
  let hfcChange = false;
  for (const change of changeToApply.changes) {
    if (change.kind === "delete") {
      continue;
    }
    for (const componentName in change.entity) {
      if (componentName === "id") {
        continue;
      }
      if (HFC_COMPONENT_NAMES.has(componentName as ComponentName)) {
        hfcChange = true;
      } else {
        rcChange = true;
      }
    }
  }
  if (hfcChange) {
    if (rcChange) {
      return "mixed";
    }
    return "hfc";
  } else if (rcChange) {
    return "rc";
  }
}

export function partitionDeltasToUpdates(deltas: Iterable<AsDelta<Entity>>): {
  rcChanges: ProposedUpdate[];
  hfcChanges: ProposedUpdate[];
} {
  const rcChanges: ProposedUpdate[] = [];
  const hfcChanges: ProposedUpdate[] = [];
  for (const delta of deltas) {
    const rcComponents: any = {};
    let hasRcComponent = false;
    const hfcComponents: any = {};
    let hasHfcComponent = false;
    for (const key in delta) {
      if (key === "id") {
        continue;
      }
      const componentName = key as ComponentName;
      const value = delta[componentName];
      if (value === undefined) {
        continue;
      }
      if (HFC_COMPONENT_NAMES.has(componentName)) {
        hfcComponents[componentName] = value;
        hasHfcComponent = true;
      } else {
        rcComponents[componentName] = value;
        hasRcComponent = true;
      }
    }
    if (hasRcComponent) {
      rcChanges.push({
        kind: "update",
        entity: {
          id: delta.id,
          ...rcComponents,
        },
      });
    }
    if (hasHfcComponent) {
      hfcChanges.push({
        kind: "update",
        entity: {
          id: delta.id,
          ...hfcComponents,
        },
      });
    }
  }
  return { rcChanges, hfcChanges };
}
