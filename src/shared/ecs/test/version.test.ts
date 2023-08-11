import { allComponentsAtTick, EntityVersion } from "@/shared/ecs/version";
import type { BiomesId } from "@/shared/ids";
import assert from "assert";

const ID_A = 1 as BiomesId;

describe("Test versions", () => {
  it("handles delete on tick", () => {
    const version = new EntityVersion(10);
    version.updateWith({ kind: "delete", tick: 20, id: ID_A });
    assert.deepEqual(version.tick, 20);
    assert.deepEqual(version.tickByComponent, undefined);
  });

  it("handles delete on tick and components", () => {
    const version = new EntityVersion(10, allComponentsAtTick(11));
    version.updateWith({ kind: "delete", tick: 20, id: ID_A });
    assert.deepEqual(version.tick, 20);
    assert.deepEqual(version.tickByComponent, undefined);
  });

  it("handles create on tick", () => {
    const version = new EntityVersion(10);
    version.updateWith({ kind: "create", tick: 20, entity: { id: ID_A } });
    assert.deepEqual(version.tick, 20);
    assert.deepEqual(version.tickByComponent, undefined);
  });

  it("handles create on tick and components", () => {
    const version = new EntityVersion(10, allComponentsAtTick(11));
    version.updateWith({ kind: "create", tick: 20, entity: { id: ID_A } });
    assert.deepEqual(version.tick, 20);
    assert.deepEqual(version.tickByComponent, undefined);
  });

  it("handles update on tick", () => {
    const version = new EntityVersion(10);
    version.updateWith({
      kind: "update",
      tick: 20,
      entity: { id: ID_A, label: { text: "Hi" } },
    });
    assert.deepEqual(version.tick, 20);
    assert.deepEqual(version.tickByComponent, {
      ...allComponentsAtTick(10),
      label: 20,
    });
  });

  it("handles update on tick and components", () => {
    const version = new EntityVersion(11, {
      ...allComponentsAtTick(9),
      label: 11,
      position: 5,
    });
    version.updateWith({
      kind: "update",
      tick: 20,
      entity: { id: ID_A, label: { text: "Hi" } },
    });
    assert.deepEqual(version.tick, 20);
    assert.deepEqual(version.tickByComponent, {
      ...allComponentsAtTick(9),
      label: 20,
      position: 5,
    });
  });
});
