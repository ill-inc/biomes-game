import type * as l from "@/galois/lang";
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  build: async (asset: l.Asset) => {
    return ipcRenderer.invoke("build", asset);
  },
});
