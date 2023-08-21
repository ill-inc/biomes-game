import { AdminPage } from "@/client/components/admin/AdminPage";
import { AdminReactJSON } from "@/client/components/admin/AdminReactJSON";
import { useEntityAdmin } from "@/client/components/hooks/client_hooks";
import { MaybeError } from "@/client/components/system/MaybeError";
import { usernameOrIdToUser } from "@/server/web/util/admin";
import { biomesGetServerSideProps } from "@/server/web/util/ssp_middleware";
import type { Entity } from "@/shared/ecs/gen/entities";
import { Npc, Player } from "@/shared/ecs/gen/entities";
import {
  INVALID_BIOMES_ID,
  LegacyIdOrBiomesId,
  legacyIdOrBiomesId,
  zUsernameOrAnyId,
} from "@/shared/ids";
import type { InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { z } from "zod";

export const getServerSideProps = biomesGetServerSideProps(
  {
    auth: "admin",
    query: z.object({
      id: zUsernameOrAnyId,
    }),
  },
  async ({ context: { db }, query: { id: usernameOrId } }) => {
    if (legacyIdOrBiomesId(usernameOrId)) {
      return { props: { id: usernameOrId } };
    } else {
      const user = await usernameOrIdToUser(db, usernameOrId);
      return { props: { id: user?.id ?? INVALID_BIOMES_ID } };
    }
  }
);

const EntityTypeDetails: React.FunctionComponent<{
  entity: Entity;
}> = ({ entity }) => {
  const entityDetails = (() => {
    const id = entity.id;
    const asPlayer = Player.from(entity);
    if (asPlayer) {
      return { name: "player", link: `/admin/user/${id}` };
    }
    const asNpc = Npc.from(entity);
    if (asNpc) {
      return { name: "npc", link: `/admin/npc/${id}` };
    }
  })();

  if (!entityDetails) {
    return <></>;
  }

  return (
    <div>
      <p>
        This entity is a {entityDetails.name} (
        <Link href={entityDetails.link}>details</Link>
        ).
      </p>
    </div>
  );
};

const AdminEntityPage: React.FunctionComponent<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ id }) => {
  const entityOrError = useEntityAdmin(id as LegacyIdOrBiomesId);

  if (entityOrError.kind === "error") {
    return (
      <AdminPage>
        <MaybeError error={entityOrError.error} />
      </AdminPage>
    );
  }

  const { entity, version } = entityOrError.result;
  return (
    <AdminPage>
      {entity ? (
        <>
          <h2>ECS {entity.id}</h2>
          {version !== undefined && <p>Version: {version}</p>}
          <EntityTypeDetails entity={entity}></EntityTypeDetails>
          <br></br>
          <AdminReactJSON src={entity} collapsed />
        </>
      ) : (
        <>
          <div className="error">Entity not found!</div>
          {version !== undefined && <p>Version: {version}</p>}
        </>
      )}
    </AdminPage>
  );
};

export default AdminEntityPage;