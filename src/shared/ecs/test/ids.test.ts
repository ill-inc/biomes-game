import { parseBiomesId } from "@/shared/ids";
import assert from "assert";

describe("Zod parsing", () => {
  it("handles various IDs", () => {
    assert.strictEqual(parseBiomesId("b:1234"), 1234);
    assert.strictEqual(parseBiomesId("b:3276660734166736"), 3276660734166736);
    assert.strictEqual(parseBiomesId("4567"), 4567);
    assert.strictEqual(parseBiomesId(4567), 4567);
  });
});
