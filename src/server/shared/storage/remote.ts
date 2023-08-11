import type { StoragePath } from "@/server/shared/storage/biomes";
import { BiomesStorage, zStoragePath } from "@/server/shared/storage/biomes";
import type { Ordering } from "@/server/shared/storage/util";
import {
  SimpleDocumentSnapshot,
  SimpleQueryDocumentSnapshot,
  SimpleQuerySnapshot,
  checkCanBeStored,
  checkValidPath,
  removeUndefinedAndDeletionMarkers,
  replaceFieldDeleteMarkers,
  zOrdering,
} from "@/server/shared/storage/util";
import type { ZService } from "@/server/shared/zrpc/server_types";
import { autoId } from "@/shared/util/auto_id";
import type { JSONObject } from "@/shared/util/type_helpers";
import type { RpcContext, ZClient } from "@/shared/zrpc/core";
import { RpcClientError, RpcError } from "@/shared/zrpc/errors";
import * as grpc from "@/shared/zrpc/grpc";
import { zrpcSerialize } from "@/shared/zrpc/serde";
import { zservice } from "@/shared/zrpc/service";
import { ok } from "assert";
import md5 from "md5";
import type { ZodType } from "zod";
import { z } from "zod";

export const zRefAndData = z.object({
  path: zStoragePath.array(),
  value: z.any(),
});

export type RefAndData = z.infer<typeof zRefAndData>;

export const zQueryDocumentSnapshot = z.object({
  id: zStoragePath,
  value: z.any().optional(),
  version: z.string(),
});

export type QueryDocumentSnapshot = z.infer<typeof zQueryDocumentSnapshot>;

export const zFilter = z.object({
  field: z.string(),
  op: z.string() as ZodType<BiomesStorage.WhereFilterOp>,
  value: z.any(),
});

export const zQueryCollectionRequest = z.object({
  path: zStoragePath.array(),
  offset: z.number().optional(),
  limit: z.number().optional(),
  orderings: zOrdering.array().default([]),
  filters: zFilter.array().default([]),
  startAfter: zStoragePath.optional(),
});

export type QueryCollectionRequest = z.infer<typeof zQueryCollectionRequest>;

export const zRunTransactionRequest = z.object({
  iff: z
    .object({
      path: zStoragePath.array(),
      version: z.string(),
    })
    .array()
    .default([]),
  creates: zRefAndData.array().default([]),
  updates: zRefAndData.array().default([]),
  sets: zRefAndData.array().default([]),
  deletes: zStoragePath.array().array().default([]),
});

export type RunTransactionRequest = z.infer<typeof zRunTransactionRequest>;

export const zRemoteStorageService = zservice("remote-storage")
  // Documents.
  .addRpc("getDoc", zStoragePath.array(), zQueryDocumentSnapshot.optional())
  .addRpc("createDoc", zRefAndData, z.void())
  .addRpc("updateDoc", zRefAndData, z.void())
  .addRpc("setDoc", zRefAndData, z.void())
  .addRpc("deleteDoc", zStoragePath.array(), z.void())
  // Collections.
  .addStreamingRpc(
    "query",
    zQueryCollectionRequest,
    zQueryDocumentSnapshot.array()
  )
  // Transactions.
  .addRpc("runTransaction", zRunTransactionRequest, z.void());

export type RemoteStorageClient = ZClient<typeof zRemoteStorageService>;

class VersionedDocumentSnapshot<
  T extends JSONObject = BiomesStorage.DocumentData
> extends SimpleDocumentSnapshot<T> {
  public readonly version: string;

  constructor(
    ref: BiomesStorage.DocumentReference<T>,
    snapshot?: z.infer<typeof zQueryDocumentSnapshot>
  ) {
    super(ref, snapshot?.value as T);
    this.version = snapshot?.version ?? "";
  }
}

