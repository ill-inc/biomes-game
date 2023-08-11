import type { Election, ElectionCampaign } from "@/server/shared/election/api";
import { ok } from "assert";

export class FakeElection implements Election {
  private value?: string;

  constructor(public readonly campaign: ElectionCampaign) {}

  get isLeader(): boolean {
    return this.value !== undefined;
  }

  async waitUntilElected<T>(
    value: string,
    fn: (signal: AbortSignal) => Promise<T>,
    signal: AbortSignal
  ): Promise<T> {
    ok(!this.value, "Already elected");
    this.value = value;
    try {
      return await fn(signal);
    } finally {
      this.value = undefined;
    }
  }

  async getElectedValue(): Promise<string | undefined> {
    return this.value;
  }
}
