import { allUserAuthLinks, authLinksBy } from "@/server/shared/auth/auth_link";
import type { BDB } from "@/server/shared/storage";
import {
  zFirestoreUserAuthLinkData,
  zFirestoreUserData,
} from "@/server/web/db/types";
import { findByUID, getAllUsers } from "@/server/web/db/users_fetch";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zBiomesId } from "@/shared/ids";
import { compact } from "lodash";
import { z } from "zod";

const DEFAULT_PAGE_SIZE = 50;

export const zAdminUserSortBy = z.enum([
  "username",
  "externalUsername",
  "email",
]);

export type AdminUserSortBy = z.infer<typeof zAdminUserSortBy>;

export const zGetUsersRequest = z.object({
  page: z.preprocess(Number, z.number()).optional().default(0),
  inviteCode: z.string().default(""),
  sortBy: zAdminUserSortBy.optional(),
});

export type GetUsersRequest = z.infer<typeof zGetUsersRequest>;

export const zAdminUser = zFirestoreUserData.extend({
  id: zBiomesId,
  canLoginWith: zFirestoreUserAuthLinkData.extend({ id: z.string() }).array(),
});

export type AdminUser = z.infer<typeof zAdminUser>;

export const zGetUsersResponse = z.object({
  users: zAdminUser.array(),
  hasMore: z.boolean().optional(),
});

export type GetUsersResponse = z.infer<typeof zGetUsersResponse>;

async function findUsers(
  db: BDB,
  sortBy: AdminUserSortBy,
  page: number,
  inviteCode?: string
) {
  switch (sortBy) {
    case "username":
      const users = await getAllUsers(
        db,
        page * DEFAULT_PAGE_SIZE,
        DEFAULT_PAGE_SIZE + 1,
        inviteCode,
        true
      );
      return Promise.all(
        users.map(async (user) => ({
          ...user,
          canLoginWith: await allUserAuthLinks(db, user.id),
        }))
      );

    case "email":
    case "externalUsername":
      const auths = await authLinksBy(
        db,
        sortBy === "email" ? sortBy : "username",
        page * DEFAULT_PAGE_SIZE,
        DEFAULT_PAGE_SIZE + 1
      );
      return compact(
        await Promise.all(
          auths.map(async (auth) => {
            const user = await findByUID(db, auth.userId, true);
            if (!user) {
              return;
            }
            return {
              ...user,
              canLoginWith: [auth],
            };
          })
        )
      );
  }
}

export default biomesApiHandler(
  {
    auth: "admin",
    query: zGetUsersRequest,
    response: zGetUsersResponse,
  },
  async ({ context: { db }, query: { page, inviteCode, sortBy } }) => {
    sortBy ??= "username";
    const users = await findUsers(
      db,
      sortBy ?? "username",
      page ?? 0,
      inviteCode
    );
    return {
      users: users.slice(0, DEFAULT_PAGE_SIZE),
      hasMore: users.length > DEFAULT_PAGE_SIZE,
    };
  }
);
