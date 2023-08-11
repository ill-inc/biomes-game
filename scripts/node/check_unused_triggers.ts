import { loadBikkieForScript } from "@/../scripts/node/helpers/bikkie";
import { bootstrapGlobalSecrets } from "@/server/shared/secrets";
import { deserializeTrigger } from "@/server/shared/triggers/serde";
import { getBiscuits } from "@/shared/bikkie/active";
import { attribs } from "@/shared/bikkie/schema/attributes";
import { bikkieTriggerDefinition } from "@/shared/bikkie/schema/types";
import { BiomesId } from "@/shared/ids";
import {
  StoredTriggerDefinition,
  zLeafStoredTriggerDefinition,
} from "@/shared/triggers/schema";
import { MultiMap } from "@/shared/util/collections";
import { sortBy, take } from "lodash";

export async function checkUnusedTriggers() {
  await bootstrapGlobalSecrets();
  await loadBikkieForScript();

  const biscuits = getBiscuits();

  const usedTriggers = new MultiMap<string, BiomesId>();
  for (const biscuit of biscuits) {
    for (const attr of attribs.all) {
      if (attr.type() === bikkieTriggerDefinition) {
        const trigger = biscuit[
          attr.name as unknown as keyof typeof biscuit
        ] as StoredTriggerDefinition | undefined;
        if (trigger) {
          const ds = deserializeTrigger(trigger);
          ds.visit((e) => {
            usedTriggers.add(e.kind, biscuit.id);
          });
        }
      }
    }
  }

  const allTriggers = new Set<string>([
    ...[
      ...(zLeafStoredTriggerDefinition.optionsMap.keys() as Iterable<string>),
    ],
    "all",
    "any",
    "seq",
  ]);

  const sortedUsed = sortBy(
    [...usedTriggers.keys()],
    (e) => -usedTriggers.get(e).length
  );
  console.log("-----");
  console.log("USED");
  console.log("-----");
  sortedUsed.forEach((e) => {
    console.log(
      `${e} (${usedTriggers.get(e).length}): ${take(
        usedTriggers.get(e),
        6
      ).join(", ")}${usedTriggers.get(e).length > 6 ? "..." : ""}`
    );
  });
  console.log("-----");
  console.log("UNUSED");
  console.log("-----");

  allTriggers.forEach((e) => {
    if (usedTriggers.get(e).length === 0) {
      console.log("UNUSED: ", e);
    }
  });
}

checkUnusedTriggers();
