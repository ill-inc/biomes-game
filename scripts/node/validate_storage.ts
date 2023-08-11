import { scriptInit } from "@/server/shared/script_init";
import { createBdb, createStorageBackend } from "@/server/shared/storage";
import { BiomesStorage } from "@/server/shared/storage/biomes";
import {
  AnyCollectionSchema,
  AnyDocumentSchema,
} from "@/server/shared/storage/schema";
import { log } from "@/shared/logging";
import { isEqual } from "lodash";
import { ZodTypeAny } from "zod";

interface ValidationConfig {
  detailedWarnings: boolean;
  checkDataChanges: boolean;
  performWrites: boolean;
}

function reportParseError<T extends ZodTypeAny>(
  config: ValidationConfig,
  path: string,
  schema: T,
  value: any
): number {
  const result = schema.safeParse(value);
  if (!result.success) {
    if (config.detailedWarnings) {
      log.warn(`${path}: ${value}`, { error: result.error });
    } else {
      log.warn(`${path}: ${value}`);
    }
    return 1;
  }
  return 0;
}

export async function* unsafeStreamingRead(
  ref: BiomesStorage.CollectionReference
): AsyncGenerator<BiomesStorage.QueryDocumentSnapshot, void, undefined> {
  const fetchPage = (from?: BiomesStorage.QueryDocumentSnapshot) =>
    (from === undefined ? ref : ref.startAfter(from)).limit(1000).get();
  let nextPage = fetchPage();
  while (true) {
    const page = await nextPage;
    if (page.empty) {
      return;
    }
    nextPage = fetchPage(page.docs[page.docs.length - 1]);
    yield* page.docs;
  }
}

async function validateDocument(
  config: ValidationConfig,
  path: string,
  schema: AnyDocumentSchema,
  doc: BiomesStorage.QueryDocumentSnapshot
): Promise<number> {
  let error = reportParseError(config, path, schema.value, doc.data());
  if (!error && config.checkDataChanges) {
    const newData = schema.value.parse(doc.data());
    if (!isEqual(newData, doc.data())) {
      log.warn(`${path}: Update required.`, {
        oldValue: doc.data(),
        newValue: newData,
      });

      if (config.performWrites) {
        log.info(`${path}: Updating...`);
        await doc.ref.set(newData);
      }
    }
  }
  for (const collection of await doc.ref.listCollections()) {
    const colPath = `${path}/${collection.id}`;
    let found = false;
    for (const collectionSchema of schema.collections) {
      const idResult = collectionSchema.id.safeParse(collection.id);
      if (!idResult.success) {
        continue;
      }
      found = true;
      error += await validateCollection(
        config,
        colPath,
        collectionSchema,
        collection
      );
    }
    if (!found) {
      log.error(`${colPath}: No ID schema matches.`);
      error += 1;
    }
  }
  return error;
}

async function validateCollection(
  config: ValidationConfig,
  path: string,
  schema: AnyCollectionSchema,
  ref: BiomesStorage.CollectionReference
): Promise<number> {
  let error = reportParseError(config, `${path}/id`, schema.id, ref.id);
  const work: Promise<number>[] = [];

  const flush = async () => {
    error += (await Promise.all(work)).reduce((a, b) => a + b, 0);
    work.length = 0;
  };

  for await (const doc of unsafeStreamingRead(ref)) {
    if (work.length > 100) {
      await flush();
    }
    const docPath = `${path}/${doc.id}`;
    let found = false;
    for (const docSchema of schema.documents) {
      const idResult = docSchema.id.safeParse(doc.id);
      if (!idResult.success) {
        continue;
      }
      found = true;
      work.push(validateDocument(config, docPath, docSchema, doc));
    }
    if (!found) {
      log.error(`${docPath}: No ID schema matches.`);
      error += 1;
    }
  }
  await flush();
  return error;
}

async function validateStorage(collectionsOrFlags: string[]) {
  await scriptInit();

  const detailedWarnings = collectionsOrFlags.includes("--detailed");
  const checkDataChanges = collectionsOrFlags.includes("--check");
  const performWrites = collectionsOrFlags.includes("--write");

  if (performWrites) {
    log.error("WARNING: --write specified, writes will be performed!");
  }

  const storage = await createStorageBackend("firestore");
  const db = createBdb(storage);

  let totalErrors = 0;
  for (const collectionName of collectionsOrFlags) {
    if (collectionName.startsWith("--")) {
      continue;
    }
    log.warn(`Validating: ${collectionName}`);
    const ref = db.collection(collectionName as any);
    const error = await validateCollection(
      {
        detailedWarnings,
        checkDataChanges,
        performWrites,
      },
      collectionName,
      ref.schema,
      ref.backing
    );
    if (error) {
      totalErrors += error;
      log.error(`Validation failed: ${error} error(s) found`);
    } else {
      log.info("Validation succeeded.");
    }
  }
  if (totalErrors) {
    log.error(`Validation failed: ${totalErrors} error(s) found`);
  }
}

const collectionsOrFlags = process.argv.slice(2);
validateStorage(collectionsOrFlags);
