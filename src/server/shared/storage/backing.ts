import type {
  BiomesStorage,
  StoragePath,
} from "@/server/shared/storage/biomes";

// The copy on write storage doesn't use the full BiomesStorage interface, so instead
// define solely the subset it depends upon to simplify implementation in tests.

// Represents fixed document data at a point in time.
export interface BackingDocumentSnapshot<T = BiomesStorage.DocumentData> {
  data(): T | undefined;
}

// Represents a reference to a document.
export interface BackingDocument<T = BiomesStorage.DocumentData> {
  readonly id: StoragePath;
  collection(collectionPath: StoragePath): BackingCollection<T>;
  get(): Promise<BackingDocumentSnapshot<T>>;
}

// Represents fixed document data from a query, which is a combination of the above.
export interface BackingQueryDocumentSnapshot<T = BiomesStorage.DocumentData> {
  readonly id: StoragePath;
  readonly ref: BackingDocument<T>;
  data(): T;
}

// Represents a complete response to a collection query.
export interface BackingQuerySnapshot<T = BiomesStorage.DocumentData> {
  readonly docs: Array<BackingQueryDocumentSnapshot<T>>;
}

// Represents a collection of documents.
export interface BackingCollection<T = BiomesStorage.DocumentData> {
  readonly id: StoragePath;
  doc(docPath: StoragePath): BackingDocument<T>;
  get(): Promise<BackingQuerySnapshot<T>>;
}

// Represents a backing store of information.
export interface BackingStore {
  collection(path: StoragePath): BackingCollection;
}
