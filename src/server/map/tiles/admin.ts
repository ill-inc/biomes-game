import type { MapResourceDeps } from "@/server/map/resources";
import { MAX_ZOOM_LEVEL } from "@/server/map/tiles/config";
import { ImageBox, patch3 } from "@/server/map/tiles/utils";
import { createGauge } from "@/shared/metrics/metrics";
import { Timer } from "@/shared/metrics/timer";
import { awaitSequential } from "@/shared/util/async";

const mapGenAdminTime = createGauge({
  name: "map_gen_admin_time_ms",
  help: "The time to generate the admin image in millis.",
});

export async function genAdmin(deps: MapResourceDeps) {
  const timer = new Timer();
  try {
    const [c00, c01, c10, c11] = await awaitSequential(
      () => deps.get("/tiles/surface", MAX_ZOOM_LEVEL, -1, -1),
      () => deps.get("/tiles/surface", MAX_ZOOM_LEVEL, 0, -1),
      () => deps.get("/tiles/surface", MAX_ZOOM_LEVEL, -1, 0),
      () => deps.get("/tiles/surface", MAX_ZOOM_LEVEL, 0, 0)
    );
    return ImageBox.fromArray(
      patch3(c00.array(), c01.array(), c10.array(), c11.array())
    );
  } finally {
    mapGenAdminTime.set(timer.elapsed);
  }
}
