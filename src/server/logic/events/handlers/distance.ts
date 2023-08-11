import type { QueriedEntity } from "@/server/logic/events/query";
import { dist } from "@/shared/math/linear";

// Distance function resilient to missing components
export function staleOkDistance(a?: QueriedEntity, b?: QueriedEntity): number {
  const ap = a?.staleOk().position()?.v;
  const bp = b?.staleOk().position()?.v;
  if (ap === undefined || bp === undefined) {
    return Infinity;
  }
  return dist(ap, bp);
}
