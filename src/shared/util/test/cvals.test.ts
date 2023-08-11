import {
  AccumulatorContext,
  collectAll,
  collectAllAsHumanReadable,
  collectAllWithAccumulation,
  Cval,
  makeCvalDatabase,
  makeCvalHook,
} from "@/shared/util/cvals";
import assert from "assert";

describe("Tests CvalDatabase snapshots work", () => {
  it("Should update the database", () => {
    const cvalDatabase = makeCvalDatabase("testRoot");
    const numberCval = new Cval<number>({
      path: ["test", "number"],
      help: "test number",
      initialValue: 5.0,
      toHumanReadable: (x) => `${x} seconds`,
      cvalDatabase: cvalDatabase,
    });
    const numberWithoutAsStringCval = new Cval<number>({
      path: ["test", "numberWithoutAsString"],
      help: "test number",
      initialValue: 10.0,
      cvalDatabase: cvalDatabase,
    });
    const vecObjectCval = new Cval<{ x: number; y: number; z: number }>({
      path: ["test", "vec"],
      help: "test number",
      initialValue: { x: 1, y: 2, z: 3 },
      toHumanReadable: (a) => `(${a.x}, ${a.y}, ${a.z})`,
      cvalDatabase: cvalDatabase,
    });

    const results1 = collectAll(cvalDatabase);
    assert.ok(
      results1.test &&
        typeof results1.test === "object" &&
        !Array.isArray(results1.test)
    );
    assert.deepEqual(results1.test.number, 5.0);
    assert.deepEqual(results1.test.vec, { x: 1, y: 2, z: 3 });
    assert.deepEqual(results1.test.numberWithoutAsString, 10.0);

    const resultsWithStringConversions1 = collectAllAsHumanReadable(
      cvalDatabase,
      new AccumulatorContext(),
      0
    );
    assert.ok(
      resultsWithStringConversions1.test &&
        typeof resultsWithStringConversions1.test === "object" &&
        !Array.isArray(resultsWithStringConversions1.test)
    );
    assert.deepEqual(resultsWithStringConversions1.test.number, "5 seconds");
    assert.deepEqual(resultsWithStringConversions1.test.vec, "(1, 2, 3)");
    assert.deepEqual(
      resultsWithStringConversions1.test.numberWithoutAsString,
      10.0
    );

    numberCval.value += 1;
    numberWithoutAsStringCval.value += 0.5;
    vecObjectCval.value.z += 2;

    const results2 = collectAll(cvalDatabase);
    assert.ok(
      results2.test &&
        typeof results2.test === "object" &&
        !Array.isArray(results2.test)
    );
    assert.deepEqual(results2.test.number, 6.0);
    assert.deepEqual(results2.test.vec, { x: 1, y: 2, z: 5 });
    assert.deepEqual(results2.test.numberWithoutAsString, 10.5);

    const resultsWithStringConversions2 = collectAllAsHumanReadable(
      cvalDatabase,
      new AccumulatorContext(),
      0
    );
    assert.ok(
      resultsWithStringConversions2.test &&
        typeof resultsWithStringConversions2.test === "object" &&
        !Array.isArray(resultsWithStringConversions2.test)
    );
    assert.deepEqual(resultsWithStringConversions2.test.number, "6 seconds");
    assert.deepEqual(resultsWithStringConversions2.test.vec, "(1, 2, 5)");
    assert.deepEqual(
      typeof resultsWithStringConversions2.test.numberWithoutAsString,
      "number"
    );
    assert.deepEqual(
      resultsWithStringConversions2.test.numberWithoutAsString,
      10.5
    );
  });

  it("Accumulators work", () => {
    const cvalDatabase = makeCvalDatabase("testRoot");
    let value = 0;
    makeCvalHook({
      path: ["test"],
      help: "help",
      collect: () => value,
      cvalDatabase,
      makeAccumulator: () => {
        let diff = 0;
        let prev = 0;
        let prevTime = 0;
        let dt = 0;
        return (x: number, timeInSeconds: number) => {
          diff = x - prev;
          prev = x;
          dt = timeInSeconds - prevTime;
          prevTime = timeInSeconds;
          return {
            diff,
            dt,
          };
        };
      },
    });

    const accumulatorContext = new AccumulatorContext();
    value = 5;

    const collect1 = collectAllWithAccumulation(
      cvalDatabase,
      accumulatorContext,
      1
    );
    assert.ok(
      "test" in collect1 &&
        collect1["test"] &&
        typeof collect1["test"] === "object"
    );
    assert.ok("diff" in collect1["test"]);
    assert.equal(collect1["test"]["diff"], 5);
    assert.ok("dt" in collect1["test"]);
    assert.equal(collect1["test"]["dt"], 1);

    value = 3;
    const collect2 = collectAllWithAccumulation(
      cvalDatabase,
      accumulatorContext,
      7
    );
    assert.ok(
      "test" in collect2 &&
        collect2["test"] &&
        typeof collect2["test"] === "object"
    );
    assert.ok("diff" in collect2["test"]);
    assert.equal(collect2["test"]["diff"], -2);
    assert.ok("dt" in collect2["test"]);
    assert.equal(collect2["test"]["dt"], 6);
  });
});
