import type { ClientContext } from "@/client/game/context";
import type { ClientResourcesBuilder } from "@/client/game/resources/types";
import type { Disposable } from "@/shared/disposable";
import type { RegistryLoader } from "@/shared/registry";
import type { Object3D } from "three";

export type ForbiddenEdit = {
  three: Object3D;
  createdAt: number;
  animationTick?: (dt: number) => void;
};

export type ForbiddenEdits = {
  edits: Map<string, Disposable<ForbiddenEdit>>;
};
export function addForbiddenEditsResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.addGlobal("/scene/forbidden_edits", { edits: new Map() });
}
