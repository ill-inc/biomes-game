import type { Change } from "@/shared/ecs/change";
import { Iced, Label, Position } from "@/shared/ecs/gen/components";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { PositionSelector } from "@/shared/ecs/gen/selectors";
import type { EagerProposedChange, Layer } from "@/shared/ecs/layered_table";
import { LayeredTable } from "@/shared/ecs/layered_table";
import { MetaIndexTableImpl, VersionedTableImpl } from "@/shared/ecs/table";
import {
  attachTableEventRecorder,
  tableEventsTest,
} from "@/shared/ecs/test/table.test";
import { EntityVersionStamper } from "@/shared/ecs/version";
import { generateTestId } from "@/shared/test_helpers";
import assert from "assert";

const TEST_ID_A = generateTestId();
const TEST_ID_B = generateTestId();
const TEST_ID_C = generateTestId();

function testTable() {
  const baseTable = new VersionedTableImpl(new EntityVersionStamper());
  const layeredTable = new LayeredTable(baseTable);
  const metaIndexTable = new MetaIndexTableImpl(layeredTable, {
    ...PositionSelector.createIndexFor.spatial(),
  });

  baseTable.apply([
    {
      kind: "create",
      tick: 1,
      entity: {
        id: TEST_ID_A,
        label: Label.create({ text: "Taylor" }),
        position: Position.create({
          v: [1, 2, 3],
        }),
      },
    },
    {
      kind: "create",
      tick: 1,
      entity: {
        id: TEST_ID_B,
        label: Label.create({ text: "Thomas" }),
        position: Position.create({
          v: [4, 5, 6],
        }),
      },
    },
  ]);

  baseTable.apply([
    {
      kind: "create",
      tick: 2,
      entity: {
        id: TEST_ID_C,
        label: Label.create({ text: "Joey" }),
        position: Position.create({
          v: [7, 8, 9],
        }),
      },
    },
  ]);

  return { baseTable: baseTable, layers: layeredTable, table: metaIndexTable };
}

describe("Layered table pass through to delegate table", () => {
  const { table } = testTable();

  it("should return 3", () => {
    assert.equal(table.recordSize, 3);
  });
  it("should have the right tick", () => {
    assert.equal(table.tick, 2);
  });
  it("should return 'Taylor'", () => {
    assert.equal(table.get(TEST_ID_A)?.label?.text, "Taylor");
  });
  it("should return '[4, 5, 6]'", () => {
    assert.deepStrictEqual(table.get(TEST_ID_B)?.position?.v, [4, 5, 6]);
  });
});

