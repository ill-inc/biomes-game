export const RobotWearableSlotIds = ["chip"] as const;

export const CharacterWearableSlotIds = [
  "head",
  "hair",
  "hair_with_hat",
  "hat",
  "bottoms",
  "face",
  "top",
  "neck",
  "outerwear",
  "ears",
  "hands",
  "feet",
  "robot",
] as const;
export type CharacterWearableSlot = (typeof CharacterWearableSlotIds)[number];

export function asSlotName(x: string): CharacterWearableSlot {
  if (CharacterWearableSlotIds.indexOf(x as CharacterWearableSlot) == -1) {
    throw new Error(`"${x}" is not a valid Galois wearable slot name.`);
  }
  return x as CharacterWearableSlot;
}

export interface CharacterWearable {
  name: string;
  slot: CharacterWearableSlot;
}
