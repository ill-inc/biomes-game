import { AdminPage } from "@/client/components/admin/AdminPage";
import { AdminReactJSON } from "@/client/components/admin/AdminReactJSON";
import {
  useBikkieLoaded,
  useEntityAdmin,
} from "@/client/components/hooks/client_hooks";
import { Img } from "@/client/components/system/Img";
import { MaybeError } from "@/client/components/system/MaybeError";
import { resolveAssetUrlUntyped } from "@/galois/interface/asset_paths";
import { biomesGetServerSideProps } from "@/server/web/util/ssp_middleware";
import { Npc } from "@/shared/ecs/gen/entities";
import { zLegacyIdOrBiomesId } from "@/shared/ids";
import { idToNpcType } from "@/shared/npc/bikkie";
import { deserializeNpcCustomState } from "@/shared/npc/serde";
import type { InferGetServerSidePropsType } from "next";
import React from "react";
import { z } from "zod";

export const getServerSideProps = biomesGetServerSideProps(
  {
    auth: "admin",
    query: z.object({
      id: zLegacyIdOrBiomesId,
    }),
  },
  async ({ query: { id } }) => ({ props: { id } })
);

export const AdminNpcPage: React.FunctionComponent<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ id }) => {
  const bikkieLoaded = useBikkieLoaded();
  const entityOrError = useEntityAdmin(id);

  if (entityOrError.kind === "error") {
    return (
      <AdminPage>
        <MaybeError error={entityOrError.error} />
      </AdminPage>
    );
  }

  const { entity } = entityOrError.result;
  if (!entity) {
    return (
      <AdminPage>
        <div className="error">NPC not found!</div>
      </AdminPage>
    );
  }

  if (!bikkieLoaded) {
    return (
      <AdminPage>
        <div>Loading Bikkie...!</div>
      </AdminPage>
    );
  }

  const npcEntity = Npc.from(entity);
  if (!npcEntity) {
    return (
      <AdminPage>
        <div className="error">BiomesId {id} is not an NPC!</div>{" "}
      </AdminPage>
    );
  }

  const npcTypeId = npcEntity.npc_metadata.type_id;
  const npcType = idToNpcType(npcTypeId);

  const customState = deserializeNpcCustomState(npcEntity.npc_state.data);

  return (
    <AdminPage>
      <h1>
        {npcType.name} (Type ID: {npcTypeId})
      </h1>
      <h2>
        <Img src={resolveAssetUrlUntyped(`icons/${npcType.galoisPath}`)}></Img>
      </h2>

      <h2>Custom NPC state</h2>
      <AdminReactJSON src={customState} />

      <h2>ECS state</h2>
      <AdminReactJSON src={entity} />
    </AdminPage>
  );
};

export default AdminNpcPage;
