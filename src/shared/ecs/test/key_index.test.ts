import type { EntityWith } from "@/shared/ecs/gen/entities";
import { SimpleKeyIndex } from "@/shared/ecs/key_index";
import { generateTestId } from "@/shared/test_helpers";
import assert from "assert";

const A_ID = generateTestId();
const B_ID = generateTestId();

const PLOT_A = generateTestId();
const PLOT_B = generateTestId();
const PLOT_C = generateTestId();

describe("KeyIndex", () => {
  it("handles keys", () => {
    const index = new SimpleKeyIndex((e) => e.deed_component?.plots);

    const deedA: EntityWith<"deed_component"> = {
      id: A_ID,
      deed_component: {
        owner: A_ID,
        description: "A",
        plots: [PLOT_A],
        custom_owner_name: undefined,
        map_display_size: undefined,
      },
    };
    const deedB: EntityWith<"deed_component"> = {
      id: B_ID,
      deed_component: {
        owner: B_ID,
        description: "B",
        plots: [PLOT_B],
        custom_owner_name: undefined,
        map_display_size: undefined,
      },
    };

    const update = () => {
      index.update(deedA, undefined);
      index.update(deedB, undefined);
    };

    update();
    assert.equal(index.size, 2);
    assert.deepEqual(index.scanByKey(PLOT_A), [A_ID]);
    assert.deepEqual(index.scanByKey(PLOT_B), [B_ID]);
    assert.deepEqual(index.scanByKey(PLOT_C), []);

    deedA.deed_component.plots = [PLOT_A, PLOT_B];
    deedB.deed_component.plots = [PLOT_C];

    update();
    assert.equal(index.size, 2);
    assert.deepEqual(index.scanByKey(PLOT_A), [A_ID]);
    assert.deepEqual(index.scanByKey(PLOT_B), [A_ID]);
    assert.deepEqual(index.scanByKey(PLOT_C), [B_ID]);

    deedB.deed_component.plots = [];

    update();
    assert.equal(index.size, 1);
    assert.deepEqual(index.scanByKey(PLOT_A), [A_ID]);
    assert.deepEqual(index.scanByKey(PLOT_B), [A_ID]);
    assert.deepEqual(index.scanByKey(PLOT_C), []);

    deedB.deed_component.plots = [PLOT_B];

    update();
    assert.equal(index.size, 2);
    assert.deepEqual(index.scanByKey(PLOT_A), [A_ID]);
    assert.deepEqual(index.scanByKey(PLOT_B), [A_ID, B_ID]);
    assert.deepEqual(index.scanByKey(PLOT_C), []);

    index.delete(B_ID);
    assert.equal(index.size, 1);
    assert.deepEqual(index.scanByKey(PLOT_A), [A_ID]);
    assert.deepEqual(index.scanByKey(PLOT_B), [A_ID]);
    assert.deepEqual(index.scanByKey(PLOT_C), []);
  });
});