describe("Layered table eager updates", () => {
  const { layers, table } = testTable();
  const { preApplyCalls, postApplyCalls } = attachTableEventRecorder(table);

  let firstLayer!: Layer;
  it("simple eager apply", () => {
    firstLayer = layers.eagerApply(
      {
        kind: "update",
        entity: {
          id: TEST_ID_A,
          label: Label.create({ text: "Gordy" }),
        },
      },
      { expires: { kind: "at", ms: 10 }, reconcile: () => "ignore" }
    );
    assert.equal(table.get(TEST_ID_A)?.label?.text, "Gordy");
    assert.deepStrictEqual(preApplyCalls[0], [TEST_ID_A]);
    assert.deepStrictEqual(postApplyCalls[0], [
      {
        kind: "update",
        tick: 2,
        entity: {
          id: TEST_ID_A,
          label: { text: "Gordy" },
        },
      },
    ]);
  });

  let secondLayer!: Layer;
  it("layered eager applies", () => {
    secondLayer = layers.eagerApply(
      {
        kind: "update",
        entity: {
          id: TEST_ID_A,
          remote_connection: {},
        },
      },
      { expires: { kind: "at", ms: 20 }, reconcile: () => "ignore" }
    );
    assert.equal(table.get(TEST_ID_A)?.label?.text, "Gordy");
    assert.deepStrictEqual(table.get(TEST_ID_A)?.remote_connection, {});
    assert.deepStrictEqual(preApplyCalls[1], [TEST_ID_A]);
    assert.deepStrictEqual(postApplyCalls[1], [
      {
        kind: "update",
        tick: 2,
        entity: {
          id: TEST_ID_A,
          remote_connection: {},
        },
      },
    ]);
  });

  it("expire single eager", () => {
    assert.equal(firstLayer.expired, false);
    assert.equal(secondLayer.expired, false);
    layers.compactLayers(15);
    assert.equal(firstLayer.expired, true);
    assert.equal(secondLayer.expired, false);
    assert.equal(table.get(TEST_ID_A)?.label?.text, "Taylor");
    assert.deepStrictEqual(table.get(TEST_ID_A)?.remote_connection, {});
    assert.deepStrictEqual(preApplyCalls[2], [TEST_ID_A]);
    assert.deepStrictEqual(postApplyCalls[2], [
      {
        kind: "update",
        tick: 2,
        entity: {
          id: TEST_ID_A,
          label: Label.create({ text: "Taylor" }),
        },
      },
    ]);
  });

  it("expire all", () => {
    assert.equal(secondLayer.expired, false);
    layers.compactLayers(25);
    assert.equal(secondLayer.expired, true);
    assert.equal(table.get(TEST_ID_A)?.label?.text, "Taylor");
    assert.deepStrictEqual(table.get(TEST_ID_A)?.remote_connection, undefined);
    assert.deepStrictEqual(preApplyCalls[3], [TEST_ID_A]);
    assert.deepStrictEqual(postApplyCalls[3], [
      {
        kind: "update",
        tick: 2,
        entity: {
          id: TEST_ID_A,
          remote_connection: null,
        },
      },
    ]);
  });
});

describe("Layered table eager deletes", () => {
  const { layers, table } = testTable();
  const { preApplyCalls, postApplyCalls } = attachTableEventRecorder(table);

  let firstLayer!: Layer;
  it("deletes fresh entry", () => {
    firstLayer = layers.eagerApply(
      {
        kind: "delete",
        id: TEST_ID_B,
      },
      { expires: { kind: "at", ms: 10 }, reconcile: () => "ignore" }
    );
    assert.equal(table.get(TEST_ID_B), undefined);
    assert.deepStrictEqual(preApplyCalls[0], [TEST_ID_B]);
    assert.deepStrictEqual(postApplyCalls[0], [
      { kind: "delete", id: TEST_ID_B, tick: 2 },
    ]);
  });

  let secondLayer!: Layer, thirdLayer!: Layer;
  it("deletes with existing eager update", () => {
    secondLayer = layers.eagerApply(
      {
        kind: "update",
        entity: {
          id: TEST_ID_A,
          label: Label.create({ text: "Gordy" }),
        },
      },
      { expires: { kind: "at", ms: 10 }, reconcile: () => "ignore" }
    );
    assert.equal(table.get(TEST_ID_A)?.label?.text, "Gordy");
    assert.deepStrictEqual(preApplyCalls[1], [TEST_ID_A]);
    assert.deepStrictEqual(postApplyCalls[1], [
      {
        kind: "update",
        entity: {
          id: TEST_ID_A,
          label: { text: "Gordy" },
        },
        tick: 2,
      },
    ]);

    thirdLayer = layers.eagerApply(
      {
        kind: "delete",
        id: TEST_ID_A,
      },
      { expires: { kind: "at", ms: 10 }, reconcile: () => "ignore" }
    );
    assert.equal(table.get(TEST_ID_A), undefined);
    assert.deepStrictEqual(preApplyCalls[2], [TEST_ID_A]);
    assert.deepStrictEqual(postApplyCalls[2], [
      {
        kind: "delete",
        id: TEST_ID_A,
        tick: 2,
      },
    ]);
  });

  it("expiry reverts deletions", () => {
    assert.equal(firstLayer.expired, false);
    assert.equal(secondLayer.expired, false);
    assert.equal(thirdLayer.expired, false);
    layers.compactLayers(15);
    assert.deepStrictEqual(preApplyCalls[3], [TEST_ID_B, TEST_ID_A]);
    assert.deepStrictEqual(postApplyCalls[3], [
      {
        kind: "create",
        tick: 2,
        entity: {
          id: TEST_ID_B,
          label: Label.create({ text: "Thomas" }),
          position: Position.create({
            v: [4, 5, 6],
          }),
        },
      },
      {
        kind: "create",
        tick: 2,
        entity: {
          id: TEST_ID_A,
          label: Label.create({ text: "Taylor" }),
          position: Position.create({
            v: [1, 2, 3],
          }),
        },
      },
    ]);
    assert.equal(firstLayer.expired, true);
    assert.equal(secondLayer.expired, true);
    assert.equal(thirdLayer.expired, true);
  });
});

