import type { Create, Update } from "@/shared/ecs/change";
import type {
  Entity,
  ReadonlyEntity,
  ReadonlyEntityWith,
} from "@/shared/ecs/gen/entities";
import type { BiomesId } from "@/shared/ids";

export interface Index {
  readonly size: number;
  update(
    entity: ReadonlyEntity,
    change: Readonly<Create | Update> | undefined
  ): void;
  delete(id: BiomesId): void;
  clear(): void;
}

export type MetaIndex<C> = { [K in keyof C]: Index };

export interface PointQuery<C extends keyof Entity> {
  readonly kind: "point";
  readonly id: BiomesId;
  wouldMatch(entity?: ReadonlyEntity): entity is ReadonlyEntityWith<C>;
}

export interface MultiQuery<C extends keyof Entity> {
  readonly kind: "multi";
  readonly ids: BiomesId[];
  wouldMatch(entity?: ReadonlyEntity): entity is ReadonlyEntityWith<C>;
}

export interface IndexQuery<MetaIndex, C extends keyof Entity> {
  readonly kind: "index";
  readonly components?: C; // Dummy marker for generic typing.
  run<RuntimeMetaIndex extends MetaIndex>(
    metaIndex: RuntimeMetaIndex
  ): Generator<BiomesId, void, undefined>;
  size<RuntimeMetaIndex extends MetaIndex>(metaIndex: RuntimeMetaIndex): number;
}

export type SelectorQuery<MetaIndex, C extends keyof Entity> =
  | PointQuery<C>
  | MultiQuery<C>
  | IndexQuery<MetaIndex, C>;

export type ComponentsFor<TSelector> = TSelector extends PointQuery<infer C>
  ? C
  : TSelector extends MultiQuery<infer C>
  ? C
  : TSelector extends IndexQuery<any, infer C>
  ? C
  : "id";
