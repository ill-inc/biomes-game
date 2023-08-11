import {
  biomesApiHandler,
  zQueryNumbers,
} from "@/server/web/util/api_middleware";
import type { Vec2, Vec3 } from "@/shared/math/types";
import { sample } from "lodash";
import { z } from "zod";

export default biomesApiHandler(
  {
    auth: "optional",
    query: z.object({
      position: zQueryNumbers,
      orientation: zQueryNumbers,
    }),
    response: z.instanceof(Buffer),
  },
  async ({
    context: { cameraClient },
    query: { position, orientation },
    unsafeResponse,
  }) => {
    const [startPosition, startOrientation] = sample(
      CONFIG.playerStartPositions
    )!;
    if (position.length !== 3) {
      position = [...startPosition];
    }
    if (orientation.length !== 2) {
      orientation = [...startOrientation];
    }
    const image = await cameraClient.takeScreenshot({
      position: position as Vec3,
      orientation: orientation as Vec2,
    });
    unsafeResponse.setHeader("Content-Type", "image/png");
    unsafeResponse.setHeader(
      "Content-Disposition",
      `attachment; filename=Biomes-${new Date().toISOString()}.png`
    );
    unsafeResponse.setHeader(
      "Cache-Control",
      `public,max-age=${5 * 60},immutable`
    );
    return image;
  }
);
