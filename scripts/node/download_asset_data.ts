import { ensurePublishedAssetsAreLocal } from "@/server/web/published_asset_data";

function run() {
  void ensurePublishedAssetsAreLocal();
}

if (require.main === module) {
  run();
}
