import * as k8s from "@kubernetes/client-node";
import { ok } from "assert";
import { writeFile } from "fs/promises";
import path from "path";

// ===== Buffer to avoid git conflicts =====
const LAST_BOB_BUILD = "bob-354da53d0a";
// ===== Buffer to avoid git conflicts =====
const LAST_BOB_IMAGE = "bob-354da53d0a";
// ===== Buffer to avoid git conflicts =====

// Fix deploy.
const PROD_IMAGE_OVERRIDE = "devin-deploy-2";

const PROD_IMAGE_TAG = PROD_IMAGE_OVERRIDE || LAST_BOB_IMAGE || LAST_BOB_BUILD;
const PROD_IMAGE_NAME = "us-central1-docker.pkg.dev/zones-cloud/b/biomes";

const SERVICE_DEFAULTS = {
  image: `${PROD_IMAGE_NAME}:${PROD_IMAGE_TAG}`,
  cpu: 1.0,
} as const;

const BASE_CONFIG_ARGS = Object.entries({
  bikkieCacheMode: "redis",
  biscuitMode: "redis2",
  chatApiMode: "redis",
  firehoseMode: "redis",
  serverCacheMode: "redis",
  storageMode: "firestore",
  worldApiMode: "hfc-hybrid",
}).flatMap(([k, v]) => [`--${k}`, String(v)]);

const USE_NGINX = true;
const USE_NODE_LOCAL_REDIS = false;
const ZRPC_PORT = 3004;

const SYNC_DEFAULTS = {
  ...SERVICE_DEFAULTS,
  replicas: 2,
  args: BASE_CONFIG_ARGS,
  ws: true,
  zrpc: true,
  cpu: 2.0,
  memory: 2 * 1024,
  additionalEnv: [],
};

class Autoscale {
  constructor(
    public readonly targetCpu: number,
    public readonly minPods: number,
    public readonly maxPods: number
  ) {}
}

