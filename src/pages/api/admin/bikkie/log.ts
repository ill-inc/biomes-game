import type { zFirestoreTray } from "@/server/shared/bikkie/bakery";
import { findAllByUID } from "@/server/web/db/users_fetch";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import type { BiomesId } from "@/shared/ids";
import { fromStoredEntityId, zBiomesId } from "@/shared/ids";
import { compactMap } from "@/shared/util/collections";
import { z } from "zod";

export const zLogEntry = z.object({
  id: zBiomesId,
  name: z.string().optional(),
  createdAt: z.number(),
  createdBy: z
    .object({
      id: zBiomesId,
      name: z.string().optional(),
    })
    .optional(),
  parent: zBiomesId.optional(),
  compactedFrom: zBiomesId.optional(),
});

export type LogEntry = z.infer<typeof zLogEntry>;

export const zBikkieLogRequest = z.object({
  from: z.number().optional(),
  pageSize: z.number().optional(),
});

export type LogRequest = z.infer<typeof zBikkieLogRequest>;

export const zBikkieLogResponse = z.object({
  log: zLogEntry.array(),
  hasMore: z.boolean(),
});

export type LogResponse = z.infer<typeof zBikkieLogResponse>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zBikkieLogRequest,
    response: zBikkieLogResponse,
  },
  async ({ context: { db }, body: { from, pageSize } }) => {
    pageSize ||= 25;
    // This type renaming makes it possible to work with queries over the mixed-content
    // bikkie collection.
    let query = db.collection("bikkie").query() as any;
    if (from) {
      query = query.where("createdAt", "<", from);
    } else {
      query = query.where("createdAt", ">", 0);
    }
    query = query.orderBy("createdAt", "desc").limit(pageSize + 1);

    const result = await query.get();
    const entries: LogEntry[] = [];
    const userIds: BiomesId[] = [];
    for (const doc of result.docs) {
      const data = doc.data() as z.infer<typeof zFirestoreTray>;
      if (!data.createdAt) {
        continue;
      }
      if (data.createdBy) {
        userIds.push(data.createdBy);
      }
      entries.push({
        id: fromStoredEntityId(doc.id),
        name: data.name,
        createdAt: data.createdAt,
        createdBy: data.createdBy
          ? {
              id: data.createdBy,
            }
          : undefined,
        parent: data.parent,
        compactedFrom: data.compactedFrom,
      });
    }
    if (userIds.length > 0) {
      // Fill in user-names.
      const users = new Map(
        compactMap(await findAllByUID(db, userIds, true), (u) =>
          u ? [u.id, u] : undefined
        )
      );
      for (const entry of entries) {
        if (entry.createdBy?.id) {
          const user = users.get(entry.createdBy.id);
          if (user) {
            entry.createdBy.name = user.username;
          }
        }
      }
    }
    return {
      log: entries.slice(0, pageSize),
      hasMore: entries.length > pageSize,
    };
  }
);
