import type {
  ReadonlyEntity,
  ReadonlyEntityWith,
} from "@/shared/ecs/gen/entities";
import { Entity } from "@/shared/ecs/gen/entities";
import type { MultiQuery, PointQuery } from "@/shared/ecs/selectors/selector";
import type { BiomesId } from "@/shared/ids";

export class ComponentSelectorQuery<C extends keyof Entity = "id"> {
  constructor(protected readonly components: C[]) {}
  wouldMatch(entity?: ReadonlyEntity): entity is ReadonlyEntityWith<C> {
    return Entity.has(entity, ...this.components);
  }
}

export class ComponentPointQuery<C extends keyof Entity = "id">
  extends ComponentSelectorQuery<C>
  implements PointQuery<C>
{
  readonly kind = "point";
  constructor(readonly id: BiomesId, ...components: C[]) {
    super(components);
  }
}

export class ComponentMultiQuery<C extends keyof Entity = "id">
  extends ComponentSelectorQuery<C>
  implements MultiQuery<C>
{
  readonly kind = "multi";
  constructor(readonly ids: BiomesId[], ...components: C[]) {
    super(components);
  }
}
