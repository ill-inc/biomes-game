import { SameDistributionTestIdGenerator } from "@/server/shared/ids/generator";
import { decodeVersionMap, encodeVersionMap } from "@/shared/ecs/version";
import type { BiomesId } from "@/shared/ids";
import { gunzip, gzip } from "@/shared/util/compression";
import { zrpcDeserialize, zrpcSerialize } from "@/shared/zrpc/serde";
import assert from "assert";
import { z } from "zod";

describe("Version map benchmark", () => {
  const generator = new SameDistributionTestIdGenerator();
  const entities = new Map<BiomesId, number>();
  for (let i = 0; i < 6_000; ++i) {
    entities.set(
      generator.syncNext(),
      Math.floor(Math.random() * 1_000_000_000)
    );
  }
  const encoded = encodeVersionMap(entities);
  const serialized = zrpcSerialize(encoded);
  let compressed!: Buffer;

  before(async () => {
    compressed = await gzip(serialized);
  });

  it(`decode performance: ${serialized.length / 1024}k`, async () => {
    const raw = zrpcDeserialize(serialized, z.number().array());
    const decoded = decodeVersionMap(raw);
    assert.deepEqual(decoded, entities);
  });

  it(`compressed decode performance`, async () => {
    const raw = zrpcDeserialize(await gunzip(compressed), z.number().array());
    const decoded = decodeVersionMap(raw);
    assert.deepEqual(decoded, entities);
  });
});
