import type {
  AsDelta,
  Entity,
  ReadonlyEntity,
} from "@/shared/ecs/gen/entities";
import type { BiomesId } from "@/shared/ids";
import { removeNilishInPlace } from "@/shared/util/object";
import { assertNever } from "@/shared/util/type_helpers";

export interface Create {
  readonly kind: "create";
  readonly tick: number;
  readonly entity: ReadonlyEntity;
}

export interface Update {
  readonly kind: "update";
  readonly tick: number;
  readonly entity: AsDelta<ReadonlyEntity>;
}

export interface Delete {
  readonly kind: "delete";
  readonly tick: number;
  readonly id: BiomesId;
}

// Note, the tick of a change is the entity version post-apply, i.e.
// it can be thought as 'this is the change that produced this version'.
// Specifically: IT IS NOT A PRECONDITION ON ENTITY VERSION.
export type Change = Create | Delete | Update;
export type ReadonlyChanges = ReadonlyArray<Readonly<Change>>;

export function changedBiomesId(
  change:
    | { kind: "create" | "update"; entity: { id: BiomesId } }
    | { kind: "delete"; id: BiomesId }
): BiomesId {
  switch (change.kind) {
    case "create":
    case "update":
      return change.entity.id;
    case "delete":
      return change.id;
  }
}

export function mergeChange(prior: Change | undefined, change: Change): Change {
  if (prior === undefined) {
    return change;
  }
  if (prior.tick > change.tick) {
    return mergeChange(change, prior);
  }
  switch (change.kind) {
    case "delete":
    case "create":
      return change;
    case "update":
      switch (prior.kind) {
        case "delete":
          return change;
        case "create":
          return {
            kind: "create",
            tick: Math.max(prior.tick, change.tick),
            entity: removeNilishInPlace({
              ...prior.entity,
              ...change.entity,
            }) as Entity,
          };
        case "update":
          return {
            kind: "update",
            tick: Math.max(prior.tick, change.tick),
            entity: {
              ...prior.entity,
              ...change.entity,
            },
          };
      }
  }
}

export function stateToChange(
  id: BiomesId,
  tick: number,
  entity?: ReadonlyEntity
): Change {
  if (entity) {
    return {
      kind: "create",
      tick,
      entity,
    };
  } else {
    return {
      kind: "delete",
      tick,
      id,
    };
  }
}

// Stores merged changes.
export class ChangeBuffer {
  private data?: Map<BiomesId, Change>;

  get size() {
    return this.data?.size ?? 0;
  }

  get empty() {
    return this.data === undefined;
  }

  has(id: BiomesId) {
    return !!this.data?.has(id);
  }

  clear() {
    this.data = undefined;
  }

  push(changes: ReadonlyChanges) {
    if (changes.length === 0) {
      return;
    }
    if (!this.data) {
      this.data = new Map();
    }
    for (const change of changes) {
      const id = changedBiomesId(change);
      this.data.set(id, mergeChange(this.data.get(id), change));
    }
  }

  peekMap() {
    return this.data ?? new Map();
  }

  popSome(count: number): Change[] {
    if (!this.data) {
      return [];
    } else if (count > this.data.size) {
      return this.pop();
    }
    const changes: Change[] = [];
    for (const [id, change] of this.data) {
      changes.push(change);
      this.data?.delete(id);
      if (changes.length === count) {
        break;
      }
    }
    return changes;
  }

  pop(): Change[] {
    const ret = Array.from(this.data?.values() ?? []);
    this.clear();
    return ret;
  }
}

export type ProposedCreate = Omit<Create, "tick">;
export type ProposedUpdate = Omit<Update, "tick">;
export type ProposedDelete = Omit<Delete, "tick">;

export type ProposedChange = ProposedCreate | ProposedUpdate | ProposedDelete;
export type ReadonlyProposedChanges = ReadonlyArray<Readonly<ProposedChange>>;

export function mergeProposedChange(
  prior: ProposedChange | undefined,
  change: ProposedChange
): ProposedChange {
  if (prior === undefined) {
    return change;
  }
  switch (change.kind) {
    case "delete":
    case "create":
      return change;
    case "update":
      switch (prior.kind) {
        case "delete":
          return change;
        case "create":
          return {
            kind: "create",
            entity: removeNilishInPlace({
              ...prior.entity,
              ...change.entity,
            }) as unknown as Entity,
          };
        case "update":
          return {
            kind: "update",
            entity: {
              ...prior.entity,
              ...change.entity,
            },
          };
      }
  }
}

export function applyProposedChange(
  entity: ReadonlyEntity | undefined,
  change: ProposedCreate | ProposedUpdate
): ReadonlyEntity;
export function applyProposedChange(
  entity: ReadonlyEntity | undefined,
  change: ProposedDelete
): undefined;
export function applyProposedChange(
  entity: ReadonlyEntity | undefined,
  change: ProposedChange
): ReadonlyEntity | undefined;
export function applyProposedChange(
  entity: ReadonlyEntity | undefined,
  change: ProposedChange
): ReadonlyEntity | undefined {
  switch (change.kind) {
    case "delete":
      return;
    case "update":
      {
        const updated = { ...entity };
        for (const [key, value] of Object.entries(change.entity)) {
          if (value === null) {
            delete updated[key as keyof typeof updated];
          } else if (value) {
            (updated as any)[key] = value;
          }
        }
        return updated as ReadonlyEntity;
      }
      break;
    case "create":
      return change.entity;
    default:
      assertNever(change);
  }
}

// Stores merged changes.
export class ProposedChangeBuffer {
  private data?: Map<BiomesId, ProposedChange>;

  get size() {
    return this.data?.size ?? 0;
  }

  get empty() {
    return this.data === undefined;
  }

  clear() {
    this.data = undefined;
  }

  delete(id: BiomesId) {
    if (this.data) {
      this.data.delete(id);
    }
  }

  push(changes: ReadonlyProposedChanges) {
    if (changes.length === 0) {
      return;
    }
    if (!this.data) {
      this.data = new Map();
    }
    for (const change of changes) {
      const id = changedBiomesId(change);
      this.data.set(id, mergeProposedChange(this.data.get(id), change));
    }
  }

  pop(): ProposedChange[] {
    const ret = Array.from(this.data?.values() ?? []);
    this.clear();
    return ret;
  }
}
