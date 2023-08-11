import { checkValidPath, createFilter } from "@/server/shared/storage/util";
import assert from "assert";

describe("Test checkValidPath", () => {
  it("Should throw an error if path is not a single field reference", () => {
    assert.throws(() => {
      checkValidPath("foo.bar");
    });
  });
});

describe("Test createFilter", () => {
  it("Should create a filter function for a given document", () => {
    const filter = createFilter("foo", "<", 42);
    assert.equal(filter.key, "foo<");
    assert.ok(
      filter.fn({
        data: () => ({
          foo: 41,
        }),
      })
    );
    assert.ok(
      !filter.fn({
        data: () => ({
          foo: 43,
        }),
      })
    );
  });

  it("Supports nested maps", () => {
    const filter = createFilter("foo.bar", "<", 42);
    assert.equal(filter.key, "foo.bar<");
    assert.ok(
      filter.fn({
        data: () => ({
          foo: {
            bar: 41,
          },
        }),
      })
    );
    assert.ok(
      !filter.fn({
        data: () => ({
          foo: {
            bar: 43,
          },
        }),
      })
    );
  });
});
