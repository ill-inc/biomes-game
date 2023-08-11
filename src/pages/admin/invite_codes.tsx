import { AdminPage } from "@/client/components/admin/AdminPage";
import { DialogButton } from "@/client/components/system/DialogButton";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import styles from "@/client/styles/admin.module.css";
import type { CreateInviteCodeRequest } from "@/pages/api/admin/create_invite_code";
import { getAllInviteCodes } from "@/server/web/db/invite_codes";
import { biomesGetServerSideProps } from "@/server/web/util/ssp_middleware";
import { jsonPost } from "@/shared/util/fetch_helpers";
import type { InferGetServerSidePropsType } from "next";
import { useRouter } from "next/router";
import React, { useCallback, useState } from "react";

export const getServerSideProps = biomesGetServerSideProps(
  {
    auth: "admin",
  },
  async ({ context: { db } }) => {
    const allInviteCodes = await getAllInviteCodes(db);
    return {
      props: {
        allInviteCodes,
      },
    };
  }
);

export const InviteCodes: React.FunctionComponent<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ allInviteCodes }) => {
  const [newInviteMemo, setNewInviteMemo] = useState("");
  const [maxUsesString, setMaxUsesString] = useState("1");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useError();

  const router = useRouter();

  allInviteCodes.sort((a, b) => {
    return (b.lastUsedAtMs ?? 0) - (a.lastUsedAtMs ?? 0);
  });

  const createNewInvite = useCallback(async () => {
    setIsCreating(true);

    let maxUses = parseInt(maxUsesString, 10);
    if (isNaN(maxUses)) {
      maxUses = 1;
    }

    try {
      await jsonPost<void, CreateInviteCodeRequest>(
        "/api/admin/create_invite_code",
        {
          createMemo: newInviteMemo,
          maxUses,
        }
      );
      router.reload();
    } catch (error: any) {
      setError(error);
    } finally {
      setIsCreating(false);
    }
  }, [newInviteMemo, maxUsesString]);

  return (
    <AdminPage>
      <div className={styles["invite-code-page"]}>
        <MaybeError error={error} />

        <section className={styles["create-invite"]}>
          <input
            type="text"
            placeholder="Invite Notes"
            value={newInviteMemo}
            onChange={(e) => {
              setNewInviteMemo(e.target.value);
            }}
          />
          Uses
          <input
            type="number"
            defaultValue={1}
            value={maxUsesString}
            onChange={(e) => {
              setMaxUsesString(e.target.value);
            }}
          />
          <DialogButton
            type="primary"
            onClick={() => {
              void createNewInvite();
            }}
            disabled={isCreating}
          >
            {isCreating ? "Creating" : "Create Invite"}
          </DialogButton>
        </section>
        <h2> Valid Codes</h2>
        <table className={styles["invite-code-table"]}>
          <thead>
            <tr>
              <th>Invite Code</th>
              <th>Uses</th>
              <th>Created At</th>
              <th>Last Used At</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {allInviteCodes.map((code) => (
              <tr key={code.id}>
                <td>
                  <a
                    title="See all users with invite code"
                    onClick={() => {
                      void router.push(`/admin?inviteCode=${code.id}`);
                    }}
                  >
                    {code.id}
                  </a>
                </td>
                <td>{code.numTimesUsed}</td>
                <td>{new Date(code.createdAtMs).toLocaleString()}</td>
                <td>
                  {code.lastUsedAtMs &&
                    new Date(code.lastUsedAtMs).toLocaleString()}
                </td>
                <td>{code.createMemo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPage>
  );
};

export default InviteCodes;
