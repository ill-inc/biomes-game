import { bootstrapGlobalSecrets } from "@/server/shared/secrets";
import { getBiscuits } from "@/shared/bikkie/active";
import { biscuitToJson } from "@/shared/bikkie/schema/attributes";
import { loadBikkieForScript } from "./helpers/bikkie";


async function dumpBikkie() {
  await bootstrapGlobalSecrets("untrusted-apply-token");
  await loadBikkieForScript();

  for (const biscuit of getBiscuits()) {
    process.stdout.write(`${JSON.stringify(biscuitToJson(biscuit))}\n`);
  }
}

dumpBikkie();