// References to documents are equivalent to the in-memory representation of the document for
// the copy on write storage.
class Document<T extends JSONObject = BiomesStorage.DocumentData>
  implements BiomesStorage.DocumentReference<T>
{
  constructor(
    public readonly client: RemoteStorageClient,
    public readonly path: StoragePath[]
  ) {}

  get id() {
    return this.path[this.path.length - 1];
  }

  listCollections(): Promise<
    BiomesStorage.CollectionReference<BiomesStorage.DocumentData>[]
  > {
    throw new Error("not implemented");
  }

  collection(collectionPath: StoragePath): BiomesStorage.CollectionReference {
    checkValidPath(collectionPath);
    return new Collection<T>(this.client, [...this.path, collectionPath]);
  }

  async get(): Promise<VersionedDocumentSnapshot<T>> {
    return new VersionedDocumentSnapshot<T>(
      this,
      await this.client.getDoc(this.path)
    );
  }

  async create(data: T): Promise<BiomesStorage.WriteResult> {
    checkCanBeStored(data);
    await this.client.createDoc({
      value: removeUndefinedAndDeletionMarkers(data),
      path: this.path,
    });
    return {};
  }

  async update(data: Partial<T>): Promise<BiomesStorage.WriteResult> {
    checkCanBeStored(data);
    data = replaceFieldDeleteMarkers(data);
    await this.client.updateDoc({
      value: removeUndefinedAndDeletionMarkers(data) as JSONObject,
      path: this.path,
    });
    return {};
  }

  async set(data: T): Promise<BiomesStorage.WriteResult> {
    checkCanBeStored(data);
    await this.client.setDoc({
      value: removeUndefinedAndDeletionMarkers(data),
      path: this.path,
    });
    return {};
  }

  async delete(): Promise<BiomesStorage.WriteResult> {
    await this.client.deleteDoc(this.path);
    return {};
  }
}

class Query<T extends JSONObject = BiomesStorage.DocumentData>
  implements BiomesStorage.Query<T>
{
  private filters: z.infer<typeof zFilter>[] = [];
  _offset?: number;
  _limit?: number;
  _startAfter?: BiomesStorage.QueryDocumentSnapshot<T>;
  private orderings: Ordering<T>[] = [];

  constructor(private readonly collection: Collection<T>) {}

  where(
    field: keyof T & string,
    op: BiomesStorage.WhereFilterOp,
    value: any
  ): BiomesStorage.Query<T> {
    this.filters.push({
      field,
      op,
      value,
    });
    return this;
  }

  orderBy(
    field: keyof T & string,
    direction?: BiomesStorage.OrderByDirection
  ): BiomesStorage.Query<T> {
    this.orderings.push({
      field,
      direction: direction ?? "asc",
    });
    return this;
  }

  offset(limit: number): BiomesStorage.Query<T> {
    this._offset = limit;
    return this;
  }

  limit(limit: number): BiomesStorage.Query<T> {
    this._limit = limit;
    return this;
  }

  startAfter(
    doc: BiomesStorage.QueryDocumentSnapshot<T>
  ): BiomesStorage.Query<T> {
    this._startAfter = doc;
    return this;
  }

  async get(): Promise<BiomesStorage.QuerySnapshot<T>> {
    const docs: SimpleQueryDocumentSnapshot<T>[] = [];
    for await (const page of this.collection.client.query({
      path: this.collection.path,
      offset: this._offset,
      limit: this._limit,
      orderings: this.orderings,
      filters: this.filters,
      startAfter: this._startAfter?.id,
    })) {
      for (const snapshot of page) {
        docs.push(
          new SimpleQueryDocumentSnapshot<T>(
            new Document(this.collection.client, [
              ...this.collection.path,
              snapshot.id,
            ]),
            snapshot.value as T
          )
        );
      }
    }
    return new SimpleQuerySnapshot(docs);
  }
}

