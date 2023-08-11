import type {
  AnySingularResultType,
  InvolvedEntities,
  InvolvedSpecification,
} from "@/server/logic/events/core";
import { isArray, valuesIn } from "lodash";

export function* eachResultOf<
  TInvolvedSpecification extends InvolvedSpecification
>(
  results: InvolvedEntities<TInvolvedSpecification> | undefined
): Generator<AnySingularResultType, unknown, undefined> {
  if (results === undefined) {
    return;
  }
  for (const entry of valuesIn(results)) {
    if (isArray(entry)) {
      yield* entry as AnySingularResultType[];
    } else {
      yield entry as AnySingularResultType;
    }
  }
}
