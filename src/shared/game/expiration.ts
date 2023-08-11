import type { Item } from "@/shared/ecs/extern";
import { clamp } from "lodash";

// Currently this assumes that we charge and discharge at the same rate.

export function entityExpirationFromInventoryItem(
  item: Item,
  expirationDuration: number,
  clock: number
) {
  const chargesAt = item.chargesAt ?? 0;
  const remaining = clamp(chargesAt - clock, 0, expirationDuration);
  const extraCharge = item.extraCharge ?? 0;
  return clock + (expirationDuration - remaining) + extraCharge;
}

export function inventoryItemExpirationFromEntity(
  expiresAt: number | undefined,
  expirationDuration: number,
  expirationOverclockDuration: number,
  clock: number
) {
  const remainingWithOverclock = clamp(
    (expiresAt ?? 0) - clock,
    0,
    expirationDuration + expirationOverclockDuration
  );
  const remaining = clamp(remainingWithOverclock, 0, expirationDuration);
  const extraCharge = clamp(
    remainingWithOverclock - expirationDuration,
    0,
    expirationOverclockDuration
  );
  const chargesAt = clock + (expirationDuration - remaining);

  return { chargesAt, extraCharge };
}

export function feedExpiringEntity(
  expiresAt: number | undefined,
  feedDuration: number,
  expirationDuration: number,
  expirationOverclockDuration: number,
  clock: number
) {
  expiresAt = (expiresAt ?? 0) < clock ? clock : expiresAt ?? 0;

  return clamp(
    expiresAt + feedDuration,
    clock,
    clock + expirationDuration + expirationOverclockDuration
  );
}

export function timeRemaining(
  item: Item | undefined,
  time: number
): number | undefined {
  if (item?.isChargeable) {
    const chargesAt = item.chargesAt ?? 0;
    const chargeTime = item.chargeTime ?? 0;
    return clamp(chargesAt - time, 0, chargeTime);
  }
  if (item?.isDischargeable) {
    const dischargesAt = item.dischargesAt ?? 0;
    const chargeTime = item.chargeTime ?? 0;
    return clamp(dischargesAt - time, 0, chargeTime);
  }
}

export function chargeRemaining(
  item: Item | undefined,
  time: number
): number | undefined {
  if (item?.isChargeable) {
    const chargesAt = item.chargesAt ?? 0;
    const chargeTime = item.chargeTime ?? 0;
    const dt = clamp(chargesAt - time, 0, chargeTime);
    return clamp((100 * (chargeTime - dt)) / chargeTime, 0, 100);
  }
  if (item?.isDischargeable) {
    const dischargesAt = item.dischargesAt ?? 0;
    const chargeTime = item.chargeTime ?? 0;
    const dt = clamp(dischargesAt - time, 0, chargeTime);
    return clamp((100 * dt) / chargeTime, 0, 100);
  }
}
