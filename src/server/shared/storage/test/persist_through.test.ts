import type { StoragePath } from "@/server/shared/storage/biomes";
import { escapeStoragePath } from "@/server/shared/storage/persist_through";
import assert from "assert";

describe("Test escapeStoragePath", () => {
  it("All paths should be escaped and have CRCs attached to them.", () => {
    assert.equal(escapeStoragePath("foobar" as StoragePath), "foobar.9ef61f95");
    assert.equal(
      escapeStoragePath("foo:bar" as StoragePath),
      "foo-bar.81e2b6cf"
    );
    assert.equal(
      escapeStoragePath('f<o>o:b"a|r?s*' as StoragePath),
      "f-o-o-b-a-r-s-.87801845"
    );
    assert.equal(
      escapeStoragePath("foo/bar.txt" as StoragePath),
      "foo/bar.txt.af8ee023"
    );
  });
});
