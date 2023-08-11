import { AdminPage } from "@/client/components/admin/AdminPage";
import styles from "@/client/styles/admin.module.css";
import { useEffectAsyncFetcher } from "@/client/util/hooks";
import type {
  AdminUser,
  AdminUserSortBy,
  GetUsersResponse,
} from "@/pages/api/admin/users";
import { biomesGetServerSideProps } from "@/server/web/util/ssp_middleware";
import { jsonFetch } from "@/shared/util/fetch_helpers";
import type { InferGetServerSidePropsType } from "next";
import Link from "next/link";
import React from "react";

const DEFAULT_PAGE_SIZE = 50;

export const getServerSideProps = biomesGetServerSideProps(
  {
    auth: "admin",
  },
  async () => ({ props: {} })
);

export const AdminPlayersPage: React.FunctionComponent<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({}) => {
  const [page, setPage] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [sortBy, setSortBy] = React.useState<AdminUserSortBy>("username");

  useEffectAsyncFetcher(
    async () =>
      jsonFetch<GetUsersResponse>(
        `/api/admin/users?page=${page}&sortBy=${sortBy}`
      ),
    ({ users, hasMore }) => {
      setUsers(users);
      setHasMore(!!hasMore);
    },
    [page, sortBy]
  );

  return (
    <AdminPage>
      <div className={styles["admin-table-controls"]}>
        {page > 0 ? (
          <button
            className={styles["admin-button"]}
            onClick={() => setPage(page - 1)}
          >
            &#x2B05;&#xFE0F;
          </button>
        ) : (
          <span>&#x1F6D1;</span>
        )}
        <span>
          {page * DEFAULT_PAGE_SIZE} - {page * DEFAULT_PAGE_SIZE + users.length}
          :
        </span>
        {hasMore ? (
          <button
            className={styles["admin-button"]}
            onClick={() => setPage(page + 1)}
          >
            &#x27A1;&#xFE0F;
          </button>
        ) : (
          <span>&#x1F6D1;</span>
        )}
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as AdminUserSortBy);
            setPage(0);
          }}
        >
          <option value="username">Username</option>
          <option value="email">Email</option>
          <option value="externalUsername">External Username</option>
        </select>
      </div>
      <table className={styles["admin-table"]}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Invite Code</th>
            <th>Emails</th>
            <th>External Usernames</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <Link href={`/admin/user/${user.id}`}>
                  <>{user.id}</>
                </Link>
              </td>
              <td>
                <Link href={`/admin/user/${user.id}`}>
                  <>{user.username}</>
                </Link>
              </td>
              <td>
                <>{user.inviteCode}</>
              </td>
              <td>
                <ul>
                  {user.canLoginWith
                    .filter((v) => !!v.profile.email)
                    .map((v) => (
                      <li key={v.id}>{v.profile.email}</li>
                    ))}
                </ul>
              </td>
              <td>
                <ul>
                  {user.canLoginWith
                    .filter((v) => !!v.profile.username)
                    .map((v) => (
                      <li key={v.id}>{v.profile.username}</li>
                    ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminPage>
  );
};

export default AdminPlayersPage;
