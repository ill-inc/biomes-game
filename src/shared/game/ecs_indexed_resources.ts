import type {
  Entity,
  EntityWith,
  ReadonlyEntityWith,
} from "@/shared/ecs/gen/entities";
import {
  ProtectionByTeamIdSelector,
  RobotsByCreatorIdSelector,
  RobotsByLandmarkNameSelector,
  TerrainShardSelector,
} from "@/shared/ecs/gen/selectors";
import type { KeyIndex } from "@/shared/ecs/key_index";
import type { SpecifiedComponentSelector } from "@/shared/ecs/selectors/helper";
import type { Table } from "@/shared/ecs/table";
import type { ShardId } from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import type { BiomesResourcesBuilder } from "@/shared/resources/biomes";
import type { PathDef } from "@/shared/resources/path_map";
import type { TypedResources } from "@/shared/resources/types";
import type { Optional } from "@/shared/util/type_helpers";

type IndexedResourcePathMap<P, TKey extends string | number> = {
  [K in keyof P]: PathDef<[TKey], any>;
};

export class EcsIndexedResource<
  MI extends { [K in I]: KeyIndex<TKey> },
  TKey extends string | number,
  P extends IndexedResourcePathMap<P, TKey>,
  C extends keyof Entity,
  I extends string
> {
  constructor(
    private readonly table: Table<MI>,
    private readonly path: keyof P & string,
    private readonly selector: SpecifiedComponentSelector<I, C>,
    private readonly singular = false
  ) {}

  add(builder: BiomesResourcesBuilder<P>) {
    builder.add(this.path, (_, id: TKey) => this.get(id));
  }

  get(key: TKey) {
    const keyQuery = this.selector.query.key<TKey, MI>(key);
    const matches: ReadonlyEntityWith<C>[] = [...this.table.scan(keyQuery)];
    return this.singular ? matches[0] : matches;
  }

  invalidate(resources: TypedResources<P>, id: BiomesId) {
    for (const key of this.selector.inverse.idToKeys<TKey, MI>(
      this.table.metaIndex,
      id
    )) {
      resources.invalidate(this.path, key);
    }
  }
}

export interface IndexedEcsResourcePaths {
  "/ecs/terrain": PathDef<
    [ShardId],
    Optional<EntityWith<"box" | "shard_seed" | "shard_diff" | "shard_shapes">>
  >;
  "/ecs/robots_by_creator_id": PathDef<
    [BiomesId],
    EntityWith<"position" | "robot_component">[]
  >;
  "/ecs/robots_by_landmark_name": PathDef<
    [string],
    EntityWith<"position" | "robot_component">[]
  >;
  "/ecs/protection_by_team_id": PathDef<
    [BiomesId],
    EntityWith<"position" | "size" | "protection" | "acl_component">[]
  >;
}
const indexedEcsResourceSelectors = [
  { path: "/ecs/terrain", selector: TerrainShardSelector, singular: true },
  {
    path: "/ecs/robots_by_creator_id",
    selector: RobotsByCreatorIdSelector,
    singular: false,
  },
  {
    path: "/ecs/robots_by_landmark_name",
    selector: RobotsByLandmarkNameSelector,
    singular: false,
  },
  {
    path: "/ecs/protection_by_team_id",
    selector: ProtectionByTeamIdSelector,
    singular: false,
  },
] as const;

type IndexedEcsResourceSelectorIndices =
  (typeof indexedEcsResourceSelectors)[number]["selector"]["index"];
type TKeys = IndexedEcsResourcePaths[keyof IndexedEcsResourcePaths]["args"][0];
export type EcsResourceMetaIndex = {
  [K in IndexedEcsResourceSelectorIndices]: KeyIndex<TKeys>;
};

export type IndexedResources = EcsIndexedResource<
  any,
  any,
  IndexedEcsResourcePaths,
  any,
  string
>[];

export function getIndexedResources(table: Table<EcsResourceMetaIndex>) {
  return indexedEcsResourceSelectors.map(
    (x) =>
      new EcsIndexedResource(
        table,
        x.path,
        x.selector as unknown as any,
        x.singular
      )
  );
}
