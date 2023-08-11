import type { BinaryStore } from "@/server/shared/bikkie/binary";
import {
  CachingBinaryStore,
  GcsBinaryStore,
} from "@/server/shared/bikkie/binary";
import { BikkieNoCache, type BikkieCache } from "@/server/shared/bikkie/cache";
import type { IdGenerator } from "@/server/shared/ids/generator";
import { isRunningOnKubernetes } from "@/server/shared/k8";
import type { BDB } from "@/server/shared/storage";
import type {
  AnyBakedBikkieAttributes,
  AnyBikkieAttribute,
  AnyBikkieAttributeOfType,
} from "@/shared/bikkie/attributes";
import type { AnyBikkie, BiscuitOf } from "@/shared/bikkie/core";
import type {
  BiscuitDefinition,
  PreparedBiscuitAttributeAssignment,
  TrayMetadata,
} from "@/shared/bikkie/tray";
import {
  BiscuitTray,
  definitionHash,
  zodBiscuitTray,
} from "@/shared/bikkie/tray";
import type { BiomesId } from "@/shared/ids";
import {
  INVALID_BIOMES_ID,
  parseBiomesId,
  toStoredEntityId,
  zBiomesId,
} from "@/shared/ids";
import { log } from "@/shared/logging";
import { ok } from "assert";
import { FLOAT32_OPTIONS, Packr } from "msgpackr";
import type { ZodType, ZodTypeAny } from "zod";
import { z } from "zod";

// For binary encoding of tray data.
const packr = new Packr({
  useRecords: true,
  moreTypes: true,
  bundleStrings: true,
  useFloat32: FLOAT32_OPTIONS.NEVER,
});

export const zFirestoreTray = z.object({
  name: z.string().optional(),
  createdAt: z.number().optional(),
  createdBy: zBiomesId.optional(),
  parent: zBiomesId.optional(),
  compactedFrom: zBiomesId.optional(),
  encoded: z.string().optional(),
});

export function encodeNames(names: Iterable<[BiomesId, string]>) {
  return Object.fromEntries(names);
}

function decodeNames(names: Record<string, string>) {
  return Object.entries(names).map(
    ([id, name]) => [parseBiomesId(id), name] as [BiomesId, string]
  );
}

function encodeTray(tray: BiscuitTray): z.infer<typeof zFirestoreTray> {
  return {
    name: tray.meta.name,
    createdAt: tray.meta.createdAt,
    createdBy: tray.meta.createdBy,
    parent: tray.parent?.id,
    compactedFrom: tray.meta.compactedFrom,
  };
}

function determineNewNames(
  oldNames: [BiomesId, string][],
  renames: [BiomesId, string][]
) {
  const newNames = new Map<BiomesId, string>([...oldNames, ...renames]);
  const seenNames = new Set<string>();
  for (const [id, name] of newNames) {
    if (!seenNames.has(name)) {
      seenNames.add(name);
      continue;
    }
    let idx = 1;
    while (true) {
      const proposal = `${name}${idx++}`;
      if (!seenNames.has(proposal)) {
        newNames.set(id, proposal);
        seenNames.add(proposal);
        break;
      }
    }
  }
  return newNames;
}

export type BakedBiscuit<TBikkie extends AnyBikkie> = BiscuitOf<TBikkie> & {
  name: string;
};

export interface InferenceContext<
  TOutputType extends ZodTypeAny,
  TAttribute extends AnyBikkieAttributeOfType<TOutputType> = AnyBikkieAttributeOfType<TOutputType>
> {
  bakery: Bakery<any>;
  output: TAttribute;
  binaries: BinaryStore;
}

export interface InferenceRule<
  TArgs extends unknown[],
  TOutputType extends ZodTypeAny
> {
  readonly name: string;
  readonly inputs: number[];
  readonly optionalInputs?: number[];
  readonly noCache?: boolean;
  fn(
    context: InferenceContext<TOutputType>,
    inputs: TArgs
  ): Promise<z.infer<TOutputType>>;
}

export type AnyInferenceRule = InferenceRule<unknown[], ZodTypeAny>;

type PendingInference = {
  attribute: AnyBikkieAttribute;
  inference: InferenceRule<any, any>;
  inputs: AnyBikkieAttribute[];
};

export interface BakedTray<TBikkie extends AnyBikkie> {
  id: BiomesId;
  contents: Map<BiomesId, BakedBiscuit<TBikkie>>;
  hashes: Map<BiomesId, string>;
}

export interface BakeOptions<TBikkie extends AnyBikkie> {
  prior?: BakedTray<TBikkie>;
}

