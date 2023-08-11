import { log } from "@/shared/logging";
import type { Server } from "http";
import type { AddressInfo } from "net";

function defaultPort(n: number) {
  return parseInt(process.env.BASE_PORT || "3000", 10) + n;
}
export class HostPort {
  constructor(
    public readonly host: string,
    public readonly port: number,
    public readonly rpcPort: number
  ) {}

  get url(): string {
    return `http://${this.host}:${this.port}`;
  }

  get rpc(): string {
    return `${this.host}:${this.rpcPort}`;
  }

  toString(): string {
    return `${this.host}:${this.port}`;
  }

  private static fromK8Environment(service: string): HostPort | undefined {
    const host = process.env[`${service}_HOST`];
    const port = process.env[`${service}_PORT`];
    if (host && port) {
      const intPort = parseInt(port, 10);
      return new HostPort(host, intPort, intPort);
    }
  }

  private static fromLocalOverride(override: string): HostPort | undefined {
    const port = process.env[`${override}_PORT`];
    if (port) {
      const intPort = parseInt(port, 10);
      return new HostPort("127.0.0.1", intPort, intPort);
    }
  }

  private static forNamedService(
    name: string,
    defaultOffset: number
  ): HostPort {
    return (
      HostPort.fromK8Environment(`${name}_SERVICE`) ??
      HostPort.fromK8Environment(`${name}_SERVER_SERVICE`) ??
      HostPort.fromLocalOverride(name) ??
      new HostPort("127.0.0.1", defaultPort(defaultOffset), HostPort.rpcPort)
    );
  }

  static forWeb(): HostPort {
    return HostPort.forNamedService("WEB", 0);
  }

  static forMetrics(): HostPort {
    return (
      HostPort.fromLocalOverride("METRICS") ??
      new HostPort("127.0.0.1", defaultPort(1), HostPort.rpcPort)
    );
  }

  static forOob(): HostPort {
    if (process.env.NODE_ENV === "production") {
      return HostPort.forNamedService("OOB", 2);
    } else {
      return HostPort.forWeb();
    }
  }

  static forSync(): HostPort {
    if (process.env.NODE_ENV === "production") {
      return HostPort.forNamedService("SYNC", 2);
    } else {
      return HostPort.forWeb();
    }
  }

  static forCamera(): HostPort {
    return HostPort.forNamedService("CAMERA", 4);
  }

  static forGremlinsSync(): HostPort {
    if (process.env.NODE_ENV === "production") {
      return HostPort.forNamedService("BETA_SYNC", 2);
    } else {
      return HostPort.forNamedService("SYNC", 2);
    }
  }

  static forLogic(): HostPort {
    return HostPort.forNamedService("LOGIC", 4);
  }

  static forShim(): HostPort {
    return HostPort.forNamedService("SHIM", 4);
  }

  static forAsk(): HostPort {
    return HostPort.forNamedService("ASK", 4);
  }

  static forBalancer(): HostPort {
    return HostPort.forNamedService("BALANCER", 4);
  }

  static forRpc(): HostPort {
    return (
      HostPort.fromLocalOverride("RPC") ??
      new HostPort("127.0.0.1", defaultPort(1), defaultPort(4))
    );
  }

  static get rpcPort() {
    return HostPort.forRpc().rpcPort;
  }
}

export function listenWithDevFallback(
  name: string,
  server: Server,
  port?: number
) {
  let attemptedFallback = false;
  server.on("error", (e: any) => {
    if (
      !attemptedFallback &&
      e.code === "EADDRINUSE" &&
      process.env.NODE_ENV !== "production"
    ) {
      attemptedFallback = true;
      server.close();
      log.error(
        `> ${name} Server: could not use port ${port}, retrying with random.`
      );
      server.listen(0, "0.0.0.0", () => {
        const listeningOn =
          typeof server.address() === "string"
            ? server.address()
            : `http://127.0.0.1:${(server.address() as AddressInfo)?.port}`;
        log.warn(`> ${name} Server: ${listeningOn}`);
      });
      return;
    }
    log.fatal(`> ${name} Server: could not find port to listen on!`);
  });
  server.listen(port, "0.0.0.0", () => {
    if (!attemptedFallback) {
      log.info(`> ${name} Server: http://127.0.0.1:${port}`);
    }
  });
}