// Define the Biomes service layout.
function createBiomes() {
  return [
    // Asset Server
    biomesIngress({
      name: "asset",
    }),
    biomesDisruptionBudget("asset"),
    ...biomesDeployment({
      ...SERVICE_DEFAULTS,
      name: "asset",
      entryPoint: "web",
      replicas: 1,
      http: true,
      args: [...BASE_CONFIG_ARGS, "-a", "local"],
      cpu: 1.5,
      memory: 4 * 1024,
    }),
    // Periodic backup job.
    biomesCron("0 * * * *", {
      ...SERVICE_DEFAULTS,
      name: "backup",
      args: BASE_CONFIG_ARGS,
      replicas: 1,
      memory: 4 * 1024,
    }),
    // Notifications server.
    ...biomesDeployment({
      ...SERVICE_DEFAULTS,
      name: "notify",
      args: BASE_CONFIG_ARGS,
      replicas: 1,
      cpu: 0.5,
      memory: 1024,
    }),
    // Trigger server.
    ...biomesDeployment({
      ...SERVICE_DEFAULTS,
      name: "trigger",
      args: BASE_CONFIG_ARGS,
      replicas: 1,
      memory: 2 * 1024,
    }),
    // Chat server
    biomesService({
      name: "chat",
    }),
    biomesDisruptionBudget("chat"),
    ...biomesDeployment({
      ...SERVICE_DEFAULTS,
      name: "chat",
      replicas: 1,
      args: BASE_CONFIG_ARGS,
      memory: 1 * 1024,
    }),
    // Logic server
    biomesService({
      name: "logic",
    }),
    biomesDisruptionBudget("logic"),
    ...biomesDeployment({
      ...SERVICE_DEFAULTS,
      name: "logic",
      replicas: 1,
      args: BASE_CONFIG_ARGS,
      zrpc: true,
      memory: 4 * 1024,
    }),
    // Bikkie server
    ...biomesStatefulSet({
      ...SERVICE_DEFAULTS,
      name: "bikkie",
      replicas: 1,
      args: BASE_CONFIG_ARGS,
      cpu: 1.0,
      memory: 4 * 1024,
    }),
    // Ask server, for use by others
    biomesService({
      name: "ask",
    }),
    biomesDisruptionBudget("ask"),
    ...biomesDeployment({
      ...SERVICE_DEFAULTS,
      name: "ask",
      replicas: 1,
      args: BASE_CONFIG_ARGS,
      zrpc: true,
      cpu: 1.5,
      memory: 4 * 1024,
    }),
    // Balancer server, shard balancing
    biomesService({
      name: "balancer",
    }),
    biomesDisruptionBudget("balancer"),
    ...biomesDeployment({
      ...SERVICE_DEFAULTS,
      name: "balancer",
      replicas: 1,
      args: BASE_CONFIG_ARGS,
      zrpc: true,
      memory: 512,
      cpu: 0.5,
    }),
    // Task Server
    // Was only responsible for repairing photo warps, stop that
    //...biomesDeployment({
    //  ...SERVICE_DEFAULTS,
    //  name: "task",
    //  args: BASE_CONFIG_ARGS,
    //  replicas: 1,
    //  memory: 1024,
    //}),
    // Gaia V2 server
    ...gaiaDeployment({
      name: "flora",
      simulations: [
        "flora_decay",
        "flora_growth",
        "flora_muck",
        "leaf_growth",
        "tree_growth",
      ],
      replicas: 1,
    }),
    ...gaiaDeployment({
      name: "flow",
      simulations: ["muck", "water"],
      replicas: 1,
    }),
    ...gaiaDeployment({
      name: "light",
      simulations: ["irradiance", "sky_occlusion"],
      replicas: 3,
    }),
    ...gaiaDeployment({
      name: "restoration",
      simulations: ["restoration", "lifetime", "ore_growth"],
      replicas: 1,
    }),
    ...gaiaDeployment({
      name: "farming",
      simulations: ["farming"],
      replicas: 1,
    }),
    // Map server (v2)
    ...biomesDeployment({
      ...SERVICE_DEFAULTS,
      name: "map",
      args: BASE_CONFIG_ARGS,
      replicas: 1,
      memory: 10 * 1024,
    }),
    // Newton server
    ...biomesDeployment({
      ...SERVICE_DEFAULTS,
      name: "newton",
      args: BASE_CONFIG_ARGS,
      replicas: 1,
      memory: 4 * 1024,
      additionalEnv: [
        {
          name: "SHARD_MANAGER_KIND",
          value: "distributed",
        },
      ],
    }),
    // SideFx server
    ...biomesDeployment({
      ...SERVICE_DEFAULTS,
      name: "sidefx",
      args: BASE_CONFIG_ARGS,
      replicas: 1,
      memory: 4 * 1024,
    }),
    // Anima server
    biomesDisruptionBudget("anima"),
    ...biomesDeployment({
      ...SERVICE_DEFAULTS,
      name: "anima",
      replicas: new Autoscale(70, 2, 5),
      args: BASE_CONFIG_ARGS,
      memory: 4 * 1024,
      additionalEnv: [{ name: "ANIMA_HFC_WRITES", value: "1" }],
    }),
    // Spawn server
    biomesDisruptionBudget("spawn"),
    ...biomesDeployment({
      ...SERVICE_DEFAULTS,
      name: "spawn",
      args: BASE_CONFIG_ARGS,
      replicas: 1,
      memory: 4 * 1024,
      cpu: 0.5,
    }),
    // Gizmo (Gremlin/Load) Server
    // Service not really used, is for the stateful set.
    //biomesService({
    //      name: "gizmo",
    //  }),
    //...biomesStatefulSet({
    //...SERVICE_DEFAULTS,
    //name: "gizmo",
    //replicas: 1,
    //args: BASE_CONFIG_ARGS,
    //memory: 4 * 1024,
    //}),
    // OOB query server
    biomesIngress({
      name: "oob",
    }),
    biomesDisruptionBudget("oob"),
    ...biomesDeployment({
      ...SERVICE_DEFAULTS,
      name: "oob",
      replicas: 2,
      args: BASE_CONFIG_ARGS,
      http: true,
      memory: 1024,
      additionalEnv: [{ name: "PERMIT_ANONYMOUS", value: "1" }],
    }),
    // Sink Server, not need any more to dump to bigquery
    //...biomesDeployment({
    //      ...SERVICE_DEFAULTS,
    //name: "sink",
    //replicas: 1,
    //args: BASE_CONFIG_ARGS,
    //memory: 4 * 1024,
    //additionalEnv: [{ name: "WASM_MEMORY", value: "512" }],
    //}),
    // Sync Server
    biomesIngress({
      name: "sync",
      selectorLabels: {
        "biomes/provider": "sync",
      },
      ws: true,
    }),
    biomesDisruptionBudget("sync"),
    ...biomesDeployment({
      ...SYNC_DEFAULTS,
      name: "sync",
      replicas: 2,
      additionalLabels: {
        "biomes/provider": "sync",
      },
    }),
    biomesIngress({
      name: "ro-sync",
      ws: true,
    }),
    biomesDisruptionBudget("ro-sync"),
    ...biomesDeployment({
      ...SYNC_DEFAULTS,
      name: "ro-sync",
      entryPoint: "sync",
      replicas: 1,
      additionalEnv: [
        ...SYNC_DEFAULTS.additionalEnv,
        { name: "RO_SYNC", value: "1" },
      ],
    }),
    // Web Server
    biomesIngress({
      name: "web",
    }),
    biomesDisruptionBudget("web"),
    ...biomesDeployment({
      ...SERVICE_DEFAULTS,
      name: "web",
      replicas: 3,
      args: BASE_CONFIG_ARGS,
      memory: 1500,
      http: true,
    }),
  ];
}

