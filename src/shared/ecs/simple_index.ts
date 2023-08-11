import type { Entity } from "@/shared/ecs/gen/entities";
import type { Index, IndexQuery } from "@/shared/ecs/selectors/selector";
import type { BiomesId } from "@/shared/ids";

export interface SimpleIndex extends Index {
  scanAll(): Generator<BiomesId, void, undefined>;
}

export class SimpleIndexQuery<
  I extends string,
  C extends keyof Entity = "id",
  MetaIndex extends { [K in I]: SimpleIndex } = { [K in I]: SimpleIndex }
> implements IndexQuery<MetaIndex, C>
{
  readonly kind = "index";
  readonly components?: C;
  constructor(private readonly index: keyof MetaIndex) {}

  *run(metaIndex: MetaIndex) {
    yield* metaIndex[this.index].scanAll();
  }

  size(metaIndex: MetaIndex): number {
    return metaIndex[this.index].size;
  }
}
