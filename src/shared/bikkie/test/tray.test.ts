import { bakeAttributes, makeAttributeType } from "@/shared/bikkie/attributes";
import type { SchemaPathsOf } from "@/shared/bikkie/core";
import { Bikkie, normalizeToSchema } from "@/shared/bikkie/core";
import { bikkieNumber, bikkieString } from "@/shared/bikkie/schema/types";
import type { BiscuitDefinition } from "@/shared/bikkie/tray";
import {
  BiscuitTray,
  createTrayMetadata,
  zEncodedBiscuitTray,
} from "@/shared/bikkie/tray";
import type { BiomesId } from "@/shared/ids";
import { definedOrThrow } from "@/shared/util/helpers";
import { makeZodType } from "@/shared/zrpc/custom_types";
import { zrpcWebDeserialize, zrpcWebSerialize } from "@/shared/zrpc/serde";
import assert from "assert";

export const migratedString = makeAttributeType({
  zod: makeZodType((val) => String(val)),
  defaultValue: "",
});

const attribs = bakeAttributes({
  1: {
    name: "displayName",
    type: () => bikkieString,
  },
  2: {
    name: "value",
    type: () => bikkieNumber,
  },
  3: {
    name: "extraDisplayName",
    type: () => bikkieString,
  },
  4: {
    name: "onceSomethingElseNowAString",
    type: () => migratedString,
  },
} as const);

const LEGACY_ATTRIBUTE_ID = attribs.all.reduce(
  (acc, attr) => Math.max(attr.id, acc) + 1,
  0
);

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

// Check if a definition within this tray conforms to the given schema.
function conformsWith(
  tray: BiscuitTray,
  id: BiomesId,
  schema: SchemaPathsOf<typeof bikkie>
): boolean {
  const definition = tray.get(id);
  if (!definition) {
    return false;
  }
  for (const attributeName of definedOrThrow(normalizeToSchema(bikkie, schema))
    .attributes) {
    const attribute = attribs.byName.get(attributeName);
    if (!attribute) {
      return false;
    }
    const found = definition.attributes[attribute.id];
    if (!found) {
      return false;
    }
    if (found.kind === "unassign") {
      return false;
    }
    // Schema validation ensures if the attribute is present it
    // must be suitable, so continue.
  }
  return true;
}

