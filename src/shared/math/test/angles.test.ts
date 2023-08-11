import { diffAngle, normalizeAngle } from "@/shared/math/angles";
import assert from "assert";

describe("Angles", () => {
  it("normalize", () => {
    assert.equal(normalizeAngle(1), 1);
    assert.equal(normalizeAngle(-1), Math.PI * 2 - 1);
    assert.equal(normalizeAngle(Math.PI * 2 + 3), 3);
    assert.equal(normalizeAngle(-Math.PI * 2 - 3), Math.PI * 2 - 3);
  });
  it("diff", () => {
    assert.equal(diffAngle(2, 1), 1);
    assert.equal(diffAngle(1, 2), -1);
    assert.equal(diffAngle(5, 1), -(Math.PI * 2 - 4));
    assert.equal(diffAngle(1, 5), Math.PI * 2 - 4);
    assert.equal(diffAngle(Math.PI * 2 + 5, 1), -(Math.PI * 2 - 4));
    assert.equal(diffAngle(1, Math.PI * 2 + 5), Math.PI * 2 - 4);
  });
});
