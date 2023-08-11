import type { ClientContext } from "@/client/game/context";
import type { ClientResourcesBuilder } from "@/client/game/resources/types";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { Vec3f } from "@/shared/ecs/gen/types";
import type { Hit } from "@/shared/game/spatial";
import type { RegistryLoader } from "@/shared/registry";

export type Cursor = {
  startPos: Vec3f;
  dir: Vec3f;
  right: Vec3f;
  hit?: Hit;

  // Entities in-front of the player that can be attacked.
  attackableEntities: ReadonlyEntity[];
};
export function makeInitialCursor(): Cursor {
  return {
    startPos: [0, 0, 0],
    dir: [0, 0, -1],
    right: [1, 0, 0],
    attackableEntities: [],
  };
}

export function addCursorResources(
  _loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.addGlobal("/scene/cursor", makeInitialCursor());
}
