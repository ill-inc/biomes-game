import type { BiscuitOf, SchemaOrWalker } from "@/shared/bikkie/core";
import { conformsWith, normalizeToSchema } from "@/shared/bikkie/core";
import type { Biscuit } from "@/shared/bikkie/schema/attributes";
import { attribs, zBiscuit } from "@/shared/bikkie/schema/attributes";
import type { SchemaPath } from "@/shared/bikkie/schema/biomes";
import { bikkie } from "@/shared/bikkie/schema/biomes";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { log } from "@/shared/logging";
import { createCounter } from "@/shared/metrics/metrics";
import { Timer } from "@/shared/metrics/timer";
import { MultiMap, compactMap } from "@/shared/util/collections";
import { zrpcWebDeserialize } from "@/shared/zrpc/serde";
import EventEmitter from "events";
import { assign } from "lodash";
import type TypedEventEmitter from "typed-emitter";

declare global {
  var bikkieRuntime: BikkieRuntime; // eslint-disable-line no-var
}

export type BikkieRuntimeEvents = {
  refreshed: (epoch: number) => void;
};

const biomesBiscuitSymbol = Symbol.for("biomesBiscuitSymbol");

export function isBiscuit(value: any): value is Biscuit {
  return value && value[biomesBiscuitSymbol];
}

const derivedComputeMs = createCounter({
  name: "bikkie_derived_compute_ms",
  help: "Compute MS for Bikkie derived values, by purpose",
  labelNames: ["purpose"],
});

export class LazyBiscuit {
  private deserialized?: Biscuit;
  constructor(
    public readonly id: BiomesId,
    private readonly serialized: string
  ) {}

  // Get the deserialized Biscuit, but still needs to be prototype-linked to
  // the fallback for correct behaviour.
  getUnpreparedBiscuit() {
    if (!this.deserialized) {
      this.deserialized = zrpcWebDeserialize(this.serialized, zBiscuit);
    }
    return this.deserialized;
  }
}

export class BikkieRuntime extends (EventEmitter as new () => TypedEventEmitter<BikkieRuntimeEvents>) {
  #epoch = 1;
  #biscuits = new Map<BiomesId, Biscuit | LazyBiscuit>();
  #allBiscuits?: Biscuit[];
  #schemaToId?: MultiMap<SchemaPath, BiomesId>;
  #initializedSchemaLookups = new Set<SchemaPath>();
  #biscuitBySchema = new MultiMap<SchemaPath, Biscuit>();
  #fallbackBiscuit: Biscuit;

