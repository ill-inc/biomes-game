import { MetricsCvals } from "@/shared/metrics/cvals";
import {
  AccumulatorContext,
  collectAllWithAccumulation,
  getCvalHook,
  makeCvalDatabase,
} from "@/shared/util/cvals";
import assert from "assert";

describe("Tests metrics -> cval adapter", () => {
  it("Counters should update cval database", () => {
    const cvalDatabase = makeCvalDatabase("testRoot");
    const metrics = new MetricsCvals();

    const counter = metrics.createCounter({
      name: "my:test:counter",
      help: "help field",
      cvalDatabase,
    });

    const counterHook = getCvalHook(cvalDatabase, [
      "metrics",
      "my",
      "test",
      "counter",
    ]);
    assert.ok(counterHook);
    assert.equal(counterHook.help, "help field");
    assert.equal(counterHook.collect(), 0);

    counter.inc(5);
    assert.equal(counterHook.collect(), 5);

    counter.inc(7);
    assert.equal(counterHook.collect(), 12);
  });

  it("Counters should update cval database with labels", () => {
    const cvalDatabase = makeCvalDatabase("testRoot");
    const metrics = new MetricsCvals();

    const counter = metrics.createCounter({
      name: "my:test:counter",
      help: "help field",
      labelNames: ["foo"],
      cvalDatabase,
    });

    counter.inc({ foo: "bar" }, 5);
    const counterHook = getCvalHook(cvalDatabase, [
      "metrics",
      "my",
      "test",
      "counter",
      "bar",
    ]);
    assert.ok(counterHook);
    assert.equal(counterHook.help, "help field");
    assert.equal(counterHook.collect(), 5);

    counter.inc(7);
    assert.equal(counterHook.collect(), 5);

    counter.inc({ foo: "bar" }, 7);
    assert.equal(counterHook.collect(), 12);
  });

  it("Counters accumulate rate", () => {
    const cvalDatabase = makeCvalDatabase("testRoot");
    const metrics = new MetricsCvals();

    const counter = metrics.createCounter({
      name: "test",
      help: "help field",
      cvalDatabase,
    });
    const accumulatorContext = new AccumulatorContext();

    // Bump the counter to 5 and collect at time 1.
    counter.inc(5);
    collectAllWithAccumulation(cvalDatabase, accumulatorContext, 1);

    // Increase the counter by 20 and collect at time 2.
    // Our rate should then come out to be 20/s.
    counter.inc(20);
    const collected = collectAllWithAccumulation(
      cvalDatabase,
      accumulatorContext,
      2
    );

    assert.ok("metrics" in collected);
    assert.ok(collected["metrics"] && typeof collected["metrics"] === "object");
    assert.ok("test" in collected["metrics"]);
    assert.ok(
      collected["metrics"]["test"] &&
        typeof collected["metrics"]["test"] === "object"
    );
    assert.ok("count" in collected["metrics"]["test"]);
    assert.equal(collected["metrics"]["test"]["count"], 25);
    assert.ok("rate" in collected["metrics"]["test"]);
    assert.equal(collected["metrics"]["test"]["rate"], 20);
  });

  it("Gauges should update cval database", () => {
    const cvalDatabase = makeCvalDatabase("testRoot");
    const metrics = new MetricsCvals();

    const gauge = metrics.createGauge({
      name: "my:test:gauge",
      help: "help field",
      cvalDatabase,
    });

    const gaugeHook = getCvalHook(cvalDatabase, [
      "metrics",
      "my",
      "test",
      "gauge",
    ]);
    assert.ok(gaugeHook);
    assert.equal(gaugeHook.collect(), 0);

    gauge.set(7);
    assert.equal(gaugeHook.collect(), 7);

    gauge.set(-5);
    assert.equal(gaugeHook.collect(), -5);
  });

  it("Gauges should update cval database", () => {
    const cvalDatabase = makeCvalDatabase("testRoot");
    const metrics = new MetricsCvals();

    const gauge = metrics.createGauge({
      name: "my:test:gauge",
      help: "help field",
      cvalDatabase,
    });

    const gaugeHook = getCvalHook(cvalDatabase, [
      "metrics",
      "my",
      "test",
      "gauge",
    ]);
    assert.ok(gaugeHook);
    assert.equal(gaugeHook.collect(), 0);

    gauge.set(7);
    assert.equal(gaugeHook.collect(), 7);

    gauge.set(-5);
    assert.equal(gaugeHook.collect(), -5);
  });
});
