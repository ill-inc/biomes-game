import type { BDB } from "@/server/shared/storage";
import type { FirestoreUser } from "@/server/web/db/types";
import { avatarPlaceholderURL, resolveImageUrls } from "@/server/web/util/urls";
import type { BiomesId } from "@/shared/ids";
import { parseBiomesId, toStoredEntityId } from "@/shared/ids";
import type { UserBundle } from "@/shared/types";
import { compactMap } from "@/shared/util/collections";
import type { WithId } from "@/shared/util/type_helpers";
import { ok } from "assert";
import { compact, keyBy } from "lodash";

export function normalizeUsernameForFirebaseUnique(username: string): string {
  return username.toLowerCase();
}

export async function fetchUserBundles(
  db: BDB,
  ...users: WithId<FirestoreUser, BiomesId>[]
): Promise<UserBundle[]> {
  return users.map((user) => {
    return {
      id: user.id,
      createMs: user.createMs ?? 0,
      username: user.username,
      profilePicImageUrls: resolveImageUrls(
        user.profilePicCloudBucket ?? "biomes-social",
        user.profilePicCloudImageLocations ?? {},
        avatarPlaceholderURL()
      ),
      numFollowers: user.numFollowers,
      numFollowing: user.numFollowing,
      numPhotos: user.numPhotos,
      disabled: user.disabled ?? false,
    };
  });
}

export async function fetchSingleUserBundleById(db: BDB, userId: BiomesId) {
  return (await fetchUserBundlesByIds(db, userId))[0];
}

export async function fetchUserBundlesByIds(
  db: BDB,
  ...userIds: BiomesId[]
): Promise<(UserBundle | undefined)[]> {
  if (userIds.length === 0) {
    return [];
  }
  const nonNullUsers = compact(await findAllByUID(db, userIds, true));
  const userBundles = await fetchUserBundles(db, ...nonNullUsers);
  const retMap = keyBy(userBundles, "id");

  return userIds.map((uid) => retMap[uid]);
}

export async function findByUID(
  db: BDB,
  uid: BiomesId,
  includeDisabled: boolean = false
): Promise<WithId<FirestoreUser, BiomesId> | undefined> {
  const doc = await db.collection("users").doc(toStoredEntityId(uid)).get();
  if (!doc.exists) {
    return;
  }
  if (!includeDisabled && doc.exists && doc.data()!.disabled) {
    return;
  }
  return {
    ...doc.data()!,
    id: parseBiomesId(doc.id),
  };
}

export async function findAllByUID(
  db: BDB,
  uids: BiomesId[],
  includeDisabled: boolean = false
): Promise<(WithId<FirestoreUser, BiomesId> | undefined)[]> {
  const docIds = uids.map((e) =>
    db.collection("users").doc(toStoredEntityId(e))
  );
  const ret = await db.getAll(...docIds);
  return compactMap(ret, (e) => {
    if (!e.exists) {
      return;
    }
    if (!includeDisabled && e.data()!.disabled) {
      return;
    }
    return {
      ...e.data()!,
      id: parseBiomesId(e.id),
    };
  });
}

export async function getAllUsers(
  db: BDB,
  offset: number = 0,
  pageSize: number = 40,
  inviteCode?: string,
  includeDisabled: boolean = false
): Promise<WithId<FirestoreUser, BiomesId>[]> {
  let users = db.collection("users").query();
  if (!includeDisabled) {
    users = users.where("disabled", "==", false);
  }
  if (inviteCode) {
    users = users.where("inviteCode", "==", inviteCode);
  }
  return (
    await users.orderBy("username", "asc").offset(offset).limit(pageSize).get()
  ).docs.map((e) => ({
    ...e.data()!,
    id: parseBiomesId(e.id),
  }));
}

export async function findUniqueByUsername(
  db: BDB,
  username: string,
  includeDisabled: boolean = false
): Promise<WithId<FirestoreUser, BiomesId> | undefined> {
  const usernameDocRef = db
    .collection("usernames")
    .doc(normalizeUsernameForFirebaseUnique(username));
  const usernameDoc = await usernameDocRef.get();
  if (usernameDoc.exists) {
    const ret = await findByUID(
      db,
      usernameDoc.data()!.userId,
      includeDisabled
    );
    ok(ret, "Bad username pointer");
    return ret;
  }

  return undefined;
}
