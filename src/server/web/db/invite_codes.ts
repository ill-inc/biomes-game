import type { BDB } from "@/server/shared/storage";
import type {
  FirestoreInviteCode,
  FirestoreUserData,
  WithId,
} from "@/server/web/db/types";
import { fetchUserBundlesByIds } from "@/server/web/db/users_fetch";
import type { BiomesId } from "@/shared/ids";
import type { InviteCodeBundle } from "@/shared/types";
import { compactMap } from "@/shared/util/collections";
import { randomString } from "@/shared/util/helpers";
import { compact, uniq } from "lodash";

const INVITE_CODE_LENGTH_LIMIT = 40 as const;

export function genInviteCodeString(prefix?: string) {
  const code = randomString(8);
  return (prefix ? `${prefix}-${code}` : code).toUpperCase();
}

export async function validateInviteCode(
  db: BDB,
  inviteCode: undefined | string
) {
  if (!inviteCode || CONFIG.instantAccessBlocklist.includes(inviteCode)) {
    return false;
  }
  if (CONFIG.instantAccessInviteCodes.includes(inviteCode)) {
    return true;
  }
  if (inviteCode.length > INVITE_CODE_LENGTH_LIMIT) {
    return false;
  }
  const inviteCodeDocRef = db.collection("inviteCodes").doc(inviteCode);
  const inviteCodeDoc = await inviteCodeDocRef.get();
  if (!inviteCodeDoc.exists) {
    return false;
  }

  return (
    (inviteCodeDoc.data()!.numTimesUsed ?? 0) <
    (inviteCodeDoc.data()!.maxUses ?? 1)
  );
}

export async function createInviteCode(
  db: BDB,
  inviteCode: string,
  maxUses: number,
  ownerId: BiomesId,
  createMemo?: string
): Promise<WithId<FirestoreInviteCode, string>> {
  const inviteCodeDocRef = db.collection("inviteCodes").doc(inviteCode);
  const docData: FirestoreInviteCode = {
    numTimesUsed: 0,
    createdAtMs: Date.now(),
    maxUses,
    createMemo,
    ownerId,
  };
  await inviteCodeDocRef.create(docData);
  return {
    id: inviteCode,
    ...docData,
  };
}

export async function invalidateInviteCodeAfterUse(
  db: BDB,
  user: WithId<FirestoreUserData>,
  inviteCode?: string
) {
  if (!inviteCode || inviteCode.length > INVITE_CODE_LENGTH_LIMIT) {
    return;
  }

  const inviteCodeDocRef = db.collection("inviteCodes").doc(inviteCode);
  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(inviteCodeDocRef);
    if (doc.exists) {
      transaction.update(inviteCodeDocRef, {
        numTimesUsed: doc.data()!.numTimesUsed + 1,
        lastUsedAtMs: Date.now(),
        lastUsedByUserId: user.id,
      });
    } else {
      transaction.create(inviteCodeDocRef, {
        numTimesUsed: 1,
        maxUses: 1,
        ownerId: user.id,
        lastUsedByUserId: user.id,
        createdAtMs: Date.now(),
        lastUsedAtMs: Date.now(),
      });
    }
  });
}

export async function getAllInviteCodes(
  db: BDB
): Promise<WithId<FirestoreInviteCode, string>[]> {
  return (await db.collection("inviteCodes").get()).docs.map((e) => ({
    id: e.id,
    ...e.data()!,
  }));
}

export async function fetchInviteCodeBundles(
  db: BDB,
  inviteCodes: WithId<FirestoreInviteCode, string>[]
): Promise<InviteCodeBundle[]> {
  const usersToFetch = uniq(compactMap(inviteCodes, (e) => e.lastUsedByUserId));

  const userBundles = compact(await fetchUserBundlesByIds(db, ...usersToFetch));
  const rekey = new Map(userBundles.map((e) => [e.id, e]));

  return inviteCodes.map((e) => ({
    code: e.id,
    maxUses: e.maxUses,
    uses: e.numTimesUsed,
    lastUser: e.lastUsedByUserId && rekey.get(e.lastUsedByUserId),
  }));
}

export async function listInviteCodesByOwner(
  db: BDB,
  userId: BiomesId,
  offset = 0,
  limit = 200
): Promise<WithId<FirestoreInviteCode, string>[]> {
  const codes = await db
    .collection("inviteCodes")
    .where("ownerId", "==", userId)
    .offset(offset)
    .limit(limit)
    .get();

  return codes.docs.map((e) => ({
    ...e.data(),
    id: e.id,
  }));
}
