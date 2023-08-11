import type { ForeignAuthProviderName } from "@/server/shared/auth/providers";
import type { ForeignAccountProfile } from "@/server/shared/auth/types";
import type { BDB } from "@/server/shared/storage";
import type {
  FirestoreUserAuthLink,
  FirestoreUserAuthLinkData,
  WithId,
} from "@/server/web/db/types";
import type { BiomesId } from "@/shared/ids";
import { parseBiomesId } from "@/shared/ids";
import { ok } from "assert";

function userAuthLinkRef<TKind extends FirestoreUserAuthLinkData["kind"]>(
  db: BDB,
  kind: TKind,
  key: string
) {
  return db.collection("user-auth-links").doc(`${kind}:${key}`);
}

async function findUserLink<TKind extends FirestoreUserAuthLinkData["kind"]>(
  db: BDB,
  kind: TKind,
  key: string
): Promise<(FirestoreUserAuthLink & { kind: TKind }) | undefined> {
  const link = (await userAuthLinkRef(db, kind, key).get()).dataWithId();
  if (link === undefined) {
    return;
  }
  ok(link.kind === kind);
  return link as FirestoreUserAuthLink & { kind: TKind };
}

export async function allUserAuthLinks(
  db: BDB,
  userId: BiomesId
): Promise<WithId<FirestoreUserAuthLink, string>[]> {
  const results = await db
    .collection("user-auth-links")
    .where("userId", "==", userId)
    .get();
  return results.docs.map((doc) => doc.dataWithId()) as WithId<
    FirestoreUserAuthLink,
    string
  >[];
}

export async function allUserAuthLinksOfKind<
  TKind extends FirestoreUserAuthLinkData["kind"]
>(
  db: BDB,
  kind: TKind,
  userId: BiomesId
): Promise<WithId<FirestoreUserAuthLink, string>[]> {
  const results = await db
    .collection("user-auth-links")
    .where("userId", "==", userId)
    .where("kind", "==", kind)
    .get();
  return results.docs.map((doc) => doc.dataWithId()) as WithId<
    FirestoreUserAuthLink & { kind: TKind },
    string
  >[];
}

export async function authLinksBy(
  db: BDB,
  sortBy: "username" | "email",
  offset: number = 0,
  pageSize: number = 40
): Promise<WithId<FirestoreUserAuthLink, string>[]> {
  const results = await db
    .collection("user-auth-links")
    .orderBy(sortBy === "username" ? "profile.username" : "profile.email")
    .offset(offset)
    .limit(pageSize)
    .get();
  return results.docs.map((doc) => doc.dataWithId()) as WithId<
    FirestoreUserAuthLink,
    string
  >[];
}

function foreignAuthLinkId(
  provider: ForeignAuthProviderName
): FirestoreUserAuthLinkData["kind"] {
  return `foreign:${provider}`;
}

function devLink(userId: BiomesId): WithId<FirestoreUserAuthLinkData, string> {
  return {
    kind: foreignAuthLinkId("dev"),
    id: String(userId),
    userId,
    profile: {},
  };
}

export async function findLinkForForeignAuth(
  db: BDB,
  provider: ForeignAuthProviderName,
  key: string
) {
  if (process.env.NODE_ENV !== "production" && provider === "dev") {
    return devLink(parseBiomesId(key));
  }
  return findUserLink(db, foreignAuthLinkId(provider), key);
}

export async function connectForeignAuth(
  db: BDB,
  provider: ForeignAuthProviderName,
  profile: ForeignAccountProfile,
  userId: BiomesId
) {
  if (process.env.NODE_ENV !== "production" && provider === "dev") {
    ok(profile.id === String(userId));
    return devLink(userId);
  }
  const kind = foreignAuthLinkId(provider);
  const linkRef = userAuthLinkRef(db, kind, profile.id);
  return db.runTransaction(async (transaction) => {
    const existing = (await transaction.get(linkRef)).dataWithId();
    if (existing !== undefined) {
      ok(existing.kind === kind);
      ok(existing.userId === userId);
      return existing;
    }
    const link = <FirestoreUserAuthLinkData>{
      kind,
      userId,
      profile,
    };
    transaction.create(linkRef, link);
    return {
      ...link,
      id: linkRef.id,
    };
  }) as Promise<WithId<FirestoreUserAuthLink, string>>;
}
