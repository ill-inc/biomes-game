import type {
  BackingCollection,
  BackingDocument,
  BackingStore,
} from "@/server/shared/storage/backing";
import type { StoragePath } from "@/server/shared/storage/biomes";
import { BiomesStorage } from "@/server/shared/storage/biomes";
import { createSerializedStorage } from "@/server/shared/storage/serialized";
import type { Filter, Ordering } from "@/server/shared/storage/util";
import {
  checkCanBeStored,
  checkValidPath,
  createFilter,
  removeUndefinedAndDeletionMarkers,
  replaceFieldDeleteMarkers,
  SimpleDocumentSnapshot,
  SimpleQueryDocumentSnapshot,
  SimpleQuerySnapshot,
  sortByOrdering,
  validateCompoundFilter,
} from "@/server/shared/storage/util";
import { autoId } from "@/shared/util/auto_id";
import type { JSONObject } from "@/shared/util/type_helpers";

// References to documents are equivalent to the in-memory representation of the document for
// the copy on write storage.
class Document<T extends JSONObject = BiomesStorage.DocumentData>
  implements BiomesStorage.DocumentReference<T>
{
  readonly id: StoragePath;
  private backing?: BackingDocument<T>;
  private data?: T;
  private collections: Map<StoragePath, Collection<T>> = new Map();
  private fetched: boolean = false;

  constructor(id: StoragePath, backing?: BackingDocument<T>, data?: T) {
    this.id = id;
    this.backing = backing;
    this.data = data;
    this.fetched = backing === undefined || data !== undefined;
  }

  get exists(): boolean {
    if (!this.fetched) {
      // Sanity check, it's unknown until fetched.
      throw new Error(`document not fetched with ID ${this.id}`);
    }
    return this.fetched && this.data !== undefined;
  }

  // We gained the data from the backing store, so populate if we didn't have it.
  maybePopulate(data: T) {
    if (this.fetched) {
      return;
    }
    this.data = data;
    this.fetched = true;
  }

  listCollections(): Promise<
    BiomesStorage.CollectionReference<BiomesStorage.DocumentData>[]
  > {
    throw new Error("not implemented");
  }

  collection(collectionPath: StoragePath): BiomesStorage.CollectionReference {
    checkValidPath(collectionPath);
    if (!this.collections.has(collectionPath)) {
      this.collections.set(
        collectionPath,
        new Collection(
          collectionPath,
          this.backing !== undefined
            ? this.backing.collection(collectionPath)
            : undefined
        )
      );
    }
    return this.collections.get(collectionPath)!;
  }

  // Fetch the document from the backing store if we haven't already.
  async prepare(): Promise<void> {
    if (this.fetched) {
      return;
    }
    this.data = (await this.backing!.get()).data();
    this.fetched = true;
  }

  async get(): Promise<BiomesStorage.DocumentSnapshot<T>> {
    await this.prepare();
    return new SimpleDocumentSnapshot<T>(this, this.data);
  }

  async create(data: T): Promise<BiomesStorage.WriteResult> {
    await this.prepare();
    if (this.exists) {
      // Mirror firebase error code
      const err = new Error(
        `document already exists with ID ${this.id}`
      ) as any;
      err.code = 6;
      throw err;
    }
    checkCanBeStored(data);
    this.data = removeUndefinedAndDeletionMarkers(data);
    return {};
  }

  async update(data: Partial<T>): Promise<BiomesStorage.WriteResult> {
    await this.prepare();
    if (!this.exists) {
      throw new Error(`document does not exist with ID ${this.id}`);
    }
    checkCanBeStored(data);
    data = replaceFieldDeleteMarkers(data);
    this.data = removeUndefinedAndDeletionMarkers({
      ...this.data,
      ...data,
    }) as T;
    return {};
  }

  async set(data: T): Promise<BiomesStorage.WriteResult> {
    this.fetched = true;
    checkCanBeStored(data);
    this.data = removeUndefinedAndDeletionMarkers(data);
    return {};
  }

  async delete(): Promise<BiomesStorage.WriteResult> {
    this.fetched = true;
    this.data = undefined;
    return {};
  }
}