describe("Layered table reconciles with delegate table changes", () => {
  const { baseTable, layers, table } = testTable();
  const { preApplyCalls, postApplyCalls } = attachTableEventRecorder(table);

  it("applies a change, and reconciles with base table changes", () => {
    const layer = layers.eagerApply(
      {
        kind: "update",
        entity: {
          id: TEST_ID_A,
          label: Label.create({ text: "Gordy" }),
        },
      },
      { expires: { kind: "at", ms: 10 }, reconcile: () => "expire" }
    );
    assert.equal(table.get(TEST_ID_A)?.label?.text, "Gordy");
    assert.deepStrictEqual(table.get(TEST_ID_A)?.remote_connection, undefined);
    assert.equal(layer.expired, false);
    assert.equal(layer.expiresAt, 10);

    baseTable.apply([
      {
        kind: "update",
        tick: 3,
        entity: {
          id: TEST_ID_A,
          remote_connection: {},
        },
      },
    ]);

    assert.equal(table.get(TEST_ID_A)?.label?.text, "Taylor");
    assert.deepStrictEqual(table.get(TEST_ID_A)?.remote_connection, {});
    assert.deepStrictEqual(preApplyCalls[1], [TEST_ID_A]);
    assert.deepStrictEqual(postApplyCalls[1], [
      {
        kind: "update",
        tick: 3,
        entity: {
          id: TEST_ID_A,
          label: { text: "Taylor" },
          remote_connection: {},
        },
      },
    ]);
    assert.equal(preApplyCalls.length, 2);
    assert.equal(layer.expired, true);
  });
});

describe("Layered table explicit expiry trigger", () => {
  const { layers, table } = testTable();
  const { preApplyCalls, postApplyCalls } = attachTableEventRecorder(table);

  const firstLayer = layers.eagerApply(
    {
      kind: "update",
      entity: {
        id: TEST_ID_A,
        label: Label.create({ text: "Gordy" }),
      },
    },
    { expires: { kind: "at", ms: 10 }, reconcile: () => "ignore" }
  );

  const secondLayer = layers.eagerApply(
    {
      kind: "update",
      entity: {
        id: TEST_ID_A,
        remote_connection: {},
      },
    },
    { expires: { kind: "at", ms: 20 }, reconcile: () => "ignore" }
  );

  it("explicit expiry works", () => {
    secondLayer.expire();
    assert.equal(firstLayer.expired, false);
    assert.equal(secondLayer.expired, true);
    assert.equal(table.get(TEST_ID_A)?.label?.text, "Gordy");
    assert.deepStrictEqual(table.get(TEST_ID_A)?.remote_connection, undefined);
    assert.deepStrictEqual(preApplyCalls[2], [TEST_ID_A]);
    assert.deepStrictEqual(postApplyCalls[2], [
      {
        kind: "update",
        tick: 2,
        entity: {
          id: TEST_ID_A,
          remote_connection: null,
        },
      },
    ]);

    firstLayer.expire();
    assert.equal(firstLayer.expired, true);
    assert.equal(table.get(TEST_ID_A)?.label?.text, "Taylor");
    assert.deepStrictEqual(table.get(TEST_ID_A)?.remote_connection, undefined);
    assert.deepStrictEqual(preApplyCalls[3], [TEST_ID_A]);
    assert.deepStrictEqual(postApplyCalls[3], [
      {
        kind: "update",
        tick: 2,
        entity: {
          id: TEST_ID_A,
          label: Label.create({ text: "Taylor" }),
        },
      },
    ]);
  });

  it("nothing to expire on timeout anymore", () => {
    layers.compactLayers(25);
    assert.equal(preApplyCalls.length, 4);
    assert.equal(postApplyCalls.length, 4);
    assert.equal(table.get(TEST_ID_A)?.label?.text, "Taylor");
    assert.deepStrictEqual(table.get(TEST_ID_A)?.remote_connection, undefined);
  });
});

