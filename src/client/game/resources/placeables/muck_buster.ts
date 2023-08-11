import type { ClientContext } from "@/client/game/context";

import { makeBasicPlaceableMesh } from "@/client/game/resources/placeables/basic";

import type { ClientResourceDeps } from "@/client/game/resources/types";
import type { BiomesId } from "@/shared/ids";

export async function makeMuckBusterReduxMesh(
  context: ClientContext,
  deps: ClientResourceDeps,
  id: BiomesId
) {
  const mesh = await makeBasicPlaceableMesh(context, deps, id, {
    noBreakableMaterial: true,
  });
  mesh.manualAnimationUpdate = (m, dt, globalTime) => {
    const s = 0.25 * (Math.sin(1.5 * globalTime) / 2 + 0.5);
    const pos = context.resources.get("/ecs/c/position", m.placeableId);
    mesh.three.position.y = (pos?.v[1] ?? 0) + s;
  };

  return mesh;
}
