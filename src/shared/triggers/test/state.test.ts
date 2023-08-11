import type { MetaState } from "@/shared/triggers/base_schema";
import {
  deserializeTriggerState,
  serializeTriggerState,
} from "@/shared/triggers/state";
import assert from "assert";
import { z } from "zod";

describe("Trigger engine encoding tests", () => {
  const zMapPayload = z.map(z.number(), z.string());
  const mapState: MetaState<Map<number, string>> = {
    firedAt: 124,
    payload: new Map([
      [1, "a"],
      [2, "b"],
    ]),
  };

  const zObjectPayload = z.object({ a: z.number(), b: z.string() });
  const objectState: MetaState<{ a: number; b: string }> = {
    firedAt: 124,
    payload: { a: 1, b: "b" },
  };

  it("Can round-trip", () => {
    assert.deepEqual(
      deserializeTriggerState(serializeTriggerState(mapState), zMapPayload),
      mapState
    );
    assert.deepEqual(
      deserializeTriggerState(
        serializeTriggerState(objectState),
        zObjectPayload
      ),
      objectState
    );
  });

  it("Can decode empty", () => {
    assert.deepEqual(deserializeTriggerState(0, z.any()), {});
    assert.deepEqual(deserializeTriggerState(undefined as any, z.any()), {});
  });

  it("Can decode completed", () => {
    assert.deepEqual(deserializeTriggerState(1234, z.any()), { firedAt: 1234 });
  });
});
