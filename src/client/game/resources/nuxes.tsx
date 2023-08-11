import type { ClientContext } from "@/client/game/context";
import type { ClientResourcesBuilder } from "@/client/game/resources/types";
import type { RegistryLoader } from "@/shared/registry";

export type ActiveNUX = {
  nuxId: number;
  stateId: string;
};

export function addNUXResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.addGlobal("/nuxes/state_active", {
    value: [],
  });
}
