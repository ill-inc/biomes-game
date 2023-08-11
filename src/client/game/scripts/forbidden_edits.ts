import type { ClientResources } from "@/client/game/resources/types";
import { makeDisposable } from "@/shared/disposable";
import { centerAABB, sizeAABB } from "@/shared/math/linear";
import type { ReadonlyAABB } from "@/shared/math/types";
import * as THREE from "three";

const FORBIDDEN_EFFECT_DURATION = 1;

export function forbiddenEditEffect(
  resources: ClientResources,
  key: string,
  aabb: ReadonlyAABB
) {
  const edits = resources.get("/scene/forbidden_edits");

  if (edits.edits.has(key)) {
    return;
  }
  const size = sizeAABB(aabb);
  const three = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshBasicMaterial({
      color: 0xccccff,
      transparent: true,
      opacity: 0.0,
    })
  );
  three.scale.set(1.02, 1.02, 1.02);
  three.position.set(...centerAABB(aabb));
  const createdAt = resources.get("/clock").time;
  edits.edits.set(
    key,
    makeDisposable(
      {
        three,
        createdAt,
        animationTick: (clock) => {
          const dt = clock - createdAt;
          const MAX_OPACITY = 0.1;
          const x = dt / FORBIDDEN_EFFECT_DURATION;
          three.material.opacity =
            MAX_OPACITY * 9 * x * (x - 1) * (x - 1.01) * (1.01 - x);
        },
      },
      () => {
        three.material.dispose();
        three.geometry.dispose();
      }
    )
  );
}

export class ForbiddenEditsScript {
  readonly name = "forbiddenEdits";

  constructor(private readonly resources: ClientResources) {}

  tick(_dt: number) {
    const clock = this.resources.get("/clock");
    const edits = this.resources.get("/scene/forbidden_edits");

    let invalidate = false;
    for (const [key, edit] of edits.edits) {
      if (edit.createdAt + FORBIDDEN_EFFECT_DURATION < clock.time) {
        edits.edits.delete(key);
        edit.dispose();
        invalidate = true;
      }
      edit.animationTick?.(clock.time);
    }

    if (invalidate) {
      this.resources.invalidate("/scene/forbidden_edits");
    }
  }
}
