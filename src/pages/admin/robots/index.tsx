import { AdminPage } from "@/client/components/admin/AdminPage";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { sanitizeServerSideProps } from "@/client/util/next_helpers";

import { biomesGetServerSideProps } from "@/server/web/util/ssp_middleware";
import { rewrittenWorldPermalink } from "@/server/web/util/urls";
import { EntitySerde, SerializeForServer } from "@/shared/ecs/gen/json_serde";
import type { BiomesId } from "@/shared/ids";
import type { InferGetServerSidePropsType } from "next";
import dynamic from "next/dynamic";
import { useState } from "react";
// The `leaflet` component references `window` during module load, so
// we can't do any server side rendering with it.
const AdminRobotMap = dynamic(
  () => import("@/client/components/admin/robots/AdminRobotMap"),
  {
    ssr: false,
  }
);

export const getServerSideProps = biomesGetServerSideProps(
  {
    auth: "admin",
  },
  async ({ context: { askApi }, auth: { userId } }) => {
    const robots = (await askApi.scanAll("robots")).filter(
      (robot) => !robot.iced()
    );
    return {
      props: sanitizeServerSideProps({
        serializedRobots: robots.map((robot) =>
          EntitySerde.serialize(SerializeForServer, robot.materialize())
        ),
        userId,
      }),
    };
  }
);

export const AdminLand: React.FunctionComponent<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ serializedRobots }) => {
  const [error, _setError] = useError();
  const robots = serializedRobots.map((serializedRobot) =>
    EntitySerde.deserialize(serializedRobot, false)
  );
  const [selectedRobotId, setSelectedRobotId] = useState<
    BiomesId | undefined
  >();
  const selectedRobot =
    selectedRobotId && robots.find((robot) => robot.id === selectedRobotId);

  const url =
    selectedRobot && selectedRobot.position
      ? rewrittenWorldPermalink(selectedRobot.position.v)
      : undefined;

  return (
    <AdminPage>
      <MaybeError error={error} />
      <div className="flex">
        <AdminRobotMap
          robots={robots}
          selectedRobot={selectedRobotId}
          onSelectedChanged={setSelectedRobotId}
        />
        {selectedRobot && (
          <div className="w-1/4">
            <h1>{selectedRobot.label?.text}</h1>
            {url && (
              <a href={url.toString()} target="blank">
                View in World
              </a>
            )}
            <pre>
              {JSON.stringify(
                selectedRobot,
                (_, value) =>
                  typeof value === "bigint" ? value.toString() : value,
                2
              )}
            </pre>
          </div>
        )}
      </div>
    </AdminPage>
  );
};
export default AdminLand;
