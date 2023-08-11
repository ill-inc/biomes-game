import { matchingAssets } from "@/galois/assets";
import type { Exporter } from "@/galois/assets/scripts/export";
import { isSignal } from "@/galois/interface/types/data";
import type * as l from "@/galois/lang";
import { write } from "@/galois/publish/common";
import { join } from "path";

export async function publishDefinitions(
  definitionsRegex: RegExp,
  outputDir: string,
  exporter: Exporter,
  dryRun: boolean
) {
  const definitionPathAssetPairs = matchingAssets(definitionsRegex).map(
    ([p, a]) => [p.split("/").splice(1).join("/"), a]
  ) as [string, l.Asset][];

  await Promise.all(
    definitionPathAssetPairs.map(async ([path, asset]) => {
      try {
        const result = await exporter.export(asset);
        const filepath = join(outputDir, `${path}.${result.extension}`);

        if (!dryRun) {
          write(filepath, result.data);
        } else {
          console.log(`Build ${path} successfully.`);
        }
      } catch (e) {
        if (isSignal(e) && e.info === "unchanged") {
          return;
        }
        throw e;
      }
    })
  );
}
