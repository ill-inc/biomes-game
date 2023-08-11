import type * as l from "@/galois/lang";
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  // Asset server stuff.
  makeAssetServer: async (sourceAssetDir: string) => {
    // There's only actually just a single asset server at a time,
    // so we don't need to track a reference to it even though the
    // interface makes it look like we do.
    let readyPromise = ipcRenderer.invoke("makeAssetServer", sourceAssetDir);
    return {
      build: async (asset: l.Asset) => {
        await readyPromise;
        return ipcRenderer.invoke("build", asset);
      },
      clearCache: async () => {
        // Recreating the asset server will effectively clear its cache.
        readyPromise = ipcRenderer.invoke("makeAssetServer", sourceAssetDir);
        return readyPromise;
      },
      glob: async (pattern: RegExp) => {
        // Recreating the asset server will effectively clear its cache.
        return ipcRenderer.invoke("glob", sourceAssetDir, pattern);
      },
    };
  },
  readUserData: () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return ipcRenderer.sendSync("readUserData");
  },
  writeUserData: (data: string) => {
    return ipcRenderer.invoke("writeUserData", data);
  },
  openExternal: (url: string) => {
    return ipcRenderer.invoke("openExternal", url);
  },

  // File dialog stuff.
  glob: (dir: string, pattern: RegExp) => {
    return ipcRenderer.invoke("glob", dir, pattern);
  },
  openDialog: (name: string, extensions: string[]) => {
    return ipcRenderer.invoke("openDialog", name, extensions);
  },
  openDirectoryDialog: () => {
    return ipcRenderer.invoke("openDirectoryDialog");
  },
  saveDialog: (name: string, extensions: string[]) => {
    return ipcRenderer.invoke("saveDialog", name, extensions);
  },
  loadFile: (path: string) => {
    return ipcRenderer.invoke("loadFile", path);
  },
  saveFile: (path: string, data: string) => {
    return ipcRenderer.invoke("saveFile", path, data);
  },
  existsSync: (path: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return ipcRenderer.sendSync("existsSync", path);
  },
});
