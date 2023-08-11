import type { ClientContext } from "@/client/game/context";
import type { ClientResourcesBuilder } from "@/client/game/resources/types";
import type { RecipeBook } from "@/shared/ecs/gen/components";
import type { ReadonlyItemSet } from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";
import type { RegistryLoader } from "@/shared/registry";

// We keep a local view of recipes so that we can eagerly populate a notification on the client
// when the change out of ECS.

export interface RecipesState {
  hasBootstrapped: boolean;
  userId: BiomesId;
  recipes: ReadonlyItemSet;
}

export interface RecipesDelta {
  newUnlocked: Set<BiomesId>;
}

function makeRecipesState(userId: BiomesId): RecipesState {
  return {
    hasBootstrapped: false,
    userId,
    recipes: new Map(),
  };
}

export function recipesECSDelta(
  state: RecipesState,
  ecsRecipes: RecipeBook
): RecipesDelta {
  const newUnlocked = new Set<BiomesId>();
  ecsRecipes.recipes.forEach((item, key) => {
    if (!state.recipes.has(key)) {
      newUnlocked.add(item.id);
    }
  });

  return {
    newUnlocked,
  };
}

export async function addLocalRecipesResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.addGlobal(
    "/local_recipes",
    makeRecipesState(await loader.get("userId"))
  );
}
