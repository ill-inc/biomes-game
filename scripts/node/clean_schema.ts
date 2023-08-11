import { scriptInit } from "@/server/shared/script_init";
import { createBdb } from "@/server/shared/storage";
import { Store, getFirestoreInstance } from "@/server/shared/storage/firestore";
import {
  AnyCollectionSchema,
  AnyDocumentSchema,
} from "@/server/shared/storage/schema";
import { WorkQueue } from "@/shared/util/async";

function findSchema(
  schemas: AnyDocumentSchema[],
  forId: string
): AnyDocumentSchema | undefined;
function findSchema(
  schemas: AnyCollectionSchema[],
  forId: string
): AnyCollectionSchema | undefined;
function findSchema(
  schemas: (AnyDocumentSchema | AnyCollectionSchema)[],
  forId: string
) {
  for (const schema of schemas) {
    const id = schema.id.safeParse(forId);
    if (id.success) {
      return schema;
    }
  }
}

function isDryRun() {
  return process.env.DRY_RUN !== "0";
}

async function recursiveDelete(
  firestore: FirebaseFirestore.Firestore,
  ref:
    | FirebaseFirestore.CollectionReference
    | FirebaseFirestore.DocumentReference
) {
  if (isDryRun()) {
    console.log(`Would delete ${ref.path}`);
    return;
  }
  await firestore.recursiveDelete(ref);
}

async function handleCollection(
  firestore: FirebaseFirestore.Firestore,
  queue: WorkQueue,
  collection: FirebaseFirestore.CollectionReference,
  schemas: AnyCollectionSchema[]
) {
  const schema = findSchema(schemas, collection.id);
  if (!schema) {
    await queue.add(recursiveDelete(firestore, collection));
    return;
  }
  for (const doc of await collection.listDocuments()) {
    const docSchema = findSchema(schema.documents, doc.id);
    if (!docSchema) {
      await queue.add(recursiveDelete(firestore, doc));
    } else {
      for (const subCollection of await doc.listCollections()) {
        await queue.add(
          handleCollection(
            firestore,
            queue,
            subCollection,
            docSchema.collections
          )
        );
      }
    }
  }
}

// Delete anything in Firestore that doesn't conform to our schema.
async function cleanSchema() {
  await scriptInit();

  const firestore = getFirestoreInstance();

  const storage = new Store(firestore);
  const db = createBdb(storage);
  const queue = new WorkQueue();

  for (const collection of await firestore.listCollections()) {
    await queue.add(handleCollection(firestore, queue, collection, db.schema));
  }
  await queue.flush();
}

cleanSchema();
