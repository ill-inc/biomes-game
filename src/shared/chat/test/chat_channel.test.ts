import { ChatChannel } from "@/shared/chat/chat_channel";
import type { ChatMessage } from "@/shared/chat/messages";
import type { Envelope } from "@/shared/chat/types";
import type { BiomesId } from "@/shared/ids";
import { generateTestId } from "@/shared/test_helpers";
import assert from "assert";
import { omit } from "lodash";

const TEST_ID_A = generateTestId();
const TEST_ID_B = generateTestId();

describe("ChatChannel", () => {
  let nextId = 1;
  const testMessage = (sender: BiomesId, message: ChatMessage): Envelope => {
    const now = Date.now() + nextId;
    return {
      id: `${nextId++}`,
      createdAt: now,
      localTime: now,
      from: sender,
      message,
    };
  };
  const omitExpiry = (envelopes: Envelope[]) => {
    return envelopes.map((e) => omit(e, "expiryMs"));
  };
  const msgA = testMessage(TEST_ID_A, { kind: "text", content: "hello" });
  const msgB = testMessage(TEST_ID_B, {
    kind: "text",
    content: "how are you?",
  });
  const msgC = testMessage(TEST_ID_B, { kind: "typing" });
  const msgD = testMessage(TEST_ID_A, { kind: "text", content: "..ok" });
  const msgE = testMessage(TEST_ID_B, {
    kind: "text",
    content: "great!",
  });

  it("Accepts mail", () => {
    const channel = new ChatChannel(60 * 1000);

    channel.accept([msgA]);
    assert.deepEqual(channel.mail, [msgA]);

    channel.accept([msgB]);
    assert.deepEqual(channel.mail, [msgA, msgB]);
  });

  it("Deletes mail", () => {
    const channel = new ChatChannel(60 * 1000);

    channel.accept([msgA]);
    assert.deepEqual(channel.mail, [msgA]);

    channel.accept([msgB]);
    assert.deepEqual(channel.mail, [msgA, msgB]);

    channel.delete(msgA.id);
    assert.deepEqual(channel.mail, [msgB]);

    channel.accept([msgC]);
    assert.deepEqual(channel.mail, [msgB, msgC]);

    channel.delete(msgB.id);
    assert.deepEqual(channel.mail, [msgC]);
  });

  it("Doesn't accept duplicates", () => {
    const channel = new ChatChannel(60 * 1000);

    channel.accept([msgA]);
    channel.accept([msgA]);
    assert.deepEqual(channel.mail, [msgA]);
  });

  it("Expires old mail", () => {
    const channel = new ChatChannel(60 * 1000);
    channel.accept([msgA, msgB]);
    assert.deepEqual(channel.mail, [msgA, msgB]);

    channel.accept([
      {
        id: "Old",
        createdAt: 0,
        localTime: 100,
        from: generateTestId(),
        message: {
          kind: "text",
          content: "Old",
        },
      },
    ]);

    assert.deepEqual(channel.mail, [msgA, msgB]);
  });

  it("Correctly eliminates typing", () => {
    const channel = new ChatChannel(60 * 1000);
    channel.accept([msgA, msgB]);
    assert.deepEqual(omitExpiry(channel.mail), omitExpiry([msgA, msgB]));
    channel.accept([msgC]);
    assert.deepEqual(omitExpiry(channel.mail), omitExpiry([msgA, msgB, msgC]));
    channel.accept([msgD]);
    assert.deepEqual(
      omitExpiry(channel.mail),
      omitExpiry([msgA, msgB, msgC, msgD])
    );
    channel.accept([msgE]);
    assert.deepEqual(
      omitExpiry(channel.mail),
      omitExpiry([msgA, msgB, msgD, msgE])
    );
  });
});
