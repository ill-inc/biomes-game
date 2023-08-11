import type { ReadonlyChanges } from "@/shared/ecs/change";
import { Label, Position } from "@/shared/ecs/gen/components";
import { PositionSelector } from "@/shared/ecs/gen/selectors";
import type {
  EntityState,
  VersionedTable,
  WriteableTable,
} from "@/shared/ecs/table";
import { VersionedTableImpl, createTable } from "@/shared/ecs/table";
import type { EntityVersion } from "@/shared/ecs/version";
import { EntityVersionStamper } from "@/shared/ecs/version";
import type { BiomesId } from "@/shared/ids";
import { generateTestId } from "@/shared/test_helpers";
import assert from "assert";

const TEST_ID_A = generateTestId();
const TEST_ID_B = generateTestId();
const TEST_ID_C = generateTestId();

function testTable() {
  const table = createTable({
    ...PositionSelector.createIndexFor.all(),
  });

  table.apply([
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

  table.apply([
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

  return table;
}

describe("Create a table with some entities", () => {
  const table = testTable();

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
    assert.deepEqual(table.get(TEST_ID_B)?.position?.v, [4, 5, 6]);
  });
});

describe("Delete entities from table", () => {
  const table = testTable();

  table.apply([
    {
      kind: "delete",
      tick: 3,
      id: TEST_ID_A,
    },
    {
      kind: "delete",
      tick: 1,
      id: TEST_ID_B,
    },
  ]);

  it("should have the right tick", () => {
    assert.equal(table.tick, 3);
  });
  it("should return 1", () => {
    assert.equal(table.recordSize, 1);
  });
  it("should return 'Joey'", () => {
    assert.equal(table.get(TEST_ID_C)?.label?.text, "Joey");
  });
});

describe("Load a table only moves ticks forwards", () => {
  const table = new VersionedTableImpl(new EntityVersionStamper());

  table.load(TEST_ID_A, [
    2,
    {
      id: TEST_ID_A,
      label: { text: "2" },
    },
  ]);
  table.load(TEST_ID_A, [
    5,
    {
      id: TEST_ID_A,
      label: { text: "5" },
    },
  ]);
  table.load(TEST_ID_A, [
    3,
    {
      id: TEST_ID_A,
      label: { text: "3" },
    },
  ]);
  table.load(TEST_ID_A, [
    1,
    {
      id: TEST_ID_A,
      label: { text: "fin" },
    },
  ]);

  it("has the right tick", () => {
    assert.equal(table.tick, 5);
  });
  it("has the right entity version", () => {
    assert.equal(table.getWithVersion(TEST_ID_A)[0].tick, 5);
  });
  it("has the right label", () => {
    assert.equal(table.get(TEST_ID_A)?.label?.text, "5");
  });
});

describe("Table updates indexes", () => {
  it("handles lookups", () => {
    const table = testTable();

    assert.deepEqual(
      [...table.scanIds(PositionSelector.query.all())],
      [TEST_ID_A, TEST_ID_B, TEST_ID_C]
    );
  });

  it("handles deletes", () => {
    const table = testTable();

    table.apply([
      {
        kind: "delete",
        tick: table.tick + 1,
        id: TEST_ID_A,
      },
      {
        kind: "update",
        tick: table.tick + 1,
        entity: { id: TEST_ID_C, position: null },
      },
    ]);

    assert.deepEqual(
      [...table.scanIds(PositionSelector.query.all())],
      [TEST_ID_B]
    );
  });
});

const TEST_A = generateTestId();
const TEST_B = generateTestId();
const TEST_C = generateTestId();

function idsOfDelta(
  upstream: Iterable<[BiomesId, Readonly<EntityState<EntityVersion>>]>
): BiomesId[] {
  const ids: BiomesId[] = [];
  for (const [id] of upstream) {
    ids.push(id);
  }
  return ids;
}

describe("Test EntityStore", () => {
  it("Can be loaded", () => {
    const store = new VersionedTableImpl(new EntityVersionStamper(), true);

    store.load(TEST_A, [
      1,
      {
        id: TEST_A,
      },
    ]);

    assert.equal(store.recordSize, 1);
    assert.equal(store.get(TEST_A)?.id, TEST_A);
    assert.ok(store.has(TEST_A));

    assert.deepEqual(
      [...store.contents()].map((e) => e.id),
      [TEST_A]
    );

    store.load(TEST_A, [2, undefined]);

    assert.equal(store.recordSize, 1);
    assert.equal(store.get(TEST_A), undefined);
    assert.ok(!store.has(TEST_A));
    assert.deepEqual(
      [...store.contents()].map((e) => e.id),
      []
    );
  });

  it("Load then apply", () => {
    const store = new VersionedTableImpl(new EntityVersionStamper(), true);

    store.load(TEST_A, [
      1,
      {
        id: TEST_A,
        label: {
          text: "foo",
        },
      },
    ]);

    assert.equal(store.get(TEST_A)?.label?.text, "foo");

    store.apply([
      {
        kind: "update",
        tick: 1,
        entity: {
          id: TEST_A,
          label: {
            text: "bar",
          },
        },
      },
    ]);

    assert.equal(store.get(TEST_A)?.label?.text, "bar");
  });

  it("Apply then load", () => {
    const store = new VersionedTableImpl(new EntityVersionStamper(), true);

    store.apply([
      {
        kind: "update",
        tick: 1,
        entity: {
          id: TEST_A,
          label: {
            text: "foo",
          },
        },
      },
    ]);

    assert.equal(store.get(TEST_A)?.label?.text, "foo");

    store.load(TEST_A, [
      2,
      {
        id: TEST_A,
        label: {
          text: "bar",
        },
      },
    ]);

    assert.equal(store.get(TEST_A)?.label?.text, "bar");
  });

  it("Apply then load backwards", () => {
    const store = new VersionedTableImpl(new EntityVersionStamper(), true);

    store.apply([
      {
        kind: "update",
        tick: 100,
        entity: {
          id: TEST_A,
          label: {
            text: "foo",
          },
        },
      },
    ]);

    assert.equal(store.getWithVersion(TEST_A)[0].tick, 100);

    store.load(TEST_A, [
      20,
      {
        id: TEST_A,
        label: {
          text: "bar",
        },
      },
    ]);

    assert.equal(store.getWithVersion(TEST_A)[0].tick, 100);
  });

  it("Stores versioned data", () => {
    const store = new VersionedTableImpl(new EntityVersionStamper(), true);

    store.apply([
      {
        kind: "create",
        tick: 1,
        entity: {
          id: TEST_A,
          label: {
            text: "A",
          },
        },
      },
    ]);
    store.apply([
      {
        kind: "create",
        tick: 2,
        entity: {
          id: TEST_B,
          label: {
            text: "B",
          },
        },
      },
    ]);

    assert.equal(store.recordSize, 2);
    assert.equal(store.get(TEST_A)?.label?.text, "A");
    assert.equal(store.get(TEST_B)?.label?.text, "B");
    assert.equal(store.getWithVersion(TEST_A)[0].tick, 1);
    assert.equal(store.getWithVersion(TEST_B)[0].tick, 2);
    assert.equal(store.getWithVersion(TEST_C)[0].tick, 0);

    store.apply([
      {
        kind: "delete",
        tick: 3,
        id: TEST_A,
      },
    ]);

    assert.equal(store.recordSize, 2);
    assert.equal(store.get(TEST_A), undefined);
    assert.equal(store.get(TEST_B)?.label?.text, "B");
  });

  it("Delta since", () => {
    const store = new VersionedTableImpl(new EntityVersionStamper(), true);

    store.apply([
      {
        kind: "create",
        tick: 1,
        entity: {
          id: TEST_A,
          label: {
            text: "A",
          },
        },
      },
    ]);
    store.apply([
      {
        kind: "create",
        tick: 2,
        entity: {
          id: TEST_B,
          label: {
            text: "B",
          },
        },
      },
    ]);

    const mark = store.mark();

    assert.equal(store.recordSize, 2);
    assert.deepEqual(idsOfDelta(store.deltaSince()), [TEST_A, TEST_B]);
    assert.deepEqual(idsOfDelta(store.deltaSince()), [TEST_A, TEST_B]);
    assert.deepEqual(idsOfDelta(store.deltaSince(mark)), [TEST_B]);

    store.apply([
      {
        kind: "delete",
        tick: 3,
        id: TEST_A,
      },
    ]);
    const mark2 = store.mark();
    store.apply([
      {
        kind: "delete",
        tick: 4,
        id: TEST_C,
      },
    ]);
    const mark3 = store.mark();

    assert.equal(store.recordSize, 2);
    assert.deepEqual(idsOfDelta(store.deltaSince()), [TEST_B]);
    assert.deepEqual(idsOfDelta(store.deltaSince()), [TEST_B]);
    assert.deepEqual(idsOfDelta(store.deltaSince(mark)), [TEST_A, TEST_B]);
    assert.deepEqual(idsOfDelta(store.deltaSince(mark2)), [TEST_A]);
    assert.deepEqual(idsOfDelta(store.deltaSince(mark3)), []);
  });
});

export function attachTableEventRecorder<TVersion>(
  table: VersionedTable<TVersion>
) {
  const preApplyCalls: BiomesId[][] = [];
  const postApplyCalls: ReadonlyChanges[] = [];
  const clearCalls: boolean[] = [];
  table.events.on("preApply", (ids) => preApplyCalls.push(ids));
  table.events.on("postApply", (changes) => postApplyCalls.push(changes));
  table.events.on("clear", () => clearCalls.push(true));
  return { preApplyCalls, postApplyCalls, clearCalls };
}

export function tableEventsTest<TVersion>(
  table: VersionedTable<TVersion>,
  writeableTable: WriteableTable
) {
  const { preApplyCalls, postApplyCalls, clearCalls } =
    attachTableEventRecorder(table);

  it("generates event for load() creations", () => {
    writeableTable.load(TEST_ID_A, [
      2,
      {
        id: TEST_ID_A,
        label: { text: "2" },
      },
    ]);

    assert.deepEqual(preApplyCalls[0], [TEST_ID_A]);
    assert.deepEqual(postApplyCalls[0], [
      {
        kind: "create",
        tick: 2,
        entity: {
          id: TEST_ID_A,
          label: { text: "2" },
        },
      },
    ]);
  });

  it("generates event for load() updates", () => {
    writeableTable.load(TEST_ID_A, [
      3,
      {
        id: TEST_ID_A,
        label: { text: "2" },
        remote_connection: {},
      },
    ]);

    assert.deepEqual(preApplyCalls[1], [TEST_ID_A]);
    assert.deepEqual(postApplyCalls[1], [
      {
        kind: "create",
        tick: 3,
        entity: {
          id: TEST_ID_A,
          label: { text: "2" },
          remote_connection: {},
        },
      },
    ]);
  });

  it("generates event for load() deletions", () => {
    writeableTable.load(TEST_ID_A, [4, undefined]);

    assert.deepEqual(preApplyCalls[2], [TEST_ID_A]);
    assert.deepEqual(postApplyCalls[2], [
      {
        kind: "delete",
        tick: 4,
        id: TEST_ID_A,
      },
    ]);
  });

  it("generates event for apply() creations", () => {
    writeableTable.apply([
      {
        kind: "create",
        tick: 5,
        entity: {
          id: TEST_ID_B,
          label: { text: "5" },
        },
      },
    ]);

    assert.deepEqual(preApplyCalls[3], [TEST_ID_B]);
    assert.deepEqual(postApplyCalls[3], [
      {
        kind: "create",
        tick: 5,
        entity: {
          id: TEST_ID_B,
          label: { text: "5" },
        },
      },
    ]);
  });

  it("generates event for apply() updates", () => {
    writeableTable.apply([
      {
        kind: "update",
        tick: 6,
        entity: {
          id: TEST_ID_B,
          label: { text: "6" },
        },
      },
    ]);

    assert.deepEqual(preApplyCalls[4], [TEST_ID_B]);
    assert.deepEqual(postApplyCalls[4], [
      {
        kind: "update",
        tick: 6,
        entity: {
          id: TEST_ID_B,
          label: { text: "6" },
        },
      },
    ]);
  });

  it("generates event for apply() deletions", () => {
    writeableTable.apply([
      {
        kind: "delete",
        tick: 7,
        id: TEST_ID_B,
      },
    ]);

    assert.deepEqual(preApplyCalls[5], [TEST_ID_B]);
    assert.deepEqual(postApplyCalls[5], [
      {
        kind: "delete",
        tick: 7,
        id: TEST_ID_B,
      },
    ]);
  });

  it("generates event for clear()", () => {
    assert.equal(clearCalls.length, 0);
    writeableTable.clear();
    assert.equal(clearCalls.length, 1);
  });
}

describe("VersionedTableImpl events fire properly", () => {
  const table = new VersionedTableImpl(new EntityVersionStamper());
  tableEventsTest(table, table);
});

describe("MetaIndexTableImpl events fire properly", () => {
  const table = createTable({});
  tableEventsTest(table, table);
});
