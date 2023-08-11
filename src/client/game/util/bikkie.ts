import type { BikkieLoadResponse } from "@/pages/api/bikkie";
import { BikkieRuntime, LazyBiscuit } from "@/shared/bikkie/active";
import type { Biscuit } from "@/shared/bikkie/schema/attributes";
import type { SchemaPath } from "@/shared/bikkie/schema/biomes";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { Timer } from "@/shared/metrics/timer";
import { PipelineBatcher, asyncYieldForEach } from "@/shared/util/async";
import { MultiMap } from "@/shared/util/collections";
import { Cval } from "@/shared/util/cvals";
import { jsonFetch } from "@/shared/util/fetch_helpers";

const requestBikkieCount = new Cval({
  path: ["game", "bikkie", "requests"],
  help: "Number of times a Bikkie refresh has been requested.",
  initialValue: 0,
});

const refreshBikkieCount = new Cval({
  path: ["game", "bikkie", "refreshes"],
  help: "Number of times a Bikkie refresh has been pushed.",
  initialValue: 0,
});

const fetchBikkieMs = new Cval({
  path: ["game", "bikkie", "fetchMs"],
  help: "Time it took to fetch Bikkie from the server.",
  initialValue: 0,
});

const decodeBikkieMs = new Cval({
  path: ["game", "bikkie", "decodeMs"],
  help: "Time it took to decode Bikkie.",
  initialValue: 0,
});

const registerBikkieMs = new Cval({
  path: ["game", "bikkie", "registerMs"],
  help: "Time it took to register Bikkie.",
  initialValue: 0,
});

let lastLoadedTrayId: BiomesId | undefined;
const lastLoadedHashes = new Map<BiomesId, string>();

function bikkieUrl(expectedTrayId?: BiomesId): string {
  if (expectedTrayId) {
    return `/api/bikkie?expectedTrayId=${expectedTrayId}&v=0`;
  }
  return "/api/bikkie";
}

async function doRefresh(
  expectedTrayId: BiomesId | undefined,
  maxBlockMs: number
): Promise<void> {
  if (expectedTrayId === lastLoadedTrayId) {
    return;
  }
  refreshBikkieCount.value++;

  const timer = new Timer();
  // While the call to zjsonPost is async and we wait a bit for the network
  // round trip, we've found that the majority of the time spent here is
  // actually around parsing the result, and can be a second or longer.
  const { trayId, encoded, schemas } = await jsonFetch<BikkieLoadResponse>(
    bikkieUrl(expectedTrayId)
  );
  fetchBikkieMs.value = timer.elapsedAndReset();
  const biscuits = new Map<BiomesId, Biscuit | LazyBiscuit>();
  const schemaToId = new MultiMap<SchemaPath, BiomesId>();
  for await (const [id, raw, inSchemas] of asyncYieldForEach(
    encoded,
    maxBlockMs
  )) {
    if (lastLoadedHashes.get(id) !== raw) {
      lastLoadedHashes.set(id, raw);
      biscuits.set(id, new LazyBiscuit(id, raw));
    }
    for (const i of inSchemas) {
      schemaToId.add(schemas[i] as SchemaPath, id);
    }
  }
  decodeBikkieMs.value = timer.elapsedAndReset();
  BikkieRuntime.get().registerBiscuits(biscuits, schemaToId);
  registerBikkieMs.value = timer.elapsedAndReset();

  lastLoadedTrayId = trayId;
  log.info(
    `Refreshed bikkie fetch=${fetchBikkieMs.value}ms, decode=${decodeBikkieMs.value}ms, register=${registerBikkieMs.value}ms`
  );
}

const batcher = new PipelineBatcher((expectedTrayId?: BiomesId) =>
  doRefresh(expectedTrayId, 5)
);

export async function refreshBikkie(expectedTrayId: BiomesId): Promise<void> {
  requestBikkieCount.value++;
  await batcher.invalidate(expectedTrayId);
}

export async function initializeBikkie(
  expectedTrayId?: BiomesId
): Promise<boolean> {
  try {
    await doRefresh(expectedTrayId, 20);
    return true;
  } catch (error) {
    log.error("Failed to initialize Bikkie", { error });
    return false;
  }
}
