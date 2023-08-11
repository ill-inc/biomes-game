import { AssetDrive } from "@/server/shared/drive/google";
import { Asset } from "@/shared/drive/types";

async function main() {
  const drive = await AssetDrive.create();
  let fetch: Asset | undefined;
  for (const asset of await drive.listAssets()) {
    console.log(asset.path, asset.name, asset.size, asset.mime, asset.md5);
    fetch = asset;
  }
  console.log("Listed", (await drive.listAssets()).length, "assets");
}

main();
