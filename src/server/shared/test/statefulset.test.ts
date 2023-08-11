import {
  statefulSetIndexFromHostname,
  statefulSetReplicas,
} from "@/server/shared/statefulset";
import assert from "assert";

describe("Test statefulset helpers", () => {
  it("can read replica count", () => {
    process.env.STATEFUL_SET_REPLICAS = "";
    assert.equal(statefulSetReplicas(), 0);
    process.env.STATEFUL_SET_REPLICAS = "0";
    assert.equal(statefulSetReplicas(), 0);
    process.env.STATEFUL_SET_REPLICAS = "42";
    assert.equal(statefulSetReplicas(), 42);
  });

  it("can read ordinal", () => {
    assert.equal(statefulSetIndexFromHostname(""), 0);
    assert.equal(statefulSetIndexFromHostname("lamb"), 0);
    assert.equal(statefulSetIndexFromHostname("www.example.com"), 0);
    assert.equal(statefulSetIndexFromHostname("www-4.example.com"), 4);
    assert.equal(statefulSetIndexFromHostname("foo-bar.example.com"), 0);
    assert.equal(statefulSetIndexFromHostname("foo-bar-42.example.com"), 42);
    assert.equal(statefulSetIndexFromHostname("gizmo-12"), 12);
    assert.equal(statefulSetIndexFromHostname("gizmo-1"), 1);
    assert.equal(statefulSetIndexFromHostname("gizmo-0"), 0);
    assert.equal(statefulSetIndexFromHostname("game-12.example.com"), 12);
    assert.equal(statefulSetIndexFromHostname("game6.example.com"), 0);
  });
});
