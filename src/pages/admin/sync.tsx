import { AdminPage } from "@/client/components/admin/AdminPage";
import { AdminReactJSON } from "@/client/components/admin/AdminReactJSON";
import { InlineEdit } from "@/client/components/admin/InlineEdit";
import { dumpAllSyncServers } from "@/server/shared/sync";
import { biomesGetServerSideProps } from "@/server/web/util/ssp_middleware";
import type { BiomesId } from "@/shared/ids";
import type { InferGetServerSidePropsType } from "next";
import React, { useState } from "react";

export const getServerSideProps = biomesGetServerSideProps(
  {
    auth: "admin",
  },
  async () => ({
    props: {
      syncServersWithDumps: await dumpAllSyncServers(),
    },
  })
);

type MaybeSyncDump = {
  sync?: {
    clients?: { [key: string]: { userId?: BiomesId } };
  };
};

function filterDump(dump: MaybeSyncDump, filter: string): [boolean, any] {
  if (filter === "" || !dump.sync || typeof dump.sync.clients !== "object") {
    return [true, dump];
  }
  const matching: any[] = [];
  for (const id in dump.sync.clients) {
    const client = dump.sync.clients[id];
    if (filter === id) {
      matching.push(client);
    } else if (String(client.userId).startsWith(filter)) {
      matching.push(client);
    }
  }
  return [matching.length > 0, matching];
}

export const SyncServers: React.FunctionComponent<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ syncServersWithDumps }) => {
  const params = new URLSearchParams(
    process.env.IS_SERVER ? "" : window.location.search
  );
  const [filter, setFilter] = useState(params.get("filter") || "");
  return (
    <AdminPage>
      <section>
        <InlineEdit
          placeholder="Filter by userId or clientId"
          value={filter}
          onValueChange={(value) => setFilter(value.trim())}
        />
      </section>
      <section>
        {syncServersWithDumps.map(({ ip, name, dump }) => {
          const [show, filteredDump] = filterDump(dump, filter);
          if (!show) {
            return <></>;
          }
          return (
            <div key={name}>
              <h1>
                {name} ({ip})
              </h1>
              <AdminReactJSON src={filteredDump} />
            </div>
          );
        })}
      </section>
    </AdminPage>
  );
};

export default SyncServers;