describe("Tray tests", () => {
  const metadata = createTrayMetadata("test", ID_A);

  it("Supports creating a tray of biscuits", () => {
    const tray = BiscuitTray.of(attribs, ID_A, metadata, {
      id: ID_A,
      attributes: {
        [attribs.displayName.id]: {
          kind: "constant",
          value: "Test Item",
        },
      },
    });

    const expectedDefinition: BiscuitDefinition = {
      id: ID_A,
      attributes: {
        "1": {
          kind: "constant",
          value: "Test Item",
        },
      },
    };

    assert.deepEqual(tray.get(ID_A), expectedDefinition);
    assert.deepEqual(Array.from(tray.prepare().values()), [expectedDefinition]);

    assert.ok(conformsWith(tray, ID_A, "/items"));
    assert.ok(!conformsWith(tray, ID_A, "/items/withValue"));
  });

  it("Supports tray inheritance", () => {
    const parent = BiscuitTray.of(attribs, ID_A, metadata, {
      id: ID_A,
      attributes: {
        [attribs.value.id]: {
          kind: "constant",
          value: 5,
        },
      },
    });

    const tray = parent.extendAs(ID_B, metadata, {
      id: ID_A,
      attributes: {
        [attribs.displayName.id]: {
          kind: "constant",
          value: "Test Item",
        },
      },
    });

    assert.deepEqual(tray.get(ID_A), {
      id: ID_A,
      attributes: {
        "1": {
          kind: "constant",
          value: "Test Item",
        },
        "2": {
          kind: "constant",
          value: 5,
        },
      },
    });

    // Prepare should incorporate the parent-tray.
    assert.deepEqual(Array.from(tray.prepare().values()), [
      {
        id: ID_A,
        attributes: {
          "1": {
            kind: "constant",
            value: "Test Item",
          },
          "2": {
            kind: "constant",
            value: 5,
          },
        },
      },
    ]);

    assert.ok(conformsWith(tray, ID_A, "/items"));
    assert.ok(!conformsWith(tray, ID_A, "/items/withValue"));
  });

  it("Can upgrade attribute data on schema changes", async () => {
    const tray = await BiscuitTray.deserialize(
      attribs,
      () => {
        throw new Error("No parent trays");
      },
      {
        id: ID_A,
        createdAt: 1234,
        name: "Test Tray",
        definitions: [
          {
            id: ID_A,
            attributes: {
              [attribs.onceSomethingElseNowAString.id]: {
                kind: "constant",
                value: 1235n,
              },
            },
          },
        ],
      }
    );

    assert.deepEqual(Array.from(tray.prepare().values()), [
      {
        id: ID_A,
        attributes: {
          [attribs.onceSomethingElseNowAString.id]: {
            kind: "constant",
            value: "1235", // It has been upgraded to the new schema.
          },
        },
      },
    ]);
  });

  it("Can deserialize an unknown attribute", async () => {
    assert.ok(!attribs.byId.get(LEGACY_ATTRIBUTE_ID));

    const tray = await BiscuitTray.deserialize(
      attribs,
      () => {
        throw new Error("No parent trays");
      },
      {
        id: ID_A,
        createdAt: 1234,
        name: "Test Tray",
        definitions: [
          {
            id: ID_A,
            attributes: {
              [attribs.displayName.id]: {
                kind: "constant",
                value: "Test Item",
              },
              [LEGACY_ATTRIBUTE_ID]: {
                kind: "constant",
                value: "Legacy Value",
              },
            },
          },
        ],
      }
    );

    assert.deepEqual(Array.from(tray.prepare().values()), [
      {
        id: ID_A,
        attributes: {
          [attribs.displayName.id]: {
            kind: "constant",
            value: "Test Item",
          },
          [LEGACY_ATTRIBUTE_ID]: {
            kind: "constant",
            value: "Legacy Value",
          },
        },
      },
    ]);

    const compacted = tray.compactAs(ID_B, metadata);

    assert.deepEqual(Array.from(compacted.prepare().values()), [
      {
        id: ID_A,
        attributes: {
          "1": {
            kind: "constant",
            value: "Test Item",
          },
        },
      },
    ]);
  });

  it("Supports tray compaction", () => {
    const one = BiscuitTray.of(attribs, ID_A, metadata, {
      id: ID_A,
      attributes: {
        [attribs.value.id]: { kind: "constant", value: 5 },
        [attribs.displayName.id]: {
          kind: "constant",
          value: "Test Item",
        },
      },
    });

    const two = one.extendAs(ID_B, metadata, {
      id: ID_A,
      attributes: {
        [attribs.value.id]: { kind: "constant", value: 6 },
        [attribs.extraDisplayName.id]: {
          kind: "constant",
          value: "Bonus Test Item",
        },
      },
    });

    const expected = [
      {
        attributes: {
          "1": {
            kind: "constant",
            value: "Test Item",
          },
          "2": {
            kind: "constant",
            value: 6,
          },
          "3": {
            kind: "constant",
            value: "Bonus Test Item",
          },
        },
        id: 1,
      },
    ];

    assert.deepEqual(Array.from(two.prepare().values()), expected);

    const compacted = two.compactAs(ID_C, metadata);

    assert.deepEqual(Array.from(two.prepare().values()), expected);
    assert.deepEqual(Array.from(compacted.prepare().values()), expected);
  });

  it("Supports extending Biscuits", () => {
    const tray = BiscuitTray.of(
      attribs,
      ID_A,
      metadata,
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
          [attribs.value.id]: {
            kind: "constant",
            value: 6,
          },
        },
      }
    );

    assert.deepEqual(tray.get(ID_B), {
      id: 2,
      extendedFrom: 1,
      attributes: {
        "1": {
          from: 1,
          kind: "inherit",
          value: {
            kind: "constant",
            value: "Test Item",
          },
        },
        "2": {
          kind: "constant",
          value: 6,
        },
      },
    });
    assert.deepEqual(Array.from(tray.prepare().values()), [
      {
        id: 1,
        attributes: {
          "1": {
            kind: "constant",
            value: "Test Item",
          },
          "2": {
            kind: "constant",
            value: 5,
          },
        },
      },
      {
        id: 2,
        extendedFrom: 1,
        attributes: {
          "1": {
            kind: "constant",
            value: "Test Item",
          },
          "2": {
            kind: "constant",
            value: 6,
          },
        },
      },
    ]);

    assert.ok(conformsWith(tray, ID_A, "/items"));
  });

  it("Supports extending across trays Biscuits", () => {
    const tray = BiscuitTray.of(attribs, ID_A, metadata, {
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
    });

    const child = tray.extendAs(ID_B, metadata, {
      id: ID_B,
      extendedFrom: ID_A,
      attributes: {
        [attribs.value.id]: {
          kind: "constant",
          value: 6,
        },
      },
    });

    assert.deepEqual(Array.from(tray.prepare().values()), [
      {
        id: 1,
        attributes: {
          "1": {
            kind: "constant",
            value: "Test Item",
          },
          "2": {
            kind: "constant",
            value: 5,
          },
        },
      },
    ]);

    assert.deepEqual(Array.from(child.prepare().values()), [
      {
        id: 1,
        attributes: {
          "1": {
            kind: "constant",
            value: "Test Item",
          },
          "2": {
            kind: "constant",
            value: 5,
          },
        },
      },
      {
        id: 2,
        extendedFrom: 1,
        attributes: {
          "1": {
            kind: "constant",
            value: "Test Item",
          },
          "2": {
            kind: "constant",
            value: 6,
          },
        },
      },
    ]);

    assert.ok(conformsWith(tray, ID_A, "/items"));
  });

  it("Roundtrips", async () => {
    const tray = BiscuitTray.of(
      attribs,
      ID_A,
      metadata,
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
          [attribs.value.id]: {
            kind: "constant",
            value: 6,
          },
        },
      }
    );
    const expected = Array.from(tray.prepare().values());
    const serialized = zrpcWebSerialize(tray);
    const deserialized = await BiscuitTray.deserialize(
      attribs,
      () => {
        throw new Error("Not supported");
      },
      zrpcWebDeserialize(serialized, zEncodedBiscuitTray)
    );

    assert.deepEqual(Array.from(deserialized.prepare().values()), expected);
  });

  it("Supports unassignment leading to inheritance", () => {
    const tray = BiscuitTray.of(
      attribs,
      ID_A,
      metadata,
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
          [attribs.value.id]: {
            kind: "constant",
            value: 6,
          },
        },
      }
    );

    assert.deepEqual(Array.from(tray.prepare().values()), [
      {
        id: 1,
        attributes: {
          "1": {
            kind: "constant",
            value: "Test Item",
          },
          "2": {
            kind: "constant",
            value: 5,
          },
        },
      },
      {
        id: 2,
        extendedFrom: 1,
        attributes: {
          "1": {
            kind: "constant",
            value: "Test Item",
          },
          "2": {
            kind: "constant",
            value: 6,
          },
        },
      },
    ]);

    const child = tray.extendAs(ID_B, metadata, {
      id: ID_B,
      attributes: {
        [attribs.value.id]: null,
      },
    });

    assert.deepEqual(Array.from(child.prepare().values()), [
      {
        id: 1,
        attributes: {
          "1": {
            kind: "constant",
            value: "Test Item",
          },
          "2": {
            kind: "constant",
            value: 5,
          },
        },
      },
      {
        id: 2,
        extendedFrom: 1,
        attributes: {
          "1": {
            kind: "constant",
            value: "Test Item",
          },
          "2": {
            kind: "constant",
            value: 5,
          },
        },
      },
    ]);
  });

  it("Supports rebasing", () => {
    const tray = BiscuitTray.of(attribs, ID_A, metadata, {
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
    });

    const child = tray.extendAs(ID_B, metadata, {
      id: ID_B,
      extendedFrom: ID_A,
      attributes: {
        [attribs.value.id]: {
          kind: "constant",
          value: 6,
        },
      },
    });

    const newParent = BiscuitTray.of(attribs, ID_A, metadata, {
      id: ID_A,
      attributes: {
        [attribs.value.id]: {
          kind: "constant",
          value: 2,
        },
        [attribs.displayName.id]: {
          kind: "constant",
          value: "Rebased Test Item",
        },
      },
    });

    assert.deepEqual(
      Array.from(child.rebaseAs(newParent, ID_B, metadata).prepare().values()),
      [
        {
          id: 1,
          attributes: {
            "1": {
              kind: "constant",
              value: "Rebased Test Item",
            },
            "2": {
              kind: "constant",
              value: 2,
            },
          },
        },
        {
          id: 2,
          extendedFrom: 1,
          attributes: {
            "1": {
              kind: "constant",
              value: "Rebased Test Item",
            },
            "2": {
              kind: "constant",
              value: 6,
            },
          },
        },
      ]
    );

    assert.ok(conformsWith(tray, ID_A, "/items"));
  });
});