export interface BakeryTrayStorage {
  saveDefinition(tray: BiscuitTray): Promise<void>;
  loadDefinition(id: BiomesId): Promise<BiscuitTray | undefined>;
}

export interface BakeryOptions {
  cache: BikkieCache | undefined;
  defaultTrayId: BiomesId;
}

const DEFAULT_BAKERY_OPTIONS: BakeryOptions = {
  cache: undefined,
  defaultTrayId: INVALID_BIOMES_ID,
};

// Class for going from definitions to the final collection of Biscuits.
export class Bakery<TBikkie extends AnyBikkie> {
  public readonly binaries = new GcsBinaryStore();
  private readonly inferenceRuleByName = new Map<string, AnyInferenceRule>();
  private readonly trayCache = new Map<BiomesId, BiscuitTray>();
  private cachedActiveTray?: BakedTray<TBikkie>;
  private cache: BikkieCache;
  private readonly options: BakeryOptions;

  constructor(
    private readonly attribs: AnyBakedBikkieAttributes,
    inference: AnyInferenceRule[],
    private readonly db: BDB,
    private readonly storage: BakeryTrayStorage,
    private readonly idGenerator?: IdGenerator | undefined,
    options?: BakeryOptions
  ) {
    this.options = { ...DEFAULT_BAKERY_OPTIONS, ...options };
    this.cache = this.options.cache ?? new BikkieNoCache();
    this.trayCache.set(INVALID_BIOMES_ID, BiscuitTray.empty(attribs));
    for (const rule of inference) {
      this.inferenceRuleByName.set(rule.name, rule);
    }
  }

  private get namesDocRef() {
    return this.db.collection("bikkie").doc("names");
  }

  async allNames(): Promise<[BiomesId, string][]> {
    const doc = await this.namesDocRef.get();
    return decodeNames(doc.data()?.idToName ?? {});
  }

  async renameBiscuits(...renames: [BiomesId, string][]) {
    if (renames.length === 0) {
      return;
    }
    await this.db.runTransaction(async (tx) => {
      const ref = this.namesDocRef;
      const doc = await tx.get(ref);
      if (!doc.exists) {
        tx.set(ref, { idToName: encodeNames(renames) });
        return renames;
      }
      const idToName = determineNewNames(
        decodeNames(doc.data()!.idToName),
        renames
      );
      const encoded = encodeNames(idToName);
      tx.set(ref, { idToName: encoded });
    });
  }

  private async getTrayFromStorage(
    zod: ZodType<BiscuitTray>,
    id: BiomesId
  ): Promise<BiscuitTray> {
    const doc = await this.db
      .collection("bikkie")
      .doc(toStoredEntityId(id))
      .get();
    ok(doc.exists, "Tray not found");
    const encoded = doc.data()!.encoded;
    ok(encoded, "Tray using Redis storage");
    const buffer = Buffer.from(encoded, "base64");
    return zod.parseAsync(packr.unpack(buffer));
  }

  private async legacyGetTray(id: BiomesId): Promise<BiscuitTray> {
    const fetched = new Set<BiomesId>([id]);
    const zod = zodBiscuitTray(
      this.attribs,
      (id) => {
        ok(!fetched.has(id), "Circular reference detected");
        fetched.add(id);
        return this.getTray(id);
      },
      (id) => (id < 200 ? id + 200 : id)
    );
    const tray = await this.cache.getOrCompute(`tray:${id}`, zod, () =>
      this.getTrayFromStorage(zod, id)
    );
    this.trayCache.set(id, tray);
    return tray;
  }

  async getTray(id?: BiomesId): Promise<BiscuitTray> {
    id ??= INVALID_BIOMES_ID;
    const cached = this.trayCache.get(id);
    if (cached !== undefined) {
      return cached;
    }
    const tray = await this.storage.loadDefinition(id);
    if (!tray) {
      log.warn("Reading legacy tray", { id });
      return this.legacyGetTray(id);
    }
    ok(tray);
    this.trayCache.set(id, tray);
    return tray;
  }

  private activeIdDocRef() {
    return this.db.collection("bikkie").doc("active");
  }

  async getActiveTrayId(): Promise<BiomesId> {
    return (
      (await this.activeIdDocRef().get()).data()?.id ??
      this.options.defaultTrayId
    );
  }

  async getActiveTray() {
    return this.getTray(await this.getActiveTrayId());
  }

