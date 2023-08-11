import { log } from "@/shared/logging";
import { watch } from "chokidar";
import { readFile } from "fs/promises";
import md5 from "md5";

export interface LookupPath {
  path: string;
  devOnly?: boolean;
}

export interface Watcher {
  reload: () => Promise<boolean>;
  close: () => Promise<void>;
}

export function makeFilesWatcher(
  lookupPaths: LookupPath[],
  onChange: (content: string, path: string) => boolean
): Watcher {
  let currentMd5: string | undefined;

  const paths = lookupPaths.map((x) => x.path);

  const reload: () => Promise<boolean> = async () => {
    let lastError = undefined;
    for (const lookupPath of lookupPaths) {
      if (lookupPath.devOnly && process.env.NODE_ENV === "production") {
        continue;
      }

      const path = lookupPath.path;
      try {
        const contents = await readFile(path, "utf8");
        const newMd5 = md5(contents);
        if (newMd5 === currentMd5) {
          log.info(`${path} unchanged, is ${currentMd5}`);
          return true;
        }
        log.info(`${path} updating ${currentMd5} to ${newMd5}...`);
        if (!onChange(contents, path)) {
          continue;
        }
        currentMd5 = newMd5;
        return true;
      } catch (err) {
        lastError = err;
      }
    }
    if (lastError) {
      log.warn(`Could not update config from files: [${paths}]`, {
        error: lastError,
      });
    }
    return false;
  };

  const watcher = watch(paths, {
    awaitWriteFinish: true,
  });
  const handler = () => {
    void reload();
  };
  watcher.on("add", handler);
  watcher.on("change", handler);
  watcher.on("unlink", handler);
  watcher.on("error", (error: any) => {
    log.warn(`Error watching config files: [${paths}]`, {
      error,
    });
  });
  return {
    reload,
    close: async () => {
      await watcher.close();
    },
  };
}
