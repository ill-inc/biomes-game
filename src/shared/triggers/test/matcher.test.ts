import { matches } from "@/shared/triggers/matcher";
import type { Matcher } from "@/shared/triggers/matcher_schema";
import assert from "assert";

describe("Matcher tests", () => {
  it("Works with an object match", () => {
    const matcher: Matcher = {
      kind: "object",
      fields: [
        [
          "a",
          {
            kind: "value",
            value: 123,
          },
        ],
      ],
    };

    assert.ok(matches(matcher, { a: 123 }));
    assert.ok(!matches(matcher, { a: 124 }));
    assert.ok(!matches(matcher, {}));
  });

  it("Works with a number range", () => {
    let matcher: Matcher = {
      kind: "object",
      fields: [
        [
          "a",
          {
            kind: "numberRange",
            max: 100,
          },
        ],
      ],
    };

    assert.ok(matches(matcher, { a: 0 }));
    assert.ok(!matches(matcher, { a: 101 }));

    matcher = {
      kind: "object",
      fields: [
        [
          "a",
          {
            kind: "numberRange",
            min: 100,
          },
        ],
      ],
    };

    assert.ok(!matches(matcher, { a: 0 }));
    assert.ok(matches(matcher, { a: 101 }));

    matcher = {
      kind: "object",
      fields: [
        [
          "a",
          {
            kind: "numberRange",
            min: 100,
            max: 102,
          },
        ],
      ],
    };

    assert.ok(!matches(matcher, { a: 99 }));
    assert.ok(!matches(matcher, { a: 103 }));
    assert.ok(matches(matcher, { a: 101 }));
    assert.ok(matches(matcher, { a: 100 }));
    assert.ok(matches(matcher, { a: 102 }));
  });

  it("Works with a discriminated union", () => {
    const matcher: Matcher = {
      kind: "object",
      restrictToUnionValue: "bbq",
      fields: [
        [
          "a",
          {
            kind: "value",
            value: 123,
          },
        ],
      ],
    };

    assert.ok(matches(matcher, { kind: "bbq", a: 123 }));
    assert.ok(!matches(matcher, { kind: "qqq", a: 123 }));
    assert.ok(!matches(matcher, {}));
  });

  it("Works with distinct array matches", () => {
    const matcher: Matcher = {
      kind: "object",
      fields: [
        [
          "a",
          {
            kind: "distinctArrayMatches",
            fields: [
              {
                kind: "object",
                fields: [
                  [
                    "leaf",
                    {
                      kind: "value",
                      value: 1,
                    },
                  ],
                ],
              },

              {
                kind: "object",
                fields: [
                  [
                    "leaf",
                    {
                      kind: "value",
                      value: 1,
                    },
                  ],
                ],
              },
            ],
          },
        ],
      ],
    };

    assert.ok(matches(matcher, { kind: "bbq", a: [{ leaf: 1 }, { leaf: 1 }] }));
    assert.ok(
      matches(matcher, {
        kind: "bbq",
        a: [{ leaf: 1 }, { leaf: 1 }, { leaf: 3 }],
      })
    );
    assert.ok(
      !matches(matcher, {
        kind: "bbq",
        a: [
          {
            leaf: 1,
          },
        ],
      })
    );
  });
});