  // NOTE: This is a super-dangerous function, it will not cleanup any
  // references but rather simply delete these definitions
  async deleteBiscuits(meta: TrayMetadata, ...ids: BiomesId[]) {
    if (!ids.length) {
      return;
    }
    ok(
      this.idGenerator !== undefined,
      "No idGenerator configured: Bakery in readonly mode"
    );
    await this.db.runTransaction(async (tx) => {
      const namesDocPromise = tx.get(this.namesDocRef);
      const activeId = (await tx.get(this.activeIdDocRef())).data()?.id;
      const current = await this.getTray(activeId);

      const id = await this.idGenerator!.next();
      const newTray = current.compactAs(id, meta, ...ids);

      const namesDoc = await namesDocPromise;
      if (namesDoc.exists) {
        const idToName = decodeNames(namesDoc.data()!.idToName).filter(
          ([id]) => !ids.includes(id)
        );
        tx.set(this.namesDocRef, { idToName: encodeNames(idToName) });
      }
      await this.storage.saveDefinition(newTray);
      tx.set(
        this.db.collection("bikkie").doc(toStoredEntityId(id)),
        encodeTray(newTray)
      );
      tx.set(this.activeIdDocRef(), { id });
      log.info("Updating active tray", { id });
    });
  }

  // Save a set of definitions as a new active tray, this will merge with the current
  // active tray and immediately be visible.
  async saveAsActive(
    {
      meta,
      forceCompaction,
    }: { meta: TrayMetadata; forceCompaction?: boolean },
    ...definitions: BiscuitDefinition[]
  ) {
    ok(
      this.idGenerator !== undefined,
      "No idGenerator configured: Bakery in readonly mode"
    );
    // Before doing any real work, check that this has a chance of success at all.
    // By creating a merged tray based on the active one.
    const active = await this.getActiveTray();
    // Not a real BiomesID here as it's just for validation, we discard the result.
    active.extendAs(1 as BiomesId, meta, ...definitions);
    const latest = await this.db.runTransaction(async (tx) => {
      const txActiveId = (await tx.get(this.activeIdDocRef())).data()?.id;
      const txActive = await (async () => {
        const current = await this.getTray(txActiveId);
        if (!forceCompaction && current.depth < 10) {
          return current;
        }
        // The current tray is a bit deep, lets just compact it so that
        // future reads don't need to recurse so much.
        const compactedId = await this.idGenerator!.next();
        const compacted = current.compactAs(compactedId, {
          ...meta,
          name: `Compacted ${txActiveId}/${current.meta.name}`,
          compactedFrom: txActiveId,
        });
        await this.storage.saveDefinition(compacted);
        tx.set(
          this.db.collection("bikkie").doc(toStoredEntityId(compactedId)),
          encodeTray(compacted)
        );
        return compacted;
      })();

      const id = await this.idGenerator!.next();
      const tray = txActive.extendAs(id, meta, ...definitions);
      await this.storage.saveDefinition(tray);
      tx.set(
        this.db.collection("bikkie").doc(toStoredEntityId(id)),
        encodeTray(tray)
      );
      tx.set(this.activeIdDocRef(), { id });
      log.info("Updating active tray", { id });
      return tray;
    });
    return latest;
  }

  private buildPendingInference(
    context: string, // For logging
    id: BiomesId,
    attributes: Record<number, PreparedBiscuitAttributeAssignment>,
    attribute: AnyBikkieAttribute,
    assignment: PreparedBiscuitAttributeAssignment
  ) {
    ok(assignment.kind === "infer");
    if (!assignment.rule) {
      return;
    }
    const inference = this.inferenceRuleByName.get(assignment.rule);
    ok(
      inference,
      `Unknown inference '${assignment.rule}' for ${id}:${attribute.id} in ${context}`
    );
    const inputs: AnyBikkieAttribute[] = [];
    for (const input of inference.inputs) {
      const inputAttribute = this.attribs.byId.get(input);
      if (!inputAttribute) {
        log.warn(
          `Inference rule '${inference.name}' refers to unknown attribute ${input} in ${context}`
        );
        return;
      }
      if (
        attributes[inputAttribute.id] === undefined &&
        !inference.optionalInputs?.includes(inputAttribute.id)
      ) {
        // It'll never be satisfied, so don't bother.
        return;
      }
      inputs.push(inputAttribute);
    }
    return { attribute, inference, inputs };
  }

