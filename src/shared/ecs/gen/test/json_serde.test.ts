import { Entity } from "@/shared/ecs/gen/entities";
import { EntitySerde, SerializeForServer } from "@/shared/ecs/gen/json_serde";
import { generateTestId } from "@/shared/test_helpers";
import assert from "assert";

const TEST_ID = generateTestId();

describe("EntitySerde", () => {
  it("handles entity v0", () => {
    assert.deepStrictEqual(
      EntitySerde.deserialize(
        [
          "ignored",
          {
            id: TEST_ID,
            label: {
              text: "test label",
            },
            rigid_body: {
              velocity: [4, 5, 6],
            },
            orientation: {},
          },
        ],
        false
      ),
      {
        id: TEST_ID,
        label: {
          text: "test label",
        },
        rigid_body: {
          velocity: [4, 5, 6],
        },
        orientation: {
          v: [0, 0], // Is missing, testing default.
        },
      } as Entity
    );
  });

  it("handles entity v1", () => {
    assert.deepStrictEqual(
      EntitySerde.deserialize(
        {
          0: TEST_ID,
          37: {
            1: "test label",
          },
          32: {
            3: [4, 5, 6],
          },
          55: {},
        },
        false
      ),
      {
        id: TEST_ID,
        label: {
          text: "test label",
        },
        rigid_body: {
          velocity: [4, 5, 6],
        },
        orientation: {
          v: [0, 0], // Is missing, testing default.
        },
      } as Entity
    );
  });

  it("handles entity v2", () => {
    assert.deepStrictEqual(
      EntitySerde.deserialize(
        [TEST_ID, 32, [, , [4, 5, 6]], 55, [], 37, ["test label"]],
        false
      ),
      {
        id: TEST_ID,
        label: {
          text: "test label",
        },
        rigid_body: {
          velocity: [4, 5, 6],
        },
        orientation: {
          v: [0, 0], // Is missing, testing default.
        },
      } as Entity
    );
  });

  it("generates modern JSON", () => {
    assert.deepStrictEqual(
      EntitySerde.serialize(SerializeForServer, {
        id: TEST_ID,
        label: {
          text: "test label",
        },
        rigid_body: {
          velocity: [4, 5, 6],
        },
        orientation: {
          v: [0, 0],
        },
      } as Entity),
      [TEST_ID, 55, [[0, 0]], 32, [, , [4, 5, 6]], 37, ["test label"]]
    );
  });
});
