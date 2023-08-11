import type { ClientContext } from "@/client/game/context";
import type { ClientResourcesBuilder } from "@/client/game/resources/types";
import type { RegistryLoader } from "@/shared/registry";
import type { TypedResourceDeps } from "@/shared/resources/types";

export interface MinigameResourcePaths {}
export type MinigameResourceDeps = TypedResourceDeps<MinigameResourcePaths>;

export function addMinigameResources(
  _loader: RegistryLoader<ClientContext>,
  _builder: ClientResourcesBuilder
) {}
