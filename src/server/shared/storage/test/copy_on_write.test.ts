import type {
  BiomesStorage,
  StoragePath,
} from "@/server/shared/storage/biomes";
import { FieldDeleteMarker } from "@/server/shared/storage/biomes";
import type { Collection as CopyOnWriteCollection } from "@/server/shared/storage/copy_on_write";
import { createCopyOnWriteStorage } from "@/server/shared/storage/copy_on_write";
import { createInMemoryStorage } from "@/server/shared/storage/memory";
import {
  removeUndefinedAndDeletionMarkers,
  replaceFieldDeleteMarkers,
} from "@/server/shared/storage/util";
import assert from "assert";

function docIDs(collection: BiomesStorage.Query) {
  return collection.get().then((snapshot) => {
    return snapshot.docs.map((doc) => doc.id);
  });
}

describe("Test copy on write storage", () => {
  it("Does not pass a write through", async () => {
    const baseStorage = createInMemoryStorage();
    const storage = createCopyOnWriteStorage(baseStorage);

    await baseStorage
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath)
      .set({ answer: 42 });

    const data = await storage
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath)
      .get();
    assert.ok(data.exists);
    assert.deepEqual(data.data(), { answer: 42 });

    await storage
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath)
      .set({ answer: 43 });
    const data2 = await storage
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath)
      .get();
    assert.ok(data2.exists);
    assert.deepEqual(data2.data(), { answer: 43 });

    const baseData2 = await baseStorage
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath)
      .get();
    assert.ok(baseData2.exists);
    assert.deepEqual(baseData2.data(), { answer: 42 });
  });

  it("Get bulk references", async () => {
    const baseStorage = createInMemoryStorage();
    const storage = createCopyOnWriteStorage(baseStorage);

    let docRefA = baseStorage
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath);
    const docRefB = storage
      .collection("foo" as StoragePath)
      .doc("baz" as StoragePath);
    const docRefC = storage
      .collection("foo" as StoragePath)
      .doc("qux" as StoragePath);

    await Promise.all([
      docRefA.set({
        answer: 42,
      }),
      docRefB.set({
        answer: 43,
      }),
    ]);

    // Update docRefA to refer to the proper storage.
    docRefA = storage
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath);

    const data = await storage.getAll(docRefA, docRefB, docRefC);
    assert.ok(data[0].exists);
    assert.ok(data[1].exists);
    assert.ok(!data[2].exists);

    assert.deepEqual(data[0].data(), { answer: 42 });
    assert.deepEqual(data[1].data(), { answer: 43 });
  });

  it("Does not pass a delete through", async () => {
    const baseStorage = createInMemoryStorage();
    const storage = createCopyOnWriteStorage(baseStorage);

    await baseStorage
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath)
      .set({ answer: 42 });

    const data = await storage
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath)
      .get();
    assert.ok(data.exists);
    assert.deepEqual(data.data(), { answer: 42 });

    await storage
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath)
      .delete();
    const data2 = await storage
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath)
      .get();
    assert.ok(!data2.exists);

    const baseData2 = await baseStorage
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath)
      .get();
    assert.ok(baseData2.exists);
    assert.deepEqual(baseData2.data(), { answer: 42 });
  });

  it("Scans a base collection", async () => {
    const baseStorage = createInMemoryStorage();
    const storage = createCopyOnWriteStorage(baseStorage);

    await baseStorage
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath)
      .set({ answer: 42 });
    await baseStorage
      .collection("foo" as StoragePath)
      .doc("baz" as StoragePath)
      .set({ answer: 43 });

    assert.deepEqual(await docIDs(storage.collection("foo" as StoragePath)), [
      "bar",
      "baz",
    ]);
  });

  it("Merges a document into a base collection", async () => {
    const baseStorage = createInMemoryStorage();
    const storage = createCopyOnWriteStorage(baseStorage);

    await baseStorage
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath)
      .set({ answer: 42 });
    await baseStorage
      .collection("foo" as StoragePath)
      .doc("baz" as StoragePath)
      .set({ answer: 43 });
    await storage
      .collection("foo" as StoragePath)
      .doc("bap" as StoragePath)
      .set({ answer: 44 });

    assert.deepEqual(await docIDs(storage.collection("foo" as StoragePath)), [
      "bap",
      "bar",
      "baz",
    ]);
    assert.deepEqual(
      await docIDs(baseStorage.collection("foo" as StoragePath)),
      ["bar", "baz"]
    );
  });

  it("Permits removing from a base collection", async () => {
    const baseStorage = createInMemoryStorage();
    const storage = createCopyOnWriteStorage(baseStorage);

    await baseStorage
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath)
      .set({ answer: 42 });
    await baseStorage
      .collection("foo" as StoragePath)
      .doc("baz" as StoragePath)
      .set({ answer: 43 });
    await storage
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath)
      .delete();

    assert.deepEqual(await docIDs(storage.collection("foo" as StoragePath)), [
      "baz",
    ]);
    assert.deepEqual(
      await docIDs(baseStorage.collection("foo" as StoragePath)),
      ["bar", "baz"]
    );
  });

  it("Modify to satisfy query", async () => {
    const baseStorage = createInMemoryStorage();
    const storage = createCopyOnWriteStorage(baseStorage);

    await baseStorage
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath)
      .set({ answer: 42 });
    await baseStorage
      .collection("foo" as StoragePath)
      .doc("baz" as StoragePath)
      .set({ answer: 43 });

    assert.deepEqual(
      await docIDs(
        storage.collection("foo" as StoragePath).where("answer", ">", 42)
      ),
      ["baz"]
    );

    await storage
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath)
      .set({ answer: 44 });

    assert.deepEqual(
      await docIDs(
        storage.collection("foo" as StoragePath).where("answer", ">", 42)
      ),
      ["bar", "baz"]
    );
    assert.deepEqual(
      await docIDs(
        baseStorage.collection("foo" as StoragePath).where("answer", ">", 42)
      ),
      ["baz"]
    );
  });

  it("Can wipe collection", async () => {
    const baseStorage = createInMemoryStorage();
    const storage = createCopyOnWriteStorage(baseStorage);

    await baseStorage
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath)
      .set({ answer: 42 });
    await baseStorage
      .collection("foo" as StoragePath)
      .doc("baz" as StoragePath)
      .set({ answer: 43 });

    await (
      storage.collection("foo" as StoragePath) as CopyOnWriteCollection
    ).wipe();

    assert.deepEqual(
      await docIDs(storage.collection("foo" as StoragePath)),
      []
    );
    assert.deepEqual(
      await docIDs(baseStorage.collection("foo" as StoragePath)),
      ["bar", "baz"]
    );
  });

  it("Uses the right reference in a snapshot", async () => {
    const baseStorage = createInMemoryStorage();
    const storage = createCopyOnWriteStorage(baseStorage);

    const docRef = storage
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath);
    await docRef.set({ answer: 42 });

    assert.equal(docRef, (await docRef.get()).ref);
    assert.equal(
      docRef,
      await storage.runTransaction(async (tx) => {
        return (await tx.get(docRef)).ref;
      })
    );
  });
});