describe("Layered table manual updates", () => {
  const { layers, table } = testTable();
  const { preApplyCalls, postApplyCalls } = attachTableEventRecorder(table);

  const firstLayer = layers.eagerApply(
    {
      kind: "update",
      entity: {
        id: TEST_ID_A,
        label: Label.create({ text: "Gordy" }),
      },
    },
    { expires: { kind: "at", ms: 10 }, reconcile: () => "ignore" }
  );

  const secondLayer = layers.eagerApply(
    {
      kind: "update",
      entity: {
        id: TEST_ID_A,
        remote_connection: {},
      },
    },
    { expires: { kind: "at", ms: 20 }, reconcile: () => "ignore" }
  );

  it("manual update change works", () => {
    firstLayer.update(
      {
        kind: "update",
        entity: {
          id: TEST_ID_A,
          label: Label.create({ text: "Jane" }),
        },
      },
      { expires: { kind: "at", ms: 30 } }
    );
    assert.equal(firstLayer.expired, false);
    assert.equal(secondLayer.expired, false);
    assert.equal(table.get(TEST_ID_A)?.label?.text, "Jane");
    assert.deepStrictEqual(table.get(TEST_ID_A)?.remote_connection, {});
    assert.deepStrictEqual(preApplyCalls[2], [TEST_ID_A]);
    assert.deepStrictEqual(postApplyCalls[2], [
      {
        kind: "update",
        tick: 2,
        entity: {
          id: TEST_ID_A,
          label: Label.create({ text: "Jane" }),
        },
      },
    ]);
  });

  it("expiresAt is updated", () => {
    assert.equal(firstLayer.expired, false);
    assert.equal(secondLayer.expired, false);
    layers.compactLayers(25);
    assert.equal(firstLayer.expired, false);
    assert.equal(secondLayer.expired, true);
    assert.equal(table.get(TEST_ID_A)?.label?.text, "Jane");
    assert.deepStrictEqual(table.get(TEST_ID_A)?.remote_connection, undefined);
    assert.deepStrictEqual(preApplyCalls[3], [TEST_ID_A]);
    assert.deepStrictEqual(postApplyCalls[3], [
      {
        kind: "update",
        tick: 2,
        entity: {
          id: TEST_ID_A,
          remote_connection: null,
        },
      },
    ]);
  });

  it("layer update can switch targeted entities", () => {
    firstLayer.update(
      {
        kind: "delete",
        id: TEST_ID_B,
      },
      { expires: { kind: "at", ms: 30 } }
    );
    assert.equal(firstLayer.expired, false);
    assert.equal(secondLayer.expired, true);
    assert.equal(table.get(TEST_ID_B), undefined);
    assert.equal(table.get(TEST_ID_A)?.label?.text, "Taylor");
    assert.deepStrictEqual(table.get(TEST_ID_A)?.remote_connection, undefined);
    assert.deepStrictEqual(preApplyCalls[4], [TEST_ID_A, TEST_ID_B]);
    assert.deepStrictEqual(postApplyCalls[4], [
      {
        kind: "update",
        tick: 2,
        entity: {
          id: TEST_ID_A,
          label: Label.create({ text: "Taylor" }),
        },
      },
      {
        kind: "delete",
        tick: 2,
        id: TEST_ID_B,
      },
    ]);
  });

  it("all will expire", () => {
    layers.compactLayers(35);
    assert.equal(firstLayer.expired, true);
    assert.equal(secondLayer.expired, true);
    assert.equal(table.get(TEST_ID_B)?.label?.text, "Thomas");
    assert.deepStrictEqual(preApplyCalls[5], [TEST_ID_B]);
    assert.deepStrictEqual(postApplyCalls[5], [
      {
        kind: "create",
        tick: 2,
        entity: {
          id: TEST_ID_B,
          label: Label.create({ text: "Thomas" }),
          position: Position.create({
            v: [4, 5, 6],
          }),
        },
      },
    ]);
  });
});

