import { ok } from "assert";
import { randomBytes } from "crypto";

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// Generate an ID derived from a seed.
export function predictableId(seed: string, targetLength = 20): string {
  let autoId = "dev";
  ok(targetLength >= autoId.length);
  const bytes = Buffer.from(seed);
  while (autoId.length < targetLength) {
    bytes.forEach((b) => {
      // Length of `chars` is 62. We only take bytes between 0 and 62*4-1
      // (both inclusive). The value is then evenly mapped to indices of `char`
      // via a modulo operation.
      const maxValue = 62 * 4 - 1;
      if (autoId.length < targetLength && b <= maxValue) {
        autoId += ALPHABET.charAt(b % 62);
      }
    });
  }
  return autoId;
}

// Generate a probably unique ID.
export function autoId(targetLength = 20): string {
  let autoId = "";
  while (autoId.length < targetLength) {
    const bytes = randomBytes(40);
    bytes.forEach((b) => {
      // Length of `chars` is 62. We only take bytes between 0 and 62*4-1
      // (both inclusive). The value is then evenly mapped to indices of `char`
      // via a modulo operation.
      const maxValue = 62 * 4 - 1;
      if (autoId.length < targetLength && b <= maxValue) {
        autoId += ALPHABET.charAt(b % 62);
      }
    });
  }
  return autoId;
}
