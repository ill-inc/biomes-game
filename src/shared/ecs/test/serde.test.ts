import type { Label, RigidBody } from "@/shared/ecs/gen/components";
import type { Entity } from "@/shared/ecs/gen/entities";
import { EntitySerde, SerializeForServer } from "@/shared/ecs/gen/json_serde";
import { ChangeSerde } from "@/shared/ecs/serde";
import { generateTestId } from "@/shared/test_helpers";
import assert from "assert";
import { Packr } from "msgpackr";

const TEST_ID = generateTestId();

describe("Benchmark Player Update", () => {
  it("is benchmarked", () => {
    const packr = new Packr({
      variableMapSize: true,
    });

    assert.equal(
      packr.pack(
        ChangeSerde.serialize(SerializeForServer, {
          kind: "update",
          tick: 5,
          entity: {
            id: TEST_ID,
            position: {
              v: [4.123, 5.456, 6.789],
            },
            orientation: {
              v: [7.123, 8.456],
            },
          },
        })
      ).length,
      // change v1, entity v1: 121
      // change v2, entity v1: 98
      // change v2, entity v2: 80
      // change v2, entity v3: 68
      // change v3, entity v3: 55
      56
    );
  });
});

describe("ChangeSerde", () => {
  const testEntity = {
    id: TEST_ID,
    label: {
      text: "test label",
    } as Label,
    rigid_body: {
      velocity: [4, 5, 6],
    } as RigidBody,
  } as Entity;

  it("handles change v2", () => {
    assert.deepStrictEqual(ChangeSerde.deserialize(TEST_ID), {
      kind: "delete",
      tick: 1,
      id: TEST_ID,
    });

    assert.deepStrictEqual(
      ChangeSerde.deserialize([
        1,
        EntitySerde.serialize(SerializeForServer, testEntity),
      ]),
      {
        kind: "update",
        tick: 1,
        entity: testEntity,
      }
    );
  });

  it("handles change v3", () => {
    assert.deepStrictEqual(ChangeSerde.deserialize([0, 42, TEST_ID]), {
      kind: "delete",
      tick: 42,
      id: TEST_ID,
    });

    assert.deepStrictEqual(
      ChangeSerde.deserialize([
        1,
        32,
        EntitySerde.serialize(SerializeForServer, testEntity),
      ]),
      {
        kind: "update",
        tick: 32,
        entity: testEntity,
      }
    );
  });

  it("generates modern JSON", () => {
    assert.deepStrictEqual(
      ChangeSerde.serialize(SerializeForServer, {
        kind: "delete",
        tick: 42,
        id: TEST_ID,
      }),
      [0, 42, TEST_ID]
    );

    assert.deepStrictEqual(
      ChangeSerde.serialize(SerializeForServer, {
        kind: "update",
        tick: 55,
        entity: testEntity,
      }),
      [1, 55, EntitySerde.serialize(SerializeForServer, testEntity)]
    );
  });
});
