import * as k8s from "@kubernetes/client-node";

export function isRunningOnKubernetes() {
  return process.env.KUBERNETES_SERVICE_HOST !== undefined;
}

export interface EndpointPort {
  name: string;
  port: number;
}

export interface Endpoint {
  name: string;
  hostname?: string;
  ip: string;
  ports: EndpointPort[];
}

const SERVICE_NAMESPACE = "default";

export async function getServiceEndpoints(
  k8: k8s.CoreV1Api,
  serviceName: string
): Promise<Endpoint[]> {
  const { body } = await k8.readNamespacedEndpoints(
    serviceName,
    SERVICE_NAMESPACE
  );
  const endpoints: Endpoint[] = [];
  for (const subset of body.subsets ?? []) {
    if (subset.addresses === undefined || subset.ports === undefined) {
      continue;
    }
    const ports: EndpointPort[] = [];
    for (const port of subset.ports) {
      if (port.name === undefined || port.port === undefined) {
        continue;
      }
      ports.push({
        name: port.name,
        port: port.port,
      });
    }
    if (ports.length === 0) {
      continue;
    }
    for (const address of subset.addresses) {
      if (
        address.targetRef === undefined ||
        address.targetRef.kind !== "Pod" ||
        address.targetRef.name === undefined
      ) {
        continue;
      }
      endpoints.push({
        name: address.targetRef.name,
        hostname: address.hostname
          ? `${address.hostname}.${serviceName}.${SERVICE_NAMESPACE}.svc.cluster.local`
          : undefined,
        ip: address.ip,
        ports,
      });
    }
  }
  return endpoints;
}

export function getK8Config() {
  const config = new k8s.KubeConfig();
  config.loadFromDefault();
  return config;
}

export function connectToK8(): k8s.CoreV1Api {
  return getK8Config().makeApiClient(k8s.CoreV1Api);
}

export function connectToCustomK8(): k8s.CustomObjectsApi {
  return getK8Config().makeApiClient(k8s.CustomObjectsApi);
}
