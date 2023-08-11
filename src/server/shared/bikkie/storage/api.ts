import type { BakeryTrayStorage } from "@/server/shared/bikkie/bakery";
import type { BakedBiscuitTray } from "@/server/shared/bikkie/registry";

export interface BikkieStorage extends BakeryTrayStorage {
  save(biscuits: BakedBiscuitTray): Promise<void>;
  load(prior?: BakedBiscuitTray): Promise<BakedBiscuitTray>;
}