class Query<T extends JSONObject = BiomesStorage.DocumentData>
  implements BiomesStorage.Query<T>
{
  private readonly filters: Filter[] = [];
  _offset?: number;
  _limit?: number;
  _startAfter?: BiomesStorage.QueryDocumentSnapshot<T>;
  private readonly orderings: Ordering<T>[] = [];

  constructor(private readonly collection: Collection<T>) {}

  clone() {
    const ret = new Query(this.collection);
    ret.filters.push(...this.filters);
    ret._offset = this._offset;
    ret._limit = this._limit;
    ret._startAfter = this._startAfter;
    ret.orderings.push(...this.orderings);
    return ret;
  }

  where(
    field: keyof T & string,
    opStr: BiomesStorage.WhereFilterOp,
    value: any
  ): BiomesStorage.Query<T> {
    const ret = this.clone();
    ret.filters.push(createFilter(field, opStr, value));
    return ret;
  }

  orderBy(
    field: keyof T & string,
    direction?: BiomesStorage.OrderByDirection
  ): BiomesStorage.Query<T> {
    const ret = this.clone();
    ret.orderings.push({
      field,
      direction: direction ?? "asc",
    });
    return ret;
  }

  offset(limit: number): BiomesStorage.Query<T> {
    const ret = this.clone();
    ret._offset = limit;
    return ret;
  }

  limit(limit: number): BiomesStorage.Query<T> {
    const ret = this.clone();
    ret._limit = limit;
    return ret;
  }

  startAfter(
    doc: BiomesStorage.QueryDocumentSnapshot<T>
  ): BiomesStorage.Query<T> {
    const ret = this.clone();
    ret._startAfter = doc;
    return ret;
  }

  async get(): Promise<BiomesStorage.QuerySnapshot<T>> {
    let offset = this._offset;
    const limit = this._limit;

    if (this.filters.length > 1) {
      validateCompoundFilter(this.filters);
    }

    const output: Array<BiomesStorage.QueryDocumentSnapshot<T>> = [];
    if (limit !== undefined && limit <= 0) {
      return new SimpleQuerySnapshot<T>(output);
    }

    let passedStartPoint = false;

    const outputBuilder = (
      snapshot: BiomesStorage.QueryDocumentSnapshot<T>
    ) => {
      if (!this.filters.every((filter) => filter.fn(snapshot))) {
        return true;
      }
      if (this._startAfter && !passedStartPoint) {
        if (snapshot.id === this._startAfter.id) {
          passedStartPoint = true;
        }
        return true;
      }
      if (offset !== undefined && offset > 0) {
        offset--;
        return true;
      }
      output.push(snapshot);
      if (limit !== undefined && output.length == limit) {
        return false;
      }
      return true;
    };

    if (this.orderings.length > 0) {
      let docs = (await this.collection.get()).docs;
      for (const ordering of this.orderings) {
        docs = sortByOrdering(docs, ordering);
      }
      docs.every(outputBuilder);
    } else {
      await this.collection.scan(outputBuilder);
    }
    return new SimpleQuerySnapshot(output);
  }
}

