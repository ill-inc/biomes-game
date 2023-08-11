import type {
  BackingCollection,
  BackingDocument,
  BackingQuerySnapshot,
  BackingStore,
} from "@/server/shared/storage/backing";
import type {
  BiomesStorage,
  StoragePath,
} from "@/server/shared/storage/biomes";
import { createCopyOnWriteStorage } from "@/server/shared/storage/copy_on_write";

class EmptyBackingCollection<T = BiomesStorage.DocumentData>
  implements BackingCollection<T>
{
  constructor(readonly id: StoragePath) {}

  doc(docPath: StoragePath): BackingDocument<T> {
    return {
      id: docPath,
      collection: (collectionPath: StoragePath) =>
        new EmptyBackingCollection<T>(collectionPath),
      get: async () => {
        return { data: () => undefined };
      },
    };
  }

  async get(): Promise<BackingQuerySnapshot<T>> {
    return {
      docs: [],
    };
  }
}

class EmptyBackingStore implements BackingStore {
  collection(path: StoragePath): BackingCollection {
    return new EmptyBackingCollection(path);
  }
}

export function createInMemoryStorage(): BiomesStorage.Store {
  return createCopyOnWriteStorage(new EmptyBackingStore());
}
