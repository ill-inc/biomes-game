import { biomesApiHandler } from "@/server/web/util/api_middleware";
import {
  WEARABLE_SLOT_TO_BIKKIE_ID,
  makePlayerMeshUrl,
  parsePlayerMeshUrl,
} from "@/shared/api/assets";
import type { CharacterWearableSlot } from "@/shared/asset_defs/wearables_list";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { fireAndForget } from "@/shared/util/async";
import { mapMap } from "@/shared/util/collections";

export default biomesApiHandler(
  {
    auth: "optional",
  },
  async ({ unsafeRequest }) => {
    if (!unsafeRequest.url) {
      // Ignore this warm request if there is no URL.
      return;
    }
    const host = unsafeRequest.headers["host"];
    if (!host) {
      // No host to warm up.
      return;
    }
    const playerMeshParse = parsePlayerMeshUrl(unsafeRequest.url);
    if (playerMeshParse.kind === "UrlParseError") {
      // Ignore invalid warm requests.
      return;
    }

    const path = new URL(
      makePlayerMeshUrl(
        mapMap(playerMeshParse.map, ({ id, primaryColor }, slotId) => [
          WEARABLE_SLOT_TO_BIKKIE_ID.get(slotId as CharacterWearableSlot) ??
            INVALID_BIOMES_ID,
          id,
          primaryColor,
        ]),
        playerMeshParse.skinColorId,
        playerMeshParse.eyeColorId,
        playerMeshParse.hairColorId
      ),
      `${process.env.NODE_ENV === "production" ? "https" : "http"}://${
        host ?? "biomes.gg"
      }`
    ).toString();
    fireAndForget(
      fetch(path, {
        headers: {
          "User-Agent": "Biomes Warmup",
        },
      })
    );
  }
);
