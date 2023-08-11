import type {
  Change,
  ProposedChange,
  ProposedDelete,
  ProposedUpdate,
} from "@/shared/ecs/change";
import {
  applyProposedChange,
  changedBiomesId,
  mergeChange,
} from "@/shared/ecs/change";
import type { ComponentName, ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type {
  DeltaSinceToken,
  EntityState,
  VersionedTable,
  VersionedTableEvents,
} from "@/shared/ecs/table";
import { exportEntity } from "@/shared/ecs/table";
import { EmitterSubscription } from "@/shared/events";
import { type BiomesId } from "@/shared/ids";
import { DefaultMap, MultiMap, mapMap } from "@/shared/util/collections";
import { getNowMs } from "@/shared/util/helpers";
import { ok } from "assert";
import { EventEmitter } from "events";
import type TypedEventEmitter from "typed-emitter";

// Currently we don't allow eager entity creation. It's not trivial (what is the
// new entity's id?), so we'll leave adding support for it until we have a use
// case for it.
export type EagerProposedChange = ProposedDelete | ProposedUpdate;

type ReconcileFn = (
  newBaseEntity: ReadonlyEntity | undefined,
  incoming: Change,
  existingLayerChange: EagerProposedChange
) => EagerProposedChange | "ignore" | "expire";

export interface EagerApplyOptions {
  expires: { kind: "at" | "in"; ms: number } | undefined;
  // This function describes what to do when a change from upstream arrives.
  // In some documents this was referred to as "rebase". Returning "ignore"
  // will ignore the incoming change and leave the eager apply layer as-is,
  // returning "expire" will cause the layer to immmediately expire, and
  // returning a new change will switch the layer to the new change.
  reconcile: ReconcileFn;
}

const DEFAULT_EAGER_APPLY_OPTIONS: EagerApplyOptions = {
  expires: { kind: "in", ms: 3000 },
  reconcile: () => "expire",
};

export interface Layer {
  readonly expired: boolean;
  readonly expiresAt: number | undefined;

  update: (
    change: EagerProposedChange,
    options?: Partial<EagerApplyOptions>
  ) => void;
  expire: () => void;
}

interface LayerInternal {
  expired: boolean;
  expiresAt: number | undefined;
  change: EagerProposedChange;
  reconcile: ReconcileFn;
}

// Acts as a proxy object so we can switch around the internal `LayerInternal`
// object without changing the public reference to the layer.
class LayerImpl implements Layer {
  constructor(
    private internal: LayerInternal,
    private updateLayer: (
      layer: LayerInternal,
      change: EagerProposedChange,
      options?: Partial<EagerApplyOptions>
    ) => LayerInternal,
    private expireLayer: (layer: LayerInternal) => void
  ) {}
  get expired() {
    return this.internal.expired;
  }
  get expiresAt() {
    return this.internal.expiresAt;
  }
  update(change: EagerProposedChange, options?: Partial<EagerApplyOptions>) {
    this.internal = this.updateLayer(this.internal, change, options);
  }

  expire() {
    this.expireLayer(this.internal);
  }
}

export interface TableLayers {
  compactLayers(): void;
  eagerApply(
    change: EagerProposedChange,
    options?: Partial<EagerApplyOptions>
  ): Layer;
  eagerApplyOnLayer(
    layer: Layer | undefined,
    change: EagerProposedChange,
    options?: Partial<EagerApplyOptions>
  ): Layer;
}

export class LayeredTable<TVersion>
  implements VersionedTable<TVersion>, TableLayers
{
  private delegateEvents: EmitterSubscription<VersionedTableEvents>;
  readonly events =
    new EventEmitter() as TypedEventEmitter<VersionedTableEvents>;

  public readonly layersByEntity: MultiMap<BiomesId, LayerInternal> =
    new MultiMap();

  private compactLwm: number = 0;

  constructor(private readonly delegate: VersionedTable<TVersion>) {
    this.delegateEvents = new EmitterSubscription(this.delegate.events, {
      postApply: (changes) => {
        const affectedLayerEntities = new DefaultMap<
          BiomesId,
          Readonly<Change>[]
        >(() => []);
        const forwardedChanges: Readonly<Change>[] = [];

        // For now, delete all eager changes that are now obsolete.
        // In the future we can impose a 'rebase'
        for (let i = 0; i < changes.length; ++i) {
          const change = changes[i];
          const id = changedBiomesId(change);

          const layers = this.layersByEntity.get(id);
          if (layers.length > 0) {
            affectedLayerEntities.get(id).push(change);
          } else {
            forwardedChanges.push(change);
          }
        }

        const layerChanges = mapMap(affectedLayerEntities, (changes, id) => {
          const baseEntity = this.delegate.get(id);
          const currentLayers = this.layersByEntity.get(id);
          const change = changes.reduce((a, c) => mergeChange(a, c));
          const layerChange = computeLayerStackChange(
            baseEntity,
            id,
            currentLayers,
            change,
            this.tick,
            [],
            []
          );

          this.applyLayerStackChangeNoEvents(layerChange);

          const incomingChange = changes.reduce((a, c) => mergeChange(a, c));
          return mergeChange(incomingChange, layerChange.change);
        });

        this.events.emit("postApply", [...forwardedChanges, ...layerChanges]);
      },
      preApply: (ids) => this.events.emit("preApply", ids),
      clear: () => {
        for (const [_, layers] of this.layersByEntity) {
          for (const layer of layers) {
            ok(layer.expired === false);
            layer.expired = true;
          }
        }
        this.layersByEntity.clear();
        this.events.emit("clear");
      },
    });
  }

  stop() {
    this.delegateEvents.off();
  }

  // TODO: Keep track of ticks for layered changes and use max of layered tick
  // and delegate tick.
  get tick(): number {
    return this.delegate.tick;
  }

  get recordSize(): number {
    return this.delegate.recordSize;
  }

  getWithVersion(id: BiomesId): Readonly<EntityState<TVersion>> {
    const [version, entity] = this.delegate.getWithVersion(id);
    return [version, !entity ? undefined : this.maybeOverlayEager(entity)];
  }

  export(id: BiomesId, ...components: ComponentName[]): string {
    return exportEntity(this, id, ...components);
  }

  has(id: BiomesId): boolean {
    return this.delegate.has(id);
  }

  contents(): Iterable<ReadonlyEntity> {
    return this.delegate.contents();
  }

  mark(): DeltaSinceToken {
    return this.delegate.mark();
  }

  deltaSince(
    token?: undefined
  ): Iterable<[BiomesId, Readonly<[TVersion, ReadonlyEntity]>]>;
  deltaSince(
    token: DeltaSinceToken
  ): Iterable<[BiomesId, Readonly<EntityState<TVersion>>]>;
  deltaSince(
    token?: DeltaSinceToken | undefined
  ): Iterable<[BiomesId, Readonly<EntityState<TVersion>>]>;
  *deltaSince(
    token?: DeltaSinceToken | undefined
  ): Iterable<[BiomesId, Readonly<EntityState<TVersion>>]> {
    return this.delegate.deltaSince(token);
  }

  compactLayers(now?: number): void {
    now = now ?? performance.now();
    if (now < this.compactLwm) {
      return;
    }

    let newLWM = Infinity;
    const layersToDelete = new DefaultMap<BiomesId, LayerInternal[]>(() => []);
    for (const [_, layers] of this.layersByEntity) {
      for (const layer of layers) {
        if (layer.expiresAt && layer.expiresAt <= now) {
          layersToDelete.get(changedBiomesId(layer.change)).push(layer);
        } else if (layer.expiresAt) {
          newLWM = Math.min(newLWM, layer.expiresAt);
        }
      }
    }
    this.compactLwm = newLWM;

    const layerChanges = mapMap(layersToDelete, (layers, id) => {
      const baseEntity = this.delegate.get(id);
      const currentLayers = this.layersByEntity.get(id);
      return computeLayerStackChange(
        baseEntity,
        id,
        currentLayers,
        undefined,
        this.tick,
        layers.map((layer) => ({ src: layer, dst: undefined })),
        []
      );
    });
    this.applyLayerStackChanges(layerChanges);
  }

  eagerApply(
    change: EagerProposedChange,
    options?: Partial<EagerApplyOptions>
  ): Layer {
    const internalLayer = this.updateLayer(undefined, change, options);

    return new LayerImpl(internalLayer, this.updateLayer, this.expireLayer);
  }

  get(query: BiomesId): ReadonlyEntity | undefined {
    return this.maybeOverlayEager(this.delegate.get(query));
  }

  private maybeOverlayEager(entity: ReadonlyEntity | undefined) {
    if (!entity) {
      // We don't yet support eager creates.
      return entity;
    }

    for (const layer of this.layersByEntity.get(entity.id)) {
      if (changedBiomesId(layer.change) === entity.id) {
        entity = applyProposedChange(entity, layer.change);
        if (!entity) {
          return;
        }
      }
    }
    return entity;
  }

  private updateLayer = (
    prevLayer: LayerInternal | undefined,
    change: EagerProposedChange,
    options: Partial<EagerApplyOptions> | undefined
  ) => {
    if (prevLayer?.expired) {
      prevLayer = undefined;
    }

    const fullOptions = { ...DEFAULT_EAGER_APPLY_OPTIONS, ...options };
    const expiresAt = fullOptions.expires
      ? fullOptions.expires.kind === "at"
        ? fullOptions.expires.ms
        : getNowMs() + fullOptions.expires.ms
      : undefined;

    const newLayer: LayerInternal = {
      expired: false,
      expiresAt,
      change,
      reconcile: fullOptions.reconcile,
    };

    if (expiresAt) {
      this.compactLwm = Math.min(this.compactLwm, expiresAt);
    }

    const oldId = prevLayer ? changedBiomesId(prevLayer.change) : undefined;
    const newId = changedBiomesId(change);

    const layerChanges: LayerStackChange[] = [];
    const newBaseEntity = this.delegate.get(newId);
    const newLayers = this.layersByEntity.get(newId);
    if (newId === oldId) {
      ok(prevLayer);
      layerChanges.push(
        computeLayerStackChange(
          newBaseEntity,
          newId,
          newLayers,
          undefined,
          this.tick,
          [{ src: prevLayer, dst: newLayer }],
          []
        )
      );
    } else {
      if (oldId && prevLayer) {
        const oldBaseEntity = this.delegate.get(oldId);
        const oldLayers = this.layersByEntity.get(oldId);
        layerChanges.push(
          computeLayerStackChange(
            oldBaseEntity,
            oldId,
            oldLayers,
            undefined,
            this.tick,
            [{ src: prevLayer, dst: undefined }],
            []
          )
        );
      }
      layerChanges.push(
        computeLayerStackChange(
          newBaseEntity,
          newId,
          newLayers,
          undefined,
          this.tick,
          [],
          [newLayer]
        )
      );
    }

    this.applyLayerStackChanges(layerChanges);

    return newLayer;
  };

  private applyLayerStackChanges(layerChanges: LayerStackChange[]) {
    if (layerChanges.length <= 0) {
      return;
    }

    this.events.emit(
      "preApply",
      layerChanges.map((x) => changedBiomesId(x.change))
    );

    for (const layerChange of layerChanges) {
      this.applyLayerStackChangeNoEvents(layerChange);
      for (const reconciliation of layerChange.reconciliations) {
        reconciliation.layer.change = reconciliation.newChange;
      }
    }

    this.events.emit(
      "postApply",
      layerChanges.map((x) => x.change)
    );
  }
  private applyLayerStackChangeNoEvents(layerChanges: LayerStackChange) {
    const { newLayers, removedLayers, id } = layerChanges;
    for (const layer of removedLayers) {
      ok(!layer.expired);
      layer.expired = true;
    }
    this.layersByEntity.set(id, newLayers);
  }

  private expireLayer = (layer: LayerInternal) => {
    if (layer.expired) {
      return;
    }

    const id = changedBiomesId(layer.change);
    const layers = this.layersByEntity.get(id);
    const baseEntity = this.delegate.get(id);
    this.applyLayerStackChanges([
      computeLayerStackChange(
        baseEntity,
        id,
        layers,
        undefined,
        this.tick,
        [{ src: layer, dst: undefined }],
        []
      ),
    ]);
  };

  // Apply the changes specified, reusing a layer if it exists or else creating
  // a new one.
  eagerApplyOnLayer(
    layer: Layer | undefined,
    change: EagerProposedChange,
    options?: Partial<EagerApplyOptions>
  ): Layer {
    if (layer) {
      layer.update(change, options);
      return layer;
    } else {
      return this.eagerApply(change, options);
    }
  }
}

interface LayerStackChange {
  id: BiomesId;
  change: Readonly<Change>;
  newEntity: ReadonlyEntity | undefined;
  newLayers: LayerInternal[];
  removedLayers: LayerInternal[];
  addedLayers: LayerInternal[];
  reconciliations: { layer: LayerInternal; newChange: EagerProposedChange }[];
}

type TouchedComponents = Set<ComponentName> | "all" | "none";

function touchedComponentsFromChange(
  change: Readonly<ProposedChange> | undefined
): TouchedComponents {
  if (!change) {
    return "none";
  }

  if (change.kind === "create" || change.kind === "delete") {
    return "all";
  }

  return new Set(
    Object.keys(change.entity).filter((x) => x !== "id") as ComponentName[]
  );
}

function mergeChangeTouchedComponents(
  existingTouchedComponents: TouchedComponents,
  change: Readonly<ProposedChange>
) {
  if (existingTouchedComponents === "all") {
    return "all";
  }

  const newTouchedComponents = touchedComponentsFromChange(change);
  if (newTouchedComponents === "all") {
    return "all";
  }

  if (existingTouchedComponents === "none") {
    return newTouchedComponents;
  }
  if (newTouchedComponents === "none") {
    return existingTouchedComponents;
  }

  for (const component of newTouchedComponents) {
    existingTouchedComponents.add(component);
  }
  return existingTouchedComponents;
}

function makeChangeFromTouchedComponents(
  newEntity: ReadonlyEntity | undefined,
  entityId: BiomesId,
  tick: number,
  touchedComponents: TouchedComponents
): Readonly<Change> {
  if (touchedComponents === "none") {
    // The client can and should arrange to have this never happen, but we can
    // handle it anyway.
    return { kind: "update", tick, entity: { id: entityId } };
  }
  if (!newEntity) {
    return {
      kind: "delete",
      tick,
      id: entityId,
    };
  }

  if (touchedComponents === "all") {
    return {
      kind: "create",
      tick,
      entity: newEntity,
    };
  } else {
    const entries = [...touchedComponents].map((c) => [
      c,
      newEntity[c] ?? null,
    ]);
    entries.push(["id", newEntity.id]);

    return {
      kind: "update",
      tick,
      entity: Object.fromEntries(entries),
    };
  }
}

// This function handles all the logic for modifying a set of layers affecting
// a specific entity. The function records what updates were made in such a way
// that we can emit corresponding events. It doesn't actually make any changes
// in place though.
function computeLayerStackChange(
  baseEntity: ReadonlyEntity | undefined,
  entityId: BiomesId,
  layers: LayerInternal[],
  incomingChange: Readonly<Change> | undefined,
  tick: number,
  replacements: { src: LayerInternal; dst: LayerInternal | undefined }[],
  additions: LayerInternal[]
): LayerStackChange {
  let newEntity: ReadonlyEntity | undefined = baseEntity;
  const newLayers: LayerInternal[] = [];
  const removedLayers: LayerInternal[] = [];
  const addedLayers: LayerInternal[] = [];
  let touchedComponents = touchedComponentsFromChange(incomingChange);
  const reconciliations: {
    layer: LayerInternal;
    newChange: EagerProposedChange;
  }[] = [];

  for (let i = 0; i < layers.length; ++i) {
    let layer: LayerInternal | undefined = layers[i];
    const replacement = replacements.find((x) => x.src === layer);
    if (replacement) {
      touchedComponents = mergeChangeTouchedComponents(
        touchedComponents,
        replacement.src.change
      );
      removedLayers.push(replacement.src);
      if (replacement.dst) {
        touchedComponents = mergeChangeTouchedComponents(
          touchedComponents,
          replacement.dst.change
        );
        addedLayers.push(replacement.dst);
      }
      layer = replacement.dst;
    } else if (touchedComponents !== "none") {
      // A change has been made underneath this layer (which otherwise has not
      // itself changed). Run reconciliation.
      const change = makeChangeFromTouchedComponents(
        newEntity,
        entityId,
        tick,
        touchedComponents
      );
      const result = layers[i].reconcile(newEntity, change, layers[i].change);
      if (result !== "ignore") {
        touchedComponents = mergeChangeTouchedComponents(
          touchedComponents,
          layer.change
        );
        if (result === "expire") {
          layer = undefined;
          removedLayers.push(layers[i]);
        } else {
          layer = { ...layers[i], change: result };
          reconciliations.push({ layer: layers[i], newChange: result });
          touchedComponents = mergeChangeTouchedComponents(
            touchedComponents,
            result
          );
        }
      }
    }

    if (layer) {
      newLayers.push(layer);
      newEntity = applyProposedChange(newEntity, layer.change);
    }
  }

  for (const addition of additions) {
    newLayers.push(addition);
    addedLayers.push(addition);
    touchedComponents = mergeChangeTouchedComponents(
      touchedComponents,
      addition.change
    );
    newEntity = applyProposedChange(newEntity, addition.change);
  }

  return {
    id: entityId,
    change: makeChangeFromTouchedComponents(
      newEntity,
      entityId,
      tick,
      touchedComponents
    ),
    newEntity,
    newLayers,
    removedLayers,
    addedLayers,
    reconciliations,
  };
}
