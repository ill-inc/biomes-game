import { zFirestoreTray } from "@/server/shared/bikkie/bakery";
import { isRunningOnKubernetes } from "@/server/shared/k8";
import { HostPort } from "@/server/shared/ports";
import type { BiomesStorage } from "@/server/shared/storage/biomes";
import { createCopyOnWriteStorage } from "@/server/shared/storage/copy_on_write";
import { getFirebaseBackedStorage } from "@/server/shared/storage/firestore";
import { createInMemoryStorage } from "@/server/shared/storage/memory";
import {
  persistBackingStorage,
  setupStorageDir,
} from "@/server/shared/storage/persist_through";
import {
  RemoteStorage,
  zRemoteStorageService,
} from "@/server/shared/storage/remote";
import { collection, doc, schemaStore } from "@/server/shared/storage/schema";
import { makeClient } from "@/server/shared/zrpc/client";
import { addRetriesForUnavailable } from "@/server/shared/zrpc/retries";
import {
  zFirestoreCuratedFeedPost,
  zFirestoreDocumentComment,
  zFirestoreDocumentLike,
  zFirestoreDocumentWarp,
  zFirestoreEnvironmentGroup,
  zFirestoreFeedPost,
  zFirestoreIdGenerator,
  zFirestoreInviteCode,
  zFirestoreServerTask,
  zFirestoreServerTaskLogItem,
  zFirestoreSessionData,
  zFirestoreUserAuthLinkData,
  zFirestoreUserData,
  zFirestoreUserFollow,
  zFirestoreUserFollowedBy,
  zFirestoreUsernamesData,
  zFirestoreWebPushToken,
  zFirestoreWorldMap,
  zTweakBlob,
} from "@/server/web/db/types";
import { zMirroredAsset } from "@/shared/drive/types";
import { zBiomesId, zStoredEntityId } from "@/shared/ids";
import { zCachedImage } from "@/shared/images/types";
import { log } from "@/shared/logging";
import { zTileMap } from "@/shared/map/types";
import type { RegistryLoader } from "@/shared/registry";
import { zChatVoice, zTranslation } from "@/shared/voices/types";
import { z } from "zod";

// Social

export const zFirestoreFeedPostDoc = doc(
  zStoredEntityId,
  zFirestoreFeedPost,
  collection("comments", doc(zStoredEntityId, zFirestoreDocumentComment)),
  collection("likes", doc(zStoredEntityId, zFirestoreDocumentLike)),
  collection("warps", doc(zStoredEntityId, zFirestoreDocumentWarp))
);

export type FirestoreFeedPostDoc = typeof zFirestoreFeedPostDoc;

export const zFirestoreCuratedFeedPostDoc = doc(
  zStoredEntityId,
  zFirestoreCuratedFeedPost,
  collection("feed-posts", doc(zStoredEntityId, zFirestoreFeedPost))
);

export type FirestoreCuratedFeedPostDoc = typeof zFirestoreCuratedFeedPostDoc;

// Tasks

export function serverTasksSchema<TName extends string>(name: TName) {
  return collection(
    name,
    doc(
      z.string(),
      zFirestoreServerTask,
      collection(
        "server-task-events",
        doc(z.string(), zFirestoreServerTaskLogItem)
      )
    )
  );
}

export type ServerTasksSchema = ReturnType<typeof serverTasksSchema>;

// Create the overall storage schema.

