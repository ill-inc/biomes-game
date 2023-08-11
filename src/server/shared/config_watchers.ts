import { DEFAULT_CONFIG_LOOKUP_PATHS } from "@/server/shared/config";
import type { Watcher } from "@/server/shared/file_watcher";
import { makeFilesWatcher } from "@/server/shared/file_watcher";
import { log } from "@/shared/logging";
import * as yaml from "js-yaml";
import { isEmpty, isObject } from "lodash";

async function startGlobalConfigWatcher(): Promise<Watcher | undefined> {
  const override = JSON.parse(process.env.BIOMES_CONFIG_OVERIDE || "{}");
  if (!isEmpty(override)) {
    log.warn("Using config override from BIOMES_CONFIG_OVERIDE", {
      override,
    });
  }

  const watcher = makeFilesWatcher(
    DEFAULT_CONFIG_LOOKUP_PATHS,
    (content, path) => {
      const config = yaml.load(content, {
        onWarning: (warning: yaml.YAMLException) => {
          log.warn(`Warning parsing config: ${warning.toString()}`);
        },
      });
      if (!isObject(config)) {
        log.error(`Invalid biomes config: ${path}`);
        return false;
      }
      Object.assign(CONFIG, config);
      Object.assign(CONFIG, override);
      CONFIG_EVENTS.emit("changed");

      return true;
    }
  );

  if (!(await watcher.reload())) {
    await watcher.close();
    return;
  }

  return {
    ...watcher,
    close: async () => {
      await watcher.close();
      CONFIG_EVENTS.removeAllListeners();
    },
  };
}

function makeCloseAllConfigs(watchers: Watcher[]): {
  close: () => Promise<void>;
} {
  return {
    close: async () => {
      await Promise.all(watchers.map((w) => w.close()));
    },
  };
}

export async function startConfigWatchers(): Promise<
  { close: () => Promise<void> } | undefined
> {
  const maybeWatchers = await Promise.allSettled([startGlobalConfigWatcher()]);

  const watchers: Watcher[] = [];
  for (const maybeWatcher of maybeWatchers) {
    if (
      maybeWatcher.status === "fulfilled" &&
      maybeWatcher.value !== undefined
    ) {
      watchers.push(maybeWatcher.value);
    }
  }
  // We might do an initial load for some watchers, and that might fail. If so,
  // close all watchers that succeeded and return failure.
  if (watchers.length != maybeWatchers.length) {
    await Promise.all(watchers.map((w) => w.close()));
    return;
  }

  return makeCloseAllConfigs(watchers);
}
