import { AdminPage } from "@/client/components/admin/AdminPage";
import { AdminReactJSON } from "@/client/components/admin/AdminReactJSON";
import { useEntityAdmin } from "@/client/components/hooks/client_hooks";
import { MaybeError } from "@/client/components/system/MaybeError";
import {
  AdminECSEditRequest,
  AdminECSEditResponse,
} from "@/pages/api/admin/ecs/edit";
import { zAdminEntityGetResponse } from "@/pages/api/admin/ecs/get";
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
import { jsonPost, zjsonPost } from "@/shared/util/fetch_helpers";
import type { InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { useState } from "react";
import { InteractionProps, OnSelectProps } from "react-json-view";
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
  if (!entity) {
    return (
      <AdminPage>
        <>
          <div className="error">Entity not found!</div>
          {version !== undefined && <p>Version: {version}</p>}
        </>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <>
        <h2>ECS {entity.id}</h2>
        {version !== undefined && <p>Version: {version}</p>}
        <EntityTypeDetails entity={entity}></EntityTypeDetails>
        <br></br>
        <ECSEditor entity={entity} />
      </>
    </AdminPage>
  );
};

const CANCEL = false;

// Perform and ECS edit and return whether it was successful.
async function doECSEdit(edit: AdminECSEditRequest): Promise<boolean> {
  const response = await jsonPost<AdminECSEditResponse, AdminECSEditRequest>(
    "/api/admin/ecs/edit",
    edit
  );
  return response.success;
}

const ECSEditor: React.FC<{ entity: Entity }> = ({ entity: initialEntity }) => {
  const [entity, setEntity] = useState(initialEntity);
  const [error, setError] = useState<string | undefined>(undefined);

  const refetchEntity = async (): Promise<Entity | undefined> => {
    const response = await zjsonPost(
      "/api/admin/ecs/get",
      [entity.id],
      zAdminEntityGetResponse
    );
    const wrappedEntity = response[0];
    return wrappedEntity?.entity;
  };

  const updateEntity = () => {
    void refetchEntity().then((entity) => {
      if (entity) {
        setEntity(entity);
      } else {
        setError("Failed to fetch after update.");
      }
    });
  };

  const onDelete = async (field: InteractionProps) => {
    if (field.name === null) {
      return;
    }

    if (field.name === "root") {
      setError("Can't delete root.");
      return;
    }
    if (field.name === "id") {
      setError("Can't delete id.");
      return;
    }
    if (entity[field.name as keyof Entity] === undefined) {
      setError("Can only delete top-level fields.");
      return;
    }

    setError("");
    if (!confirm(`Are you sure you want to delete ${field.name}?`)) {
      return;
    }

    const successful = await doECSEdit({
      id: entity.id,
      edit: {
        kind: "delete",
        field: field.name,
      },
    });
    if (successful) {
      updateEntity();
    }
  };

  const onSelection = (select: OnSelectProps) => {
    return CANCEL;
  };

  const onEdit = (field: InteractionProps) => {
    return CANCEL;
  };

  return (
    <div className="ecs-json-editor">
      {error && <div className="text-red">{`Error: ${error}`}</div>}
      <AdminReactJSON
        onEdit={onEdit}
        validationMessage={undefined}
        src={entity}
        collapsed={1}
        onSelect={onSelection}
        onDelete={(field) => {
          onDelete(field);
          return false; // Don't perform the delete.
        }}
        sortKeys
      />
    </div>
  );
};

export default AdminEntityPage;
