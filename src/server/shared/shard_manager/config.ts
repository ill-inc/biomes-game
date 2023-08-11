import type {
  ShardDomainConfig,
  ShardManagerDomain,
} from "@/server/shared/shard_manager/api";
import {
  DEFAULT_TOTAL_SHARDS,
  chooseShardDomainConfig,
} from "@/server/shared/shard_manager/api";
import { log } from "@/shared/logging";
import { isEqual } from "lodash";

export class ShardDomainConfigWatcher {
  public current: ShardDomainConfig;

  constructor(
    private readonly domain: ShardManagerDomain,
    private readonly onChange: () => void
  ) {
    this.current = chooseShardDomainConfig(domain, CONFIG.shardManagerDomains);
    CONFIG_EVENTS.on("changed", this.onConfigChanged);
  }

  private onConfigChanged = () => {
    const newConfig = chooseShardDomainConfig(
      this.domain,
      CONFIG.shardManagerDomains
    );
    if (isEqual(this.current, newConfig)) {
      return;
    }
    log.info("Shard domain config changed, rebalancing.", {
      old: this.current,
      new: newConfig,
    });
    this.current = newConfig;
    this.onChange();
  };

  get shards() {
    return this.current.shards ?? DEFAULT_TOTAL_SHARDS;
  }

  get strategy() {
    return this.current.strategy;
  }

  stop() {
    CONFIG_EVENTS.off("changed", this.onConfigChanged);
  }
}
