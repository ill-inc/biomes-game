import { checkIff, EagerChangeBuffer } from "@/server/shared/ecs/transactions";
import { allComponentsAtTick, EntityVersion } from "@/shared/ecs/version";
import type { BiomesId } from "@/shared/ids";
import assert from "assert";

const ID_A = 1 as BiomesId;

describe("EagerChangeBuffer tests", () => {
  let ecb!: EagerChangeBuffer;
  beforeEach(() => {
    ecb = new EagerChangeBuffer();
  });

  it("ignores past changes", () => {
    ecb.changesSince(ID_A, 10, new EntityVersion(9), {
      id: ID_A,
      label: { text: "Hi" },
    });
    assert.deepEqual(ecb.pop(), []);
  });

  it("handles a delete", () => {
    ecb.changesSince(ID_A, 10, new EntityVersion(11), undefined);
    assert.deepEqual(ecb.pop(), [
      {
        kind: "delete",
        tick: 11,
        id: ID_A,
      },
    ]);
  });

  it("gives a create when lacking full information", () => {
    ecb.changesSince(ID_A, 10, new EntityVersion(11), {
      id: ID_A,
      label: { text: "Hi" },
    });
    assert.deepEqual(ecb.pop(), [
      {
        kind: "create",
        tick: 11,
        entity: { id: ID_A, label: { text: "Hi" } },
      },
    ]);
  });

  it("correctly gives a versioned delta", () => {
    ecb.changesSince(
      ID_A,
      10,
      new EntityVersion(11, {
        ...allComponentsAtTick(10),
        label: 11,
      }),
      {
        id: ID_A,
        label: { text: "Hi" },
        position: { v: [1, 2, 3] },
      }
    );
    assert.deepEqual(ecb.pop(), [
      {
        kind: "update",
        tick: 11,
        entity: { id: ID_A, label: { text: "Hi" } },
      },
    ]);
  });

  it("provides component deletion", () => {
    ecb.changesSince(
      ID_A,
      10,
      new EntityVersion(11, {
        ...allComponentsAtTick(10),
        label: 11,
      }),
      {
        id: ID_A,
      }
    );
    assert.deepEqual(ecb.pop(), [
      {
        kind: "update",
        tick: 11,
        entity: { id: ID_A, label: null },
      },
    ]);
  });
});

describe("checkIff tests", () => {
  const ENTITY = { id: ID_A };
  it("correctly checks ticks", () => {
    assert.deepEqual(checkIff([ID_A, 5], new EntityVersion(4), ENTITY), true);
    assert.deepEqual(checkIff([ID_A, 4], new EntityVersion(4), ENTITY), true);
    assert.deepEqual(checkIff([ID_A, 3], new EntityVersion(4), ENTITY), false);
  });

  it("correctly checks existence", () => {
    assert.deepEqual(checkIff([ID_A], new EntityVersion(4), ENTITY), true);
    assert.deepEqual(checkIff([ID_A], new EntityVersion(4), undefined), false);
  });

  it("handles component wise", () => {
    assert.deepEqual(
      checkIff([ID_A, 3, 37], new EntityVersion(4), ENTITY),
      false
    );

    assert.deepEqual(
      checkIff(
        [ID_A, 3, 37],
        new EntityVersion(4, allComponentsAtTick(4)),
        ENTITY
      ),
      false
    );
    assert.deepEqual(
      checkIff(
        [ID_A, 3, 37],
        new EntityVersion(4, { ...allComponentsAtTick(4), label: 3 }),
        ENTITY
      ),
      true
    );
    assert.deepEqual(
      checkIff(
        [ID_A, 3, 37],
        new EntityVersion(4, { ...allComponentsAtTick(4), label: 2 }),
        ENTITY
      ),
      true
    );
  });

  it("rejects one component behind", () => {
    assert.deepEqual(
      checkIff(
        [ID_A, 3, 37, 54],
        new EntityVersion(4, { ...allComponentsAtTick(4), label: 2 }),
        ENTITY
      ),
      false
    );
  });
});
