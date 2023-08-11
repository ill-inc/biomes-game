import type { AssetData, ErrorData } from "@/galois/interface/types/data";
import * as l from "@/galois/lang";
import type {
  AssetQuery,
  AssetServer,
  NamedQuery,
} from "@/galois/server/interface";
import { log } from "@/shared/logging";
import { ok } from "assert";
import type { ChildProcess } from "child_process";
import { spawn } from "child_process";
import { join } from "path";
import * as readline from "readline";
import type { Readable, Writable } from "stream";

function isNamedQuery(query: AssetQuery): query is NamedQuery {
  return Object.hasOwn(query, "name");
}

function serializeQuery(query: AssetQuery): string {
  if (isNamedQuery(query)) {
    // HACK: The below is a temporary hack to ensure that the program is will
    // hash differently depending on its name by adding a no-op string node.
    const program = l.toProgram(query);
    const last = program.pop();
    return JSON.stringify([
      ...program,
      ...l.toProgram(l.toStr(query.name)),
      last,
    ]);
  } else {
    return l.serialize(query);
  }
}

function parseBuildResult(result: Buffer): AssetData | ErrorData {
  try {
    const data = JSON.parse(result.toString());
    if ((data as ErrorData).kind == "Error") {
      log.info("Exception occurred during build:");
      log.info(data.info.join(""));
    }
    return data;
  } catch (error) {
    log.error("Error parsing JSON");
    log.error(result.toString());
    return {
      kind: "Error",
      info: [result.toString()],
    };
  }
}

// Asset server used during local development.
export class DevAssetServer implements AssetServer {
  constructor(
    private execDir: string,
    private dataDir: string,
    private additionalArgs: string[] = []
  ) {}

  async build<T extends AssetData>(asset: l.Asset) {
    // The value of the DevAssetServer is that it re-spawns a Python process
    // on every call to build(), so that you can quickly evaluate changes
    // to Python code as you modify it.
    const batchAssetServer = new BatchAssetServer(
      this.execDir,
      this.dataDir,
      this.additionalArgs
    );
    const result = await batchAssetServer.build<T>(asset);
    await batchAssetServer.stop();
    return result;
  }

  async stop() {
    // Nothing to do because there's no persistent state here.
  }
}

// Asset server used with a persistent builder subprocess.
export class BatchAssetServer implements AssetServer {
  private process: ChildProcess | undefined;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    execDir: string,
    dataDir: string,
    additionalArgs: string[] = [],
    buildCommand = "python py/assets/build.py"
  ) {
    // We want the child process to ignore SIGINT (ctrl+c) so that we can
    // handle it and gracefully shutdown the child.
    this.process = spawn(
      buildCommand,
      ["batch", `--workspace="${dataDir}"`, "--ignore_sigint"].concat(
        additionalArgs
      ),
      {
        cwd: execDir,
        stdio: ["ignore", "inherit", "inherit", "pipe", "pipe"],
        shell: true,
        windowsHide: true,
      }
    );
  }

  private send(data: string) {
    (this.process?.stdio[3] as Writable)?.write(data);
  }

  async stop() {
    this.queue = this.queue.then(() => {
      this.send("\n\n"); // End process.
      this.process = undefined;
    });
    return this.queue as Promise<void>;
  }

  async build<T extends AssetData>(asset: l.Asset): Promise<T | ErrorData> {
    if (!this.process) {
      throw new Error("Asset server not running");
    }
    const program = serializeQuery(asset);
    this.queue = this.queue.then(() => {
      this.send(`${program.length}\n${program}`);
      return new Promise((resolve, reject) => {
        if (!this.process) {
          reject(new Error("Asset server not running"));
          return;
        }
        const rl = readline.createInterface({
          input: this.process.stdio[4] as Readable,
          crlfDelay: Infinity,
        });
        rl.once("line", (data) => {
          const result = Buffer.from(data.slice(2, data.length - 1), "base64");
          resolve(parseBuildResult(result));
          rl.close();
        });
      });
    });
    return this.queue as Promise<T>;
  }
}

// Asset server used in the packaged Windows applications.
export class WinAssetServer implements AssetServer {
  // Just forward along to the BatchAssetServer, it does what we want.
  private batchAssetServer: BatchAssetServer;

  constructor(execDir: string, dataDir: string, additionalArgs: string[] = []) {
    this.batchAssetServer = new BatchAssetServer(
      execDir,
      dataDir,
      additionalArgs,
      `"${join(__dirname, "build.exe")}"`
    );
  }

  async stop() {
    await this.batchAssetServer.stop();
  }

  async build<T extends AssetData>(asset: l.Asset) {
    return this.batchAssetServer.build<T>(asset);
  }
}

interface PoolAssetServerWorker {
  server: BatchAssetServer;
  available: Promise<unknown>;
}
export class PoolAssetServer implements AssetServer {
  private workers: PoolAssetServerWorker[] = [];
  private acquireWorkerQueue: Promise<PoolAssetServerWorker | null> =
    Promise.resolve(null);

  constructor(
    execDir: string,
    dataDir: string,
    numWorkers: number,
    additionalArgs: string[] = []
  ) {
    ok(numWorkers > 0);
    for (let i = 0; i < numWorkers; ++i) {
      this.workers.push({
        server: new BatchAssetServer(execDir, dataDir, additionalArgs),
        available: Promise.resolve(),
      });
    }
  }

  async build<T extends AssetData>(asset: l.Asset) {
    this.acquireWorkerQueue = this.acquireWorkerQueue.then(() => {
      // Wait for a ready worker to free up.
      return Promise.any(this.workers.map((x) => x.available.then(() => x)));
    });
    // Wait for a worker to become available.
    const worker = await this.acquireWorkerQueue;
    ok(worker);

    // Build the asset.
    worker.available = worker.server.build<T>(asset);
    return worker.available as Promise<T | ErrorData>;
  }

  async stop() {
    await this.acquireWorkerQueue.then(() =>
      Promise.all(this.workers.map((x) => x.server.stop()))
    );
  }
}