describe("LayeredTable reconcile expire works", () => {
  const { layers, table } = testTable();
  const { preApplyCalls, postApplyCalls } = attachTableEventRecorder(table);

  const firstLayerA = layers.eagerApply(
    {
      kind: "update",
      entity: {
        id: TEST_ID_A,
        label: Label.create({ text: "Gordy" }),
      },
    },
    { expires: { kind: "at", ms: 10 }, reconcile: () => "expire" }
  );

  const secondLayerA = layers.eagerApply(
    {
      kind: "update",
      entity: {
        id: TEST_ID_A,
        remote_connection: {},
      },
    },
    { expires: { kind: "at", ms: 20 }, reconcile: () => "expire" }
  );

  const thirdLayerA = layers.eagerApply(
    {
      kind: "update",
      entity: {
        id: TEST_ID_A,
        label: Label.create({ text: "Jane" }),
      },
    },
    { expires: { kind: "at", ms: 30 }, reconcile: () => "expire" }
  );

  const firstLayerB = layers.eagerApply(
    {
      kind: "update",
      entity: {
        id: TEST_ID_B,
        label: Label.create({ text: "Jude" }),
      },
    },
    { expires: { kind: "at", ms: 40 }, reconcile: () => "expire" }
  );
  const secondLayerB = layers.eagerApply(
    {
      kind: "update",
      entity: {
        id: TEST_ID_B,
        remote_connection: {},
      },
    },
    { expires: { kind: "at", ms: 50 }, reconcile: () => "expire" }
  );

  it("expires only above layers", () => {
    assert.equal(table.get(TEST_ID_A)?.label?.text, "Jane");
    assert.deepStrictEqual(table.get(TEST_ID_A)?.remote_connection, {});

    // If we expire the second layer explicitly, the third layer should be
    // reconciled but not the first.
    secondLayerA.expire();
    assert.equal(firstLayerA.expired, false);
    assert.equal(secondLayerA.expired, true);
    assert.equal(thirdLayerA.expired, true);
    assert.equal(firstLayerB.expired, false);
    assert.equal(secondLayerB.expired, false);
    assert.equal(table.get(TEST_ID_A)?.label?.text, "Gordy");
    assert.deepStrictEqual(table.get(TEST_ID_A)?.remote_connection, undefined);
    assert.deepStrictEqual(preApplyCalls[5], [TEST_ID_A]);
    assert.deepStrictEqual(postApplyCalls[5], [
      {
        kind: "update",
        tick: 2,
        entity: {
          id: TEST_ID_A,
          label: Label.create({ text: "Gordy" }),
          remote_connection: null,
        },
      },
    ]);
  });

  it("natural expiration triggers reconcile", () => {
    layers.compactLayers(45);
    assert.equal(firstLayerA.expired, true);
    assert.equal(secondLayerA.expired, true);
    assert.equal(thirdLayerA.expired, true);
    assert.equal(firstLayerB.expired, true);
    assert.equal(secondLayerB.expired, true);
    assert.equal(table.get(TEST_ID_A)?.label?.text, "Taylor");
    assert.deepStrictEqual(table.get(TEST_ID_A)?.remote_connection, undefined);
    assert.equal(table.get(TEST_ID_B)?.label?.text, "Thomas");
    assert.deepStrictEqual(table.get(TEST_ID_A)?.remote_connection, undefined);
    assert.deepStrictEqual(preApplyCalls[6], [TEST_ID_A, TEST_ID_B]);
    assert.deepStrictEqual(postApplyCalls[6], [
      {
        kind: "update",
        tick: 2,
        entity: {
          id: TEST_ID_A,
          label: Label.create({ text: "Taylor" }),
        },
      },
      {
        kind: "update",
        tick: 2,
        entity: {
          id: TEST_ID_B,
          label: Label.create({ text: "Thomas" }),
          remote_connection: null,
        },
      },
    ]);
  });
});