export class Collection<T extends JSONObject = BiomesStorage.DocumentData>
  implements BiomesStorage.CollectionReference<T>
{
  readonly id: StoragePath;
  private backing?: BackingCollection<T>;
  private documents: Map<string, Document<T>> = new Map();
  // We store the key iteration order to permit partial population, it is also
  // an indicator of whether we have bootstrapped the entire collection.
  private keyOrder?: Array<string>;

  constructor(id: StoragePath, backing?: BackingCollection<T>) {
    this.id = id;
    this.backing = backing;
    if (backing === undefined) {
      this.keyOrder = [];
    }
  }

  async prepare(): Promise<void> {
    if (this.keyOrder !== undefined) {
      return;
    }
    const snapshot = (await this.backing!.get()).docs;
    this.keyOrder = [...this.documents.keys()];
    snapshot.forEach((doc) => {
      const existing = this.documents.get(doc.id);
      if (existing) {
        existing.maybePopulate(doc.data());
      } else {
        this.documents.set(
          doc.id,
          new Document<T>(doc.id, doc.ref, doc.data())
        );
        this.keyOrder!.push(doc.id);
      }
    });
    this.keyOrder.sort();
  }

  async scan(
    fn: (snapshot: SimpleQueryDocumentSnapshot<T>) => boolean
  ): Promise<void> {
    await this.prepare();
    for (const key of this.keyOrder!) {
      const doc = this.documents.get(key)!;
      const data = await doc.get();
      if (!data.exists) {
        continue;
      }
      const snapshot = new SimpleQueryDocumentSnapshot<T>(doc, data.data()!);
      if (!fn(snapshot)) {
        break;
      }
    }
  }

  where(
    field: keyof T & string,
    opStr: BiomesStorage.WhereFilterOp,
    value: any
  ): BiomesStorage.Query<T> {
    return new Query(this).where(field, opStr, value);
  }

  orderBy(
    field: keyof T & string,
    directionStr?: BiomesStorage.OrderByDirection
  ): BiomesStorage.Query<T> {
    return new Query(this).orderBy(field, directionStr);
  }

  offset(limit: number): BiomesStorage.Query<T> {
    return new Query(this).offset(limit);
  }

  limit(limit: number): BiomesStorage.Query<T> {
    return new Query(this).limit(limit);
  }

  startAfter(
    doc: BiomesStorage.QueryDocumentSnapshot<T>
  ): BiomesStorage.Query<T> {
    return new Query(this).startAfter(doc);
  }

  get(): Promise<BiomesStorage.QuerySnapshot<T>> {
    return new Query(this).get();
  }

  private ensureInKeyOrder(id: string) {
    if (this.keyOrder === undefined) {
      return;
    }
    const index = this.keyOrder.findIndex((key) => key >= id);
    if (index === -1) {
      this.keyOrder.push(id);
    } else if (this.keyOrder[index] !== id) {
      this.keyOrder.splice(index, 0, id);
    }
  }

  doc(documentPath?: StoragePath): BiomesStorage.DocumentReference<T> {
    if (documentPath === undefined) {
      documentPath = BiomesStorage.escape(autoId());
      if (this.documents.has(documentPath)) {
        throw new Error(
          `UNEXPECTED: document already exists with path ${documentPath}`
        );
      }
    } else {
      checkValidPath(documentPath);
    }
    if (!this.documents.has(documentPath)) {
      this.documents.set(
        documentPath,
        new Document<T>(
          documentPath,
          this.backing !== undefined
            ? this.backing.doc(documentPath)
            : undefined
        )
      );
      this.ensureInKeyOrder(documentPath);
    }
    return this.documents.get(documentPath)!;
  }

  async add(data: T): Promise<BiomesStorage.DocumentReference<T>> {
    const id = BiomesStorage.escape(autoId());
    if (this.documents.has(id)) {
      throw new Error(`UNEXPECTED: document already exists with ID ${id}`);
    }
    const doc = new Document<T>(id);
    await doc.set(data);
    this.documents.set(id, doc);
    this.ensureInKeyOrder(id);
    return doc;
  }

  async wipe() {
    // Wipe anything in-memory and remove the backing so that we don't fetch.
    this.backing = undefined;
    this.documents = new Map();
    this.keyOrder = [];
  }
}

class Transaction implements BiomesStorage.Transaction {
  protected touched: Set<BiomesStorage.DocumentReference> = new Set();
  // Note, for correct behaviour the Transaction must be either fully applied,
  // or not at all. In order to do this force any data loads to happen first
  // as 'setups', then execute any checks.
  // After both those stages it is expected that all updates complete.
  private setups: Array<() => Promise<any>> = [];
  private checks: Array<() => void> = [];
  private updates: Array<() => Promise<any>> = [];
  private doneWrite: boolean = false;

  private checkUsableDoc(doc: BiomesStorage.DocumentReference) {
    if (this.touched.has(doc)) {
      throw new Error(`document already used in batch with ID ${doc.id}`);
    }
    this.touched.add(doc);
  }