  private async fufill(
    context: string, // For logging
    id: BiomesId,
    into: any,
    pending: PendingInference[],
    prior?: BakedBiscuit<TBikkie>
  ): Promise<PendingInference[]> {
    const newPending: PendingInference[] = [];
    const work: Promise<unknown>[] = [];
    for (const task of pending) {
      const values: any[] = [];
      let missing = false;
      for (const input of task.inputs) {
        const value = into[input.name];
        if (
          value === undefined &&
          !task.inference.optionalInputs?.includes(input.id)
        ) {
          missing = true;
          break;
        }
        values.push(value);
      }
      if (missing) {
        newPending.push(task);
        continue;
      }
      work.push(
        (async () => {
          const allowLocalInference =
            isRunningOnKubernetes() || process.env.RUN_INFERENCE_LOCALLY;
          const priorValue = prior?.[task.attribute.name];
          if (priorValue && !allowLocalInference) {
            log.warn(
              "Skipping run of inference rule locally, RUN_INFERENCE_LOCALLY=1 to enable"
            );
          } else {
            log.debug("Running inference rule", {
              id,
              attributeId: task.attribute.id,
              attributeName: task.attribute.name,
              rule: task.inference.name,
            });
            try {
              const result = await task.inference.fn(
                {
                  bakery: this,
                  output: task.attribute,
                  // Cache all fetches during a single inference call.
                  binaries: new CachingBinaryStore(this.binaries),
                },
                values
              );
              into[task.attribute.name] = task.attribute.type().parse(result);
              return;
            } catch (error) {
              log.error("Inference rule failed!", {
                error,
                context,
                id,
                attributeId: task.attribute.id,
                attributeName: task.attribute.name,
                rule: task.inference.name,
              });
            }
          }
          // Failed, use a prior value if one exists.
          if (priorValue) {
            into[task.attribute.name] = priorValue;
          }
        })()
      );
    }
    await Promise.all(work);
    return newPending;
  }

  private async bakeBiscuit(
    context: string, // For logging
    id: BiomesId,
    name: string,
    attributes: Record<number, PreparedBiscuitAttributeAssignment>,
    prior?: BakedBiscuit<TBikkie>
  ): Promise<BakedBiscuit<TBikkie>> {
    const out: any = { id, name };
    let pending: PendingInference[] = [];
    for (const rawAttributeId in attributes) {
      const attributeId = parseInt(rawAttributeId);
      const assignment = attributes[attributeId];
      const attribute = this.attribs.byId.get(attributeId);
      if (!attribute) {
        log.warn(
          `Ignoring unknown attribute ${id}:${attributeId} in ${context}`
        );
        continue;
      }
      if (assignment.kind === "constant") {
        out[attribute.name] = assignment.value;
      } else if (assignment.kind === "infer") {
        const inference = this.buildPendingInference(
          context,
          id,
          attributes,
          attribute,
          assignment
        );
        if (inference) {
          pending.push(inference);
        }
      } else {
        throw new Error(`Unknown assignment kind`);
      }
    }
    while (pending.length > 0) {
      // Run inference.
      const oldLength = pending.length;
      pending = await this.fufill(context, id, out, pending, prior);
      if (pending.length === oldLength) {
        log.error(`Inference loop detected! Abandoning all values in-loop`, {
          context,
          id,
        });
      }
    }
    return out as BakedBiscuit<TBikkie>;
  }

  async bakeTray(
    id: BiomesId,
    options?: BakeOptions<TBikkie>
  ): Promise<BakedTray<TBikkie>> {
    const thisLastCached = this.cachedActiveTray?.id;
    if (this.cachedActiveTray !== undefined && thisLastCached === id) {
      return this.cachedActiveTray;
    }
    const [tray, names] = await Promise.all([
      this.getTray(id),
      this.allNames(),
    ]);
    const definitions = tray.prepare();
    const context = `tray:${tray.id}`;
    const hashes = new Map<BiomesId, string>(
      names.map(([id]) => [id, definitionHash(definitions.get(id))])
    );
    const baked = {
      id,
      contents: new Map(
        await Promise.all(
          names.map(async ([id, name]) => {
            let priorBiscuit = options?.prior?.contents.get(id);
            if (priorBiscuit) {
              const priorHash = options!.prior!.hashes.get(id);
              const currentHash = hashes.get(id);
              if (priorHash && currentHash && priorHash === currentHash) {
                if (priorBiscuit) {
                  if (priorBiscuit.name !== name) {
                    priorBiscuit = { ...priorBiscuit, name };
                  }
                  return [id, priorBiscuit] as const;
                }
              }
            }
            return [
              id,
              await this.bakeBiscuit(
                context,
                id,
                name,
                definitions.get(id)?.attributes ?? {},
                priorBiscuit
              ),
            ] as const;
          })
        )
      ),
      hashes,
    };
    if (
      this.cachedActiveTray === undefined ||
      this.cachedActiveTray?.id === thisLastCached
    ) {
      // Check again in case it changed while we were waiting.
      this.cachedActiveTray = baked;
    }
    return baked;
  }

  async bakeActiveTray(
    options?: BakeOptions<TBikkie>
  ): Promise<BakedTray<TBikkie>> {
    return this.bakeTray(await this.getActiveTrayId(), options);
  }
}
