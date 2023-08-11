import { getLatestAssetsByPath } from "@/server/shared/drive/mirror";
import { createBdb, createStorageBackend } from "@/server/shared/storage";

async function main() {
  const storage = await createStorageBackend("firestore");
  const db = createBdb(storage);

  const latestByPath = await getLatestAssetsByPath(db);

  for (const [path, asset] of latestByPath.entries()) {
    console.log(`${path} -> ${asset.id} / ${asset.mirrored.hash}`);
  }
}

main();
