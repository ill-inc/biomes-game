import type { BakedBiscuitTray } from "@/server/shared/bikkie/registry";
import type { BikkieStorage } from "@/server/shared/bikkie/storage/api";
import { emptyBakedTray } from "@/server/shared/bikkie/storage/baked";
import { type BiscuitTray } from "@/shared/bikkie/tray";
import type { BiomesId } from "@/shared/ids";

export class EmptyBikkieStorage implements BikkieStorage {
  private readonly tray = emptyBakedTray();

  async saveDefinition(_tray: BiscuitTray) {
    throw new Error("Not implemented");
  }

  async loadDefinition(_id: BiomesId): Promise<BiscuitTray | undefined> {
    return;
  }

  async save(_baked: BakedBiscuitTray) {
    throw new Error("Not implemented");
  }

  async load(): Promise<BakedBiscuitTray> {
    return this.tray;
  }
}
