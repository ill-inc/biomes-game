import { parseSourceLine } from "@/server/web/source_maps";

import assert from "assert";

describe("Source Maps", () => {
  it("parse file only", async () => {
    const parsed = parseSourceLine("7572-acfe4b18399fa14c.js:1:202991");

    assert.deepEqual(parsed, {
      source: "7572-acfe4b18399fa14c.js",
      line: 1,
      column: 202991,
    });
  });
  it("parse file and gen symbol", async () => {
    const parsed = parseSourceLine(
      "t.build @ 7572-acfe4b18399fa14c.js:1:202991"
    );

    assert.deepEqual(parsed, {
      source: "7572-acfe4b18399fa14c.js",
      line: 1,
      column: 202991,
    });
  });
  it("parse with brackets", async () => {
    const parsed = parseSourceLine("f (6206-89fe3f620cc8972e.js:1:10500)");

    assert.deepEqual(parsed, {
      source: "6206-89fe3f620cc8972e.js",
      line: 1,
      column: 10500,
    });
  });
  it("parse with indent", async () => {
    const parsed = parseSourceLine(
      "    at f (6206-89fe3f620cc8972e.js:1:10500)"
    );

    assert.deepEqual(parsed, {
      source: "6206-89fe3f620cc8972e.js",
      line: 1,
      column: 10500,
    });
  });
  it("parse with URL", async () => {
    const parsed = parseSourceLine(
      "at https://static.biomes.gg/_next/static/chunks/7572-acfe4b18399fa14c.js:1:61747"
    );

    assert.deepEqual(parsed, {
      source:
        "https://static.biomes.gg/_next/static/chunks/7572-acfe4b18399fa14c.js",
      line: 1,
      column: 61747,
    });
  });
});
