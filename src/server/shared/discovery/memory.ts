import type { ServiceDiscoveryApi } from "@/server/shared/discovery/api";
import { autoId } from "@/shared/util/auto_id";
import { DefaultMap } from "@/shared/util/collections";
import { EventEmitter } from "events";

export class MemoryServiceDiscovery {
  private readonly emitter = new EventEmitter();
  private readonly values = new DefaultMap<string, Map<string, string>>(
    () => new Map()
  );

  get(service: string) {
    return new Set(this.values.get(service).values());
  }

  private set(service: string, nonce: string, value: string) {
    this.values.get(service).set(nonce, value);
    this.emitter.emit(service, this.get(service));
  }

  for(service: string): ServiceDiscoveryApi {
    const nonce = autoId();
    return {
      service,
      getKnownServices: async () => new Set(this.values.keys()),
      publish: async (value) => this.set(service, nonce, value),
      unpublish: async () => {
        this.values.get(service).delete(nonce);
      },
      stop: async () => {},
      discover: async () => this.get(service),
      on: (_event, callback) => this.emitter.on(service, callback),
      off: (_event, callback) => this.emitter.off(service, callback),
    };
  }
}
