import type * as l from "@/galois/lang";
import { DevAssetServer, WinAssetServer } from "@/galois/server/server";
import { app, BrowserWindow, ipcMain, protocol } from "electron";
import { join } from "path";

function parseArg(name: string, fallback: string) {
  return app.commandLine.getSwitchValue(name) || fallback;
}

const options = ((env: string) => {
  return {
    dir: parseArg("dir", defaultGaloisDir(env)),
    env: env,
  };
})(parseArg("env", "win"));

function defaultGaloisDir(env: string) {
  if (env === "win") {
    return "../..";
  } else {
    return "../../../../src/galois";
  }
}

function initAssetServer(env: string) {
  const execDir = join(__dirname, options.dir);
  const dataDir = join(__dirname, options.dir, "data");
  if (env === "win") {
    return new WinAssetServer(execDir, dataDir);
  } else if (env === "dev") {
    return new DevAssetServer(execDir, dataDir);
  } else {
    throw Error(`Invlaid environment: "${env}"`);
  }
}

// HACK: We get webgl errors when hardware acceleration is enabled
// when the viewer is launched within WSL.
if (process.platform === "linux") {
  app.disableHardwareAcceleration();
}

// Create the asset server.
const assetServer = initAssetServer(options.env);

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

  // Kill the app when the window is closed.
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
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
    if (relative.startsWith("/data")) {
      callback({ path: join(__dirname, options.dir, relative) });
    } else {
      callback({ path: path });
    }
  });
});

// Handle build requests.
ipcMain.handle("build", (event: any, asset: l.Asset) => {
  return assetServer.build(asset);
});
