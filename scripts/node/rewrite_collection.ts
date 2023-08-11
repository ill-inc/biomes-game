import { scriptInit } from "@/server/shared/script_init";
import { createBdb, createStorageBackend } from "@/server/shared/storage";
import {
  AnyCollectionSchema,
  CollectionReference,
} from "@/server/shared/storage/schema";
import { log } from "@/shared/logging";

const MAX_CONCURRENT_WORK = 5000;

export async function rewriteCollection(name?: string) {
  if (!name) {
    log.fatal(`Usage: yarn script:rewrite_collection <from> <to>`);
    return;
  }

  await scriptInit();
  const storage = await createStorageBackend("firestore");
  const db = createBdb(storage);

  log.info(`Rewriting collection ${name}`);
  const colRef = db.collection(
    name as any
  ) as CollectionReference<AnyCollectionSchema>;

  const work: Promise<unknown>[] = [];
  for (const doc of (await colRef.get()).docs) {
    if (work.length > MAX_CONCURRENT_WORK) {
      await Promise.all(work);
      work.length = 0;
    }
    work.push(doc.ref.set(doc.data()));
  }
  await Promise.all(work);
  log.info("Done!");
}
const [name] = process.argv.slice(2);
rewriteCollection(name);
