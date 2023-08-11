import { loadBikkieForScript } from "@/../scripts/node/helpers/bikkie";
import { iterBackupEntitiesFromFile } from "@/server/backup/serde";
import { getBiscuits } from "@/shared/bikkie/active";
import { BiomesId } from "@/shared/ids";

const TypedArray = Object.getPrototypeOf(Uint8Array);

function walkFor(target: BiomesId, prefix: string, data: any): string[] {
  if (data === target) {
    return [prefix];
  } else if (data && typeof data === "object") {
    if (data.constructor === Array) {
      return data.flatMap((value, idx) =>
        walkFor(target, `${prefix}[${idx}]`, value)
      );
    } else if (data.constructor === Map) {
      return Array.from(data.entries()).flatMap(([key, value]) => {
        return walkFor(target, `${prefix}[${key}]`, value);
      });
    } else if (data.constructor === Set) {
      return Array.from(data.values()).flatMap((value) => {
        return walkFor(target, `${prefix}{}`, value);
      });
    } else if (data.constructor === Buffer || data instanceof TypedArray) {
      return [];
    }
    return Object.entries(data).flatMap(([key, value]) => {
      return walkFor(target, `${prefix}.${key}`, value);
    });
  } else {
    return [];
  }
}

async function main() {
  const [backupFile, item] = process.argv.slice(2);

  if (!backupFile) {
    console.error("Usage: node has.ts <backup file> <item>");
    return;
  }

  // If item is not an integer, lookup
  let itemId = +item;
  if (isNaN(itemId)) {
    console.log("Specified item by name, reading Bikkie...");
    await loadBikkieForScript();
    for (const biscuit of getBiscuits()) {
      if (biscuit.name === item) {
        itemId = biscuit.id;
        console.log(item, itemId);
        break;
      }
    }
    if (isNaN(itemId)) {
      console.error(`Could not find item ${item}`);
      return;
    }
  }
  console.log("Searching for references in ECS backup...");
  for await (const [version, entity] of iterBackupEntitiesFromFile(
    backupFile
  )) {
    const paths = walkFor(itemId as BiomesId, "", entity);
    if (paths.length === 0) {
      continue;
    }
    console.log(
      entity.label ? `${entity.id} / ${entity.label.text}` : entity.id
    );
    // If you want to print the paths
    //for (const path of paths) {
    //  console.log(`  ${path}`);
    //}
  }
  console.log("Done.");
}

main();
