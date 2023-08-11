import type { Delta } from "@/shared/ecs/gen/delta";
import type { Item } from "@/shared/ecs/gen/types";
import { findItemEquippableSlot } from "@/shared/game/wearables";
import type { BiomesId } from "@/shared/ids";
import { ok } from "assert";

export class Outfit {
  constructor(private readonly delta: Delta) {
    ok(this.delta.wearing(), "Outfit must have a wearing component");
    ok(this.delta.placedBy(), "Outfits must be placed");
  }

  // Predicate to check if the given entity can edit the outfit.
  public canBeModifiedBy(entityId: BiomesId): boolean {
    return this.delta.placedBy()?.id === entityId;
  }

  // Equip the outfit on the given entity.
  public equipToEntity(equipper: Delta) {
    ok(equipper.wearing(), "Equipper must have a wearing component");
    const temp = this.delta.mutableWearing();
    this.delta.setWearing(equipper.mutableWearing());
    equipper.setWearing(temp);
  }

  // Add an item to the outfit and return the item that was replaced, if any.
  public addToOutfit(item: Item): Item | undefined {
    const equipSlot = findItemEquippableSlot(item);
    ok(item.isWearable, "Item must be wearable");
    ok(equipSlot, "Item must have an equip slot");
    const existingWearable = this.delta.mutableWearing().items.get(equipSlot);
    this.delta.mutableWearing().items.set(equipSlot, item);

    return existingWearable;
  }
}
