import type { LazyEntityWith } from "@/server/shared/ecs/gen/lazy";
import type {
  MinigameComponent,
  MinigameInstance,
  ReadonlyMinigameComponent,
  ReadonlyMinigameInstance,
} from "@/shared/ecs/gen/components";
import type { Delta, DeltaWith } from "@/shared/ecs/gen/delta";
import type { UnionValue } from "@/shared/util/type_helpers";
import { zrpcDeserialize } from "@/shared/zrpc/serde";
import { ok } from "assert";
import type { z, ZodTypeAny } from "zod";

export type MinigameInstanceWithStateKind<
  K extends MinigameInstance["state"]["kind"]
> = Omit<MinigameInstance, "state"> & {
  state: UnionValue<MinigameInstance["state"], K>;
};

export type ReadonlyMinigameInstanceWithStateKind<
  K extends ReadonlyMinigameInstance["state"]["kind"]
> = Omit<ReadonlyMinigameInstance, "state"> & {
  state: UnionValue<ReadonlyMinigameInstance["state"], K>;
};

export type ComponentWithMetadataKind<
  Q extends MinigameComponent | ReadonlyMinigameComponent,
  K extends ReadonlyMinigameComponent["metadata"]["kind"]
> = Omit<Q, "metadata"> & {
  metadata: UnionValue<Q["metadata"], K>;
};

export type MinigameComponentWithMetadataKind<
  K extends MinigameComponent["metadata"]["kind"]
> = ComponentWithMetadataKind<MinigameComponent, K>;

export type ReadonlyMinigameComponentWithMetadataKind<
  K extends ReadonlyMinigameComponent["metadata"]["kind"]
> = ComponentWithMetadataKind<ReadonlyMinigameComponent, K>;

export function instanceOfStateKind<
  K extends MinigameInstance["state"]["kind"],
  T extends DeltaWith<"minigame_instance"> | LazyEntityWith<"minigame_instance">
>(element: T, kind: K): MinigameInstanceWithStateKind<K> {
  const instance = element.minigameInstance();
  ok(instance.state.kind === kind);
  return instance as MinigameInstanceWithStateKind<K>;
}

export function mutInstanceOfStateKind<
  K extends MinigameInstance["state"]["kind"]
>(element: Delta, kind: K): MinigameInstanceWithStateKind<K> {
  const mutInstance = element.mutableMinigameInstance();
  ok(mutInstance.state.kind === kind);
  return mutInstance as MinigameInstanceWithStateKind<K>;
}

export function isMinigameInstanceOfStateKind<
  K extends MinigameInstance["state"]["kind"]
>(
  element: MinigameInstance | undefined,
  kind: K
): element is MinigameInstanceWithStateKind<K> {
  return element?.state.kind === kind;
}

export function isReadonlyMinigameInstanceOfStateKind<
  K extends MinigameInstance["state"]["kind"]
>(
  element: MinigameInstance | ReadonlyMinigameInstance | undefined,
  kind: K
): element is ReadonlyMinigameInstanceWithStateKind<K> {
  return element?.state.kind === kind;
}

export function minigameComponentOfMetadataKind<
  K extends MinigameComponent["metadata"]["kind"]
>(element: Delta, kind: K): MinigameComponentWithMetadataKind<K> {
  const instance = element.minigameComponent();
  ok(instance?.metadata.kind === kind);
  return instance as MinigameComponentWithMetadataKind<K>;
}

export function mutMinigameComponentOfMetadataKind<
  K extends MinigameComponent["metadata"]["kind"]
>(element: Delta, kind: K): MinigameComponentWithMetadataKind<K> {
  const mutInstance = element.mutableMinigameComponent();
  ok(mutInstance.metadata.kind === kind);
  return mutInstance as MinigameComponentWithMetadataKind<K>;
}

export function isMinigameComponentOfMetadataKind<
  K extends MinigameComponent["metadata"]["kind"]
>(
  element: MinigameComponent | undefined,
  kind: K
): element is MinigameComponentWithMetadataKind<K> {
  return element?.metadata.kind === kind;
}

export function isReadonlyMinigameComponentOfMetadataKind<
  K extends MinigameComponent["metadata"]["kind"]
>(
  element: MinigameComponent | ReadonlyMinigameComponent | undefined,
  kind: K
): element is ReadonlyMinigameComponentWithMetadataKind<K> {
  return element?.metadata.kind === kind;
}

export function parseMinigameSettings<SettingsType extends ZodTypeAny>(
  settingsBlob: Uint8Array | Buffer | undefined,
  settings: SettingsType
): z.infer<SettingsType> {
  if (!settingsBlob) {
    return settings.parse({});
  }
  return zrpcDeserialize(settingsBlob, settings);
}
