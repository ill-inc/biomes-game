export type ElectionCampaign = "balancer" | `test:${string}`;

// Run a given function using a distributed election to guarantee
// isolation. Only one caller can run the function at a time, and others
// can inspect to find the value published by this, and also check whether
// it is the leader currently.
export interface Election {
  readonly campaign: ElectionCampaign;

  // Run a given function when elected as leader with a given
  // value. If some error occurs and we lose leadership then
  // the internal signal will abort.
  waitUntilElected<T>(
    value: string,
    fn: (signal: AbortSignal) => Promise<T>,
    signal: AbortSignal
  ): Promise<T>;

  // Return true if we are the leader.
  readonly isLeader: boolean;

  // Return the current leader's published value, this can be
  // undefined if no one is currently elected.
  getElectedValue(): Promise<string | undefined>;
}
