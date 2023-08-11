import {
  deserializeRedisComponentData,
  serializeRedisComponentData,
} from "@/server/shared/world/lua/serde";
import assert from "assert";

describe("Redis component serialization", () => {
  it("check expected encoding", async () => {
    const obj = { id: 123, position: { v: [5, 6, 7] }, label: { v: "abc" } };

    assert.deepEqual(
      deserializeRedisComponentData(serializeRedisComponentData(obj)),
      obj
    );

    assert.deepEqual(deserializeRedisComponentData(undefined), undefined);
    assert.deepEqual(deserializeRedisComponentData(0), null);
    assert.deepEqual(deserializeRedisComponentData(""), undefined);
    // Legacy encoding.
    assert.deepEqual(
      deserializeRedisComponentData(
        '\xFF\x0Fo"\x02idIö\x01"\bpositiono"\x01vA\x03I\nI\fI\x0E$\x00\x03{\x01"\x05labelo"\x01vc\x06a\x00b\x00c\x00{\x01{\x03'
      ),
      obj
    );
    assert.deepEqual(
      deserializeRedisComponentData(
        "\x01Þ\x00\x03¢id{¨positionÞ\x00\x01¡v\x93\x05\x06\x07¥labelÞ\x00\x01¡v£abc"
      ),
      obj
    );
  });
});
