import type {
  BiomesStorage,
  StoragePath,
} from "@/server/shared/storage/biomes";
import {
  RedirectedDocumentSnapshot,
  RedirectedQueryDocumentSnapshot,
} from "@/server/shared/storage/util";
import type { JSONObject } from "@/shared/util/type_helpers";
import { ok } from "assert";
import { Mutex } from "async-mutex";

// To simplify implementations of BiomesStorage, e.g. CopyOnWriteStorage, we introduce the
// following. Scoped objects:
// 1. Hold a mutex that is at the DB level, for locking of all operations (and thus
//    serializing them). This gives transactional and atomic expections.
// 2. Hold an implementation type of the underlying DB that can be unwrapped for safe usage.
//    We do unwrap checking the value of the mutex to ensure you're not using objects from
//    one DB with another (e.g. in tests!)
class Scoped<T> {
  private readonly mutex: Mutex;
  impl: T;

  constructor(parent: Scoped<any> | undefined, impl: T) {
    this.mutex = parent ? parent.mutex : new Mutex();
    this.impl = impl;
  }

  protected checkScope<U>(obj: U): U {
    ok(
      this,
      "Entered check scope with empty this -- did you accidentally map without fat arrow?"
    );
    if (!(obj instanceof Scoped)) {
      throw new Error("Object is not scoped");
    }
    if (obj.mutex !== this.mutex) {
      throw new Error("Object is from a different scope");
    }
    return (obj as Scoped<U>).impl;
  }

  protected async withinScope<T>(fn: () => Promise<T>): Promise<T> {
    return this.mutex.runExclusive(fn);
  }
}
class DocumentReference<T = BiomesStorage.DocumentData>
  extends Scoped<BiomesStorage.DocumentReference<T>>
  implements BiomesStorage.DocumentReference<T>
{
  get id(): StoragePath {
    return this.impl.id;
  }

  listCollections(): Promise<
    BiomesStorage.CollectionReference<BiomesStorage.DocumentData>[]
  > {
    return this.withinScope(() => this.impl.listCollections());
  }

  collection(collectionPath: StoragePath): BiomesStorage.CollectionReference {
    return new CollectionReference(this, this.impl.collection(collectionPath));
  }

  get(): Promise<BiomesStorage.DocumentSnapshot<T>> {
    return this.withinScope(async () => {
      const snapshot = await this.impl.get();
      return new RedirectedDocumentSnapshot<T>(this, snapshot);
    });
  }

  create(data: T): Promise<BiomesStorage.WriteResult> {
    return this.withinScope(() => this.impl.create(data));
  }

  update(data: Partial<T>): Promise<BiomesStorage.WriteResult> {
    return this.withinScope(() => this.impl.update(data));
  }

  set(data: T): Promise<BiomesStorage.WriteResult> {
    return this.withinScope(() => this.impl.set(data));
  }

  delete(): Promise<BiomesStorage.WriteResult> {
    return this.withinScope(() => this.impl.delete());
  }
}

class Query<T = BiomesStorage.DocumentData>
  extends Scoped<BiomesStorage.Query<T>>
  implements BiomesStorage.Query<T>
{
  where(
    field: keyof T & string,
    opStr: BiomesStorage.WhereFilterOp,
    value: any
  ): BiomesStorage.Query<T> {
    return new Query(this, this.impl.where(field, opStr, value));
  }

  orderBy(
    field: keyof T & string,
    directionStr?: BiomesStorage.OrderByDirection
  ): BiomesStorage.Query<T> {
    return new Query(this, this.impl.orderBy(field, directionStr));
  }

  offset(limit: number): BiomesStorage.Query<T> {
    return new Query(this, this.impl.offset(limit));
  }

  limit(limit: number): BiomesStorage.Query<T> {
    return new Query(this, this.impl.limit(limit));
  }

  startAfter(
    doc: BiomesStorage.QueryDocumentSnapshot<T>
  ): BiomesStorage.Query<T> {
    return new Query(
      this,
      this.impl.startAfter((doc as RedirectedQueryDocumentSnapshot<T>).backing)
    );
  }

  get(): Promise<BiomesStorage.QuerySnapshot<T>> {
    return this.withinScope(async () => {
      const snapshot = await this.impl.get();
      return {
        empty: snapshot.empty,
        docs: snapshot.docs.map(
          (doc) =>
            new RedirectedQueryDocumentSnapshot<T>(
              new DocumentReference(this, doc.ref),
              doc
            )
        ),
      };
    });
  }
}

interface CollectionWithWipe extends BiomesStorage.CollectionReference {
  wipe(): Promise<void>;
}

