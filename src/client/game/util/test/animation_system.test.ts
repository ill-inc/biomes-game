import {
  AnimationSystem,
  getSmoothedWeight,
} from "@/client/game/util/animation_system";
import assert from "assert";

describe("Player Animations", () => {
  const ALL_DURATIONS = 1;
  const durationFn = () => ALL_DURATIONS;

  const system = new AnimationSystem(
    {
      attack: {
        fileAnimationName: "attack",
      },
      dance: {
        fileAnimationName: "dance",
      },
      walk: {
        fileAnimationName: "walk",
      },
      run: {
        fileAnimationName: "run",
      },
      idle: {
        fileAnimationName: "idle",
      },
    },
    {
      arms: {
        re: /(.*(arm|hand|tool).*)/i,
      },
      notArms: {
        re: /[^(.*(arm|hand|tool).*)]/i,
      },
    }
  );

  it("simple single apply action modifies accumulated actions", () => {
    const accum = system.newAccumulatedActions(0.2, durationFn);
    assert.equal(accum.clockTime, 0.2);

    system.accumulateAction(
      {
        weights: system.singleAnimationWeight("dance", 1),
        state: { repeat: { kind: "once" }, startTime: 0.1 },
        layers: { arms: "apply", notArms: "apply" },
      },
      accum
    );

    assert.deepEqual(accum.animations.dance?.repeat, { kind: "once" });
    assert.equal(accum.animations.dance?.startTime, 0.1);
    assert.equal(accum.animations.walk, undefined);
    assert.equal(accum.layers.arms.desiredWeights?.dance, 1);
    assert.equal(accum.layers.arms.desiredWeights?.walk, 0);
    assert.equal(accum.layers.arms.idleWeights, undefined);
    assert.equal(accum.layers.notArms.desiredWeights?.dance, 1);
    assert.equal(accum.layers.notArms.desiredWeights?.walk, 0);
    assert.equal(accum.layers.notArms.idleWeights, undefined);
  });

  it("apply action does not overwrite existing", () => {
    const accum = system.newAccumulatedActions(0.2, durationFn);

    system.accumulateAction(
      {
        weights: system.singleAnimationWeight("attack", 1),
        state: { repeat: { kind: "once" }, startTime: 0.2 },
        layers: { arms: "apply", notArms: "noApply" },
      },
      accum
    );
    system.accumulateAction(
      {
        weights: system.singleAnimationWeight("dance", 1),
        state: { repeat: { kind: "once" }, startTime: 0.1 },
        layers: { arms: "apply", notArms: "apply" },
      },
      accum
    );

    assert.deepEqual(accum.animations.attack?.repeat, { kind: "once" });
    assert.deepEqual(accum.animations.dance?.repeat, { kind: "once" });
    assert.equal(accum.layers.arms.desiredWeights?.dance, 0);
    assert.equal(accum.layers.arms.desiredWeights?.attack, 1);
    assert.equal(accum.layers.notArms.desiredWeights?.dance, 1);
    assert.equal(accum.layers.notArms.desiredWeights?.walk, 0);
  });

  it("once animations expire", () => {
    const accum = system.newAccumulatedActions(
      ALL_DURATIONS * 2 + 0.2,
      durationFn
    );

    system.accumulateAction(
      {
        weights: system.singleAnimationWeight("dance", 1),
        state: { repeat: { kind: "once" }, startTime: 0.2 },
        layers: { arms: "apply", notArms: "apply" },
      },
      accum
    );

    assert.equal(accum.animations.dance, undefined);
    assert.equal(accum.layers.arms.desiredWeights, undefined);
    assert.equal(accum.layers.arms.idleWeights, undefined);
    assert.equal(accum.layers.notArms.desiredWeights, undefined);
    assert.equal(accum.layers.notArms.idleWeights, undefined);
  });

  it("once animations with trim active before trim starts", () => {
    const TRANSITION_TRIM = 0.5;
    const accum = system.newAccumulatedActions(
      ALL_DURATIONS - TRANSITION_TRIM * 1.01,
      durationFn,
      TRANSITION_TRIM
    );

    system.accumulateAction(
      {
        weights: system.singleAnimationWeight("dance", 1),
        state: { repeat: { kind: "once" }, startTime: 0 },
        layers: { arms: "apply", notArms: "apply" },
      },
      accum
    );

    assert.deepEqual(accum.animations.dance?.repeat, { kind: "once" });
    assert.equal(accum.layers.arms.desiredWeights?.dance, 1);
    assert.equal(accum.layers.notArms.desiredWeights?.dance, 1);
  });

  it("once animations with trim expire when trim starts", () => {
    const TRANSITION_TRIM = 0.5;
    const accum = system.newAccumulatedActions(
      ALL_DURATIONS - TRANSITION_TRIM / 2,
      durationFn,
      TRANSITION_TRIM
    );

    system.accumulateAction(
      {
        weights: system.singleAnimationWeight("dance", 1),
        state: { repeat: { kind: "once" }, startTime: 0 },
        layers: { arms: "apply", notArms: "apply" },
      },
      accum
    );

    assert.equal(accum.animations.dance, undefined);
    assert.equal(accum.layers.arms.desiredWeights, undefined);
    assert.equal(accum.layers.notArms.desiredWeights, undefined);
  });

  it("repeat animations do not expire", () => {
    const accum = system.newAccumulatedActions(
      ALL_DURATIONS * 2 + 0.2,
      durationFn
    );

    system.accumulateAction(
      {
        weights: system.singleAnimationWeight("dance", 1),
        state: { repeat: { kind: "repeat" }, startTime: 0.2 },
        layers: { arms: "apply", notArms: "apply" },
      },
      accum
    );

    assert.deepEqual(accum.animations.dance?.repeat, { kind: "repeat" });
    assert.equal(accum.layers.arms.desiredWeights?.dance, 1);
    assert.equal(accum.layers.notArms.desiredWeights?.dance, 1);
  });

  it("custom ease in is accumulated", () => {
    const accum = system.newAccumulatedActions(0.2, durationFn);

    system.accumulateAction(
      {
        weights: system.singleAnimationWeight("dance", 1),
        state: { repeat: { kind: "repeat" }, startTime: 0.2, easeInTime: 0.5 },
        layers: { arms: "apply", notArms: "apply" },
      },
      accum
    );

    assert.equal(accum.animations.dance?.easeInTime, 0.5);
  });

  it("idle weights are tracked despire previous setting", () => {
    const accum = system.newAccumulatedActions(0.2, durationFn);

    system.accumulateAction(
      {
        weights: system.singleAnimationWeight("attack", 1),
        state: { repeat: { kind: "once" }, startTime: 0.2 },
        layers: { arms: "apply", notArms: "ifIdle" },
      },
      accum
    );

    const moveWeights = system.createEmptyAnimationWeights();
    moveWeights.run = 0.5;
    moveWeights.idle = 0.5;
    system.accumulateAction(
      {
        weights: moveWeights,
        state: { repeat: { kind: "repeat" }, startTime: 0 },
        layers: { arms: "apply", notArms: "apply" },
      },
      accum
    );

    assert.deepEqual(accum.animations.attack?.repeat, { kind: "once" });
    assert.deepEqual(accum.animations.run?.repeat, { kind: "repeat" });
    assert.deepEqual(accum.animations.idle?.repeat, { kind: "repeat" });
    assert.equal(accum.layers.arms.desiredWeights?.attack, 1);
    assert.equal(accum.layers.arms.desiredWeights?.run, 0);
    assert.equal(accum.layers.arms.desiredWeights?.idle, 0);
    assert.equal(accum.layers.arms.idleWeights, undefined);
    assert.equal(accum.layers.notArms.desiredWeights?.attack, 0);
    assert.equal(accum.layers.notArms.desiredWeights?.run, 0.5);
    assert.equal(accum.layers.notArms.desiredWeights?.idle, 0.5);
    assert.equal(accum.layers.notArms.idleWeights?.attack, 1.0);
    assert.equal(accum.layers.notArms.idleWeights?.run, 0);
    assert.equal(accum.layers.notArms.idleWeights?.idle, 0);

    // Now check that the idle weights resolve correctly.
    system.resolveIdleWeights(accum);

    assert.equal(accum.layers.arms.desiredWeights?.attack, 1);
    assert.equal(accum.layers.arms.desiredWeights?.run, 0);
    assert.equal(accum.layers.arms.desiredWeights?.idle, 0);
    assert.equal(accum.layers.arms.idleWeights, undefined);
    assert.equal(accum.layers.notArms.desiredWeights?.attack, 0.5);
    assert.equal(accum.layers.notArms.desiredWeights?.run, 0.5);
    assert.equal(accum.layers.notArms.desiredWeights?.idle, 0);
    assert.equal(accum.layers.notArms.idleWeights, undefined);
  });

  it("smoothing weights with self does nothing", () => {
    const e = 1;
    const d = 1;
    const s = getSmoothedWeight(e, d, 0.1);

    assert.equal(s, 1);
  });
  it("desired weights are smoothed into current weights", () => {
    const e = 1;
    const d = 0;
    const s = getSmoothedWeight(e, d, 0.1);

    assert.equal(s, 0.6);
  });
  it("smoothed weights near zero are rounded to zero", () => {
    const e = 0.0000001;
    const d = 0;
    const s = getSmoothedWeight(e, d, 0.1);

    assert.equal(s, 0);
  });
  it("smoothed weights with custom ease in works", () => {
    const e = 0;
    const d = 1;
    const s = getSmoothedWeight(e, d, 0.1, 0.5);

    assert.equal(s, 0.2);
  });
  it("smoothed weights with custom ease in does not affect ease out", () => {
    const e = 1;
    const d = 0;
    const s = getSmoothedWeight(e, d, 0.1, 0.5);

    assert.equal(s, 0.6);
  });
});
