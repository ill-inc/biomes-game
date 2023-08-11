import { zSaveBiscuitsRequest } from "@/client/components/admin/bikkie/requests";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import type { BiscuitDefinition } from "@/shared/bikkie/tray";
import { createTrayMetadata } from "@/shared/bikkie/tray";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { autoId } from "@/shared/util/auto_id";

export default biomesApiHandler(
  {
    auth: "admin",
    body: zSaveBiscuitsRequest,
    zrpc: true,
  },
  async ({
    context: { bakery, bikkieNotifiers },
    body: { trayName, updates },
    auth: { userId },
  }) => {
    const definitions: BiscuitDefinition[] = [];
    const renames: [BiomesId, string][] = [];
    for (const update of updates) {
      definitions.push({
        id: update.id,
        extendedFrom: update.extendedFrom,
        attributes: update.attributes ?? {},
      });
      if (update.name) {
        renames.push([update.id, update.name]);
      }
    }
    if (definitions.length > 0) {
      const tray = await bakery.saveAsActive(
        { meta: createTrayMetadata(trayName, userId) },
        ...definitions
      );
      log.info(`${userId} saved tray ${tray.id}`);
    }
    if (renames.length > 0) {
      await bakery.renameBiscuits(...renames);
    }

    await bikkieNotifiers.baking.notify(autoId());
  }
);
