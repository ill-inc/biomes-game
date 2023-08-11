import { getAsset } from "@/galois/assets";
import * as l from "@/galois/lang";
import * as yargs from "yargs";

function run() {
  const options = yargs
    .options({
      name: {
        alias: "n",
        type: "string",
        demandOption: true,
        description: "Asset name",
      },
    })
    .parseSync();

  // Dump the assets JSON.
  const program = l.serialize(getAsset(options.name));
  console.log(program);
}

run();
