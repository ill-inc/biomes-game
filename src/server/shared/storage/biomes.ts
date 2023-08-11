/* eslint-disable @typescript-eslint/no-namespace */

import type { JSONObject } from "@/shared/util/type_helpers";
import { FieldValue } from "@google-cloud/firestore";
import { ok } from "assert";
import type { ZodType } from "zod";
import { z } from "zod";

export const FieldDeleteMarker = FieldValue.delete();

export type StoragePath = string & {
  readonly "use BiomesStorage.(un)escape": unique symbol;
};

export const zStoragePath = z.string() as unknown as ZodType<StoragePath>;

// Storage interface used by the biomes servers, basically a clone of the
// Firestore v8 API.
export namespace BiomesStorage {
  export type DocumentData = JSONObject;

  // Number overload is to ensure double-escaping doesn't happen.
  export function escape(id: string): StoragePath {
    // Firestore IDs must:
    // - Be UTF-8, achieved by encodeURI
    // - Be shorter than 1500
    // - Not to contain /, done by manual replacement.
    // - Not to contain . or .. in isolation, done by individual replacement.
    // - Not to match __.*__, done by replacement of the suffix.
    id = encodeURI(id)
      .replace(/[./]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
      .replace(/__$/, "%5F%5F");
    ok(id.length < 1500);
    return id as StoragePath;
  }

  export function unescape(id: StoragePath): string {
    return decodeURIComponent(id);
  }

  // Represents a document at a fixed point in time.
  export interface DocumentSnapshot<T = DocumentData> {
    readonly exists: boolean;
    readonly id: StoragePath;
    readonly ref: DocumentReference<T>;
    data(): T | undefined;
  }

  // Unsupported for now.
  export interface WriteResult {}

  // Represents a reference to a document.
  export interface DocumentReference<T = DocumentData> {
    readonly id: StoragePath;
    listCollections(): Promise<CollectionReference<DocumentData>[]>;
    collection(collectionPath: StoragePath): CollectionReference<DocumentData>;
    get(): Promise<DocumentSnapshot<T>>;
    create(data: T): Promise<WriteResult>;
    update(data: object): Promise<WriteResult>;
    set(data: T): Promise<WriteResult>;
    delete(): Promise<WriteResult>;
  }

  // Represents a snapshot of a document in a query result, where data is always
  // present.
  export interface QueryDocumentSnapshot<T = DocumentData>
    extends DocumentSnapshot<T> {
    data(): T;
  }

  // Represents the result of a collection query.
  export interface QuerySnapshot<T = DocumentData> {
    readonly docs: Array<QueryDocumentSnapshot<T>>;
    readonly empty: boolean;
  }

  export type WhereFilterOp =
    | "<"
    | "<="
    | "=="
    | "!="
    | ">="
    | ">"
    | "array-contains"
    | "in"
    | "not-in"
    | "array-contains-any";
  export type OrderByDirection = "desc" | "asc";

  // Represents a query of an underlying collections.
  export interface Query<T = DocumentData> {
    where(field: keyof T & string, opStr: WhereFilterOp, value: any): Query<T>;
    orderBy(field: keyof T & string, directionStr?: OrderByDirection): Query<T>;
    offset(limit: number): Query<T>;
    limit(limit: number): Query<T>;
    startAfter(doc: DocumentSnapshot<T>): Query<T>;
    get(): Promise<QuerySnapshot<T>>;
  }

  // Represents a reference to a collection.
  export interface CollectionReference<T = DocumentData> extends Query<T> {
    readonly id: StoragePath;
    doc(documentPath?: StoragePath): DocumentReference<T>;
    add(data: T): Promise<DocumentReference<T>>;
  }

  // Transaction operations, see runTransaction below.
  export interface Transaction {
    get<T extends JSONObject>(
      documentRef: DocumentReference<T>
    ): Promise<DocumentSnapshot<T>>;
    create<T extends JSONObject>(
      documentRef: DocumentReference<T>,
      data: T
    ): Transaction;
    set<T extends JSONObject>(
      documentRef: DocumentReference<T>,
      data: T
    ): Transaction;
    update<T extends JSONObject>(
      documentRef: DocumentReference<T>,
      data: Partial<T>
    ): Transaction;
    delete(documentRef: DocumentReference): Transaction;
  }

  // The overall DB.
  export interface Store {
    // Get a reference to a particular collection.
    collection(collectionPath: StoragePath): CollectionReference;

    // Get all documents by reference, non-atomic.
    getAll(
      ...documentRefs: Array<DocumentReference>
    ): Promise<Array<DocumentSnapshot<DocumentData>>>;

    // Run a transaction, the given function is called with a transactional object
    // that implements *at-least* pessimistic locking. You must read all objects
    // before performing any write, and all reads are at the state prior to the
    // transaction commencing. It is possible for the transaction to fail - in which
    // case the operation will be retried a number of times.
    runTransaction<T>(
      updateFunction: (transaction: Transaction) => Promise<T>
    ): Promise<T>;
  }
}
