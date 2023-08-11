import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useError } from "@/client/components/system/MaybeError";
import type { ClientContextSubset } from "@/client/game/context";
import { refreshBikkie } from "@/client/game/util/bikkie";
import { useEffectAsyncFetcher, useInvalidate } from "@/client/util/hooks";
import { zGetWithVersionResponse } from "@/pages/api/admin/ecs/get_with_version";
import type { Entity, ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { ENTITY_PROP_TO_RESOURCE_PATH } from "@/shared/ecs/gen/entities";
import type { BiomesId, LegacyIdOrBiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { log } from "@/shared/logging";
import { zjsonPost } from "@/shared/util/fetch_helpers";
import { useCallback, useEffect, useState } from "react";

const DEFAULT_TTL = 5 * 60 * 1000;

export async function invalidateCachedSingleOOBFetch(
  deps: ClientContextSubset<"table" | "clientCache" | "requestBatchers">,
  entityId: BiomesId
) {
  const v = await deps.requestBatchers.oobRequestBatcher.fetch(entityId);
  await deps.clientCache.set(DEFAULT_TTL, "oobFetch", entityId, v ?? null);
}

export function useLatestAvailableEntity(entityId?: BiomesId) {
  const { reactResources } = useClientContext();
  const cachedEntity = useCachedEntity(entityId);
  const localEntity = reactResources.maybeUse(
    Boolean(entityId),
    "/ecs/entity",
    entityId ?? INVALID_BIOMES_ID
  );
  return localEntity ?? cachedEntity;
}

// In this case null == verified not present, undefined == not sure if present
type EntityRes<K extends keyof ReadonlyEntity> =
  | ReadonlyEntity[K]
  | null
  | undefined;
export function useLatestAvailableComponents<
  Keys extends Array<keyof ReadonlyEntity>
>(
  entityId: BiomesId | undefined,
  ...components: Keys
): { [K in keyof Keys]: EntityRes<Keys[K]> } {
  const { reactResources } = useClientContext();
  const cachedEntity = useCachedEntity(entityId);

  const ret: Array<ReadonlyEntity[keyof ReadonlyEntity] | null | undefined> =
    [];

  for (const c of components) {
    const path = ENTITY_PROP_TO_RESOURCE_PATH[c]!;
    const localComponent = reactResources.maybeUse(
      !!entityId,
      path,
      entityId ?? INVALID_BIOMES_ID
    );
    if (localComponent) {
      ret.push(localComponent);
      continue;
    }

    if (cachedEntity && !cachedEntity[c]) {
      ret.push(null);
      continue;
    }

    ret.push(cachedEntity?.[c]);
  }

  return ret as any;
}

export function useCachedEntity(entityId?: BiomesId, bustCache?: boolean) {
  const { table, clientCache, requestBatchers } = useClientContext();

  const invalidate = useInvalidate();
  const [entity, setEntityInternal] = useState<ReadonlyEntity | null>(
    entityId ? table.get(entityId) ?? null : null
  );

  // There is some tricky caching logic below; goal is to always
  // override with the local copy of a specific entity
  // even in the case the OOB fetch is racing with the sync.
  const setEntity = useCallback(
    (entity: ReadonlyEntity | null) => {
      if (!entityId) {
        return null;
      }

      setEntityInternal(table.get(entityId) ?? entity);

      // In case object itself hasn't changed still invalidate
      invalidate();
    },
    [entityId]
  );

  useEffect(() => {
    if (!entityId) {
      setEntityInternal(null);
      return;
    }

    const cb = (a: ReadonlyEntity | null) => {
      setEntity(a);
    };

    clientCache.addLocalInvalidateListener("oobFetch", entityId, cb);
    return () => {
      clientCache.removeLocalInvalidateListener("oobFetch", entityId, cb);
    };
  }, [entityId]);

  useEffectAsyncFetcher(
    async () => {
      if (!entityId) {
        return null;
      }
      const ret = await clientCache.maybeGetOrCompute(
        !bustCache,
        DEFAULT_TTL,
        "oobFetch",
        entityId,
        async () => {
          return (
            (await requestBatchers.oobRequestBatcher.fetch(entityId)) ?? null
          );
        }
      );
      return ret;
    },
    (entity) => {
      setEntity(entity);
    },
    [entityId]
  );

  return entity;
}

// Useful on Admin pages.
export function useBikkieLoaded() {
  const [loadedBikkie, setLoadedBikkie] = useState(false);
  useEffect(() => {
    refreshBikkie(INVALID_BIOMES_ID)
      .then(() => setLoadedBikkie(true))
      .catch((error) => log.error("Failed to refresh bikkie", { error }));
  }, [loadedBikkie]);
  return loadedBikkie;
}

type EntityOrError =
  | { kind: "error"; error: any }
  | {
      kind: "success";
      result: { version: number; entity: Entity | undefined };
    };

export function useEntityAdmin(id: LegacyIdOrBiomesId): EntityOrError {
  const [error, setError] = useError();
  const [version, setVersion] = useState<number | undefined>(undefined);
  const [entity, setEntity] = useState<Entity | undefined>(undefined);

  useEffectAsyncFetcher<[number, Entity | undefined]>(
    async (signal) => {
      setError(undefined);
      if (!id) {
        return [0, undefined];
      }
      try {
        const results = await zjsonPost(
          "/api/admin/ecs/get_with_version",
          [id],
          zGetWithVersionResponse
        );
        return [results[0][0], results[0][1]?.entity];
      } catch (e) {
        if (!signal?.aborted) {
          setError(e);
        }
        return [-1, undefined];
      }
    },
    ([version, entity]) => {
      setVersion(version);
      setEntity(entity);
    },
    [id]
  );

  if (error) {
    return { kind: "error", error };
  } else {
    return { kind: "success", result: { version: version!, entity } };
  }
}
