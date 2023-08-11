import type { ClientContextSubset } from "@/client/game/context";
import { cleanUntypedEmitterCallback } from "@/client/util/helpers";
import { useEffectAsync } from "@/client/util/hooks";
import type {
  Landmark,
  LandmarksResponse,
} from "@/pages/api/world_map/landmarks";
import type {
  Mailbox,
  MailboxesResponse,
} from "@/pages/api/world_map/mailboxes";
import { jsonFetch } from "@/shared/util/fetch_helpers";
import { useEffect, useState } from "react";

export function invalidateLandmarks(deps: ClientContextSubset<"clientCache">) {
  void deps.clientCache.del("landmarks");
}
export function useLandmarks(deps: ClientContextSubset<"clientCache">) {
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [invalidateVersion, setInvalidateVersion] = useState(0);
  useEffectAsync(async () => {
    const newLandmarks = await deps.clientCache.getOrCompute(
      5 * 60,
      "landmarks",
      async () => {
        return jsonFetch<LandmarksResponse>("/api/world_map/landmarks");
      }
    );
    setLandmarks(newLandmarks);
  }, [invalidateVersion]);

  useEffect(
    () =>
      cleanUntypedEmitterCallback(deps.clientCache.emitter, {
        ["invalidate:landmarks"]: () => {
          setInvalidateVersion((v) => v + 1);
        },
      }),
    []
  );

  return landmarks;
}

export function useMailboxes(deps: ClientContextSubset<"clientCache">) {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [invalidateVersion, setInvalidateVersion] = useState(0);
  useEffectAsync(async () => {
    const newMailboxes = await deps.clientCache.getOrCompute(
      5 * 60,
      "mailboxes",
      async () => {
        return jsonFetch<MailboxesResponse>("/api/world_map/mailboxes");
      }
    );
    setMailboxes(newMailboxes);
  }, [invalidateVersion]);

  useEffect(
    () =>
      cleanUntypedEmitterCallback(deps.clientCache.emitter, {
        ["invalidate:mailboxes"]: () => {
          setInvalidateVersion((v) => v + 1);
        },
      }),
    []
  );

  return mailboxes;
}
