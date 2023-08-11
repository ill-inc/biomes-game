import { scriptInit } from "@/server/shared/script_init";
import { createStorageBackend } from "@/server/shared/storage";
import { BiomesStorage } from "@/server/shared/storage/biomes";
import { log } from "@/shared/logging";

const MAX_CONCURRENT_WORK = 5000;

export async function copyCollection(from?: string, to?: string) {
  if (!from || !to) {
    log.fatal(`Usage: yarn script:copy_collection <from> <to>`);
    return;
  }

  await scriptInit();
  const storage = await createStorageBackend("firestore");

  log.info(`Copying collection from ${from} to ${to}`);
  const oldRef = storage.collection(BiomesStorage.escape(from));
  const newRef = storage.collection(BiomesStorage.escape(to));
  const work: Promise<unknown>[] = [];

  for (const doc of (await oldRef.get()).docs) {
    if (work.length > MAX_CONCURRENT_WORK) {
      await Promise.all(work);
      work.length = 0;
    }
    work.push(newRef.doc(doc.id).set(doc.data()));
  }
  await Promise.all(work);
  log.info("Done!");
}
const [from, to] = process.argv.slice(2);
copyCollection(from, to);
