import { zGetBiscuitResponse } from "@/client/components/admin/bikkie/requests";
import { iconUrl } from "@/client/components/inventory/icons";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { anItem } from "@/shared/game/item";
import { zBiomesId } from "@/shared/ids";
import defaultBiscuitIcon from "/public/hud/icon-16-biscuit.png";

export default biomesApiHandler(
  {
    auth: "admin",
    body: zBiomesId.array(),
    response: zGetBiscuitResponse,
    zrpc: true,
  },
  async ({ context: { bakery }, body: ids }) => {
    const [active, names] = await Promise.all([
      bakery.getActiveTray(),
      bakery.allNames(),
    ]);
    return ids.map((id) => {
      const definition = active.get(id);
      const name = names.find(([x]) => x === id)?.[1];
      if (!name) {
        return;
      }
      return {
        definition: definition ?? {
          id,
          attributes: {},
        },
        iconUrl: iconUrl(anItem(id), { defaultIcon: defaultBiscuitIcon.src }),
        name,
      };
    });
  }
);
