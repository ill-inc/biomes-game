// Service discovery API, for discovering the available values in a scope.
// This is typically used in a distributed system where we need to know which
// servers in a set are alive and available, for example to handle requests or
// in order to balance work across them.
//
// The most common implementation is the Redis one, which uses a periodic keepalive
// as well as TTL to ensure that the set of available values is kept up to date.
export interface ServiceDiscoveryApi {
  readonly service: string;

  // Get all services
  getKnownServices(): Promise<ReadonlySet<string>>;

  // Indicate we are available under a given value, this will replace any
  // prior advertisement, only one per client is allowed.
  publish(value: string): Promise<void>;
  unpublish(): Promise<void>;

  // Shutdown and cleanup.
  stop(): Promise<void>;

  // Return the current set of available values, this may also start a watch.
  discover(): Promise<ReadonlySet<string>>;

  // Listen to a change in the available values.
  on(event: "change", callback: (values: ReadonlySet<string>) => void): void;
  off(event: "change", callback: (values: ReadonlySet<string>) => void): void;
}
