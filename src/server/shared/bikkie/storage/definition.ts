import { attribs } from "@/shared/bikkie/schema/attributes";
import { zodBiscuitTray, type BiscuitTray } from "@/shared/bikkie/tray";
import type { BiomesId } from "@/shared/ids";
import { ok } from "assert";
import { FLOAT32_OPTIONS, Packr } from "msgpackr";

// For binary encoding of tray data.
const packr = new Packr({
  useRecords: true,
  moreTypes: true,
  bundleStrings: true,
  useFloat32: FLOAT32_OPTIONS.NEVER,
});

export async function parseEncodedTrayDefinition(
  id: BiomesId,
  raw: Buffer | undefined | null,
  lookup: (id: BiomesId) => Promise<BiscuitTray | undefined>
) {
  if (!raw) {
    return;
  }
  const fetched = new Set<BiomesId>([id]);
  const zod = zodBiscuitTray(
    attribs,
    async (id) => {
      ok(!fetched.has(id), `Circular reference in tray definition: ${id}`);
      fetched.add(id);
      const def = await lookup(id);
      ok(def !== undefined, `Missing tray definition: ${id}`);
      return def;
    },
    (id) => (id < 200 ? id + 200 : id)
  );
  return zod.parseAsync(packr.unpack(raw));
}
