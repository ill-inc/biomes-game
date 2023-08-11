import { blockIDs } from "@/galois/assets/blocks";
import * as l from "@/galois/lang";

interface Item {
  key: string;
  type: string;
  icon: string;
  blockId: l.BlockID | null;
}

type ItemEntries = {
  [K in keyof Item]: [K, Item[K]];
}[keyof Item][];

const items: ItemEntries[] = [];

function addItem(item: Item) {
  items.push(Object.entries(item) as [keyof Item, any][]);
}

function addBlock(key: string, id: l.BlockID) {
  addItem({
    key,
    type: "block",
    icon: `icons/blocks/${key}`,
    blockId: id,
  });
}

addBlock("grass", blockIDs.grass);
addBlock("dirt", blockIDs.dirt);
addBlock("oak_log", blockIDs.oak_log);
addBlock("stone", blockIDs.stone);
addBlock("pumpkin", blockIDs.pumpkin);

export function getAssets(): Record<string, l.Asset> {
  return {
    "items/table": l.ToItemTable(items),
  };
}
