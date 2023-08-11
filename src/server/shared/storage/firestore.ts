/* eslint-disable @typescript-eslint/no-namespace */

import { getFirebaseAdminApp } from "@/server/shared/firebase";
import type {
  BiomesStorage,
  StoragePath,
} from "@/server/shared/storage/biomes";

export class Store implements BiomesStorage.Store {
  private readonly db: FirebaseFirestore.Firestore;

  constructor(db: FirebaseFirestore.Firestore) {
    this.db = db;
  }

  collection(collectionPath: StoragePath): BiomesStorage.CollectionReference {
    return this.db.collection(
      collectionPath
    ) as unknown as BiomesStorage.CollectionReference;
  }

  getAll(
    ...documentRefs: Array<BiomesStorage.DocumentReference>
  ): Promise<Array<BiomesStorage.DocumentSnapshot>> {
    if (documentRefs.length === 0) {
      return Promise.resolve([]);
    }
    return this.db.getAll(
      ...(documentRefs as unknown as Array<FirebaseFirestore.DocumentReference>)
    ) as unknown as Promise<Array<BiomesStorage.DocumentSnapshot>>;
  }

  runTransaction<T>(
    updateFunction: (transaction: BiomesStorage.Transaction) => Promise<T>
  ): Promise<T> {
    return this.db.runTransaction(
      (transaction: FirebaseFirestore.Transaction) => {
        return updateFunction(
          transaction as unknown as BiomesStorage.Transaction
        );
      }
    );
  }
}

export function getFirestoreInstance(): FirebaseFirestore.Firestore {
  if (!(global as any).firestoreInstance) {
    const instance = getFirebaseAdminApp();
    const firestore = instance.firestore();
    firestore.settings({
      ignoreUndefinedProperties: true,
    });
    (global as any).firestoreInstance = firestore;
  }

  return (global as any).firestoreInstance as FirebaseFirestore.Firestore;
}

export function getFirebaseBackedStorage(): BiomesStorage.Store {
  return new Store(getFirestoreInstance());
}
