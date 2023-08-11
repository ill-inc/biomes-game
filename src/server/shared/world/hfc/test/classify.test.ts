import {
  HFC_COMPONENT_NAMES,
  classifyChangeToApply,
} from "@/server/shared/world/hfc/classify";
import type { BiomesId } from "@/shared/ids";
import assert from "assert";

const ID_A = 1 as BiomesId;

describe("Appropriate classify changes as HFC or not", () => {
  it("has HFC component names", () => {
    assert.ok(HFC_COMPONENT_NAMES.has("position"));
  });

  it("classifies changes appropriately", () => {
    assert.equal(
      classifyChangeToApply({
        changes: [],
        events: [],
      }),
      "rc"
    );

    assert.equal(
      classifyChangeToApply({
        changes: [
          {
            kind: "update",
            entity: {
              id: ID_A,
              position: { v: [1, 2, 3] },
            },
          },
        ],
      }),
      "hfc"
    );
    assert.equal(
      classifyChangeToApply({
        changes: [
          {
            kind: "update",
            entity: {
              id: ID_A,
              position: { v: [1, 2, 3] },
            },
          },
          {
            kind: "update",
            entity: {
              id: ID_A,
              label: { text: "hi" },
            },
          },
        ],
      }),
      "mixed"
    );
    assert.equal(
      classifyChangeToApply({
        changes: [
          {
            kind: "update",
            entity: {
              id: ID_A,
              position: { v: [1, 2, 3] },
              label: { text: "hi" },
            },
          },
        ],
      }),
      "mixed"
    );
    assert.equal(
      classifyChangeToApply({
        changes: [
          {
            kind: "update",
            entity: {
              id: ID_A,
              label: { text: "hi" },
            },
          },
        ],
      }),
      "rc"
    );
  });
});
