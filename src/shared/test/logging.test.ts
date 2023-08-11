import type { LogMessage, Sink } from "@/shared/logging";
import { addSink, log, removeSink } from "@/shared/logging";
import assert from "assert";

function withLogSink(sink: Sink, fn: () => void) {
  try {
    addSink(sink);
    fn();
  } finally {
    removeSink(sink);
  }
}

describe("Test logging", () => {
  it("Can add logging sinks", () => {
    const logMessages: LogMessage[] = [];

    withLogSink(
      async (l) => {
        logMessages.push(l);
      },
      () => {
        log.info("hello");
        log.warn("there", { foo: "bar" });

        assert.equal(logMessages.length, 2);
        assert.equal(logMessages[0].message, "hello");
        assert.equal(logMessages[0].severity, "INFO");

        assert.equal(logMessages[1].message, "there");
        assert.equal(logMessages[1].severity, "WARNING");
        assert.ok("foo" in logMessages[1]);
        assert.equal(logMessages[1]["foo"], "bar");
      }
    );

    log.info("sink removed");
    // After removing the custom sink, we should not see `logMessages` be
    // updated anymore.
    assert.equal(logMessages.length, 2);
  });
});
