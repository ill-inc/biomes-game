import { SchemaSpecificPage } from "@/client/components/admin/bikkie/BikkieEditorWrapper";

/*
Fix old editor.

import { AdminPage } from "@/client/components/admin/AdminPage";
import { BikkieEditorWrapper } from "@/client/components/admin/bikkie/BikkieEditorWrapper";
import { RecipesEditor } from "@/client/components/admin/recipes/RecipesEditor";
import { bikkie } from "@/shared/bikkie/schema/biomes";
import type { BiomesId } from "@/shared/ids";
import { safeParseBiomesId } from "@/shared/ids";
import { useRouter } from "next/router";
import { useCallback } from "react";

export const RecipesList: React.FunctionComponent<{}> = ({}) => {
  const router = useRouter();

  const stationId = safeParseBiomesId(router.query.stationId);
  const recipeId = safeParseBiomesId(router.query.recipeId);

  const setStationId = useCallback(
    (newStationId: BiomesId | undefined) => {
      if (stationId === newStationId) {
        return;
      }
      void router.push(
        {
          pathname: "/admin/recipes",
          query: {
            ...(newStationId ? { stationId: newStationId } : {}),
          },
        },
        undefined,
        { shallow: true }
      );
    },
    [stationId]
  );
  const setRecipeId = useCallback(
    (newRecipeId: BiomesId | undefined) => {
      if (recipeId === newRecipeId) {
        return;
      }
      void router.push(
        {
          pathname: "/admin/recipes",
          query: {
            ...(stationId ? { stationId } : {}),
            ...(newRecipeId ? { recipeId: newRecipeId } : {}),
          },
        },
        undefined,
        { shallow: true }
      );
    },
    [recipeId]
  );

  return (
    <AdminPage>
      <BikkieEditorWrapper
        schema={bikkie.schema.recipes}
        selectedId={recipeId}
        setSelectedId={setRecipeId}
      >
        <RecipesEditor
          stationId={stationId}
          setStationId={setStationId}
          recipeId={recipeId}
          setRecipeId={setRecipeId}
        />
      </BikkieEditorWrapper>
    </AdminPage>
  );
};
export default RecipesList;
*/

export default () => <SchemaSpecificPage schemas={["/recipes"]} />;
