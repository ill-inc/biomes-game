import { isRunningOnKubernetes } from "@/server/shared/k8";
import { hostname } from "os";

let lastClientId = 0;

// Generate a nonce that is unique globally, but also meaningful.
export function generateNonce(): string {
  if (isRunningOnKubernetes()) {
    return `${hostname()}-${process.pid}-${++lastClientId}`;
  } else {
    return `${process.pid}-${++lastClientId}`;
  }
}
