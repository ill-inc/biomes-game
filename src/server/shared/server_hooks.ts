// For correct tracing setup, important this isn't
// enabled.
export interface ServerHooks {
  shutdownHook?: () => Promise<unknown>;
  readyHook?: () => Promise<boolean>;
  dumpHook?: () => Promise<unknown>;
}
