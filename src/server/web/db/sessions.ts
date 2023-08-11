import { getSecret } from "@/server/shared/secrets";
import type { BDB } from "@/server/shared/storage";
import type { FirestoreSession, WithId } from "@/server/web/db/types";
import { zFirestoreSessionData } from "@/server/web/db/types";
import type { ServerCache } from "@/server/web/server_cache";
import type { SpecialRoles } from "@/shared/acl_types";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";
import { autoId } from "@/shared/util/auto_id";
import { ok } from "assert";
import * as jwt from "jsonwebtoken";

const SESSION_ID_LENGTH = 80;
const SESSION_CACHE_TTL_SEC = 60 * 60; // 1 hour

export class SessionStore {
  constructor(
    private readonly db: BDB,
    private readonly serverCache: ServerCache
  ) {}

  private async findAllSessions(userId: BiomesId) {
    const sessions = await this.db
      .collection("sessions")
      .where("userId", "==", userId)
      .get();
    return sessions.docs.map((doc) => doc.dataWithId());
  }

  async countSessions(userId?: BiomesId) {
    if (!userId) {
      return 0;
    }
    const sessions = await this.findAllSessions(userId);
    return sessions.length;
  }

  async findSession(
    sessionId: string,
    userId: BiomesId
  ): Promise<WithId<FirestoreSession, string> | undefined> {
    // Handle internal user sessions, which are not persisted.
    try {
      const token = zFirestoreSessionData.parse(
        jwt.verify(sessionId, getSecret("internal-auth-token"), {
          algorithms: ["HS512"],
        })
      );
      if (token.userId === userId || process.env.BIOMES_OVERRIDE_AUTH) {
        return {
          ...token,
          id: sessionId,
        };
      }
    } catch (error) {
      // Ignore errors.
    }

    return (
      (await this.serverCache.getOrCompute(
        SESSION_CACHE_TTL_SEC,
        "session",
        sessionId,
        async () => {
          const session = (
            await this.db.collection("sessions").doc(sessionId).get()
          ).dataWithId();
          if (session === undefined) {
            log.debug("Failed to find existing sessionId");
            return null;
          }
          if (session.userId !== userId) {
            log.debug("Session id mismatch with userId");
            return null;
          }
          return session;
        }
      )) ?? undefined
    );
  }

  private static createStatelessSession(
    userId: BiomesId,
    gremlin: boolean,
    roleOverride: SpecialRoles[] | undefined
  ): FirestoreSession {
    const sessionData = zFirestoreSessionData.parse({
      userId,
      createMs: Date.now(),
      gremlin,
      roleOverrides: roleOverride || [],
    });
    const id = jwt.sign(sessionData, getSecret("internal-auth-token"), {
      algorithm: "HS512",
      expiresIn: process.env.NODE_ENV === "production" ? "12h" : "30d",
    });
    log.debug(`Created stateless session ${id}`, {
      userId,
      gremlin,
      roleOverride,
    });
    return {
      ...sessionData,
      id,
    };
  }

  static createInternalSyncSession(userId: BiomesId): FirestoreSession {
    return SessionStore.createStatelessSession(userId, false, [
      "internalSync",
      "export",
    ]);
  }

  static createGremlinSession(userId: BiomesId): FirestoreSession {
    return SessionStore.createStatelessSession(userId, true, undefined);
  }

  async createSession(userId: BiomesId): Promise<FirestoreSession> {
    if (process.env.NODE_ENV !== "production") {
      return SessionStore.createStatelessSession(userId, false, undefined);
    }
    const id = autoId(SESSION_ID_LENGTH);
    const sessionDocRef = this.db.collection("sessions").doc(id);
    const session = await this.db.runTransaction(async (transaction) => {
      const existing = (await transaction.get(sessionDocRef)).dataWithId();
      if (existing !== undefined) {
        ok(existing.userId === userId, "Session conflict!");
        return existing;
      }
      const sessionData = zFirestoreSessionData.parse({
        userId,
        createMs: Date.now(),
      });
      transaction.create(sessionDocRef, sessionData);
      return {
        ...sessionData,
        id,
      };
    });
    await this.serverCache.set(SESSION_CACHE_TTL_SEC, "session", id, session);
    return session;
  }

  async destroySession(sessionId: string) {
    await this.db.collection("sessions").doc(sessionId).delete();
    await this.serverCache.del("session", sessionId);
  }

  async destroyAllSessions(userId: BiomesId) {
    const sessions = await this.findAllSessions(userId);
    await Promise.all(
      sessions.map((session) => this.destroySession(session.id))
    );
  }
}

export async function registerSessionStore<
  C extends {
    db: BDB;
    serverCache: ServerCache;
  }
>(loader: RegistryLoader<C>) {
  const [db, serverCache] = await Promise.all([
    loader.get("db"),
    loader.get("serverCache"),
  ]);
  return new SessionStore(db, serverCache);
}
