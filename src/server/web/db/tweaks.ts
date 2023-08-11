import type { TweakableConfig } from "@/server/shared/minigames/ruleset/tweaks";
import { defaultTweakableConfigValues } from "@/server/shared/minigames/ruleset/tweaks";
import type { BDB } from "@/server/shared/storage";
import type { TweakBlob } from "@/server/web/db/types";
import { deepMerge } from "@/shared/util/collections";
import {
  typesafeJSONParse,
  typesafeJSONStringify,
} from "@/shared/util/helpers";

export const serverFetchTweakableConfig = async (
  db: BDB
): Promise<TweakableConfig> => {
  const item = await db
    .collection("tweakable-config")
    .doc("config-document-1")
    .get();
  const itemData = item.data();
  const tweakData = itemData ? JSON.parse(itemData.blob) : {};
  const defaultClone = typesafeJSONParse(
    typesafeJSONStringify(defaultTweakableConfigValues)
  );

  const ret = deepMerge(defaultClone as {}, tweakData) as TweakableConfig;
  return ret;
};

export const serverSaveTweakableConfig = async (
  db: BDB,
  values: TweakableConfig,
  doMerge = true
) => {
  const valuesClone = typesafeJSONParse<TweakableConfig>(
    typesafeJSONStringify(values)
  );
  const defaultClone = await serverFetchTweakableConfig(db);

  const toSave = doMerge ? deepMerge(defaultClone, valuesClone) : valuesClone;

  const vals: TweakBlob = {
    blob: JSON.stringify(toSave),
  };

  await db.collection("tweakable-config").doc("config-document-1").set(vals);
};
