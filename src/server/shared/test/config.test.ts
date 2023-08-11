import { startConfigWatchers } from "@/server/shared/config_watchers";
import assert from "assert";

describe("Hot reloading config test", () => {
  it("Has a valid initial value", async () => {
    const watcher = await startConfigWatchers();
    assert.ok(watcher);
    await watcher.close();
  });
});
