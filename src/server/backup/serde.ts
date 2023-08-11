import type { BakedBiscuitTray } from "@/server/shared/bikkie/registry";
import type { StoredBiscuit } from "@/server/shared/bikkie/storage/baked";
import {
  fromStoredBakedTray,
  toStoredBiscuit,
  zStoredBakedTray,
} from "@/server/shared/bikkie/storage/baked";
import { getBiscuits } from "@/shared/bikkie/active";
import type { Biscuit } from "@/shared/bikkie/schema/attributes";
import { attribs } from "@/shared/bikkie/schema/attributes";
import type {
  BiscuitDefinition,
  PreparedBiscuitAttributeAssignment,
  PreparedBiscuitDefinition,
} from "@/shared/bikkie/tray";
import {
  BiscuitTray,
  ConstantAssignment,
  createTrayMetadata,
  definitionHash,
  type BiscuitAttributeAssignment,
} from "@/shared/bikkie/tray";
import type { Entity } from "@/shared/ecs/gen/entities";
import { EntitySerde, SerializeForServer } from "@/shared/ecs/gen/json_serde";
import type { Table } from "@/shared/ecs/table";
import { zEntity } from "@/shared/ecs/zod";
import type { BiomesId } from "@/shared/ids";
import { compactMap } from "@/shared/util/collections";
import { zrpcWebDeserialize, zrpcWebSerialize } from "@/shared/zrpc/serde";
import { ok } from "assert";
import { createReadStream } from "fs";
import type { Writable } from "stream";
import type Chain from "stream-chain";
import StreamArray from "stream-json/streamers/StreamArray";

const CURRENT_VERSION = 2;

const BACKUP_HEADER_TO_VERSION = new Map([
  ["Biomes Backup Version 0", 0],
  ["Biomes Backup Version 1", 1],
  ["Biomes Backup Version 2", 2],
]);

function currentHeader() {
  for (const [header, version] of BACKUP_HEADER_TO_VERSION) {
    if (version === CURRENT_VERSION) {
      return header;
    }
  }
  throw new Error("No current header");
}

// Allocate a unique ID to re-root all backups at.
export const BACKUP_BIKKIE_TRAY_ID = 4782339746648270 as BiomesId;

function createSyntheticDefinition(
  biscuit: Biscuit
): PreparedBiscuitDefinition {
  return {
    id: biscuit.id,
    attributes: Object.fromEntries(
      compactMap(Object.entries(biscuit), ([key, value]) => {
        if (key === "id" || key === "name") {
          return;
        }
        if (value === undefined) {
          return;
        }
        const attrib = attribs.byName.get(key);
        if (!attrib) {
          return;
        }
        return [attrib.id, new ConstantAssignment(value)];
      }) as [number, BiscuitAttributeAssignment][]
    ) as Record<number, PreparedBiscuitAttributeAssignment>,
  };
}

// Synthesize a tray from the current Bikkie-state, this loses
// inference rules but will capture all their outputs.
function createSyntheticTray(baked: BakedBiscuitTray): BiscuitTray {
  const definitions: BiscuitDefinition[] = [];
  for (const biscuit of baked.contents.values()) {
    definitions.push(createSyntheticDefinition(biscuit));
  }
  return BiscuitTray.of(
    attribs,
    BACKUP_BIKKIE_TRAY_ID,
    createTrayMetadata("Synthetic backup", BACKUP_BIKKIE_TRAY_ID),
    ...definitions
  );
}

export type BikkieBackup = {
  definition: BiscuitTray;
  baked: BakedBiscuitTray;
};

export type BackupEntry =
  | [version: number, entity: Entity]
  | [version: "bikkie", value: BikkieBackup];

export async function* iterBackupEntriesFromPipeline(
  pipeline: Chain
): AsyncGenerator<BackupEntry> {
  let version = 0;
  for await (const { key, value } of pipeline) {
    if (key === 0) {
      const foundVersion = BACKUP_HEADER_TO_VERSION.get(value);
      ok(foundVersion !== undefined, `Unknown backup header: ${value}`);
      version = foundVersion;
    } else if (version === 0) {
      const [version, ...encodedEntity] = value;
      yield [parseInt(version), EntitySerde.deserialize(encodedEntity, false)];
    } else if (version > 0) {
      const [version, encodedValue] = value;
      if (version === "bikkie") {
        const baked = fromStoredBakedTray(
          zrpcWebDeserialize(encodedValue, zStoredBakedTray)
        );
        yield [
          "bikkie",
          {
            definition: createSyntheticTray(baked),
            baked,
          },
        ];
      } else {
        yield [
          parseInt(version),
          zrpcWebDeserialize(encodedValue, zEntity)?.entity,
        ];
      }
    }
  }
}

export async function* iterBackupEntitiesFromPipeline(pipeline: Chain) {
  for await (const [version, entity] of iterBackupEntriesFromPipeline(
    pipeline
  )) {
    if (version !== "bikkie") {
      yield [version, entity] as const;
    }
  }
}

export async function* iterBackupEntriesFromFile(
  path: string
): AsyncGenerator<BackupEntry> {
  yield* iterBackupEntriesFromPipeline(
    createReadStream(path).pipe(StreamArray.withParser())
  );
}

export async function* iterBackupEntitiesFromFile(path: string) {
  for await (const [version, entity] of iterBackupEntitiesFromPipeline(
    createReadStream(path).pipe(StreamArray.withParser())
  )) {
    yield [version, entity] as const;
  }
}

async function drainBikkie(target: Writable) {
  if (!target.write(",\n")) {
    await new Promise<void>((resolve) => {
      target.once("drain", () => resolve());
    });
  }
  const baked = {
    id: BACKUP_BIKKIE_TRAY_ID,
    biscuits: [] as [StoredBiscuit, string][],
  };
  for (const biscuit of getBiscuits()) {
    const definition = createSyntheticDefinition(biscuit);
    baked.biscuits.push([toStoredBiscuit(biscuit), definitionHash(definition)]);
  }
  target.write(JSON.stringify(["bikkie", `${zrpcWebSerialize(baked)}`]));
}

export async function drainContents(
  table: Table<{}>,
  target: Writable,
  signal: AbortSignal
) {
  target.write(`["${currentHeader()}"`);
  await drainBikkie(target);
  for (const [, [version, entity]] of table.deltaSince()) {
    if (!target.write(",\n")) {
      await new Promise<void>((resolve) => {
        target.once("drain", () => resolve());
      });
    }
    if (signal.aborted) {
      target.end('"incomplete"]');
      return false;
    }
    target.write(
      JSON.stringify([
        version,
        zrpcWebSerialize(EntitySerde.serialize(SerializeForServer, entity)),
      ])
    );
  }
  target.end("]");
  return true;
}