function biomesLabels({
  name,
  additionalLabels,
}: {
  name: string;
  additionalLabels?: { [key: string]: string };
}) {
  return {
    ...(additionalLabels ?? {}),
    "app.kubernetes.io/component": "biomes",
    "app.kubernetes.io/name": name,
    name: name,
  };
}

function biomesIngress({
  name,
  selectorLabels,
  targetPort,
  ws,
}: {
  name: string;
  selectorLabels?: { [key: string]: string };
  targetPort?: string;
  ws?: boolean;
}) {
  return <k8s.V1Service>{
    apiVersion: "v1",
    kind: "Service",
    metadata: {
      namespace: "default",
      name,
      annotations: {
        "cloud.google.com/neg": '{"ingress": true}',
        "cloud.google.com/backend-config": `{"default": "${
          ws ? "biomes-sockets" : USE_NGINX ? "biomes-nginx" : "biomes"
        }"}`,
      },
    },
    spec: {
      selector: selectorLabels ?? biomesLabels({ name }),
      ports: [
        {
          name: "http",
          port: 3000,
          targetPort:
            targetPort ?? (ws ? "main" : USE_NGINX ? "nginx" : "main"),
        },
      ],
    },
  };
}

function biomesService({
  name,
  selectorLabels,
}: {
  name: string;
  selectorLabels?: { [key: string]: string };
}) {
  return <k8s.V1Service>{
    apiVersion: "v1",
    kind: "Service",
    metadata: {
      namespace: "default",
      name,
    },
    spec: {
      selector: selectorLabels ?? biomesLabels({ name }),
      ports: [
        {
          name: "http",
          port: ZRPC_PORT,
          targetPort: "zrpc",
        },
      ],
    },
  };
}

const workloadIdentityInitContainer = <k8s.V1Container>{
  image: "gcr.io/google.com/cloudsdktool/cloud-sdk:326.0.0-alpine",
  name: "workload-identity-initcontainer",
  command: [
    "/bin/bash",
    "-c",
    "curl -s -H 'Metadata-Flavor: Google' 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token' --retry 30 --retry-connrefused --retry-max-time 30 > /dev/null || exit 1",
  ],
};

