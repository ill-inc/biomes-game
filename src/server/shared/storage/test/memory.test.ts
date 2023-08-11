import type {
  BiomesStorage,
  StoragePath,
} from "@/server/shared/storage/biomes";
import { createInMemoryStorage } from "@/server/shared/storage/memory";
import type { JSONObject } from "@/shared/util/type_helpers";
import assert from "assert";

function docIDs(collection: BiomesStorage.Query) {
  return collection.get().then((snapshot) => {
    return snapshot.docs.map((doc) => doc.id);
  });
}

describe("Test in-memory storage", () => {
  it("Can get and set data", async () => {
    const store = createInMemoryStorage();
    const docRef = store
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath);
    assert.ok(!(await docRef.get()).exists);

    await docRef.set({
      answer: 42,
    });
    const data = await docRef.get();
    assert.ok(data.exists);
    assert.deepEqual(data.data(), { answer: 42 });
  });

  it("Cannot store undefined or null", async () => {
    const store = createInMemoryStorage();
    const docRef = store
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath);
    assert.ok(!(await docRef.get()).exists);

    await docRef.set({
      answer: 42,
      whatever: undefined,
      andMore: null,
    } as unknown as JSONObject);
    const data = await docRef.get();
    assert.ok(data.exists);
    assert.deepEqual(data.data(), { answer: 42 });
  });

  it("Cannot update with undefined", async () => {
    const store = createInMemoryStorage();
    const docRef = store
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath);
    assert.ok(!(await docRef.get()).exists);

    await docRef.set({
      answer: 42,
    });
    await docRef.update({
      answer: 43,
      whatever: undefined,
      andMore: null,
    });
    const data = await docRef.get();
    assert.ok(data.exists);
    assert.deepEqual(data.data(), { answer: 43 });
  });

  it("Ignores undefined as field deletion", async () => {
    const store = createInMemoryStorage();
    const docRef = store
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath);
    assert.ok(!(await docRef.get()).exists);

    await docRef.set({
      answer: 42,
    });
    await docRef.update({
      answer: undefined,
      whatever: "hi",
    });
    const data = await docRef.get();
    assert.ok(data.exists);
    assert.deepEqual(data.data(), { answer: 42, whatever: "hi" });
  });

  it("Ignores null as field deletion", async () => {
    const store = createInMemoryStorage();
    const docRef = store
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath);
    assert.ok(!(await docRef.get()).exists);

    await docRef.set({
      answer: 42,
    });
    await docRef.update({
      answer: null,
      whatever: "hi",
    });
    const data = await docRef.get();
    assert.ok(data.exists);
    assert.deepEqual(data.data(), { answer: 42, whatever: "hi" });
  });

  it("Get bulk references", async () => {
    const store = createInMemoryStorage();
    const docRefA = store
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath);
    const docRefB = store
      .collection("foo" as StoragePath)
      .doc("baz" as StoragePath);
    const docRefC = store
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

    const data = await store.getAll(docRefA, docRefB, docRefC);
    assert.ok(data[0].exists);
    assert.ok(data[1].exists);
    assert.ok(!data[2].exists);

    assert.deepEqual(data[0].data(), { answer: 42 });
    assert.deepEqual(data[1].data(), { answer: 43 });
  });

  it("Test auto-ID for empty reference", async () => {
    const store = createInMemoryStorage();
    const docRef = store.collection("foo" as StoragePath).doc();

    await docRef.set({ answer: 42 });

    const data = await docRef.get();
    assert.ok(data.exists);
    assert.ok(data.id.length > 0);
  });

  it("Transactions do not change anything on failure", async () => {
    const store = createInMemoryStorage();
    const docRef = store
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath);
    assert.ok(!(await docRef.get()).exists);

    try {
      await store.runTransaction(async (transaction) => {
        transaction.set(docRef, {
          answer: 42,
        });
        throw new Error("Transaction failed");
      });
    } catch (e) {
      // Ignore.
    }
    const data = await docRef.get();
    assert.ok(!data.exists);
  });

  it("Test query limit", async () => {
    const store = createInMemoryStorage();
    const collection = store.collection("foo" as StoragePath);

    await Promise.all([
      collection.doc("a" as StoragePath).set({ one: 1 }),
      collection.doc("b" as StoragePath).set({ two: 2 }),
      collection.doc("c" as StoragePath).set({ three: 3 }),
    ]);

    assert.deepEqual(await docIDs(collection.limit(2)), ["a", "b"]);
  });

  it("Test query offset", async () => {
    const store = createInMemoryStorage();
    const collection = store.collection("foo" as StoragePath);

    await Promise.all([
      collection.doc("a" as StoragePath).set({ one: 1 }),
      collection.doc("b" as StoragePath).set({ two: 2 }),
      collection.doc("c" as StoragePath).set({ three: 3 }),
      collection.doc("d" as StoragePath).set({ four: 4 }),
    ]);

    assert.deepEqual(await docIDs(collection.offset(1).limit(2)), ["b", "c"]);
  });

  it("Test query filter", async () => {
    const store = createInMemoryStorage();
    const collection = store.collection("foo" as StoragePath);

    await Promise.all([
      collection.doc("a" as StoragePath).set({ data: 3 }),
      collection.doc("b" as StoragePath).set({ data: 2 }),
      collection.doc("c" as StoragePath).set({ data: 1 }),
      collection.doc("d" as StoragePath).set({ data: 4 }),
    ]);

    assert.deepEqual(await docIDs(collection.where("data", ">=", 2)), [
      "a",
      "b",
      "d",
    ]);
  });

  it("Test order by", async () => {
    const store = createInMemoryStorage();
    const collection = store.collection("foo" as StoragePath);

    await Promise.all([
      collection.doc("a" as StoragePath).set({ data: 3 }),
      collection.doc("b" as StoragePath).set({}),
      collection.doc("c" as StoragePath).set({ data: 1 }),
      collection.doc("d" as StoragePath).set({ data: 4 }),
      collection.doc("e" as StoragePath).set({ data: 5 }),
      collection.doc("f" as StoragePath).set({}),
    ]);

    assert.deepEqual(await docIDs(collection.orderBy("data", "desc")), [
      "e",
      "d",
      "a",
      "c",
    ]);

    assert.deepEqual(await docIDs(collection.orderBy("data", "asc")), [
      "c",
      "a",
      "d",
      "e",
    ]);
  });

  it("Test startAfter", async () => {
    const store = createInMemoryStorage();
    const collection = store.collection("foo" as StoragePath);

    await Promise.all([
      collection.doc("a" as StoragePath).set({ data: 3 }),
      collection.doc("b" as StoragePath).set({}),
      collection.doc("c" as StoragePath).set({ data: 1 }),
      collection.doc("d" as StoragePath).set({ data: 4 }),
      collection.doc("e" as StoragePath).set({ data: 5 }),
      collection.doc("f" as StoragePath).set({}),
    ]);

    const snapshot = await collection.orderBy("data", "desc").get();

    assert.deepEqual(
      await docIDs(
        collection.orderBy("data", "desc").startAfter(snapshot.docs[1])
      ),
      ["a", "c"]
    );
  });

  it("Uses the right reference in a snapshot", async () => {
    const store = createInMemoryStorage();

    const docRef = store
      .collection("foo" as StoragePath)
      .doc("bar" as StoragePath);
    await docRef.set({ answer: 42 });

    assert.equal(docRef, (await docRef.get()).ref);
    assert.equal(
      docRef,
      await store.runTransaction(async (tx) => {
        return (await tx.get(docRef)).ref;
      })
    );
  });
});
