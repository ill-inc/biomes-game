import { getNonPublishedAssetPaths } from "@/server/web/published_asset_data";
import * as process from "process";

// Check that all asset data that we ex
function run() {
  void getNonPublishedAssetPaths().then((nonPublishedAssetPaths) => {
    if (nonPublishedAssetPaths.length == 0) {
      console.log(
        "All assets referenced by asset_versions.json are published."
      );
      process.exit(0);
    } else {
      console.error(
        "The following asset paths referenced by asset_versions.json are not published:"
      );
      nonPublishedAssetPaths.forEach((x) => {
        console.error(`  - ${x}`);
      });

      console.error();
      console.error("This issue should be corrected if you run:");
      console.error("  ./b galois assets publish");

      process.exit(1);
    }
  });
}

if (require.main === module) {
  run();
}