const redisReadyInitContainer = <k8s.V1Container>{
  image: "redis:7.0.5-alpine",
  name: "redis-ready-initcontainer",
  command: [
    "/bin/sh",
    "-c",
    "until redis-cli -s /redis-replica-io/redis.sock ping | grep PONG; do sleep 1; done",
  ],
  volumeMounts: [
    {
      name: "redis-replica-io",
      mountPath: "/redis-replica-io",
    },
  ],
};

const defaultProbe: Record<"startup" | "liveness" | "readiness", k8s.V1Probe> =
  {
    startup: {
      httpGet: {
        path: "/ready",
        port: "metrics",
      },
      // Give the container 10 minutes (60 x period=10) to finish startup.
      failureThreshold: 60,
      initialDelaySeconds: 0,
      periodSeconds: 10,
      timeoutSeconds: 5,
    },
    liveness: {
      httpGet: {
        path: "/alive",
        port: "metrics",
      },
      failureThreshold: 10,
      initialDelaySeconds: 0,
      periodSeconds: 1,
      timeoutSeconds: 5,
    },
    readiness: {
      httpGet: {
        path: "/ready",
        port: "metrics",
      },
      failureThreshold: 1,
      initialDelaySeconds: 0,
      periodSeconds: 1,
      timeoutSeconds: 1,
    },
  };

interface BiomesServiceConfig {
  image: string;
  name: string;
  replicas: Autoscale | number;
  entryPoint?: string;
  args?: string[];
  zrpc?: boolean;
  http?: boolean;
  ws?: boolean;
  cpu: number;
  memory: number;
  youngGenMemory?: number;
  additionalLabels?: { [key: string]: string };
  additionalEnv?: { name: string; value: string }[];
  // See: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes
  startupProbe?: k8s.V1Probe | "none";
  livenessProbe?: k8s.V1Probe | "none";
  readinessProbe?: k8s.V1Probe | "none";
}

