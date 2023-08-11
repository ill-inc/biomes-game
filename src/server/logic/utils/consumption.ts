import { startPlayerEmote } from "@/server/logic/utils/players";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import type { Delta } from "@/shared/ecs/gen/delta";
import type { Buff } from "@/shared/ecs/gen/types";
import {
  buffExpirationTime,
  buffTimeRemaining,
  buffType,
} from "@/shared/game/buffs";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import { weightedRandomIndex } from "@/shared/util/helpers";
import { minBy } from "lodash";

export function removeBuffBy({
  player,
  shouldRemoveBuff,
}: {
  player: Delta;
  shouldRemoveBuff: (buff: Buff) => boolean;
}) {
  const playerBuffs = player.buffsComponent()?.buffs;
  if (playerBuffs) {
    player.mutableBuffsComponent().buffs = playerBuffs.filter(
      (buff) => !shouldRemoveBuff(buff)
    );
  }
}

export function addBuff({
  itemId,
  player,
}: {
  itemId: BiomesId;
  player: Delta;
}) {
  // Get a weighted random sample from the buff entries.
  const entries = anItem(itemId).buffs ?? [];
  if (!entries.length) {
    return;
  }
  const sampledIndex = weightedRandomIndex(entries.map((e) => e[1]));
  const buffId = entries[sampledIndex][0];

  const time = secondsSinceEpoch();
  const newBuff: Buff = {
    item_id: buffId,
    start_time: time,
    from_id: itemId,
    is_disabled: false,
  };

  const buffs = [...(player.buffsComponent()?.buffs ?? [])].filter(
    (buff) => buffTimeRemaining(buff, time) > 0
  );
  const newBuffType = buffType(newBuff);
  if (newBuffType === "debuff") {
    buffs.push(newBuff);
  } else {
    const idx = buffs.findIndex((b) => b.item_id === buffId);
    if (idx < 0) {
      buffs.push(newBuff);
    } else {
      buffs[idx] = newBuff;
    }
  }

  const firstBuffToExpire = minBy(buffs, (buff) => buffExpirationTime(buff))!;
  player.setBuffsComponent({
    buffs,
    trigger_at: buffExpirationTime(firstBuffToExpire),
  });

  if (newBuffType === "debuff") {
    startPlayerEmote(player, {
      emote_type: "sick",
      emote_start_time: time + 5,
    });
  }
}