  get<T extends JSONObject>(
    documentRef: BiomesStorage.DocumentReference<T>
  ): Promise<BiomesStorage.DocumentSnapshot<T>> {
    if (this.doneWrite) {
      throw new Error("transaction writes must follow all reads");
    }
    const doc = documentRef as Document<T>;
    this.checkUsableDoc(doc);
    return doc.get();
  }

  private startWrites() {
    if (!this.doneWrite) {
      this.touched = new Set();
      this.doneWrite = true;
    }
  }

  create<T extends JSONObject>(
    documentRef: BiomesStorage.DocumentReference<T>,
    data: T
  ): Transaction {
    this.startWrites();
    const doc = documentRef as Document<T>;
    this.checkUsableDoc(doc);
    this.setups.push(() => doc.prepare());
    this.checks.push(() => {
      if (doc.exists) {
        const err = new Error(`document already exists with ID ${doc.id}`);
        (err as any).code = 6;
        throw err;
      }
    });
    this.updates.push(() => doc.create(data));
    return this;
  }

  set<T extends JSONObject>(
    documentRef: BiomesStorage.DocumentReference<T>,
    data: T
  ): Transaction {
    this.startWrites();
    const doc = documentRef as Document<T>;
    this.checkUsableDoc(doc);
    this.updates.push(() => doc.set(data));
    return this;
  }

  update<T extends JSONObject>(
    documentRef: BiomesStorage.DocumentReference<T>,
    data: Partial<T>
  ): Transaction {
    this.startWrites();
    const doc = documentRef as Document<T>;
    this.checkUsableDoc(doc);
    this.setups.push(() => doc.prepare());
    this.checks.push(() => {
      if (!doc.exists)
        throw new Error(`document does not exist with ID ${doc.id}`);
    });
    this.updates.push(() => doc.update(data));
    return this;
  }

  delete(documentRef: BiomesStorage.DocumentReference): Transaction {
    this.startWrites();
    const doc = documentRef as Document;
    this.checkUsableDoc(doc);
    this.updates.push(() => doc.delete());
    return this;
  }

  async commit(): Promise<void> {
    await Promise.all(this.setups.map((fn) => fn()));
    this.checks.forEach((fn) => fn());
    await Promise.all(this.updates.map((fn) => fn()));
  }
}

class Storage implements BiomesStorage.Store {
  private collections: Map<StoragePath, Collection> = new Map();

  constructor(private backing: BackingStore) {}

  collection(collectionPath: StoragePath): BiomesStorage.CollectionReference {
    checkValidPath(collectionPath);
    if (!this.collections.has(collectionPath)) {
      this.collections.set(
        collectionPath,
        new Collection(collectionPath, this.backing.collection(collectionPath))
      );
    }
    return this.collections.get(collectionPath)!;
  }

  async getAll(
    ...documentRefs: Array<BiomesStorage.DocumentReference>
  ): Promise<
    Array<BiomesStorage.DocumentSnapshot<BiomesStorage.DocumentData>>
  > {
    return Promise.all(documentRefs.map((documentRef) => documentRef.get()));
  }

  async runTransaction<T>(
    updateFunction: (transaction: BiomesStorage.Transaction) => Promise<T>
  ): Promise<T> {
    const transaction = new Transaction();
    const result = await updateFunction(transaction);
    await transaction.commit();
    return result;
  }
}

// Creates a copy on write wrapper over an existing store. Any reads are satisfied from the existing store,
// but any writes/deletes are kept in an in-memory layer and do not make it to the underlying storage ever.
// Note: The 'unsafe' here refers to two things:
// 1. The store has no locking, and thus batch and transaction atomicity is not guaranteed.
// 2. The store does not validate references, and thus can behave incorrectly if used with references from
//    other stores.
// To avoid both of these properties, we wrap it in a serialized store.
function createUnsafeCopyOnWriteStorage(
  backing: BackingStore
): BiomesStorage.Store {
  return new Storage(backing);
}

export function createCopyOnWriteStorage(
  backing: BackingStore
): BiomesStorage.Store {
  return createSerializedStorage(createUnsafeCopyOnWriteStorage(backing));
}
