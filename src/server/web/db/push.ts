import type { BDB } from "@/server/shared/storage";
import type { BiomesId } from "@/shared/ids";
import { toStoredEntityId } from "@/shared/ids";

export async function addWebPushToken(
  db: BDB,
  userId: BiomesId,
  token: string
) {
  await db
    .collection("users")
    .doc(toStoredEntityId(userId))
    .collection("push-tokens")
    .doc(token)
    .set({});
}

export async function findAllWebPushTokens(db: BDB, userId: BiomesId) {
  return (
    await db
      .collection("users")
      .doc(toStoredEntityId(userId))
      .collection("push-tokens")
      .get()
  ).docs.map((e) => e.id);
}

export async function removeAllWebPushTokens(
  db: BDB,
  userId: BiomesId,
  tokens: string[]
) {
  await Promise.all(
    tokens.map(async (t) => {
      await db
        .collection("users")
        .doc(toStoredEntityId(userId))
        .collection("push-tokens")
        .doc(t)
        .delete();
    })
  );
}