export function createBdb(backing: BiomesStorage.Store) {
  return schemaStore(
    backing,
    collection(
      "users",
      doc(
        zStoredEntityId,
        zFirestoreUserData,
        collection("follows", doc(zStoredEntityId, zFirestoreUserFollow)),
        collection(
          "followed-by",
          doc(zStoredEntityId, zFirestoreUserFollowedBy)
        ),
        collection("push-tokens", doc(z.string(), zFirestoreWebPushToken))
      )
    ),
    collection("usernames", doc(z.string(), zFirestoreUsernamesData)),
    collection("id-generators", doc(z.string(), zFirestoreIdGenerator)),
    collection("inviteCodes", doc(z.string(), zFirestoreInviteCode)),
    collection("sessions", doc(z.string(), zFirestoreSessionData)),
    collection("world-map", doc(z.string(), zFirestoreWorldMap)),
    collection("map-indices", doc(z.string(), zTileMap)),
    serverTasksSchema("server-tasks"),
    serverTasksSchema("server-tasks-dev"),
    collection("user-auth-links", doc(z.string(), zFirestoreUserAuthLinkData)),
    collection("tweakable-config", doc("config-document-1", zTweakBlob)),
    collection(
      "environment-groups",
      doc(zStoredEntityId, zFirestoreEnvironmentGroup)
    ),
    collection("feed-posts", zFirestoreFeedPostDoc),
    collection("currated-feed-posts", zFirestoreCuratedFeedPostDoc),
    collection(
      "bikkie",
      doc(zStoredEntityId, zFirestoreTray),
      doc("names", z.object({ idToName: z.record(z.string()) })),
      doc("active", z.object({ id: zBiomesId }))
    ),
    collection(
      "waitlist",
      doc(
        z.string(),
        z.object({
          origin: z.string(),
          createdAt: z.number(),
          ua: z.string(),
        })
      )
    ),
    collection("mirrored-assets", doc(z.string(), zMirroredAsset)),
    collection(
      "notified-prs",
      doc(
        z.string(),
        z.object({
          notified: z.string().array().optional(),
          updatedAtMs: z.number(),
        })
      )
    ),
    collection("voices-cache", doc(z.string(), zChatVoice)),
    collection("images-cache", doc(z.string(), zCachedImage)),
    collection("translations", doc(z.string(), zTranslation))
  );
}

export type BDB = ReturnType<typeof createBdb>;

export type StorageMode =
  | "copy-on-write"
  | "firestore"
  | "memory"
  | "snapshot"
  | "shim";

interface StorageContext {
  config: {
    copyOnWriteSnapshot: string;
    storageMode: StorageMode;
  };
}

function createShimStorage() {
  return new RemoteStorage(
    addRetriesForUnavailable(
      zRemoteStorageService,
      makeClient(zRemoteStorageService, HostPort.forShim().rpc)
    )
  );
}

export async function createStorageBackend(
  storageMode: StorageMode,
  copyOnWriteSnapshot?: string
) {
  switch (storageMode) {
    case "copy-on-write":
      log.info("STORAGE MODE: Copy-on-write backed by production Firestore");
      return createCopyOnWriteStorage(getFirebaseBackedStorage());
    case "firestore":
      if (!isRunningOnKubernetes()) {
        log.error("WARNING WARNING WARNING: USING PRODUCTION STORAGE LOCALLY!");
      } else {
        log.info("STORAGE MODE: Production Firestore");
      }
      return getFirebaseBackedStorage();
    case "snapshot":
      log.warn("STORAGE MODE: Snapshot-backed");
      return createCopyOnWriteStorage(
        persistBackingStorage(
          await setupStorageDir(copyOnWriteSnapshot || "default"),
          getFirebaseBackedStorage()
        )
      );
    case "memory":
      log.warn("STORAGE MODE: In-memory storage, will not be persisted");
      return createInMemoryStorage();
    case "shim":
      log.info(`STORAGE MODE: Locally running shim ${HostPort.forShim().rpc}`);
      return createShimStorage();
    default:
      throw new Error(`Unknown storage mode: '${storageMode}'`);
  }
}

export async function registerBiomesStorage<C extends StorageContext>(
  loader: RegistryLoader<C>
) {
  const config = await loader.get("config");
  return createBdb(
    await createStorageBackend(config.storageMode, config.copyOnWriteSnapshot)
  );
}
