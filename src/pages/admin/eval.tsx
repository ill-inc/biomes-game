import { AdminPage } from "@/client/components/admin/AdminPage";
import { AdminReactJSON } from "@/client/components/admin/AdminReactJSON";
import { InlineEdit } from "@/client/components/admin/InlineEdit";
import { DialogButton } from "@/client/components/system/DialogButton";
import styles from "@/client/styles/admin.module.css";
import type { AdminEvalRequest } from "@/pages/api/admin/eval";
import { zEvalResponse, type SingleEvalResponse } from "@/server/sync/api";
import { biomesGetServerSideProps } from "@/server/web/util/ssp_middleware";
import type { BiomesId } from "@/shared/ids";
import { zjsonPost } from "@/shared/util/fetch_helpers";
import type { InferGetServerSidePropsType } from "next";
import React, { useEffect, useMemo, useState } from "react";

export const getServerSideProps = biomesGetServerSideProps(
  {
    auth: "admin",
  },
  async () => ({
    props: {},
  })
);

export const Eval: React.FunctionComponent<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({}) => {
  const [user, setUser] = useState("");
  const [code, setCode] = useState("");
  const [executing, setExecuting] = useState(false);
  const [results, setResults] = useState<SingleEvalResponse[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(
      process.env.IS_SERVER ? "" : window.location.search
    );
    const user = parseInt(params.get("user") || "");
    if (!isNaN(user)) {
      setUser(String(user));
    }
  }, []);

  const userId = useMemo(() => {
    const id = parseInt(user.trim());
    if (isNaN(id) || !id) {
      return;
    }
    return id as BiomesId;
  }, [user]);

  return (
    <AdminPage>
      <section>
        <InlineEdit
          placeholder="UserID"
          value={user}
          onValueChange={(value) => setUser(value)}
        />
        <textarea
          disabled={executing}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <DialogButton
          extraClassNames="btn-inline"
          disabled={executing}
          onClick={async () => {
            setExecuting(true);
            try {
              const response = await zjsonPost(
                "/api/admin/eval",
                {
                  user: userId,
                  code,
                } satisfies AdminEvalRequest,
                zEvalResponse
              );
              setResults(response.results);
            } finally {
              setExecuting(false);
            }
          }}
        >
          Execute
        </DialogButton>
      </section>
      <section>
        <table className={styles["admin-table"]}>
          <thead>
            <tr>
              <th>Client ID</th>
              <th>Session ID</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {results.map(({ clientId, sessionId, result }) => (
              <tr key={`${clientId}-${sessionId}`}>
                <td>{clientId}</td>
                <td>{sessionId}</td>
                <td>
                  <AdminReactJSON src={{ result }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AdminPage>
  );
};

export default Eval;
