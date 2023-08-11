import { AdminPage } from "@/client/components/admin/AdminPage";
import { AdminReactJSON } from "@/client/components/admin/AdminReactJSON";
import { AdminUserTitle } from "@/client/components/admin/AdminUserTitle";
import styles from "@/client/styles/admin.module.css";
import { usernameOrIdToUser, zUsernameOrId } from "@/server/web/util/admin";
import { biomesGetServerSideProps } from "@/server/web/util/ssp_middleware";
import { log } from "@/shared/logging";
import { BigQuery } from "@google-cloud/bigquery";
import type { InferGetServerSidePropsType } from "next";
import { z } from "zod";

// The data as we will send it to the admin user client.
interface CvalRow {
  timestamp: string;
  data: object;
}

function cleanRawCvalRow(input: any): CvalRow | undefined {
  try {
    const timestamp = input.timestamp.value;
    const asDate = new Date(timestamp);
    if (asDate.toString() === "Invalid Date") {
      throw new Error("Expected timestamp to be a valid date.");
    }
    const data = input.data as string;
    return {
      timestamp,
      data: JSON.parse(data),
    };
  } catch (error: any) {
    log.error(`Error parsing cval row results.`, { error });
    return undefined;
  }
}

export const getServerSideProps = biomesGetServerSideProps(
  {
    auth: "admin",
    query: z.object({
      id: zUsernameOrId,
    }),
  },
  async ({ context: { db }, query: { id: idOrUsername } }) => {
    const user = await usernameOrIdToUser(db, idOrUsername);

    let cvalRows: CvalRow[] | undefined;
    if (user) {
      const bigquery = new BigQuery();
      const sqlQuery = `
        SELECT
          timestamp, data
          FROM \`zones-cloud.prod.cval\`
        WHERE
          timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY) AND
          userId = @userId
        ORDER BY timestamp desc
        LIMIT 10
      `;
      const options = {
        query: sqlQuery,
        params: { userId: user.id },
      };

      const results = await bigquery.query(options);
      if (results && results.length > 0 && Array.isArray(results[0])) {
        cvalRows = results[0]
          .map(cleanRawCvalRow)
          .filter((x): x is CvalRow => !!x);
      }
    }
    return {
      props: {
        user: user ?? null,
        cvalRows: cvalRows ?? null,
      },
    };
  }
);

const AdminUserCvalsPage: React.FunctionComponent<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ user, cvalRows }) => {
  if (!user) {
    return (
      <AdminPage>
        <div className="error">User not found!</div>{" "}
      </AdminPage>
    );
  }

  if (!cvalRows) {
    return (
      <AdminPage>
        <div className="error">No cvals found for user.</div>{" "}
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <AdminUserTitle user={user} extraTitle="Cvals" />

      <h1>Latest Cval Data</h1>
      <ol className={styles["cvals"]}>
        {cvalRows.map((x, i) => {
          return (
            <li key={i}>
              <div>{new Date(x.timestamp).toLocaleString()}</div>
              <AdminReactJSON src={x.data} collapsed />
            </li>
          );
        })}
      </ol>
    </AdminPage>
  );
};

export default AdminUserCvalsPage;