function biomesPodTemplate({
  image,
  name,
  entryPoint,
  args,
  zrpc,
  http,
  ws,
  cpu,
  memory,
  youngGenMemory,
  additionalLabels,
  additionalEnv,
  startupProbe,
  livenessProbe,
  readinessProbe,
}: BiomesServiceConfig) {
  // Graceful shutdown process:
  // 0. K8 removes pod from endpoints, traffic begins to stop.
  // 1. K8 runs preStop hooks
  //    - linkerd (service mesh) will wait 60 seconds,
  //      configured using proxy-wait-before-exit-seconds
  // 2. K8 issues SIGTERM to main process
  //    It listens to this and begins graceful shutdown.
  // 3. Main process exits, its last action is to tell the linkerd
  //    proxy to exit explicitly with /shutdown
  // --- if main process fails to issue shutdown ---
  // 4. Linkerd proxy hits 60 seconds timer, exits
  //    (main process loses networking)
  // --- if main process fails to shutdown ---
  // 5. After 65s from #1 (terminationGracePeriodSeconds),
  //    K8 issues SIGKILL to everything, forcibly ending them.
  return <k8s.V1PodTemplateSpec>{
    metadata: {
      labels: {
        ...biomesLabels({ name, additionalLabels }),
      },
      namespace: "default",
      annotations: {
        "linkerd.io/inject": "enabled",
        "config.linkerd.io/proxy-await": "enabled",
        "config.linkerd.io/skip-outbound-ports": "6379,2379",
        "config.linkerd.io/skip-subnets": "169.254.169.254/32",
        "config.alpha.linkerd.io/proxy-wait-before-exit-seconds": "60",
        "kubectl.kubernetes.io/default-container": "biomes",
      },
    },
    spec: {
      serviceAccountName: "zones-backend",
      nodeSelector: {
        "iam.gke.io/gke-metadata-server-enabled": "true",
      },
      terminationGracePeriodSeconds: 65,
      volumes: [
        {
          name: "biomes-config",
          configMap: {
            name: "biomes-config",
            items: [
              {
                key: "config",
                path: "biomes.config.yaml",
              },
            ],
          },
        },
        {
          name: "redis-replica-io",
          hostPath: {
            path: "/tmp/redis-replica-io",
            type: "DirectoryOrCreate",
          },
        },
        {
          name: "nginx-config",
          configMap: {
            name: "nginx-config",
            items: [
              {
                key: "config",
                path: "nginx.conf",
              },
            ],
          },
        },
      ],
      initContainers: [
        workloadIdentityInitContainer,
        ...(USE_NODE_LOCAL_REDIS ? [redisReadyInitContainer] : []),
      ],
      containers: [
        {
          image,
          name: "biomes",
          args: [
            ...(youngGenMemory
              ? [`--max-semi-space-size=${youngGenMemory}`]
              : []),
            "-r",
            "ts-node/register",
            `src/server/${entryPoint ?? name}/main.ts`,
            ...(args ?? []),
          ],
          env: [
            {
              name: "POD_IP",
              valueFrom: {
                fieldRef: {
                  fieldPath: "status.podIP",
                },
              },
            },
            {
              name: "CPU_COUNT",
              value: `${cpu}`,
            },
            {
              name: "NODE_OPTIONS",
              value: `--openssl-legacy-provider --max-old-space-size=${memory}`,
            },
            {
              name: "GOOGLE_CLOUD_PROJECT",
              value: "zones-cloud",
            },
            {
              name: "IS_SERVER",
              value: "true",
            },
            {
              name: "NEXT_TELEMETRY_DISABLED",
              value: "1",
            },
            {
              name: "DETECT_GCP_RETRIES",
              value: "3",
            },
            {
              name: "USE_REDIS_REPLICAS",
              value: USE_NODE_LOCAL_REDIS ? "1" : "0",
            },
            {
              name: "LD_PRELOAD",
              value: "/usr/local/lib/libjemalloc.so.2",
            },
            {
              name: "USE_K8_REDIS",
              value: "1",
            },
            ...(additionalEnv ?? []),
          ],
          volumeMounts: [
            {
              name: "biomes-config",
              mountPath: "/biomes",
            },
            {
              name: "redis-replica-io",
              mountPath: "/redis-replica-io",
            },
          ],
          ports: [
            {
              name: "metrics",
              containerPort: 3001,
            },
            ...(http || ws
              ? [
                  {
                    name: "main",
                    containerPort: 3000,
                  },
                ]
              : []),
            ...(zrpc
              ? [
                  {
                    name: "zrpc",
                    containerPort: ZRPC_PORT,
                  },
                ]
              : []),
          ],
          ...(startupProbe === "none"
            ? {}
            : {
                startupProbe: {
                  ...defaultProbe.startup,
                  ...startupProbe,
                },
              }),
          ...(livenessProbe === "none"
            ? {}
            : {
                livenessProbe: {
                  ...defaultProbe.liveness,
                  ...livenessProbe,
                },
              }),
          ...(readinessProbe === "none"
            ? {}
            : {
                readinessProbe: {
                  ...defaultProbe.readiness,
                  ...readinessProbe,
                },
              }),
          resources: {
            requests: {
              memory: `${memory}Mi`,
              cpu: `${cpu}`,
            },
          },
        },
        ...(http
          ? [
              {
                name: "nginx",
                image: "nginx:stable",
                args: [],
                volumeMounts: [
                  {
                    name: "nginx-config",
                    mountPath: "/etc/nginx",
                  },
                ],
                resources: {
                  requests: {
                    cpu: "1",
                  },
                },
                ports: [
                  {
                    name: "nginx",
                    containerPort: 80,
                  },
                  {
                    name: "nginx-metrics",
                    containerPort: 81,
                  },
                ],
                livenessProbe: {
                  httpGet: {
                    path: "/l1-ready",
                    port: "nginx-metrics",
                  },
                  failureThreshold: 2,
                },
                ...(readinessProbe === "none"
                  ? {}
                  : {
                      readinessProbe: {
                        ...defaultProbe.readiness,
                        httpGet: {
                          // Change to the nginx port.
                          path: "/ready",
                          port: "nginx-metrics",
                        },
                        ...readinessProbe,
                      },
                    }),
              },
            ]
          : []),
      ],
    },
  };
}

