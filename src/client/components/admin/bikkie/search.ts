import { BikkieEditorContext } from "@/client/components/admin/bikkie/BikkieEditorContext";
import type { BikkieSearchRequest } from "@/client/components/admin/bikkie/requests";
import {
  fetchBiscuit,
  sendSearchRequest,
} from "@/client/components/admin/bikkie/requests";
import type { UnsavedBiscuit } from "@/client/components/admin/bikkie/unsaved";
import { iconUrl } from "@/client/components/inventory/icons";
import { useEffectAsyncFetcher } from "@/client/util/hooks";
import { conformsWith } from "@/shared/bikkie/core";
import type { Biscuit } from "@/shared/bikkie/schema/attributes";
import type { SchemaPath } from "@/shared/bikkie/schema/biomes";
import { bikkie } from "@/shared/bikkie/schema/biomes";
import { safeParseBiomesId, type BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { compactMap } from "@/shared/util/collections";
import { compact } from "lodash";
import { useCallback, useContext, useMemo, useState } from "react";
import defaultBiscuitIcon from "/public/hud/icon-16-biscuit.png";

export type ListedBiscuit = {
  id: BiomesId;
  name: string;
  displayName?: string;
  schemas: string[];
  iconUrl: string;
  edited?: boolean;
};

export function bakedToListed(
  baked: Biscuit,
  latestName?: string
): ListedBiscuit {
  return {
    id: baked.id,
    name: latestName ?? baked.name,
    displayName: baked.displayName,
    schemas: compactMap(bikkie.allSchemas(), ([path, schema]) =>
      conformsWith(schema, baked) ? path : undefined
    ),
    iconUrl: iconUrl(baked, { defaultIcon: defaultBiscuitIcon.src }),
  };
}

export function unsavedToListed(
  unsaved: UnsavedBiscuit,
  edited: boolean
): ListedBiscuit {
  return {
    id: unsaved.id,
    name: unsaved.name,
    displayName: unsaved.name,
    schemas: compactMap(bikkie.allSchemas(), ([path, schema]) =>
      unsaved.conforms(schema) ? path : undefined
    ),
    iconUrl: unsaved.iconUrl,
    edited,
  };
}

export interface ParsedQuery {
  id?: BiomesId;
  text?: string;
  attributes: string[];
}

export function parseQuery(query?: string): ParsedQuery | undefined {
  query = query?.trim();
  if (!query) {
    return undefined;
  }
  query = query.toLowerCase().replace(/\s+/g, " ");

  const parsed: ParsedQuery = { attributes: [] };
  while (true) {
    const match = query.match(/with:([a-z]*)/);
    if (!match) {
      break;
    }
    const [, attribute] = match;
    if (attribute) {
      parsed.attributes.push(attribute);
    }
    query = query.slice(match.index! + match[0].length);
  }
  query = query.trim();

  const idQuery = safeParseBiomesId(query);
  if (idQuery !== undefined) {
    parsed.id = idQuery;
  } else if (query) {
    parsed.text = query;
  }
  return parsed;
}

export function matchesQuery(biscuit: Biscuit, query?: ParsedQuery) {
  if (!query) {
    return true;
  }
  if (query.id !== undefined && biscuit.id !== query.id) {
    return false;
  }
  if (query.text && !biscuit.name.toLowerCase().includes(query.text)) {
    return false;
  }
  if (query.attributes.length) {
    const attributes = Object.keys(biscuit);
    if (
      !query.attributes.every((neededAttribute) =>
        attributes.find(
          (hasAttribute) =>
            hasAttribute.toLowerCase() === neededAttribute.toLowerCase()
        )
      )
    ) {
      return false;
    }
  }
  return true;
}

function matchPriority(biscuit: ListedBiscuit, query: ParsedQuery) {
  if (query.id !== undefined && biscuit.id !== query.id) {
    return 0;
  }
  if (query.text) {
    if (biscuit.name.startsWith(query.text)) {
      return biscuit.name.length === query.text.length ? 1 : 2;
    }
  }
  return 3;
}

function normalizeSearch(request: BikkieSearchRequest) {
  if (request.id !== undefined && !request.id) {
    delete request.id;
  }
  if (request.query) {
    request.query = request.query.trim();
  }
  if (request.query !== undefined && !request.query) {
    delete request.query;
  }
  if (request.schemaPath !== undefined && !request.schemaPath) {
    delete request.schemaPath;
  }
}

export function useBikkieSearch() {
  const context = useContext(BikkieEditorContext);
  const unsaved = context?.unsaved;
  const queryCache = context?.queryCache;

  // Main workhorse to perform remote search and merge-in local matches.
  return useCallback(
    async (
      request: BikkieSearchRequest,
      signal?: AbortSignal
    ): Promise<ListedBiscuit[] | undefined> => {
      if (signal?.aborted) {
        return;
      }
      normalizeSearch(request);
      const schema = bikkie.getSchema(request.schemaPath);
      try {
        const key = JSON.stringify(request);
        const remoteResults =
          queryCache?.get(key) ?? (await sendSearchRequest(request, signal));
        if (signal?.aborted) {
          return;
        }
        queryCache?.set(key, remoteResults);
        const query = parseQuery(request.query);
        const localResults = unsaved
          ? compactMap(unsaved, ([, b]) => {
              if (request.id !== undefined && b.id !== request.id) {
                return;
              }
              if (!b.conforms(schema)) {
                return;
              }
              const baked = b.bake();
              if (matchesQuery(baked, query)) {
                return unsavedToListed(b, true);
              }
            })
          : [];
        const matches = [
          ...compactMap(remoteResults, (rr) =>
            unsaved?.get(rr.id) ? undefined : rr
          ),
          ...localResults,
        ];

        // Sort results lexiographically, but with precise match at top{
        matches.sort((a, b) => {
          if (query) {
            const aPriority = matchPriority(a, query);
            const bPriority = matchPriority(b, query);
            if (aPriority !== bPriority) {
              return aPriority - bPriority;
            }
          }
          return a.name.localeCompare(b.name);
        });
        return matches;
      } catch (error) {
        if (!signal?.aborted) {
          log.error("Failed to search biscuits", { error });
        }
      }
    },
    [unsaved]
  );
}

export function useSearchResults(query?: BikkieSearchRequest) {
  const search = useBikkieSearch();
  const key = JSON.stringify(query);
  const [results, setResults] = useState<ListedBiscuit[]>([]);
  useEffectAsyncFetcher(
    async (signal) => {
      try {
        if (query) {
          const results = await search(query, signal);
          if (results) {
            return results;
          }
        }
      } catch (error) {
        log.error("Failed to find matching biscuits", { error });
      }
      return [];
    },
    setResults,
    [search, key]
  );
  return results;
}

export function useBiscuit(id?: BiomesId): ListedBiscuit | undefined {
  const results = useSearchResults(id ? { id } : undefined);
  return results?.[0];
}

export function useMatchingBiscuits(schemaPath?: SchemaPath) {
  return useSearchResults({ schemaPath });
}

export function useFullBiscuits(ids: BiomesId[], invalidateOnUnsaved = true) {
  const context = useContext(BikkieEditorContext);
  const unsaved = context?.unsaved;
  const queryCache = context?.queryCache;
  const [remoteBiscuits, setRemoteBiscuits] = useState<UnsavedBiscuit[]>([]);
  const key = JSON.stringify(ids);
  useEffectAsyncFetcher(
    async (signal) => fetchBiscuit(ids, signal),
    setRemoteBiscuits,
    [key, queryCache]
  );
  return useMemo(
    () =>
      compact([
        ...ids.map((id) => unsaved?.get(id)),
        ...remoteBiscuits.filter((b) => !unsaved?.has(b.id)),
      ]).sort((a, b) => a.name.localeCompare(b.name)),
    [invalidateOnUnsaved && unsaved, remoteBiscuits, key]
  );
}
