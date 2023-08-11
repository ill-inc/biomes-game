import type { ClientContext } from "@/client/game/context";
import type {
  ClientResourceDeps,
  ClientResourcesBuilder,
  WrappedResourcePrimitive,
} from "@/client/game/resources/types";
import { makeDisposable } from "@/shared/disposable";
import type { BiomesId } from "@/shared/ids";
import type { RegistryLoader } from "@/shared/registry";
import type { Object3D } from "three";
import { BufferGeometry, Line, LineBasicMaterial, Vector3 } from "three";

export function makeFishingLineThree(
  deps: ClientResourceDeps,
  id: BiomesId
): WrappedResourcePrimitive<Object3D | undefined> {
  const points = deps.get("/scene/fishing_line_points", id);

  if (!points.value) {
    return {
      value: undefined,
    };
  }

  const material = new LineBasicMaterial({ color: 0xffffff });
  const bufPoints: Array<Vector3> = [];
  bufPoints.push(new Vector3(...points.value[0]));
  bufPoints.push(new Vector3(...points.value[1]));

  const geometry = new BufferGeometry().setFromPoints(bufPoints);
  const line = new Line(geometry, material);

  return makeDisposable({ value: line }, () => {
    geometry.dispose();
  });
}

export async function addFishingResources(
  _loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.addGlobal("/scene/fishing_line_points", {
    value: undefined,
  });

  builder.add("/scene/fishing_line_mesh", makeFishingLineThree);
}
