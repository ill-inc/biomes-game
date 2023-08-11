import { AdminPage } from "@/client/components/admin/AdminPage";
import { MaybeGridSpinner } from "@/client/components/system/MaybeGridSpinner";
import styles from "@/client/styles/admin.module.css";
import { useEffectAsyncFetcher } from "@/client/util/hooks";
import type {
  LogEntry,
  LogRequest,
  LogResponse,
} from "@/pages/api/admin/bikkie/log";
import { jsonPost } from "@/shared/util/fetch_helpers";
import type { FunctionComponent } from "react";
import { useState } from "react";

export const BikkieLogPage: FunctionComponent<{}> = ({}) => {
  const [from, setFrom] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffectAsyncFetcher(
    async () => {
      setLoading(true);
      try {
        return await jsonPost<LogResponse, LogRequest>(
          `/api/admin/bikkie/log`,
          { from }
        );
      } finally {
        setLoading(false);
      }
    },
    ({ log, hasMore }) => {
      setLog(log);
      setHasMore(!!hasMore);
    },
    [from]
  );

  return (
    <AdminPage>
      <MaybeGridSpinner isLoading={loading} />
      <table className={styles["admin-table"]}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Created</th>
            <th>By</th>
            <th>Notes</th>
            <th>Parent</th>
            <th>Compacted From</th>
          </tr>
        </thead>
        <tbody>
          {log.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.id}</td>
              <td>{new Date(entry.createdAt).toLocaleString()}</td>
              <td>
                {entry.createdBy?.name
                  ? `${entry.createdBy.name} (${entry.createdBy.id})`
                  : entry.createdBy?.id
                  ? entry.createdBy.id
                  : "Unknown"}
              </td>
              <td>{entry.name}</td>
              <td>{entry.parent}</td>
              <td>{entry.compactedFrom}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore && (
        <div className={styles["admin-table-controls"]}>
          <button
            className={styles["admin-button"]}
            onClick={() => setFrom(log[log.length - 1].createdAt)}
          >
            More
          </button>
        </div>
      )}
    </AdminPage>
  );
};

export default BikkieLogPage;
