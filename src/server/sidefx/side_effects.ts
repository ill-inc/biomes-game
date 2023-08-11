import { AclSideEffect } from "@/server/sidefx/effects/acl";
import { DeletesWithSideEffect } from "@/server/sidefx/effects/deletes_with";
import { IcedSideEffect } from "@/server/sidefx/effects/iced";
import { MaxCountPerPlayerSideEffect } from "@/server/sidefx/effects/max_count_per_player";
import {
  makeProjectsProtectionSideEffect,
  makeProjectsRestorationSideEffect,
} from "@/server/sidefx/effects/project_protection";
import type { SideFxServerContext } from "@/server/sidefx/main";
import type { SideEffect } from "@/server/sidefx/side_effect_types";
import type { RegistryLoader } from "@/shared/registry";

export async function registerSideEffects<C extends SideFxServerContext>(
  loader: RegistryLoader<C>
): Promise<SideEffect[]> {
  const { sideFxReplica, idGenerator, logicApi, voxeloo } = await loader.getAll(
    "sideFxReplica",
    "idGenerator",
    "logicApi",
    "voxeloo"
  );
  const table = sideFxReplica.table;
  return [
    makeProjectsProtectionSideEffect(table, idGenerator),
    makeProjectsRestorationSideEffect(table, idGenerator),
    new DeletesWithSideEffect(table),
    new AclSideEffect(voxeloo, table),
    new IcedSideEffect(voxeloo, table),
    new MaxCountPerPlayerSideEffect(voxeloo, sideFxReplica, logicApi),
  ];
}