function biomesDisruptionBudget(name: string) {
  return <k8s.V1PodDisruptionBudget>{
    apiVersion: "policy/v1",
    kind: "PodDisruptionBudget",
    metadata: {
      labels: biomesLabels({ name }),
      namespace: "default",
      name,
    },
    spec: {
      minAvailable: 1,
      selector: {
        matchLabels: biomesLabels({ name }),
      },
    },
  };
}

function maybeHorizontalPodAutoscaler(
  config: BiomesServiceConfig,
  target: k8s.V1Deployment | k8s.V1StatefulSet
) {
  const { name, additionalLabels, replicas } = config;
  if (typeof replicas === "number") {
    return [];
  }
  return [
    <k8s.V1HorizontalPodAutoscaler>{
      apiVersion: "autoscaling/v2",
      kind: "HorizontalPodAutoscaler",
      metadata: {
        labels: {
          ...biomesLabels({ name, additionalLabels }),
        },
        namespace: "default",
        name,
      },
      spec: {
        scaleTargetRef: {
          apiVersion: target.apiVersion,
          kind: target.kind,
          name: target.metadata!.name,
        },
        minReplicas: replicas.minPods,
        maxReplicas: replicas.maxPods,
        metrics: [
          {
            type: "Resource",
            resource: {
              name: "cpu",
              target: {
                type: "Utilization",
                averageUtilization: replicas.targetCpu,
              },
            },
          },
        ],
      },
    },
  ];
}

function biomesDeployment(config: BiomesServiceConfig) {
  const { name, additionalLabels, replicas } = config;
  const deployment = {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      labels: {
        ...biomesLabels({ name, additionalLabels }),
      },
      namespace: "default",
      name,
    },
    spec: {
      replicas: typeof replicas === "number" ? replicas : undefined,
      strategy: {
        type: "RollingUpdate",
        rollingUpdate: {
          maxUnavailable: 0,
        },
      },
      selector: {
        matchLabels: biomesLabels({ name }),
      },
      template: biomesPodTemplate(config),
    },
  } satisfies k8s.V1Deployment;
  return [
    deployment,
    ...maybeHorizontalPodAutoscaler(config, deployment),
  ] as const;
}

function cameraDeployment(config: BiomesServiceConfig) {
  const base = biomesDeployment(config);
  const deployment = base[0];
  const podSpec = deployment.spec.template.spec!;
  (podSpec.securityContext ??= {}).fsGroup = 2000;
  (podSpec.volumes ??= []).push({
    name: "storage",
    ephemeral: {
      volumeClaimTemplate: {
        metadata: {
          labels: {
            type: "camera-storage",
          },
        },
        spec: {
          accessModes: ["ReadWriteOnce"],
          storageClassName: "premium-rwo",
          resources: {
            requests: {
              storage: "1Gi",
            },
          },
        },
      },
    },
  });

  const mounts = [
    {
      name: "storage",
      mountPath: "/camera",
      subPath: "camera",
    },
    {
      name: "storage",
      mountPath: "/tmp",
      subPath: "tmp",
    },
  ] as const;

  (podSpec.initContainers ??= []).push({
    name: "camera-storage-init",
    image: "busybox:1.35",
    command: [
      "/bin/sh",
      "-c",
      "mkdir -p /camera/cache /camera/tmp /camera/download  /camera/userData && " +
        "chmod -R a+rwx /camera && chmod -R a+rwx /tmp",
    ],
    volumeMounts: [...mounts],
  });

  ok(podSpec.containers.length === 1);
  const container = podSpec.containers[0];

  const dbusAddress = "unix:path=/tmp/dbus";
  container.command = [
    "/bin/bash",
    "-c",
    `dbus-daemon --nopidfile --address=${dbusAddress} --system && ` +
      "linkerd-await --shutdown -- node " +
      (container.args ?? []).join(" "),
  ];
  delete container.args;

  (container.volumeMounts ??= []).push(...mounts);
  (container.env ??= []).push(
    {
      name: "PUPPETEER_CACHE_DIR",
      value: "/camera/cache",
    },
    {
      name: "PUPPETEER_TMP_DIR",
      value: "/camera/tmp",
    },
    {
      name: "PUPPETEER_DOWNLOAD_PATH",
      value: "/camera/download",
    },
    {
      name: "PUPPETEER_USER_DATA_DIR",
      value: "/camera/userData",
    },
    {
      name: "PUPPETEER_HOME",
      value: "/camera",
    },
    {
      name: "DBUS_SESSION_BUS_ADDRESS",
      value: dbusAddress,
    }
  );
  return base;
}

