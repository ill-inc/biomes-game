import type * as l from "@/galois/lang";
import type { AssetServer } from "@/galois/server/interface";
import {
  BatchAssetServer,
  DevAssetServer,
  WinAssetServer,
} from "@/galois/server/server";
import { log } from "@/shared/logging";
import { ok } from "assert";
import type { IpcMainEvent } from "electron";
import { app, BrowserWindow, dialog, ipcMain, protocol, shell } from "electron";
import { existsSync, readFileSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { glob } from "glob";
import { join } from "path";

function parseArg(name: string, fallback: string) {
  return app.commandLine.getSwitchValue(name) || fallback;
}

function defaultGaloisDir(env: string) {
  if (env === "win") {
    return "../..";
  } else {
    return "../../../../src/galois";
  }
}

const options = ((env: string) => {
  return {
    dir: parseArg("dir", defaultGaloisDir(env)),
    env: env,
  };
})(parseArg("env", "win"));

interface AssetServerWithBuildDir {
  server: AssetServer;
  staticFilesDir: string;
  sourceAssetDir: string;
}

function initAssetServer(sourceAssetDir: string): AssetServerWithBuildDir {
  let server = null;
  if (options.env === "win") {
    log.info("Initialize win asset server...");
    server = new WinAssetServer(join(__dirname, options.dir), sourceAssetDir);
  } else if (options.env === "dev") {
    log.info("Initialize dev asset server...");
    server = new DevAssetServer(join(__dirname, options.dir), sourceAssetDir);
  } else if (options.env === "batch") {
    log.info("Initialize batch asset server...");
    server = new BatchAssetServer(join(__dirname, options.dir), sourceAssetDir);
  } else {
    throw Error(`Invalid environment: "${options.env}"`);
  }
  return {
    server: server,
    staticFilesDir: options.dir,
    sourceAssetDir: sourceAssetDir,
  };
}

// Create the asset server.
let assetServer: AssetServerWithBuildDir | null = null;

// Create the electron server.
void app.whenReady().then(() => {
  // Create the window.
  const window = new BrowserWindow({
    backgroundColor: "#2f3136",
    width: 1600,
    height: 1000,
    show: false,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      devTools: true,
    },
  });

  // Initialize the window contents.
  window.setMenuBarVisibility(false);
  void window.loadFile(join(__dirname, "index.html"));

  // Show the window when it's ready.
  window.on("ready-to-show", () => {
    window.show();
    window.focus();
  });

  window.webContents.on("did-start-navigation", (e: any) => {
    // Reset the asset server when the page is reloaded (e.g. ctrl + r).
    if (!e.isInPlace) {
      if (assetServer) {
        void assetServer.server.stop();
      }
    }
  });

  // Kill the app when the window is closed.
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      if (assetServer) {
        void assetServer.server.stop();
      }
      app.quit();
    }
  });

  // Intercept data file requests to read from the data directory.
  // TODO: It would make a lot more sense for the data files to be relative
  // to the dist directory like everything else. Figure out some build time
  // operation for generating a symbol link to data files.
  protocol.interceptFileProtocol("file", (request, callback) => {
    const path = decodeURIComponent(request.url.substring("file:///".length));
    const relative = path.substring(__dirname.length);
    if (assetServer && relative.startsWith("/data")) {
      callback({ path: join(__dirname, assetServer.staticFilesDir, relative) });
    } else {
      callback({ path: path });
    }
  });
});

// Handle build requests.
ipcMain.handle(
  "makeAssetServer",
  async (_event: any, sourceAssetDir: string) => {
    if (assetServer) {
      await assetServer.server.stop();
    }
    assetServer = initAssetServer(sourceAssetDir);
    log.info(`Created new asset server: ${assetServer}`);
  }
);

function getUserDataFilePath() {
  return `${app.getPath("userData")}/galois-user-file.json`;
}

// *synchronously* read user data and return it.
ipcMain.on("readUserData", (event: IpcMainEvent) => {
  const configFilePath = getUserDataFilePath();
  const fileExists = existsSync(configFilePath);
  if (!fileExists) {
    event.returnValue = null;
  } else {
    try {
      event.returnValue = JSON.parse(readFileSync(configFilePath, "utf8"));
    } catch (e) {
      log.error(`Error reading user data file data, ignoring it. Error: ${e}`);
      event.returnValue = null;
    }
  }
});

ipcMain.handle("writeUserData", (_, data: Record<string, unknown>) => {
  return writeFile(getUserDataFilePath(), JSON.stringify(data));
});

ipcMain.handle("openExternal", (_, url: string) => {
  return shell.openExternal(url);
});

ipcMain.handle("build", async (_: any, asset: l.Asset) => {
  ok(assetServer, "Calling build() before an asset server was created.");
  return assetServer.server.build(asset);
});

// Handle file dialogs for opening and saving files.
ipcMain.handle("openDialog", (_, name: string, extensions: string[]) => {
  return dialog.showOpenDialog({
    filters: [{ name, extensions }],
    properties: ["openFile"],
  });
});
ipcMain.handle("openDirectoryDialog", (_) => {
  return dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
});
ipcMain.handle("saveDialog", (_, name: string, extensions: string[]) => {
  return dialog.showSaveDialog({
    filters: [{ name, extensions }],
  });
});

// Handle reading and writing files to the file system.
ipcMain.handle("loadFile", (_, path: string) => {
  return readFile(path).then((buffer) => buffer.toString());
});
ipcMain.handle("saveFile", (_, path: string, data: string) => {
  return writeFile(path, data);
});
ipcMain.handle("glob", (_, dir: string, pattern: RegExp) => {
  return new Promise((resolve) => {
    ok(assetServer);
    glob(join(dir, "**"), (err, files) => {
      resolve(files.filter((path) => pattern.test(path)));
    });
  });
});

ipcMain.on("existsSync", (event: IpcMainEvent, path: string) => {
  event.returnValue = existsSync(path);
});
