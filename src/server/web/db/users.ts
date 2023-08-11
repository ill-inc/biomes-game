import type { BDB } from "@/server/shared/storage";
import { invalidateInviteCodeAfterUse } from "@/server/web/db/invite_codes";
import type {
  FirestoreUser,
  FirestoreUserData,
  WithId,
} from "@/server/web/db/types";
import { normalizeUsernameForFirebaseUnique } from "@/server/web/db/users_fetch";
import { makeCloudImageBundle } from "@/server/web/util/image_resizing";
import { generateInitialUsername } from "@/server/web/util/username";
import type { BiomesId } from "@/shared/ids";
import { parseBiomesId, toStoredEntityId } from "@/shared/ids";
import type { CloudBucketKey } from "@/shared/url_types";
import { fireAndForget } from "@/shared/util/async";
import { dataURLToBase64 } from "@/shared/util/helpers";

export async function disableUser(
  db: BDB,
  uid: BiomesId,
  disabled: boolean
): Promise<void> {
  await db.collection("users").doc(toStoredEntityId(uid)).update({
    disabled,
  });
}

export async function saveUsername(db: BDB, uid: BiomesId, username: string) {
  const userDocRef = db.collection("users").doc(toStoredEntityId(uid));
  const usernameDocRef = db
    .collection("usernames")
    .doc(normalizeUsernameForFirebaseUnique(username));
  // We enforce unique usernames by a secondary table that just stores usernames
  await db.runTransaction(async (transaction) => {
    return transaction.get(userDocRef).then((userDoc) => {
      if (userDoc.exists) {
        const oldName = userDoc.data()?.username;
        transaction.update(userDocRef, {
          username,
        });

        // Rare case: changing case of a name
        if (
          oldName &&
          normalizeUsernameForFirebaseUnique(username) ===
            normalizeUsernameForFirebaseUnique(oldName)
        ) {
          return;
        }

        if (oldName !== undefined) {
          transaction.delete(
            db
              .collection("usernames")
              .doc(normalizeUsernameForFirebaseUnique(oldName))
          );
        }
        transaction.create(usernameDocRef, {
          userId: parseBiomesId(userDoc.id),
        });
      } else {
        // TODO: this path shouldn't really be hit... users should be created after auth
        transaction.create(userDocRef, {
          username,
          numFollowers: 0,
          numFollowing: 0,
          numPhotos: 0,
        });
        transaction.create(usernameDocRef, {
          userId: parseBiomesId(userDoc.id),
        });
      }
    });
  });
}

export async function updateProfilePicture(
  db: BDB,
  userId: BiomesId,
  dataURI: string,
  hash: string
) {
  const b64 = dataURLToBase64(dataURI);

  const basePath = `${userId}/profile_pic`;
  const image = Buffer.from(b64, "base64");
  const cloudBucketKey: CloudBucketKey = "biomes-social";
  const cloudBundle = await makeCloudImageBundle(
    "biomes-social",
    image,
    basePath
  );

  await db.collection("users").doc(toStoredEntityId(userId)).update({
    profilePicCloudBucket: cloudBucketKey,
    profilePicCloudImageLocations: cloudBundle,
    profilePicHash: hash,
  });
}

function newUserData(username: string, inviteCode?: string): FirestoreUserData {
  return {
    username,
    inviteCode,
    numFollowers: 0,
    numPhotos: 0,
    numFollowing: 0,
    createMs: Date.now(),
    disabled: false,
  };
}

export async function getUserOrCreateIfNotExists(
  db: BDB,
  uid: BiomesId,
  desiredUsername?: string,
  inviteCode?: string
): Promise<WithId<FirestoreUser, BiomesId>> {
  let writeUsername = desiredUsername ?? generateInitialUsername();
  const takenUsername = await db
    .collection("usernames")
    .doc(normalizeUsernameForFirebaseUnique(writeUsername))
    .get();
  const userDocRef = db.collection("users").doc(toStoredEntityId(uid));
  if (takenUsername.exists) {
    if (takenUsername.data()!.userId === uid) {
      return {
        ...(await userDocRef.get()).data()!,
        id: uid,
      };
    }
    writeUsername = `user-${uid}`;
  }

  const usernameDocRef = db
    .collection("usernames")
    .doc(normalizeUsernameForFirebaseUnique(writeUsername));
  // We enforce unique usernames by a secondary table that just stores usernames
  const createdDoc: WithId<FirestoreUserData> | undefined =
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userDocRef);
      if (userDoc.exists) {
        return;
      }

      const doc = newUserData(writeUsername, inviteCode);
      transaction.create(userDocRef, doc);
      transaction.create(usernameDocRef, {
        userId: uid,
      });

      return {
        ...doc,
        id: uid,
      };
    });

  if (createdDoc) {
    fireAndForget(invalidateInviteCodeAfterUse(db, createdDoc, inviteCode));
  }

  return {
    ...(await userDocRef.get()).data()!,
    id: uid,
  };
}

export class UserExistsError extends Error {}
