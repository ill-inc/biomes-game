import { allUserAuthLinks } from "@/server/shared/auth/auth_link";
import type { BDB } from "@/server/shared/storage";
import type { FirestoreUserAuthLink, WithId } from "@/server/web/db/types";
import { findByUID, findUniqueByUsername } from "@/server/web/db/users_fetch";
import type { BiomesId } from "@/shared/ids";
import { safeParseBiomesId, zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zUsernameOrId = z.union([zBiomesId, z.string()]);

export async function usernameOrIdToUser(
  db: BDB,
  usernameOrId: z.infer<typeof zUsernameOrId>
) {
  if (typeof usernameOrId !== "string") {
    return findByUID(db, usernameOrId, true);
  }
  const tryAsId = safeParseBiomesId(usernameOrId);
  const [userById, userByName] = await Promise.all([
    tryAsId !== undefined ? findByUID(db, tryAsId, true) : undefined,
    findUniqueByUsername(db, usernameOrId, true),
  ]);
  return userById ?? userByName;
}

export function authLinkToString(
  link: WithId<FirestoreUserAuthLink, string>
): string {
  let output = String(link.id);
  if (link.profile.email) {
    output += ` email:${link.profile.email}`;
  }
  if (link.profile.username) {
    output += ` username:${link.profile.username}`;
  }
  return output;
}

export async function fetchCanLoginWith(
  db: BDB,
  userId?: BiomesId
): Promise<string[]> {
  if (!userId) {
    return [];
  }
  const authLinks = await allUserAuthLinks(db, userId);
  return [...authLinks.map(authLinkToString)];
}
