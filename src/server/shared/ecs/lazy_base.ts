import type { RedisComponentData } from "@/server/shared/world/lua/serde";
import {
  deserializeRedisComponentData,
  serializeRedisEntity,
} from "@/server/shared/world/lua/serde";
import { DEPRECATED_COMPONENT_IDS } from "@/shared/ecs/gen/components";
import type {
  AsDelta,
  ComponentName,
  Entity,
  ReadonlyEntity,
} from "@/shared/ecs/gen/entities";
import { COMPONENT_PROP_NAME_TO_ID } from "@/shared/ecs/gen/entities";
import type { BiomesId } from "@/shared/ids";
import { createCounter } from "@/shared/metrics/metrics";

type SnakeToCamelCase<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamelCase<U>>}`
  : S;

export type LazyLikeWith<
  C extends keyof ReadonlyEntity,
  SuperType,
  NormalType
> = (Pick<SuperType, SnakeToCamelCase<C> & keyof SuperType> &
  Omit<NormalType, SnakeToCamelCase<C>>) &
  NormalType;

export const poisonedComponent = Symbol.for("biomesPoisonedComponent");

// Lazy components can be 'poisoned' such that it is an error to decode them.
export type LazyComponentData = RedisComponentData | typeof poisonedComponent;

const poisonedComponentUse = createCounter({
  name: "biomes_poisoned_component_use",
  help: "Number of times a poisoned component was used",
  labelNames: ["name"],
});

function recordPoisonedComponentUse(id: BiomesId, name: string) {
  poisonedComponentUse.inc({ name });
  if (process.env.NODE_ENV !== "production") {
    throw new Error(`Attempted to use poisoned component ${id}:${name}`);
  }
}

export abstract class LazyEntityLike<SuperT, OutT> {
  public readonly encoded: Record<string, LazyComponentData>;

  protected constructor(
    public readonly id: BiomesId,
    encoded: Record<string, LazyComponentData> | undefined,
    public readonly decoded: AsDelta<Entity>
  ) {
    this.encoded = encoded ?? serializeRedisEntity(decoded);
  }

  protected abstract make(
    id: BiomesId,
    encoded: Record<string, LazyComponentData> | undefined,
    decoded: AsDelta<Entity>
  ): OutT;
  protected abstract decodeAny(
    componentId: number,
    value: LazyComponentData
  ): boolean;

  protected decode<T>(
    component: Exclude<keyof Entity, "id">,
    encoded: LazyComponentData,
    componentFn: (decoded: unknown) => T
  ): void {
    if (this.decoded[component] !== undefined) {
      return;
    }
    if (encoded === poisonedComponent) {
      recordPoisonedComponentUse(this.id, component);
      this.decoded[component] = null; // Poisoned components are absent always.
      return;
    }
    const data = deserializeRedisComponentData(encoded);
    if (data === null) {
      this.decoded[component] = data;
    } else if (data) {
      this.decoded[component] = componentFn(data) as any;
    }
  }

  materialize(): AsDelta<ReadonlyEntity> {
    if (this.encoded !== undefined) {
      for (const [key, value] of Object.entries(this.encoded)) {
        if (value === undefined) {
          continue;
        }
        const componentId = parseInt(key);
        if (
          !this.decodeAny(componentId, value) &&
          !DEPRECATED_COMPONENT_IDS.has(componentId)
        ) {
          throw new Error(`Unknown component: ${this.id}:${componentId}`);
        }
      }
    }
    return this.decoded;
  }

  merge(other: LazyEntityLike<unknown, unknown>): OutT {
    // Anything we decoded they should too, so to assure it's approriately
    // merged together.
    for (const [key] of Object.entries(this.decoded)) {
      if (key === "id") {
        continue;
      }
      if ((other.decoded as any)[key] === undefined) {
        const componentId = COMPONENT_PROP_NAME_TO_ID.get(
          key as ComponentName
        )!;
        if (
          !other.decodeAny(componentId, other.encoded?.[componentId]) &&
          !DEPRECATED_COMPONENT_IDS.has(componentId)
        ) {
          throw new Error(`Unknown component: ${this.id}:${componentId}`);
        }
      }
    }
    return this.make(
      this.id,
      {
        ...this.encoded,
        ...other.encoded,
      },
      {
        ...this.decoded,
        ...other.decoded,
      }
    );
  }

  alters<C extends keyof Entity>(...components: C[]): boolean {
    for (const component of components) {
      if (component === "id") {
        continue;
      }
      if (
        this.decoded[component] === undefined &&
        (this.encoded === undefined ||
          this.encoded[COMPONENT_PROP_NAME_TO_ID.get(component)!] === undefined)
      ) {
        return false;
      }
    }
    return true;
  }

  has<C extends keyof Entity>(
    ...components: C[]
  ): this is LazyLikeWith<C, SuperT, OutT> {
    for (const component of components) {
      if (component === "id" || this.decoded[component] !== undefined) {
        continue;
      }
      if (this.encoded === undefined) {
        return false;
      }
      const encoded = this.encoded[COMPONENT_PROP_NAME_TO_ID.get(component)!];
      if (encoded === poisonedComponent) {
        recordPoisonedComponentUse(this.id, component);
        return false; // Treat as absent.
      } else if (encoded === undefined) {
        return false;
      }
    }
    return true;
  }

  allReferencedComponents() {
    const referenced: Set<ComponentName> = new Set();
    for (const name of COMPONENT_PROP_NAME_TO_ID.keys()) {
      if (this.has(name)) {
        referenced.add(name);
      }
    }
    return referenced;
  }
}
