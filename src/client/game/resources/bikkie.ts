import type { IngameAdminPages } from "@/client/components/InGameAdminPanel";
import type {
  ClientReactResources,
  ClientResources,
} from "@/client/game/resources/types";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";

export function setCurrentBiscuit(
  resources: ClientResources | ClientReactResources,
  id: BiomesId = INVALID_BIOMES_ID
) {
  resources.update("/admin/current_biscuit", (current) => (current.id = id));
}

export function setCurrentEntity(
  resources: ClientResources | ClientReactResources,
  entity: ReadonlyEntity | undefined = undefined
) {
  resources.update(
    "/admin/current_entity",
    (current) => (current.entity = entity)
  );
}

export function setInlineAdminVisibility(
  resources: ClientResources | ClientReactResources,
  tab: IngameAdminPages | undefined
) {
  const curVal = resources.get("/admin/inline_admin_visible").tab;
  if (curVal !== tab) {
    resources.set("/admin/inline_admin_visible", { tab: tab });
  }
}
