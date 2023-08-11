import { HostPort } from "@/server/shared/ports";
import assert from "assert";

describe("Test HostPort", () => {
  it("formats correctly", () => {
    assert.equal(new HostPort("foo", 4242, 53).url, "http://foo:4242");
    assert.equal(new HostPort("foo", 4242, 53).rpc, "foo:53");
    assert.equal(String(new HostPort("bar", 4242, 53)), "bar:4242");
  });
});
