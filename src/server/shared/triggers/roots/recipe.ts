import type { Trigger, TriggerContext } from "@/server/shared/triggers/core";
import { RootExecutor } from "@/server/shared/triggers/roots/root";
import { deserializeTrigger } from "@/server/shared/triggers/serde";
import type { Biscuit } from "@/shared/bikkie/schema/attributes";
import { anItem } from "@/shared/game/item";
import { addToSet, itemSetContains } from "@/shared/game/items";
import type { BiomesId } from "@/shared/ids";

export class RecipeExecutor extends RootExecutor {
  constructor(id: BiomesId, public readonly unlock: Trigger | undefined) {
    super(id);
  }

  static fromBiscuit(b: Biscuit): RecipeExecutor | undefined {
    if (!b.isRecipe) {
      return;
    }
    const unlock = b.unlock ? deserializeTrigger(b.unlock) : undefined;
    if (!b.isDefault && (!unlock || unlock?.isEmpty())) {
      // Is never unlocked.
      return;
    }
    return new RecipeExecutor(b.id, unlock);
  }

  run(context: TriggerContext): void {
    const recipe = anItem(this.id);
    if (itemSetContains(context.entity.recipeBook()?.recipes, recipe)) {
      return;
    }
    if (this.unlock && !this.unlock.update(context)) {
      return;
    }
    // Clear all trigger states, we're done!
    context.entity.mutableTriggerState().by_root.delete(this.id);
    addToSet(context.entity.mutableRecipeBook().recipes, recipe);
    context.publish({
      kind: "recipeUnlocked",
      entityId: context.entity.id,
      recipe,
    });
  }
}
