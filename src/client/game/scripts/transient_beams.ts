import type { ClientResources } from "@/client/game/resources/types";

export class TransientBeamsScript {
  readonly name = "transientBeams";

  static GC_TIME = 10;

  lastGC?: number;
  constructor(private readonly resources: ClientResources) {}

  tick(_dt: number) {
    const clock = this.resources.get("/clock");
    if (
      !this.lastGC ||
      clock.time - this.lastGC > TransientBeamsScript.GC_TIME
    ) {
      const oldBeams = this.resources.get("/scene/beams/transient");
      let invalidate = false;
      for (const [k, v] of oldBeams.beams) {
        if (v.expiresAt < clock.time) {
          oldBeams.beams.delete(k);
          v.dispose();
          invalidate = true;
        }
      }

      if (invalidate) {
        this.resources.set("/scene/beams/transient", oldBeams);
      }
    }
  }
}