describe("Deletion markers", () => {
  it("Handles removing undefined and deletion markers", () => {
    assert.deepEqual(removeUndefinedAndDeletionMarkers({}), {});
    assert.deepEqual(
      removeUndefinedAndDeletionMarkers({
        a: 42,
        b: [1, 2, 3],
        c: {
          a: 43,
          b: [1, 2, 3],
        },
      }),
      {
        a: 42,
        b: [1, 2, 3],
        c: {
          a: 43,
          b: [1, 2, 3],
        },
      }
    );
    assert.deepEqual(
      removeUndefinedAndDeletionMarkers({
        a: undefined,
        b: FieldDeleteMarker,
        c: {
          a: 42,
          b: undefined,
          c: FieldDeleteMarker,
          d: [1, 2, 3],
          e: [
            undefined,
            undefined,
            {
              a: 43,
            },
          ],
        },
        d: [1, 2, 3],
        e: [
          undefined,
          undefined,
          {
            a: 44,
          },
        ],
        f: "hello",
        g: false,
      }),
      {
        c: {
          a: 42,
          d: [1, 2, 3],
          e: [
            undefined,
            undefined,
            {
              a: 43,
            },
          ],
        },
        d: [1, 2, 3],
        e: [
          undefined,
          undefined,
          {
            a: 44,
          },
        ],
        f: "hello",
        g: false,
      }
    );
  });

  it("Handles replacing undefined and deletion markers", () => {
    assert.deepEqual(replaceFieldDeleteMarkers({}), {});
    assert.deepEqual(
      replaceFieldDeleteMarkers({
        a: 42,
        b: [1, 2, 3],
        c: {
          a: 43,
          b: [1, 2, 3],
        },
      }),
      {
        a: 42,
        b: [1, 2, 3],
        c: {
          a: 43,
          b: [1, 2, 3],
        },
      }
    );
    assert.deepEqual(
      replaceFieldDeleteMarkers({
        a: undefined,
        b: FieldDeleteMarker,
        c: {
          a: 42,
          b: undefined,
          c: FieldDeleteMarker,
          d: [1, 2, 3],
          e: [
            undefined,
            undefined,
            {
              a: 43,
            },
          ],
        },
        d: [1, 2, 3],
        e: [
          undefined,
          undefined,
          {
            a: 44,
          },
        ],
        f: "hello",
        g: false,
      }),
      {
        b: undefined,
        c: {
          a: 42,
          c: undefined,
          d: [1, 2, 3],
          e: [
            undefined,
            undefined,
            {
              a: 43,
            },
          ],
        },
        d: [1, 2, 3],
        e: [
          undefined,
          undefined,
          {
            a: 44,
          },
        ],
        f: "hello",
        g: false,
      }
    );
  });
});