describe("LayeredTable reconcile function works", () => {
  const { layers, table, baseTable } = testTable();
  const { preApplyCalls, postApplyCalls } = attachTableEventRecorder(table);

  const firstLayerA = layers.eagerApply(
    {
      kind: "update",
      entity: {
        id: TEST_ID_A,
        label: Label.create({ text: "Gordy" }),
      },
    },
    {
      expires: { kind: "at", ms: 10 },
      reconcile: (newEntity) => {
        if (newEntity?.position && newEntity.position.v[0] > 50) {
          return {
            kind: "update",
            entity: {
              id: TEST_ID_A,
              label: Label.create({ text: "Far Person" }),
            },
          };
        } else {
          return {
            kind: "update",
            entity: {
              id: TEST_ID_A,
              label: Label.create({ text: "Near Person" }),
            },
          };
        }
      },
    }
  );

  const secondLayerA = layers.eagerApply(
    {
      kind: "update",
      entity: {
        id: TEST_ID_A,
        remote_connection: {},
      },
    },
    { expires: { kind: "at", ms: 20 }, reconcile: () => "expire" }
  );

  const thirdLayerA = layers.eagerApply(
    {
      kind: "update",
      entity: {
        id: TEST_ID_A,
        label: Label.create({ text: "Jane" }),
      },
    },
    {
      expires: { kind: "at", ms: 30 },
      reconcile: (_, change) => {
        if (
          (change.kind === "update" || change.kind === "create") &&
          change.entity.iced
        ) {
          return "expire";
        } else {
          return "ignore";
        }
      },
    }
  );

  it("all stack reconciles are called", () => {
    baseTable.apply([
      {
        kind: "update",
        tick: 5,
        entity: {
          id: TEST_ID_A,
          position: Position.create({
            v: [100, 200, 300],
          }),
        },
      },
    ]);

    assert.equal(firstLayerA.expired, false);
    assert.equal(secondLayerA.expired, true);
    assert.equal(thirdLayerA.expired, false);
    assert.equal(table.get(TEST_ID_A)?.label?.text, "Jane");
    assert.deepStrictEqual(table.get(TEST_ID_A)?.remote_connection, undefined);
    assert.deepStrictEqual(table.get(TEST_ID_A)?.position, {
      v: [100, 200, 300],
    });
    assert.deepStrictEqual(preApplyCalls[3], [TEST_ID_A]);
    assert.deepStrictEqual(postApplyCalls[3], [
      {
        kind: "update",
        tick: 5,
        entity: {
          id: TEST_ID_A,
          label: { text: "Jane" },
          remote_connection: null,
          position: { v: [100, 200, 300] },
        },
      },
    ]);

    baseTable.apply([
      {
        kind: "update",
        tick: 6,
        entity: {
          id: TEST_ID_A,
          iced: Iced.create({}),
        },
      },
    ]);
    assert.equal(firstLayerA.expired, false);
    assert.equal(secondLayerA.expired, true);
    assert.equal(thirdLayerA.expired, true);
    assert.equal(table.get(TEST_ID_A)?.label?.text, "Far Person");
    assert.deepStrictEqual(table.get(TEST_ID_A)?.remote_connection, undefined);
    assert.deepStrictEqual(table.get(TEST_ID_A)?.position, {
      v: [100, 200, 300],
    });
    assert.deepStrictEqual(preApplyCalls[4], [TEST_ID_A]);
    assert.deepStrictEqual(postApplyCalls[4], [
      {
        kind: "update",
        tick: 6,
        entity: {
          id: TEST_ID_A,
          label: { text: "Far Person" },
          iced: {},
        },
      },
    ]);

    baseTable.apply([
      {
        kind: "update",
        tick: 7,
        entity: {
          id: TEST_ID_A,
          position: Position.create({ v: [10, 20, 30] }),
        },
      },
    ]);
    assert.equal(firstLayerA.expired, false);
    assert.equal(table.get(TEST_ID_A)?.label?.text, "Near Person");
    assert.deepStrictEqual(table.get(TEST_ID_A)?.remote_connection, undefined);
    assert.deepStrictEqual(table.get(TEST_ID_A)?.position, {
      v: [10, 20, 30],
    });
    assert.deepStrictEqual(preApplyCalls[5], [TEST_ID_A]);
    assert.deepStrictEqual(postApplyCalls[5], [
      {
        kind: "update",
        tick: 7,
        entity: {
          id: TEST_ID_A,
          label: { text: "Near Person" },
          position: { v: [10, 20, 30] },
        },
      },
    ]);
  });
});

