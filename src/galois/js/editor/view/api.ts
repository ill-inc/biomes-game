import type { BuildAssetFn } from "@/galois/server/interface";

interface LoadResult {
  canceled: boolean;
  filePaths: string[];
}

interface SaveResult {
  canceled: boolean;
  filePath: string;
}

export interface AssetServerConnection {
  build: BuildAssetFn;
  clearCache: () => void;
  glob(pattern: RegExp): Promise<string[]>;
}

interface FileApi {
  existsSync(path: string): boolean;
  loadFile(path: string): Promise<string>;
  openDialog(name: string, extensions: string[]): Promise<LoadResult>;
  openDirectoryDialog(): Promise<LoadResult>;
  saveDialog(name: string, extensions: string[]): Promise<SaveResult>;
  saveFile(path: string, data: string): Promise<void>;
  glob(dir: string, pattern: RegExp): Promise<string[]>;
}

interface ServerApi {
  makeAssetServer(sourceAssetDir: string): Promise<AssetServerConnection>;
  openExternal(url: string): void;
  readUserData(): Record<string, unknown> | null;
  writeUserData(data: Record<string, unknown>): Promise<void>;
}

export type Api = FileApi & ServerApi;

export function clientApi() {
  if (typeof window === "undefined") {
    throw new Error("Attempt to use client API outside of window");
  }
  return (window as any).api as Api;
}
