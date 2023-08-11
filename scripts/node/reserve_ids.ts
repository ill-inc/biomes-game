import { DbIdGenerator } from "@/server/shared/ids/generator";
import { createBdb, createStorageBackend } from "@/server/shared/storage";

export async function reserveIds(num: number) {
  const storage = await createStorageBackend("firestore");
  const db = createBdb(storage);
  const idGen = new DbIdGenerator(db);
  return idGen.batch(num);
}

async function outputIds(num: number, outfile: string) {
  const json = JSON.stringify(await reserveIds(num));
  if (outfile) {
    const fs = require("fs");
    fs.writeFile(outfile, json, (err: any) => {
      if (err) {
        console.log(`Error writing to ${outfile}: ${err}`);
      }
    });
  } else {
    console.log(json);
  }
}

const [num, outfile] = process.argv.slice(2);
outputIds(parseInt(num), outfile);
