import type { WearableSlot } from "@/shared/bikkie/ids";
import { BikkieIds, WEARABLE_SLOTS } from "@/shared/bikkie/ids";
import type { Biscuit } from "@/shared/bikkie/schema/attributes";
import type { Item } from "@/shared/ecs/gen/types";
import { lazy } from "@/shared/util/lazy";

const WEARABLE_ATTRIBUTE = lazy(
  () =>
    new Map<WearableSlot, keyof Biscuit>([
      [BikkieIds.hat, "wearAsHat"],
      [BikkieIds.outerwear, "wearAsOuterwear"],
      [BikkieIds.top, "wearAsTop"],
      [BikkieIds.bottoms, "wearAsBottoms"],
      [BikkieIds.feet, "wearOnFeet"],
      [BikkieIds.hair, "wearAsHair"],
      [BikkieIds.face, "wearOnFace"],
      [BikkieIds.ears, "wearOnEars"],
      [BikkieIds.neck, "wearOnNeck"],
      [BikkieIds.hands, "wearOnHands"],
    ])
);

export function findItemEquippableSlot(
  item?: Item,
  slots?: WearableSlot[]
): WearableSlot | undefined {
  if (!item) {
    return;
  }
  for (const slot of slots ?? WEARABLE_SLOTS) {
    if (item[WEARABLE_ATTRIBUTE().get(slot)!]) {
      return slot;
    }
  }
}
