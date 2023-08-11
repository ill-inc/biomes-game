import {
  biomesApiHandler,
  zQueryOptionalBiomesId,
} from "@/server/web/util/api_middleware";
import { conformsWith } from "@/shared/bikkie/core";
import { bikkie } from "@/shared/bikkie/schema/biomes";
import type { BiomesId } from "@/shared/ids";
import { zBiomesId } from "@/shared/ids";
import { zrpcWebSerialize } from "@/shared/zrpc/serde";
import { z } from "zod";

export const zBikkieLoadResponse = z.object({
  trayId: zBiomesId,
  encoded: z.tuple([zBiomesId, z.string(), z.array(z.number())]).array(),
  schemas: z.array(z.string()),
});

export type BikkieLoadResponse = z.infer<typeof zBikkieLoadResponse>;

export default biomesApiHandler(
  {
    auth: "optional",
    query: z.object({
      expectedTrayId: zQueryOptionalBiomesId,
    }),
    response: zBikkieLoadResponse,
  },
  async ({
    context: { bikkieRefresher },
    query: { expectedTrayId },
    unsafeResponse,
  }) => {
    const currentTray = await bikkieRefresher.currentTray();
    const tray =
      currentTray.id === expectedTrayId
        ? currentTray
        : await bikkieRefresher.force();
    if (expectedTrayId === tray.id) {
      // Trays are immutable.
      unsafeResponse.setHeader(
        "Cache-Control",
        `public,max-age=${365 * 24 * 60 * 60},immutable`
      );
    }
    const encoded: [BiomesId, string, number[]][] = [];
    const schemas: string[] = [];
    const allSchemas = bikkie.allSchemas();
    for (const [path] of allSchemas) {
      schemas.push(path);
    }
    for (const biscuit of tray.contents.values()) {
      const schemas: number[] = [];
      allSchemas.forEach(([, schema], i) => {
        if (conformsWith(schema, biscuit)) {
          schemas.push(i);
        }
      });
      encoded.push([biscuit.id, zrpcWebSerialize(biscuit), schemas]);
    }
    return { trayId: tray.id, schemas, encoded };
  }
);