class CollectionReference<T = BiomesStorage.DocumentData>
  extends Scoped<BiomesStorage.CollectionReference<T>>
  implements BiomesStorage.CollectionReference<T>
{
  get id(): StoragePath {
    return this.impl.id;
  }

  where(
    field: keyof T & string,
    opStr: BiomesStorage.WhereFilterOp,
    value: any
  ): BiomesStorage.Query<T> {
    return new Query(this, this.impl.where(field, opStr, value));
  }

  orderBy(
    field: keyof T & string,
    directionStr?: BiomesStorage.OrderByDirection
  ): BiomesStorage.Query<T> {
    return new Query(this, this.impl.orderBy(field, directionStr));
  }

  offset(limit: number): BiomesStorage.Query<T> {
    return new Query(this, this.impl.offset(limit));
  }

  limit(limit: number): BiomesStorage.Query<T> {
    return new Query(this, this.impl.limit(limit));
  }

  startAfter(
    doc: BiomesStorage.QueryDocumentSnapshot<T>
  ): BiomesStorage.Query<T> {
    return new Query(
      this,
      this.impl.startAfter((doc as RedirectedQueryDocumentSnapshot<T>).backing)
    );
  }

  get(): Promise<BiomesStorage.QuerySnapshot<T>> {
    return new Query(this, this.impl).get();
  }

  doc(documentPath: StoragePath): BiomesStorage.DocumentReference<T> {
    return new DocumentReference(this, this.impl.doc(documentPath));
  }

  add(data: T): Promise<BiomesStorage.DocumentReference<T>> {
    return this.withinScope(
      async () => new DocumentReference(this, await this.impl.add(data))
    );
  }

  wipe(): Promise<void> {
    const wipeImpl = this.impl as unknown as CollectionWithWipe;
    if (wipeImpl.wipe === undefined) {
      throw new Error("Wipe not supported");
    }
    return this.withinScope(() => wipeImpl.wipe());
  }
}

class Transaction extends Scoped<BiomesStorage.Transaction> {
  create<T extends JSONObject>(
    documentRef: DocumentReference<T>,
    data: T
  ): Transaction {
    this.impl.create(this.checkScope(documentRef), data);
    return this;
  }

  async get<T extends JSONObject>(
    documentRef: DocumentReference<T>
  ): Promise<BiomesStorage.DocumentSnapshot<T>> {
    // Note, we don't need to hold the lock for this as the surrounding runTransaction
    // does for us.
    return new RedirectedDocumentSnapshot<T>(
      documentRef,
      await this.impl.get(this.checkScope(documentRef))
    );
  }

  set<T extends JSONObject>(
    documentRef: DocumentReference<T>,
    data: T
  ): Transaction {
    this.impl.set(this.checkScope(documentRef), data);
    return this;
  }

  delete(
    documentRef: BiomesStorage.DocumentReference<BiomesStorage.DocumentData>
  ): Transaction {
    this.impl.delete(this.checkScope(documentRef));
    return this;
  }

  update<T extends JSONObject>(
    documentRef: DocumentReference<T>,
    data: Partial<T>
  ): Transaction {
    this.impl.update(this.checkScope(documentRef), data);
    return this;
  }
}

class Store extends Scoped<BiomesStorage.Store> implements BiomesStorage.Store {
  constructor(backing: BiomesStorage.Store) {
    super(undefined, backing);
  }

  collection(collectionPath: StoragePath): BiomesStorage.CollectionReference {
    return new CollectionReference(this, this.impl.collection(collectionPath));
  }

  getAll(
    ...documentRefs: Array<BiomesStorage.DocumentReference>
  ): Promise<Array<BiomesStorage.DocumentSnapshot>> {
    // mpa documentRefs through checkScope
    return this.withinScope(async () =>
      (
        await this.impl.getAll(...documentRefs.map((e) => this.checkScope(e)))
      ).map((doc) => new RedirectedDocumentSnapshot(doc.ref, doc))
    );
  }

  runTransaction<T>(
    updateFunction: (transaction: BiomesStorage.Transaction) => Promise<T>
  ): Promise<T> {
    return this.withinScope(() =>
      this.impl.runTransaction((transaction) =>
        updateFunction(new Transaction(this, transaction))
      )
    );
  }
}

// Create a wrapper around an underlying store that uses a mutex to serialize all access
// (e.g. transactional and batch atomicity).
// This is done as it makes it easier to build an underlying storage in a clean fashion without
// cluttering it with lock nonsense.
export function createSerializedStorage(
  backing: BiomesStorage.Store
): BiomesStorage.Store {
  return new Store(backing);
}
