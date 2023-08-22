import { AdminPage } from "@/client/components/admin/AdminPage";
import { AdminReactJSON } from "@/client/components/admin/AdminReactJSON";
import { useEntityAdmin } from "@/client/components/hooks/client_hooks";
import { DialogBoxContents } from "@/client/components/system/DialogBox";
import { DialogButton } from "@/client/components/system/DialogButton";
import { DialogTextInput } from "@/client/components/system/DialogTextInput";
import { MaybeError } from "@/client/components/system/MaybeError";
import type {
  AdminECSEditRequest,
  AdminECSEditResponse,
} from "@/pages/api/admin/ecs/edit";
import { zAdminEntityGetResponse } from "@/pages/api/admin/ecs/get";
import { usernameOrIdToUser } from "@/server/web/util/admin";
import { biomesGetServerSideProps } from "@/server/web/util/ssp_middleware";
import type { Entity } from "@/shared/ecs/gen/entities";
import { Npc, Player } from "@/shared/ecs/gen/entities";
import type { LegacyIdOrBiomesId } from "@/shared/ids";
import {
  INVALID_BIOMES_ID,
  legacyIdOrBiomesId,
  zUsernameOrAnyId,
} from "@/shared/ids";
import { jsonPost, zjsonPost } from "@/shared/util/fetch_helpers";
import type { InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { useState } from "react";
import type { InteractionProps } from "react-json-view";
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

// Perform and ECS edit and return whether it was successful.
async function doECSEdit(request: AdminECSEditRequest): Promise<boolean> {
  const { edit } = request;
  const fieldName = edit.kind === "update" ? edit.path[0] : edit.field;
  const editKind = edit.kind.toUpperCase();
  if (fieldName === undefined) {
    return false;
  }
  if (!confirm(`Are you sure you want to ${editKind} ${fieldName}?`)) {
    return false;
  }
  const response = await jsonPost<AdminECSEditResponse, AdminECSEditRequest>(
    "/api/admin/ecs/edit",
    request
  );
  return response.success;
}

const ECSEditor: React.FC<{ entity: Entity }> = ({ entity: initialEntity }) => {
  const [entity, setEntity] = useState(initialEntity);
  const [error, setError] = useState<string | undefined>(undefined);
  const [componentName, setComponentName] = useState<string>("");

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
        setError("");
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

  const onEdit = async (field: InteractionProps) => {
    if (!field.name || field.namespace.find((x) => x === null) !== undefined) {
      return;
    }
    const path = [...(field.namespace as string[]), field.name];
    const currentValue = field.existing_value;
    const newValue = field.new_value;

    if (field.name === "id") {
      setError("Can't edit id.");
      return;
    }

    if (
      currentValue === undefined ||
      currentValue === null ||
      typeof currentValue === "object"
    ) {
      setError("Can't update null, undefined, or object.");
      return;
    }
    if (
      newValue === undefined ||
      newValue === null ||
      typeof currentValue === "object"
    ) {
      setError("Can't set to null, undefined, or object.");
      return;
    }

    const serialized = (newValue as number | string | boolean).toString();
    const successful = await doECSEdit({
      id: entity.id,
      edit: {
        kind: "update",
        path,
        value: serialized,
      },
    });

    if (successful) {
      updateEntity();
    }
  };

  const onAdd = async () => {
    if (entity[componentName as keyof Entity] !== undefined) {
      setError("Key already exists on entity.");
      return;
    }

    const successful = await doECSEdit({
      id: entity.id,
      edit: {
        kind: "add",
        field: componentName,
      },
    });

    if (successful) {
      updateEntity();
    }
    setComponentName("");
  };

  // Note: We return false from onEdit and onDelete, not updating the JSON, because the updates
  //       are done implicitly, by updating the entity and refetching.
  return (
    <div className="ecs-json-editor">
      {error && <div className="text-red">{`Error: ${error}`}</div>}
      <div className="relative flex w-full flex-col">
        <div className="mb-1 flex w-[300px] flex-col gap-1 rounded-md bg-dark-grey p-1">
          <DialogBoxContents>
            <DialogTextInput
              placeholder="Component"
              value={componentName}
              onChange={(e) => {
                setComponentName(e.target.value);
              }}
            />
            <DialogButton name="Add Default" type="primary" onClick={onAdd} />
          </DialogBoxContents>
        </div>
        <AdminReactJSON
          onEdit={(field) => {
            void onEdit(field);
            return false;
          }}
          src={entity}
          collapsed={1}
          onDelete={(field) => {
            void onDelete(field);
            return false;
          }}
          sortKeys
        />
      </div>
    </div>
  );
};

export default AdminEntityPage;