function gaiaDeployment({
  name,
  simulations,
  replicas,
}: {
  name: string;
  simulations: string[];
  replicas: Autoscale | number;
}) {
  if (!simulations.length) {
    return [];
  }
  name = `gaia-${name}`;
  return [
    biomesDisruptionBudget(name),
    ...biomesDeployment({
      ...SERVICE_DEFAULTS,
      name,
      replicas,
      args: [...BASE_CONFIG_ARGS, "--simulations", ...simulations],
      cpu: 1.5,
      memory: 6 * 1024,
      additionalEnv: [
        { name: "WASM_MEMORY", value: "4096" },
        { name: "GAIA_SHARD_DOMAIN", value: name },
        {
          name: "SHARD_MANAGER_KIND",
          value: "distributed",
        },
      ],
      entryPoint: "gaia_v2",
    }),
  ];
}

function biomesStatefulSet(config: BiomesServiceConfig) {
  const { name, additionalLabels, replicas } = config;
  const statefulSet = <k8s.V1StatefulSet>{
    apiVersion: "apps/v1",
    kind: "StatefulSet",
    metadata: {
      labels: {
        ...biomesLabels({ name, additionalLabels }),
      },
      namespace: "default",
      name,
    },
    spec: {
      serviceName: name,
      replicas: typeof replicas === "number" ? replicas : undefined,
      podManagementPolicy: "Parallel",
      selector: {
        matchLabels: biomesLabels({ name }),
      },
      template: biomesPodTemplate({
        ...config,
        additionalEnv: (config.additionalEnv ?? []).concat([
          {
            name: "STATEFUL_SET_REPLICAS",
            value: replicas.toString(),
          },
        ]),
      }),
    },
  };
  return [statefulSet, ...maybeHorizontalPodAutoscaler(config, statefulSet)];
}

function biomesCron(schedule: string, config: BiomesServiceConfig) {
  const { name, additionalLabels } = config;
  const podTemplate = biomesPodTemplate({
    ...config,
    livenessProbe: "none",
    startupProbe: "none",
    readinessProbe: "none",
  });
  ok(podTemplate.spec);
  podTemplate.spec.restartPolicy = "Never";
  return <k8s.V1CronJob>{
    apiVersion: "batch/v1",
    kind: "CronJob",
    metadata: {
      labels: {
        ...biomesLabels({ name, additionalLabels }),
      },
      namespace: "default",
      name,
    },
    spec: {
      schedule,
      concurrencyPolicy: "Forbid",
      jobTemplate: {
        spec: {
          template: podTemplate,
          activeDeadlineSeconds: 60 * 10, // 10 minutes to complete.
        },
      },
    },
  };
}

// Write to file deploy/k8/biomes.yaml
async function writeYamlFile(filePath: string) {
  await writeFile(
    filePath,
    "# Generated by biomes.ts - DO NOT MANUALLY EDIT!\n\n" +
      createBiomes()
        .map((x) => k8s.dumpYaml(x))
        .join("---\n"),
    { encoding: "utf-8" }
  );
}

void writeYamlFile(path.resolve(__dirname, "biomes.yaml"));
