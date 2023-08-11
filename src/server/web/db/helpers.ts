import type {
  AnyCollectionSchema,
  Query,
  ValuesFor,
} from "@/server/shared/storage/schema";
import { parseBiomesId } from "@/shared/ids";

export async function simplePaginate<
  TSchema extends AnyCollectionSchema,
  FieldT extends keyof ValuesFor<TSchema> & string
>(
  collection: Query<TSchema>,
  timeField: FieldT,
  order: "asc" | "desc" = "desc",
  offset = 0,
  limit = 21
) {
  const result = await collection
    .orderBy(timeField, order)
    .offset(offset)
    .limit(limit)
    .get();
  return result.docs.map((e) => ({
    ...e.data(),
    id: parseBiomesId(e.id),
  }));
}
