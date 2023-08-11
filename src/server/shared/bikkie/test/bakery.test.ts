import type { InferenceRule } from "@/server/shared/bikkie/bakery";
import { Bakery } from "@/server/shared/bikkie/bakery";
import { MemoryBikkieStorage } from "@/server/shared/bikkie/storage/memory";
import type { IdGenerator } from "@/server/shared/ids/generator";
import { TestIdGenerator } from "@/server/shared/ids/test_helpers";
import type { BDB } from "@/server/shared/storage";
import { newTestDB } from "@/server/test/test_helpers";
import { bakeAttributes } from "@/shared/bikkie/attributes";
import { Bikkie, conformsWith } from "@/shared/bikkie/core";
import { bikkieNumber, bikkieString } from "@/shared/bikkie/schema/types";
import { createTrayMetadata } from "@/shared/bikkie/tray";
import type { BiomesId } from "@/shared/ids";
import assert from "assert";

const attribs = bakeAttributes({
  201: {
    name: "displayName",
    type: () => bikkieString,
  },
  202: {
    name: "value",
    type: () => bikkieNumber,
  },
  203: {
    name: "extraDisplayName",
    type: () => bikkieString,
  },
} as const);

const bikkie = new Bikkie({
  items: {
    attributes: ["displayName"],
    subschemas: {
      withValue: {
        attributes: ["extraDisplayName", "value"],
      },
    },
  },
});

const ID_A = 1 as BiomesId;
const ID_B = 2 as BiomesId;
const ID_C = 3 as BiomesId;

const displayNameLength = {
  name: "displayNameLength",
  inputs: [attribs.displayName.id],
  fn: async (_context, [displayName]) => displayName.length,
} satisfies InferenceRule<
  [string],
  ReturnType<(typeof attribs)["value"]["type"]>
>;

describe("Bakery tests", () => {
  let idGenerator!: IdGenerator;
  let db!: BDB;
  let storage!: MemoryBikkieStorage;
  let bakery!: Bakery<typeof bikkie>;

  const meta = createTrayMetadata("Test Tray", ID_A);

  beforeEach(async () => {
    idGenerator = new TestIdGenerator();
    db = await newTestDB();
    storage = new MemoryBikkieStorage();
    bakery = new Bakery(attribs, [displayNameLength], db, storage, idGenerator);
  });

  it("Can be baked into Biscuits", async () => {
    const [active] = await Promise.all([
      bakery.saveAsActive(
        { meta },
        {
          id: ID_A,
          attributes: {
            [attribs.value.id]: {
              kind: "constant",
              value: 5,
            },
            [attribs.displayName.id]: {
              kind: "constant",
              value: "Test Item",
            },
          },
        },
        {
          id: ID_B,
          extendedFrom: ID_A,
          attributes: {
            [attribs.displayName.id]: {
              kind: "constant",
              value: "Second Test Item",
            },
          },
        }
      ),
      bakery.renameBiscuits([ID_A, "testItem"], [ID_B, "secondTestItem"]),
    ]);

    assert.equal(active.id, await bakery.getActiveTrayId());

    const output = await bakery.bakeActiveTray();
    assert.deepEqual(
      [...output.contents],
      [
        [
          ID_A,
          {
            name: "testItem",
            displayName: "Test Item",
            id: 1,
            value: 5,
          },
        ],
        [
          ID_B,
          {
            name: "secondTestItem",
            displayName: "Second Test Item",
            id: 2,
            value: 5,
          },
        ],
      ]
    );

    assert.ok(
      conformsWith(bikkie.schema.items.schema, output.contents.get(ID_A))
    );
    assert.ok(
      !conformsWith(
        bikkie.schema.items.withValue.schema,
        output.contents.get(ID_A)
      )
    );
  });

  it("Can run inference rules", async () => {
    await Promise.all([
      bakery.saveAsActive(
        { meta },
        {
          id: ID_A,
          attributes: {
            [attribs.value.id]: {
              kind: "infer",
              rule: "displayNameLength",
            },
            [attribs.displayName.id]: {
              kind: "constant",
              value: "Test Item",
            },
          },
        },
        {
          id: ID_B,
          extendedFrom: ID_A,
          attributes: {
            [attribs.displayName.id]: {
              kind: "constant",
              value: "Second Test Item",
            },
          },
        },
        {
          id: ID_C,
          extendedFrom: ID_A,
          attributes: {
            [attribs.displayName.id]: {
              kind: "unassign",
            },
            [attribs.extraDisplayName.id]: {
              kind: "constant",
              value: "No Display Name",
            },
          },
        }
      ),
      bakery.renameBiscuits(
        [ID_A, "testItem"],
        [ID_B, "secondTestItem"],
        [ID_C, "thirdTestItem"]
      ),
    ]);
    assert.deepEqual(
      [...(await bakery.bakeActiveTray()).contents],
      [
        [
          ID_A,
          {
            name: "testItem",
            displayName: "Test Item",
            id: 1,
            value: 9,
          },
        ],
        [
          ID_B,
          {
            name: "secondTestItem",
            displayName: "Second Test Item",
            id: 2,
            value: 16,
          },
        ],
        [
          ID_C,
          {
            name: "thirdTestItem",
            id: 3,
            extraDisplayName: "No Display Name",
          },
        ],
      ]
    );
  });

  it("Supports Biscuit deletion", async () => {
    await Promise.all([
      bakery.saveAsActive(
        { meta },
        {
          id: ID_A,
          attributes: {
            [attribs.value.id]: {
              kind: "constant",
              value: 5,
            },
            [attribs.displayName.id]: {
              kind: "constant",
              value: "Test Item",
            },
          },
        },
        {
          id: ID_B,
          extendedFrom: ID_A,
          attributes: {
            [attribs.displayName.id]: {
              kind: "constant",
              value: "Second Test Item",
            },
          },
        }
      ),
      bakery.renameBiscuits([ID_A, "testItem"], [ID_B, "secondTestItem"]),
    ]);

    assert.deepEqual(
      [...(await bakery.bakeActiveTray()).contents],
      [
        [
          ID_A,
          {
            name: "testItem",
            displayName: "Test Item",
            id: 1,
            value: 5,
          },
        ],
        [
          ID_B,
          {
            name: "secondTestItem",
            displayName: "Second Test Item",
            id: 2,
            value: 5,
          },
        ],
      ]
    );

    let success = true;
    try {
      await bakery.deleteBiscuits(meta, ID_A);
    } catch (error) {
      // Expected.
      success = false;
    }
    assert.ok(!success, "Expected error to delete depended-upon Biscuit");

    assert.deepEqual(
      [...(await bakery.bakeActiveTray()).contents],
      [
        [
          ID_A,
          {
            name: "testItem",
            displayName: "Test Item",
            id: 1,
            value: 5,
          },
        ],
        [
          ID_B,
          {
            name: "secondTestItem",
            displayName: "Second Test Item",
            id: 2,
            value: 5,
          },
        ],
      ]
    );

    await bakery.deleteBiscuits(meta, ID_B);

    assert.deepEqual(
      [...(await bakery.bakeActiveTray()).contents],
      [
        [
          ID_A,
          {
            name: "testItem",
            displayName: "Test Item",
            id: 1,
            value: 5,
          },
        ],
      ]
    );
  });
});
