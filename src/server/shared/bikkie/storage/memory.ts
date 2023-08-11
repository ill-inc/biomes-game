import type { BakedBiscuitTray } from "@/server/shared/bikkie/registry";
import type { BikkieStorage } from "@/server/shared/bikkie/storage/api";
import { emptyBakedTray } from "@/server/shared/bikkie/storage/baked";
import { type BiscuitTray } from "@/shared/bikkie/tray";
import { cloneDeepWithItems } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";

export class MemoryBikkieStorage implements BikkieStorage {
  private definitions = new Map<BiomesId, BiscuitTray>();
  private tray = emptyBakedTray();

  async saveDefinition(tray: BiscuitTray) {
    this.definitions.set(tray.id, tray);
  }

  async loadDefinition(id: BiomesId): Promise<BiscuitTray | undefined> {
    return this.definitions.get(id);
  }

  async save(baked: BakedBiscuitTray) {
    this.tray = cloneDeepWithItems(baked);
  }

  async load(): Promise<BakedBiscuitTray> {
    return this.tray;
  }
}
