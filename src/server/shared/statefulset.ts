import { ok } from "assert";
import { isInteger } from "lodash";
import { hostname } from "os";

export function statefulSetReplicas() {
  const replicas = parseInt(process.env.STATEFUL_SET_REPLICAS || "0");
  ok(isInteger(replicas));
  ok(replicas >= 0);
  return replicas;
}

export function statefulSetIndexFromHostname(hostname: string) {
  const parts = /^.*?-(\d+).*$/.exec(hostname);
  if (parts === null) {
    return 0;
  }
  return parseInt(parts[1]);
}

export function statefulSetIndex() {
  return statefulSetIndexFromHostname(hostname());
}
