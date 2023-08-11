import { ShardSeed } from "@/shared/ecs/gen/components";
import { WrappedEntity, zEntity } from "@/shared/ecs/zod";
import type { BiomesId } from "@/shared/ids";
import {
  zrpcDeserialize,
  zrpcSerialize,
  zrpcWebDeserialize,
  zrpcWebSerialize,
} from "@/shared/zrpc/serde";
import assert from "assert";

const TEST_ID = 1234 as BiomesId;

describe("Test binary encoding", () => {
  it("encodes a shard with binary data", () => {
    assert.deepEqual(
      zrpcWebSerialize(
        new WrappedEntity({
          id: TEST_ID,
          shard_seed: ShardSeed.create({
            buffer: Buffer.from("x"),
          }),
        })
      ),
      "k80E0iKT1AAA1AAAxAF4"
    );

    assert.deepEqual(
      zrpcSerialize(
        new WrappedEntity({
          id: TEST_ID,
          shard_seed: ShardSeed.create({
            buffer: Buffer.from("x"),
          }),
        })
      ).toString("hex"),
      "93cd04d22293d40000d40000c40178"
    );
  });

  it("decodes a shard with binary data", () => {
    assert.deepEqual(
      zrpcWebDeserialize("k80E0iKT1AAA1AAAxAF4", zEntity),
      new WrappedEntity({
        id: TEST_ID,
        shard_seed: ShardSeed.create({
          buffer: Buffer.from("x"),
        }),
      })
    );

    assert.deepEqual(
      zrpcDeserialize(
        Buffer.from("93cd04d22293d40000d40000c40178", "hex"),
        zEntity
      ),
      new WrappedEntity({
        id: TEST_ID,
        shard_seed: ShardSeed.create({
          buffer: Buffer.from("x"),
        }),
      })
    );
  });
});
