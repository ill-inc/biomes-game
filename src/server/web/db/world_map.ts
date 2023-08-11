import type { BDB } from "@/server/shared/storage";
import type { FirestoreWorldMap, WithId } from "@/server/web/db/types";

export async function fetchWorldMapByWorldKey(
  db: BDB,
  worldKey: string
): Promise<WithId<FirestoreWorldMap, string> | undefined> {
  const doc = await db.collection("world-map").doc(worldKey).get();
  return doc.exists ? { id: worldKey, ...doc.data()! } : undefined;
}
