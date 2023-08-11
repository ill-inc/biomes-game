/* eslint-disable no-console */
import type { AsDelta, ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { DefaultMap } from "@/shared/util/collections";
import { zrpcSerialize } from "@/shared/zrpc/serde";

export class ComponentStats {
  observations: number[] = [];
  count = 0;
  size = 0;
  min?: number;
  max?: number;
  stddev?: number;

  get mean() {
    if (this.count > 0) {
      return this.size / this.count;
    }
  }

  record(size: number) {
    this.observations.push(size);
    this.count++;
    this.size += size;
    if (this.min === undefined || this.min > size) {
      this.min = size;
    }
    if (this.max === undefined || this.max < size) {
      this.max = size;
    }
  }

  diff(other: ComponentStats) {
    const ret = new ComponentStats();
    ret.count = this.count - other.count;
    ret.size = this.size - other.size;
    if (this.min && other.min) {
      ret.min = this.min - other.min;
    }
    if (this.max && other.max) {
      ret.max = this.max - other.max;
    }
    if (this.stddev && other.stddev) {
      ret.stddev = this.stddev - other.stddev;
    }
    return ret;
  }

  finalize() {
    const mean = this.mean;
    if (mean === undefined) {
      this.stddev = undefined;
      return;
    }
    this.stddev = 0;
    for (const o of this.observations) {
      this.stddev += (o - mean) * (o - mean);
    }
    this.stddev = Math.sqrt(this.stddev / this.count);
  }
}

function prettyBytes(n: number): string {
  if (n > 1024 * 1024) {
    return `${n} (${Math.ceil(n / 1024 / 1024)}m)`;
  } else if (n > 1024) {
    return `${n} (${Math.ceil(n / 1024)}k)`;
  }
  return String(n);
}

export class EntityStats {
  totalFileSize = 0;
  totalEntities = 0;
  totalComponents = 0;
  componentStatistics = new DefaultMap<string, ComponentStats>(
    () => new ComponentStats()
  );

  diff(other: EntityStats) {
    const ret = new EntityStats();
    ret.totalFileSize = this.totalFileSize - other.totalFileSize;
    ret.totalEntities = this.totalEntities - other.totalEntities;
    ret.totalComponents = this.totalComponents - other.totalComponents;
    for (const [key, stat] of other.componentStatistics) {
      ret.componentStatistics.set(
        key,
        stat.diff(this.componentStatistics.get(key))
      );
    }
    for (const [key, stat] of this.componentStatistics) {
      if (!other.componentStatistics.has(key)) {
        ret.componentStatistics.set(key, new ComponentStats().diff(stat));
      }
    }
    return ret;
  }

  observe(entity: ReadonlyEntity | AsDelta<ReadonlyEntity>) {
    this.totalEntities++;
    for (const [key, component] of Object.entries(entity)) {
      if (key === "id") {
        continue;
      }
      this.totalComponents++;
      const stat = this.componentStatistics.get(key);
      stat.record(zrpcSerialize(component).length);
    }
  }

  finalize() {
    for (const stat of this.componentStatistics.values()) {
      stat.finalize();
    }
  }

  toString() {
    return [
      `Total entities: ${this.totalEntities}`,
      `Total components: ${this.totalComponents}`,
      "",
      ...Array.from(this.componentStatistics.entries())
        .sort((a, b) => b[1].size - a[1].size)
        .flatMap(([key, comp]) => [
          key,
          `  count: ${comp.count}`,
          ...(comp.count === 0
            ? []
            : [
                `  size: ${prettyBytes(comp.size)}`,
                `  mean: ${comp.mean}`,
                `  min: ${comp.min}`,
                `  max: ${comp.max}`,
                `  stddev: ${comp.stddev}`,
              ]),
        ]),
    ].join("\n");
  }
}
