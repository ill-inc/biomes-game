import type {
  BackingCollection,
  BackingDocument,
  BackingDocumentSnapshot,
  BackingQueryDocumentSnapshot,
  BackingQuerySnapshot,
  BackingStore,
} from "@/server/shared/storage/backing";
import type {
  BiomesStorage,
  StoragePath,
} from "@/server/shared/storage/biomes";
import { log } from "@/shared/logging";
import { ok } from "assert";
import crc32 from "crc/crc32";
import { mkdirSync } from "fs";
import { mkdir, readdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

const ENOENT = "ENOENT";
export const DATA_SUFFIX = ".data";
export const COMPLETE_COLLECTION_MARKER = "complete";
export const LOCAL_STORAGE_DIR = ".cow";

// Exported for testability.
export function escapeStoragePath(path: StoragePath): string {
  // Make sure we include crc for case sensitivity and long files.
  // Limit to maximum filename length.
  return (
    `${path}.${crc32(path).toString(16)}`
      .slice(0, 255 - DATA_SUFFIX.length)
      // Replace invalid windows filename characters with a dash.
      .replaceAll(/[<>:"\|\?\*]/g, "-")
  );
}

function makeSnapshot<T = BiomesStorage.DocumentData>(
  data: string | undefined
): BackingDocumentSnapshot<T> {
  if (data === undefined) {
    return {
      data: () => undefined,
    };
  }
  const parsed = JSON.parse(data);
  return {
    data: () => parsed.data as T,
  };
}

class PersistedBackingDocument<T = BiomesStorage.DocumentData>
  implements BackingDocument<T>
{
  constructor(
    private readonly path: string,
    private readonly doc: BackingDocument<T>
  ) {}

  get id() {
    return this.doc.id;
  }

  get dataPath() {
    return `${this.path}${DATA_SUFFIX}`;
  }

  async unlink() {
    await unlink(this.dataPath);
  }

  collection(id: StoragePath): BackingCollection<T> {
    const diskPath = path.join(this.path, escapeStoragePath(id));
    mkdirSync(diskPath, { recursive: true });
    return new PersistedBackingCollection(diskPath, this.doc.collection(id));
  }

  async get(): Promise<BackingDocumentSnapshot<T>> {
    try {
      const data = (await readFile(this.dataPath, "utf8")).trim();
      return makeSnapshot(data === ENOENT ? undefined : data);
    } catch (err: any) {
      if (err.code === ENOENT) {
        // Is missing, attempt to get from true backing.
        const backing = await this.doc.get();
        await writeFile(
          this.dataPath,
          backing.data() === undefined
            ? ENOENT
            : JSON.stringify({
                id: this.id,
                data: backing.data(),
              })
        );
        return backing;
      }
      throw err;
    }
  }
}

class PersistedBackingCollection<T = BiomesStorage.DocumentData>
  implements BackingCollection<T>
{
  constructor(
    private readonly path: string,
    private readonly collection: BackingCollection<T>,
    private readonly doNotScanBacking = false
  ) {}

  get id() {
    return this.collection.id;
  }

  doc(id: StoragePath): BackingDocument<T> {
    return new PersistedBackingDocument(
      path.join(this.path, escapeStoragePath(id)),
      this.collection.doc(id)
    );
  }

  async interpretFilesAsDocuments(
    folderPath: string,
    seen: Set<string>
  ): Promise<[boolean, BackingQueryDocumentSnapshot<T>[]]> {
    const docs: BackingQueryDocumentSnapshot<T>[] = [];
    const files = await readdir(folderPath, { withFileTypes: true });
    let complete = false;
    for (const file of files) {
      if (file.isDirectory() && file.name.startsWith(".cow")) {
        const [childComplete, childDocs] = await this.interpretFilesAsDocuments(
          path.join(folderPath, file.name),
          seen
        );
        complete = complete || childComplete;
        docs.push(...childDocs);
      }
      if (!file.isFile()) {
        continue;
      }
      if (file.name === COMPLETE_COLLECTION_MARKER) {
        complete = true;
        continue;
      }
      if (!file.name.endsWith(DATA_SUFFIX)) {
        continue;
      }
      const dataPath = path.join(folderPath, file.name);
      const data = (await readFile(dataPath, "utf8")).trim();
      if (data === ENOENT) {
        continue;
      }
      const parsed = JSON.parse(data);
      if (seen.has(parsed.id)) {
        await unlink(dataPath);
        continue;
      }
      seen.add(parsed.id);
      docs.push({
        id: parsed.id,
        ref: new PersistedBackingDocument(
          dataPath.slice(0, -DATA_SUFFIX.length),
          this.collection.doc(parsed.id)
        ),
        data: () => parsed.data as T,
      });
    }
    return [complete, docs];
  }

  async get(): Promise<BackingQuerySnapshot<T>> {
    // Get all items matching glob in path
    const docs: BackingQueryDocumentSnapshot<T>[] = [];
    try {
      const [complete, childDocs] = await this.interpretFilesAsDocuments(
        this.path,
        new Set()
      );
      docs.push(...childDocs);
      if (complete) {
        return {
          docs,
        };
      }
    } catch (err: any) {
      if (err.code !== ENOENT) {
        throw err;
      }
    }

    ok(
      !this.doNotScanBacking,
      `Collection at '${this.path}' cannot be scanned!`
    );

    // Delete all the old files as we're about to replace them.
    const promises: Promise<unknown>[] = [];
    for (const doc of docs) {
      if (promises.length > 500) {
        await Promise.all(promises);
        promises.length = 0;
      }
      promises.push((doc.ref as unknown as PersistedBackingDocument).unlink());
    }
    await Promise.all(promises);
    promises.length = 0;

    // Write all the new documents.
    const backing = await this.collection.get();
    await mkdir(this.path, { recursive: true });
    const useSubDirs = backing.docs.length > 10000;
    const createdSubDirs = new Set<string>();
    for (const backingDoc of backing.docs) {
      if (promises.length > 500) {
        await Promise.all(promises);
        promises.length = 0;
      }
      promises.push(
        (async () => {
          let dataPath = path.join(
            this.path,
            `${escapeStoragePath(backingDoc.id)}${DATA_SUFFIX}`
          );
          if (useSubDirs) {
            const crc = crc32(backingDoc.id).toString(16);
            const subDir = path.join(
              this.path,
              `.cow.${crc.slice(0, 2)}`
              // Add more layers if we have super large collections.
            );
            if (!createdSubDirs.has(subDir)) {
              await mkdir(subDir, { recursive: true });
              createdSubDirs.add(subDir);
            }
            dataPath = path.join(
              subDir,
              `${escapeStoragePath(backingDoc.id)}${DATA_SUFFIX}`
            );
          }
          await writeFile(
            dataPath,
            JSON.stringify({
              id: backingDoc.id,
              data: backingDoc.data(),
            })
          );
        })()
      );
    }
    await Promise.all(promises);
    await writeFile(path.join(this.path, COMPLETE_COLLECTION_MARKER), "ok");
    return backing;
  }
}

class PersistedBackingStore implements BackingStore {
  constructor(
    private readonly rootPath: string,
    private readonly store: BackingStore
  ) {}

  collection(id: StoragePath): BackingCollection {
    const diskPath = path.join(this.rootPath, "/", escapeStoragePath(id));
    mkdirSync(diskPath, { recursive: true });
    return new PersistedBackingCollection(diskPath, this.store.collection(id));
  }
}

export function persistBackingStorage(rootPath: string, store: BackingStore) {
  return new PersistedBackingStore(rootPath, store);
}

export async function setupStorageDir(active: string): Promise<string> {
  await mkdir(LOCAL_STORAGE_DIR, { recursive: true });
  const activeDir = path.join(LOCAL_STORAGE_DIR, active);
  await mkdir(activeDir, { recursive: true });
  log.info(`Persisted local storage ready as: ${activeDir}`);
  return activeDir;
}