export class Collection<T extends JSONObject = BiomesStorage.DocumentData>
  implements BiomesStorage.CollectionReference<T>
{
  constructor(
    public readonly client: RemoteStorageClient,
    public readonly path: StoragePath[]
  ) {}

  get id() {
    return this.path[this.path.length - 1];
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

  doc(documentPath?: StoragePath): BiomesStorage.DocumentReference<T> {
    documentPath ??= BiomesStorage.escape(autoId());
    return new Document(this.client, [...this.path, documentPath]);
  }

  async add(data: T): Promise<BiomesStorage.DocumentReference<T>> {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }
}

class RemoteTransaction implements BiomesStorage.Transaction {
  private doneWrite: boolean = false;
  private readonly request: RunTransactionRequest = {
    iff: [],
    creates: [],
    updates: [],
    sets: [],
    deletes: [],
  };

  constructor(private readonly client: RemoteStorageClient) {}

  async get<T extends JSONObject>(
    documentRef: BiomesStorage.DocumentReference<T>
  ): Promise<BiomesStorage.DocumentSnapshot<T>> {
    ok(!this.doneWrite, "Transaction writes must follow all reads");
    const ref = documentRef as Document<T>;
    const snapshot = await ref.get();
    this.request.iff.push({
      path: ref.path,
      version: snapshot.version,
    });
    return snapshot;
  }

  private startWrites() {
    if (!this.doneWrite) {
      this.doneWrite = true;
    }
  }

  create<T extends JSONObject>(
    documentRef: BiomesStorage.DocumentReference<T>,
    data: T
  ): BiomesStorage.Transaction {
    checkCanBeStored(data);
    this.startWrites();
    this.request.creates.push({
      path: (documentRef as Document<T>).path,
      value: removeUndefinedAndDeletionMarkers(data),
    });
    return this;
  }

  set<T extends JSONObject>(
    documentRef: BiomesStorage.DocumentReference<T>,
    data: T
  ): BiomesStorage.Transaction {
    checkCanBeStored(data);
    this.startWrites();
    this.request.sets.push({
      path: (documentRef as Document<T>).path,
      value: removeUndefinedAndDeletionMarkers(data),
    });
    return this;
  }

  update<T extends JSONObject>(
    documentRef: BiomesStorage.DocumentReference<T>,
    data: Partial<T>
  ): BiomesStorage.Transaction {
    checkCanBeStored(data);
    this.startWrites();
    this.request.updates.push({
      path: (documentRef as Document<T>).path,
      value: removeUndefinedAndDeletionMarkers(data) as JSONObject,
    });
    return this;
  }

  delete(
    documentRef: BiomesStorage.DocumentReference
  ): BiomesStorage.Transaction {
    this.startWrites();
    this.request.deletes.push((documentRef as Document).path);
    return this;
  }

  async commit(): Promise<void> {
    await this.client.runTransaction(this.request);
  }
}

export class RemoteStorage implements BiomesStorage.Store {
  constructor(private readonly client: RemoteStorageClient) {}

  collection(collectionPath: StoragePath): BiomesStorage.CollectionReference {
    checkValidPath(collectionPath);
    return new Collection(this.client, [collectionPath]);
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
    for (let i = 0; i < CONFIG.devShimTransactionAttempts; ++i) {
      try {
        const transaction = new RemoteTransaction(this.client);
        const result = await updateFunction(transaction);
        await transaction.commit();
        return result;
      } catch (error) {
        if (
          error instanceof RpcClientError &&
          error.code === grpc.status.FAILED_PRECONDITION
        ) {
          // Optimistic transaction failure, try again.
          continue;
        }
        throw error;
      }
    }
    throw new RpcClientError(
      "/remote-storage/runTransaction",
      grpc.status.ABORTED,
      "Too much transaction contention."
    );
  }
}

export type RemoteStorageService = ZService<typeof zRemoteStorageService>;

function version<T extends JSONObject>(data: T | undefined) {
  return data === undefined ? "" : md5(zrpcSerialize(data as any));
}

function pathPk(path: StoragePath[]): string {
  return path.join("/");
}

export class ExposeStorageService implements RemoteStorageService {
  constructor(private readonly backing: BiomesStorage.Store) {}

  private pathToDocRef(path: StoragePath[]) {
    ok(path.length > 0, "Empty path");
    ok(path.length % 2 === 0, "Path references a collection");
    let collection = this.backing.collection(path[0]);
    for (let i = 1; i < path.length; i += 2) {
      const doc = collection.doc(path[i]);
      if (i === path.length - 1) {
        return doc;
      }
      collection = doc.collection(path[i + 1]);
    }
    throw new RpcError(grpc.status.INTERNAL, "Unreachable.");
  }

  async getDoc(
    _context: RpcContext,
    path: StoragePath[]
  ): Promise<QueryDocumentSnapshot | undefined> {
    const ref = this.pathToDocRef(path);
    const result = await ref.get();
    if (!result.exists) {
      return undefined;
    }
    return {
      id: result.id,
      value: result.data()!,
      version: version(result.data()),
    };
  }

  async createDoc(_context: RpcContext, { path, value }: RefAndData) {
    await this.pathToDocRef(path).create(value);
  }

  async updateDoc(_context: RpcContext, { path, value }: RefAndData) {
    await this.pathToDocRef(path).update(value);
  }

  async setDoc(_context: RpcContext, { path, value }: RefAndData) {
    await this.pathToDocRef(path).set(value);
  }

  async deleteDoc(_context: RpcContext, path: StoragePath[]) {
    await this.pathToDocRef(path).delete();
  }

  private pathToCollectionRef(path: StoragePath[]) {
    ok(path.length > 0, "Empty path");
    ok(path.length % 2 === 1, "Path references a document");
    let collection = this.backing.collection(path[0]);
    for (let i = 1; i < path.length; i += 2) {
      const doc = collection.doc(path[i]);
      collection = doc.collection(path[i + 1]);
    }
    return collection;
  }

  async *query(
    _context: RpcContext,
    {
      path,
      offset,
      limit,
      startAfter,
      orderings,
      filters,
    }: QueryCollectionRequest
  ) {
    try {
      const collection = this.pathToCollectionRef(path);
      let query = collection.offset(offset ?? 0);
      if (limit !== undefined) {
        query = query.limit(limit);
      }
      for (const ordering of orderings) {
        query = query.orderBy(ordering.field, ordering.direction);
      }
      for (const filter of filters) {
        query = query.where(filter.field, filter.op, filter.value);
      }
      if (startAfter !== undefined) {
        const doc = await collection.doc(startAfter).get();
        query = query.startAfter(doc);
      }
      const batch: QueryDocumentSnapshot[] = [];
      for (const doc of (await query.get()).docs) {
        if (batch.length === 100) {
          yield batch;
          batch.length = 0;
        }
        batch.push({
          id: doc.id,
          value: doc.data()!,
          version: version(doc.data()!),
        });
      }
      if (batch.length > 0) {
        yield batch;
      }
    } catch (error) {
      throw new RpcError(
        grpc.status.INTERNAL,
        `Error performing query: ${error}`
      );
    }
  }

  async runTransaction(
    _context: RpcContext,
    { iff: iffs, creates, updates, sets, deletes }: RunTransactionRequest
  ) {
    await this.backing.runTransaction(async (t) => {
      const fetched = new Set<string>();
      for (const iff of iffs) {
        const pk = pathPk(iff.path);
        ok(!fetched.has(pk));
        fetched.add(pk);
        const doc = await t.get(this.pathToDocRef(iff.path));
        if (iff.version !== version(doc.exists ? doc.data()! : undefined)) {
          throw new RpcError(
            grpc.status.FAILED_PRECONDITION,
            "Optimistic transaction failed"
          );
        }
      }
      for (const create of creates) {
        t.create(this.pathToDocRef(create.path), create.value);
      }
      for (const update of updates) {
        t.update(this.pathToDocRef(update.path), update.value);
      }
      for (const set of sets) {
        t.set(this.pathToDocRef(set.path), set.value);
      }
      for (const deletePath of deletes) {
        t.delete(this.pathToDocRef(deletePath));
      }
    });
  }
}