describe("LayeredTable reconcile gets correct parameters", () => {
  const { layers, table, baseTable } = testTable();

  const reconcileParams: {
    newBaseEntity: ReadonlyEntity | undefined;
    incoming: Change;
    existingLayerChange: EagerProposedChange;
  }[] = [];

  layers.eagerApply(
    {
      kind: "update",
      entity: {
        id: TEST_ID_A,
        label: Label.create({ text: "Gordy" }),
      },
    },
    {
      expires: { kind: "at", ms: 10 },
      reconcile: (newBaseEntity, incoming, existingLayerChange) => {
        reconcileParams.push({ newBaseEntity, incoming, existingLayerChange });
        return "ignore";
      },
    }
  );

  it("gets correct params", () => {
    baseTable.apply([
      {
        kind: "update",
        tick: 5,
        entity: {
          id: TEST_ID_A,
          position: Position.create({
            v: [100, 200, 300],
          }),
        },
      },
    ]);
    assert.equal(table.get(TEST_ID_A)?.label?.text, "Gordy");
    assert.deepStrictEqual(table.get(TEST_ID_A)?.position, {
      v: [100, 200, 300],
    });
    assert.equal(reconcileParams.length, 1);
    assert.deepStrictEqual(reconcileParams[0], {
      newBaseEntity: {
        id: TEST_ID_A,
        label: Label.create({ text: "Taylor" }),
        position: Position.create({
          v: [100, 200, 300],
        }),
      },
      incoming: {
        kind: "update",
        tick: 5,
        entity: {
          id: TEST_ID_A,
          position: Position.create({
            v: [100, 200, 300],
          }),
        },
      },
      existingLayerChange: {
        kind: "update",
        entity: {
          id: TEST_ID_A,
          label: Label.create({ text: "Gordy" }),
        },
      },
    });
  });
});

describe("LayeredTable events fire properly", () => {
  const { baseTable, table } = testTable();
  tableEventsTest(table, baseTable);
});

describe("LayeredTable eager updates affect metaindex", () => {
  const { layers, table } = testTable();

  it("entities in correct position before eager update", () => {
    const entitiesA = Array.from(
      table.scan(
        PositionSelector.query.spatial.inSphere({
          center: [7, 8, 9],
          radius: 1,
        })
      )
    );
    assert.deepStrictEqual(
      entitiesA.map((e) => e.id),
      [TEST_ID_C]
    );

    const entitiesB = Array.from(
      table.scan(
        PositionSelector.query.spatial.inSphere({
          center: [70, 80, 90],
          radius: 1,
        })
      )
    );
    assert.deepStrictEqual(entitiesB, []);
  });

  it("entities in correct position after eager update", () => {
    layers.eagerApply(
      {
        kind: "update",
        entity: {
          id: TEST_ID_C,
          position: Position.create({
            v: [70, 80, 90],
          }),
        },
      },
      { expires: { kind: "at", ms: 10 }, reconcile: () => "ignore" }
    );

    const entitiesA = Array.from(
      table.scan(
        PositionSelector.query.spatial.inSphere({
          center: [7, 8, 9],
          radius: 1,
        })
      )
    );
    assert.deepStrictEqual(entitiesA, []);

    const entitiesB = Array.from(
      table.scan(
        PositionSelector.query.spatial.inSphere({
          center: [70, 80, 90],
          radius: 1,
        })
      )
    );
    assert.deepStrictEqual(
      entitiesB.map((e) => e.id),
      [TEST_ID_C]
    );
  });
});