  constructor() {
    super();
    this.setMaxListeners(1000);
    this.#fallbackBiscuit = Object.fromEntries([
      [biomesBiscuitSymbol, true],
      ["id", INVALID_BIOMES_ID],
      ["name", "invalid"],
      ...compactMap(attribs.all, (a) => {
        if (a.fallbackValue) {
          return [a.name, a.fallbackValue()];
        }
      }),
    ]) as Biscuit;
    this.#biscuits.set(INVALID_BIOMES_ID, this.#fallbackBiscuit);
  }

  static get(): BikkieRuntime {
    return (global.bikkieRuntime ??= new BikkieRuntime());
  }

  get epoch(): number {
    return this.#epoch;
  }

  // Create a value computed only when the biscuits change.
  derived<T>(purpose: string, fn: (runtime: BikkieRuntime) => T): () => T {
    let current: T | undefined;
    let currentEpoch = this.#epoch;
    return () => {
      if (current === undefined || currentEpoch !== this.#epoch) {
        const timer = new Timer();
        current = fn(this);
        derivedComputeMs.inc({ purpose }, timer.elapsed);
        currentEpoch = this.#epoch;
      }
      return current;
    };
  }

  private materialize(biscuit: Biscuit | LazyBiscuit): Biscuit {
    const unprepared =
      biscuit instanceof LazyBiscuit ? biscuit.getUnpreparedBiscuit() : biscuit;
    const full = { ...unprepared };
    Object.setPrototypeOf(full, this.#fallbackBiscuit);
    this.#biscuits.set(biscuit.id, full as Biscuit);
    return full as Biscuit;
  }

  registerBiscuits(
    biscuits: ReadonlyMap<BiomesId, Biscuit | LazyBiscuit>,
    schemaToId?: MultiMap<SchemaPath, BiomesId>
  ) {
    this.#epoch++;
    for (const [id, maybeLazyBiscuit] of biscuits) {
      const existing = this.#biscuits.get(id);
      if (existing === undefined) {
        if (maybeLazyBiscuit instanceof LazyBiscuit) {
          this.#biscuits.set(id, maybeLazyBiscuit);
          continue;
        }
        this.materialize(maybeLazyBiscuit);
        continue;
      } else if (existing instanceof LazyBiscuit) {
        this.#biscuits.set(id, maybeLazyBiscuit);
        continue;
      }
      const biscuit =
        maybeLazyBiscuit instanceof LazyBiscuit
          ? maybeLazyBiscuit.getUnpreparedBiscuit()
          : maybeLazyBiscuit;
      // Firstly clear its prototype to avoid confusion.
      Object.setPrototypeOf(existing, null);
      const newKeys = new Set(Object.keys(biscuit));
      for (const key in existing) {
        if (!newKeys.has(key)) {
          delete existing[key as keyof typeof existing];
        }
      }
      assign(existing, biscuit);
      Object.setPrototypeOf(existing, this.#fallbackBiscuit);
    }
    this.#allBiscuits = undefined;
    this.#initializedSchemaLookups.clear();
    this.#biscuitBySchema.clear();
    this.#schemaToId = schemaToId;
    this.#biscuits.set(INVALID_BIOMES_ID, this.#fallbackBiscuit);
    this.emit("refreshed", this.#epoch);
  }

  getBiscuits(schema?: undefined): Biscuit[];
  getBiscuits<T extends SchemaOrWalker>(schema: T): (Biscuit & BiscuitOf<T>)[];
  getBiscuits<T extends SchemaOrWalker>(schema?: T): (Biscuit | BiscuitOf<T>)[];
  getBiscuits(schema: SchemaPath): Biscuit[];
  getBiscuits<T extends SchemaOrWalker>(
    schema?: T | SchemaPath
  ): (Biscuit | BiscuitOf<T>)[];
  getBiscuits<T extends SchemaOrWalker>(
    schema?: T | SchemaPath
  ): (Biscuit | BiscuitOf<T>)[] {
    if (!schema) {
      if (!process.env.IS_SERVER) {
        log.warn("getBiscuits() called without a schema");
      }
      if (!this.#allBiscuits) {
        this.#allBiscuits = compactMap(
          this.#biscuits.values(),
          (b) => b.id && this.materialize(b)
        );
      }
      return this.#allBiscuits;
    }
    const path =
      typeof schema === "string"
        ? schema
        : bikkie.getPathForSchema(normalizeToSchema(bikkie, schema));

    if (!this.#initializedSchemaLookups.has(path)) {
      if (this.#schemaToId) {
        for (const id of this.#schemaToId.get(path) ?? []) {
          const biscuit = this.getBiscuitOnlyIfExists(id);
          if (biscuit) {
            this.#biscuitBySchema.add(path, biscuit);
          }
        }
        this.#initializedSchemaLookups.add(path);
      } else {
        if (!process.env.IS_SERVER) {
          log.warn(`Uncached lookup by schema: ${path}`);
        }
        for (const maybeLazyBiscuit of this.#biscuits.values()) {
          const biscuit = this.materialize(maybeLazyBiscuit);
          for (const [path, schema] of bikkie.allSchemas()) {
            if (conformsWith(schema, biscuit)) {
              this.#biscuitBySchema.add(path, biscuit);
            }
            this.#initializedSchemaLookups.add(path);
          }
        }
      }
    }
    return this.#biscuitBySchema.get(path);
  }

  getBiscuitOnlyIfExists(id?: BiomesId): Biscuit | undefined {
    if (id === undefined) {
      return;
    }
    const biscuit = this.#biscuits.get(id);
    if (!biscuit) {
      return;
    }
    if (biscuit instanceof LazyBiscuit) {
      return this.materialize(biscuit);
    }
    return biscuit;
  }

  getBiscuit(id: BiomesId): Biscuit;
  getBiscuit(id?: BiomesId): Biscuit | undefined;
  getBiscuit(id?: BiomesId): Biscuit | undefined {
    if (id === undefined) {
      return;
    }
    let biscuit = this.getBiscuitOnlyIfExists(id);
    if (biscuit !== undefined) {
      return biscuit;
    }
    biscuit = {
      id,
      name: "unknown",
    } as Biscuit;
    Object.setPrototypeOf(biscuit, this.#fallbackBiscuit);
    this.#biscuits.set(id, biscuit);
    return biscuit;
  }
}

// Wrapper around BikkieRuntime.derived to avoid circular dependencies by only evaluating
// it on first call (After which it will be memoized).
export function bikkieDerived<T>(
  purpose: string,
  fn: (runtime: BikkieRuntime) => T
): () => T {
  let memo: (() => T) | undefined;
  return () => {
    if (!memo) {
      memo = BikkieRuntime.get().derived(purpose, fn);
    }
    return memo();
  };
}

export function getBiscuit(id: BiomesId): Biscuit;
export function getBiscuit(id?: BiomesId): Biscuit | undefined;
export function getBiscuit(id?: BiomesId): Biscuit | undefined {
  return BikkieRuntime.get().getBiscuit(id);
}

export function getBiscuits(schema?: undefined): Biscuit[];
export function getBiscuits<T extends SchemaOrWalker>(
  schema: T
): (Biscuit & BiscuitOf<T>)[];
export function getBiscuits(schema: SchemaPath): Biscuit[];
export function getBiscuits<T extends SchemaOrWalker>(
  schema?: T | SchemaPath
): (Biscuit | BiscuitOf<T>)[] {
  return BikkieRuntime.get().getBiscuits(schema);
}
