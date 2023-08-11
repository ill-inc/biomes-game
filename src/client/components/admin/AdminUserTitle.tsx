import { AdminUserLink } from "@/client/components/admin/AdminUserLink";
import { Img } from "@/client/components/system/Img";
import styles from "@/client/styles/admin.module.css";
import type { FirestoreUser, WithId } from "@/server/web/db/types";
import { absoluteBucketURL } from "@/server/web/util/urls";
import React from "react";

export const AdminUserTitle: React.FunctionComponent<{
  user: WithId<FirestoreUser>;
  extraTitle?: string;
}> = ({ user, extraTitle }) => {
  return (
    <div>
      <div className={styles["admin-user-title"]}>
        {user.profilePicCloudBucket &&
          user.profilePicCloudImageLocations?.webp_320w && (
            <div>
              <AdminUserLink userId={user.id}>
                <Img
                  src={absoluteBucketURL(
                    user.profilePicCloudBucket,
                    user.profilePicCloudImageLocations?.webp_320w
                  )}
                />
              </AdminUserLink>
            </div>
          )}
        <div>
          <h2>
            <AdminUserLink userId={user.id}>{user.username}</AdminUserLink>
            {extraTitle ? " - " + extraTitle : ""}
          </h2>
          User ID: {user.id}
        </div>
      </div>
    </div>
  );
};
