import type { SimulationName } from "@/server/gaia_v2/simulations/api";
import type { ForeignAuthProviderName } from "@/server/shared/auth/providers";
import type { LookupPath } from "@/server/shared/file_watcher";
import type { ShardDomainConfig } from "@/server/shared/shard_manager/api";
import type { LeaderboardCategory } from "@/server/shared/world/api";
import type { FirestoreWorldMap } from "@/server/web/db/types";
import type { DiscordHookConfig } from "@/server/web/util/discord";
import type { ChatMessage } from "@/shared/chat/messages";
import type { MessageVolume } from "@/shared/chat/types";
import type { LifetimeStatsType } from "@/shared/ecs/gen/types";
import { SHARD_RADIUS } from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { AABB, ReadonlyOrientedPoint, Vec3 } from "@/shared/math/types";
import { hoursToMs, minutesToMs } from "@/shared/util/durations";
import deepFreeze from "deep-freeze-strict";
import { cloneDeep } from "lodash";
import { EventEmitter } from "stream";
import type TypedEventEmitter from "typed-emitter";

export const DEFAULT_CONFIG_LOOKUP_PATHS: LookupPath[] = [
  {
    // This is the config used in prod.
    path: "/biomes/biomes.config.yaml",
  },
  {
    // Example config local developers can use.
    path: "./biomes.config.local.yaml",
    devOnly: true,
  },
  {
    // Sane defaults for all local developers.
    path: "./biomes.config.dev.yaml",
    devOnly: true,
  },
  {
    // Fallback to the committed prod config (this is deployed as #1).
    path: "./deploy/k8/biomes.config.yaml",
  },
];

const PLAYER_START_POSITIONS: Readonly<Array<ReadonlyOrientedPoint>> = [
  [
    [477, 55, -211],
    [0.033, 3.581],
  ],
  [
    [482, 53, -211],
    [0.045, 3.337],
  ],
  [
    [491, 55, -205],
    [-0.057, 2.759],
  ],
];

const WARP_DEFAULT_POSITIONS: Readonly<Array<ReadonlyOrientedPoint>> = [
  [
    [485, 70, -133],
    [0.057, 3.779],
  ],
  [
    [497, 70, -133],
    [-0.011, 3.207],
  ],
  [
    [508, 70, -125],
    [-0.351, 1.755],
  ],
];

const OBSERVER_START_POSITIONS: Readonly<Array<ReadonlyOrientedPoint>> = [
  // Grove
  [
    [502, 87, -102],
    [-0.473, 0.725],
  ],
  // Rolland Pond
  [
    [1264, 60, -59],
    [-0.368, 0.702],
  ],
  // Brickleberry Farms
  [
    [144, 50, -215],
    [-0.478, 3.765],
  ],
  // Fueille Gardens
  [
    [-1059, 46, 1199],
    [-0.48, 1.934],
  ],
  // Arbre
  [
    [-853, 71, 1171],
    [-0.274, 3.714],
  ],
];

const DEFAULT_CONFIG = deepFreeze({
  // The MD5 value of the last loaded config.
  md5: "[none]",

  // Auth
  instantAccessInviteCodes: ["buildthebobber"],
  instantAccessBlocklist: ["bobthebuilder"],
  instantAccessAuthProviders: <Readonly<Array<ForeignAuthProviderName>>>[],
  primaryCTA: "login" as "discord" | "login",

  // Disable the game
  disableGame: false,

  //
  // ZRPC WebSocket Server
  //
  // How often the server checks a client is present,
  // if it fails twice it is terminated.
  wsZrpcTtlMs: 10_000,
  // How often the server sends a heartbeat - independent of messages.
  wsZrpcHeartbeatIntervalMs: 150,
  // How long the client waits for a heartbeat before being unhealthy.
  wsZrpcHeartbeatTtlMs: 400,
  // How long the client waits until reconnecting.
  wsZrpcHeartbeatReconnectMs: 600,
  // How long the client waits on first connection until reconnecting.
  wsZrpcHeartbeatStartupReconnectMs: 5000,
  // Client backpressure
  wsZrpcClientBackpressureLimit: 1024,
  // Warning for large message
  wsZrpcMaxMessageSizeBytes: 100_000,
  // Refresh interval for heartbeat config
  wsZrpcHeartbeatConfigRefreshMs: 30_000,
  // Time in MS to wait after switching to lame-duck
  wsZrpcLameDuckMs: 20_000,
  // Time in MS to wait after closing before terminating.
  wsZrpcCloseMs: 5_000,
  // Whether compression is enabled.
  wsZrpcCompressionEnabled: true,
  // For small responses have backpressure to stop the server accumulating too much
  // giving time for small updates to condense into a single message.
  wsZrpcSoftBackpressure: (64 * 1024) as number | undefined, // Soft backpressure.
  // Force a reconnect periodically to keep the load balancer connection happy
  // In backend-configs.yaml see "timeoutSec" for "biomes-sockets", which controls
  // that timeout.
  wsZrpcLameDuckIntervalMs: 25 * 60 * 1000, // 25 minutes

  webServerLameDuckMs: 10_000,

  //
  // Bikkie
  //
  // Epoch to invalidate any Bikkie caches.
  bikkieCacheEpoch: 0,
  // Epoch to invalidate all computed Bikkie inference.
  bikkieInferenceEpoch: 4,
  bikkieUpdateAssetInterval: 30_000,
  bikkieMirrorAssetInterval: 30_000,
  bikkieBakeCheckInterval: 30_000,
  bikkiePublishBinaryBatchSize: 100,
  bikkieMirrorBatchSize: 10,
  bikkieMirrorMaxAssetSize: 50 * 1024 * 1024, // 50MB
  bikkieStorageSaveBatchSize: 100,
  bikkieStorageTrayExpirySecs: 60 * 60, // 1 hour

  //
  // BigQuery
  //
  bigQueryFlushIntervalMs: 120 * 1000,
  bigQueryDefaultBatchSize: 2000,
  bigQueryCvalMaxPendingRows: 2000,

  // Shard Manager
  remoteShardManagerListenBackoffMs: 10,
  shardManagerTtlMs: 5000,
  shardManagerKeepaliveRatio: 3, // Ping TTL / 3 when healthy.
  shardManagerBalanceIntervalMs: 5000,
  shardManagerBalanceBatchMs: 1000,
  shardManagerWeightedMaxRebalancePct: 0.1,
  shardManagerDomains: [] as ShardDomainConfig[],

  // Distributed
  distributedShutdownWaitMs: 5000,

  //
  // Elections
  //
  electionTtlMs: 5_000,

  //
  // Service Discovery
  //
  serviceDiscoveryTtlMs: 3_000,
  serviceDiscoveryServiceExpirySeconds: 24 * 60 * 60, // 24 hours

  //
  // Discord
  //
  discordHooksEnabled: true,
  discordHookConfig: <DiscordHookConfig>{
    badge: [],
    deploy: ["discord-deploy-webhook-url"],
    environment_group: [
      "discord-social-webhook-url",
      "discord-biomes-alpha-webhook",
    ],
    new_users: ["discord-new-users-webhook-url"],
    photo: ["discord-camera-webhook-url", "discord-biomes-alpha-webhook"],
    review: ["discord-review-webhook-url"],
    social: ["discord-social-webhook-url", "discord-biomes-alpha-webhook"],
    user_report: ["discord-user-report-webhook-url"],
  },
  discordGatingServerId: "1040638050700640296",
  discordEarlyAccessGeneralChannelId: "1040638051182989313",
  discordPlaytesterRoleId: "1116503866712789042",
  discordPlaytesterRoleTimeThresholdMs: 1000 * 60 * 10, // 10 minutes.
  discordRefreshMemberIntervalMs: 10 * 60 * 1000,
  discordBotWelcomeMessage: `Beep! Boop! Welcome to The Collective!

  I'm **B-42**, a friendly Biomes Robot here to transmit messages to you when players around the world visit your home, tag you in photos, or use any of the useful things you've built.`,

  // Asset server jitter interval
  assetServerJitterIntervalMs: 1000,
  assetServerPlayerMeshRecomputeIntervalMs: 1000 * 60 * 60 * 24, // 1 day

  //
  // Chat
  //
  allowPushForSelfActivity: false,
  playerWhisperRadius: 10 as number | undefined,
  playerChatRadius: Infinity as number | undefined,
  playerYellRadius: Infinity as number | undefined,
  activityMessagesToPush: [
    "follow",
    "like",
    "comment",
    "tag",
    "enter_my_robot",
    "robotExpired",
    "purchase",
    "joined_my_team",
    "mailReceived",
    "invitedToTeam",
    "requestedToJoinTeam",
    "requestToJoinTeamAccepted",
    "minigame_royalty",
    "robotVisitorMessage",
  ] as const satisfies Readonly<Array<ChatMessage["kind"]>>,
  chatEnterWorldVolume: "yell" as MessageVolume,
  chatPushNonceTtlSecs: 12 * 60 * 60, // 12 hour
  chatRedisSubscribeBackoffMs: 1000,
  chatRedisDistributorTtlSecs: 5000,
  chatRedisDistributorFetchSize: 10,
  chatRedisDistributorBatchSize: 100,
  chatRedisDistributorBackoffMs: 1000,
  chatCompactionFrequencyMs: 1 * 60 * 1000,
  chatRedisIdleConsumerGroupMs: 12 * 60 * 60 * 1000, // 12 hours

  //
  // Eval controls
  //
  evalEnabled: true,
  evalTimeoutMs: 30_000,

  //
  // Sync Controls.
  //
  syncDisableDevEndpoints: false,
  syncClientGcIntervalMs: 1_000,
  syncClientEventHz: 20,
  syncUpdatePlaytimeIntervalMs: 15_000,
  syncMaxConcurrentSubscribes: 5,
  syncRefreshFollowingIntervalMs: 15_000,
  defaultSyncRadius: 256 + SHARD_RADIUS,
  minSyncRadius: SHARD_RADIUS,
  syncMaxClients: 50,
  syncMaxInflightRequestsPerClient: 100,
  syncMaxChatBootstrapDelayMs: 250,
  syncMaxChangeBatchForInitialSync: 100,
  syncPingInterval: 5000,
  syncTimeUpdateIntervalMs: 30_000,
  syncMaxEventBoxCar: 1000, // Amount of events to put in a single game server request.
  syncMaxInboundEventsPerFrame: 20, // Amount of events per client per frame.
  syncMaxPendingInboundEvents: 1000,
  syncVersionMapMaxSize: 20_000,
  syncMinIntervalMs: 20, // Minimum amount of time between syncs.
  syncMaxUpdatesPerSecond: 3000,
  syncPlayerUpdateRateMs: 1000 / 20, // Other player update rate, and event rate limit.
  syncOutsideRadiusUpdateRateMs: 5000, // Update rate for entities outside of the sync radius.
  syncEntityJitter: 50, // Randomness to entity sync time to ensure things don't align.
  syncUpdatePlayerCountThrottleMs: 5000,

  // Rank score (lower is better) for sync priority:
  // rank(e) = 1 + e^(-timeSinceLastSync) * (1 + d2 * distanceBias)))
  // Where d2 is distance squared, 0 if unknown.
  syncDistanceBias: 1,

  oldestAcceptableBuildTimestamp: 0,
  // Build age relative to the server's.
  maximumClientBuildAgeMs: 1000 * 60 * 60 * 24, // 1 day

  //
  // Development mode options
  //
  devResetAllPlayers: false, // Reset all players to initial state
  devBootstrapRadius: 256 + SHARD_RADIUS, // Radius to use when bootstrap syncing
  devBootstrapPosition: undefined as string | Vec3 | undefined,
  devHomeOverride: undefined as Vec3 | undefined | "centerOfTerrain",
  devShimTransactionAttempts: 3,

  //
  // Event Processing
  //
  logicIdPoolBatchSize: 10,
  logicTransactionAttempts: 5,

  //
  // Redis connections
  //
  redisRefreshK8EndpointsMs: 5 * 60 * 1000, // 5 minutes

  //
  // World server
  //
  redisMaxKeysPerBatch: 1000,
  redisMaxTransactionsPerApply: 100,
  redisMaxChangesPerUpdate: 100,
  redisBootstrapBatchSize: 100,
  redisHfcBootstrapBatchSize: 100,
  redisMaxTicksToPull: 100,
  redisMarkBackoffMs: 1000,
  redisBootstrapBackoffMs: 1000,
  redisStreamBackoffMs: 500,
  redisPeriodicTrimIntervalMs: 5 * 60 * 1000,
  redisPeriodicTrimChance: 1.0,
  redisUseApproximateTrim: false,
  redisMaxEcsLogAgeMs: 1000 * 60 * 15, // 15 minutes.
  redisMinUpdateHz: 20,

  // Sink (mapping HFC to regular)
  sinkHfcMirrorIntervalMs: 5 * 60 * 1000, // 5 minutes
  sinkHfcMirrorChangeQps: 100,
  sinkHfcMirrorBatchSize: 100,

  // Discord role update
  sinkDiscordRoleIntervalMs: 5 * 60 * 1000, // 5 minutes

  // Sink Bikkie.
  sinkBikkieIntervalMs: 5 * 60 * 1000, // 5 minutes

  // Firehose client management
  firehoseClientBatchSize: 100,
  firehoseClientAckMultiplier: 2,
  firehoseIdleConsumerGroupMs: 12 * 60 * 60 * 1000, // 12 hours

  //
  // Bob the builder
  //
  bobBaseDirectory: "biomes",
  bobHaltBuilds: true,
  bobBuildIntervalMs: 15_000,
  bobNotifyPrIntervalMs: 60_000,
  bobFluxCheckIntervalMs: 60_000,
  bobStuckOnCommitWaitMs: 60_000,
  bobStuckOnBuildWaitMs: 5 * 60_000,
  bobWaitMergableIntervalMs: 15_000,
  bobMentionMinDelayMs: 5 * 60_000,
  // Will ignore files changed with these prefixes,
  // and not build if that's all that changed.
  bobIgnorePaths: ["cloud-functions/", ".github/", ".vscode/"],
  bobDeployPaths: ["deploy/"],
  bobIgnoreChangeEmails: ["cloud-build@ill.inc"],
  bobIgnoreChangeSubject: /^Deploy \d+ change/,
  bobGithubEmailToDiscord: [
    [
      ["nick@not.fun", "nicknotfun"],
      ["<@944028492239110174>", "@nillinc"],
    ],
  ] as [string[], [string, string]][],

  manualUserIdToDiscord: [] as [BiomesId, string][],

  //
  // Replica
  //
  replicaExpectedTerrainShards: 262144,

  //
  // Game Logic.
  //
  gameDropPickupDistance: 4,
  gameDropPickupExpirationSecs: 5,
  gameDropBlingChance: 0.1,
  gameDropExpirationSecs: 60,
  // Drops further than this distance away from dropping player are clamped to their feet
  // If intending to change actual dropped distance, change the value in client_config.ts
  gameThrowDistance: 9,
  gameThrownFilterSecs: 8, // Time until you can re-pick-up thrown things
  gameMinePrioritySecs: 5, // Time you have priority over things you mine.
  gamePlayerExpirationSecs: 60 as number | undefined,

  // Start positions
  observerStartPositions: OBSERVER_START_POSITIONS,
  playerStartPositions: PLAYER_START_POSITIONS,
  fallbackStartPosition: PLAYER_START_POSITIONS[0],
  warpDefaultPositions: WARP_DEFAULT_POSITIONS,

  gameMaxTalkDistance: 20,

  // Muck restoration applies to changes in regions with muck greater than this.
  muckRestorationThreshold: 0,
  // The restoration delay associated with muck restoration.
  muckRestorationDelaySecs: 60 * 60,
  muckRestorationEnabled: false,

  //
  // Gaia server
  //
  gaiaClockMultiplier: 1.0,

  //
  // Gaia Server
  //
  gaiaShardsPerBatch: 2,

  gaiaDisabledSimulations: [] as SimulationName[],
  gaiaShardThrottleMs: [] as [SimulationName, number][],

  // Whether or not to submit changes to ECS
  gaiaV2DryRun: false,
  // How quickly to step muck values in a single update
  gaiaV2MuckSimStepSize: 7,
  // How many missing shards to tolerate
  gaiaV2MissingShardsThreshold: 0,
  // Gaia shutdown delay
  // When shutting down we release shards, then we push our hipri queue so others can
  // handle it, this is they delay before we do that push (giving time for the balancer
  // to allocate the shards to other servers).
  gaiaV2ShutdownDelayMs: 250,

  // Growth related params.
  gaiaV2GrowthLeafDecayTimeMs: minutesToMs(1),
  gaiaV2GrowthLeafRestoreTimeMs: minutesToMs(5),
  gaiaV2GrowthLeafTimerFuzz: 2,
  gaiaV2GrowthLeafMaxDFS: 8,
  gaiaV2GrowthTreeDecayTimeMs: minutesToMs(2),
  gaiaV2GrowthTreeRestoreTimeMs: minutesToMs(10),
  gaiaV2GrowthTreeTimerFuzz: 2,
  gaiaV2GrowthTreeMaxDFS: 24,
  gaiaV2GrowthFloraRestoreTimeMs: minutesToMs(20),
  gaiaV2GrowthFloraTimerFuzz: 5,
  gaiaV2GrowthOresRestoreTimeMs: hoursToMs(2),
  gaiaV2GrowthOresTimerFuzz: 4,

  // Gaia Flora Decay
  gaiaFloraDecayFlora: [
    "azalea_flower",
    "bamboo_bush",
    "bell_flower",
    "carrot_bush",
    "coffee_bush",
    "cotton_bush",
    "dandelion_flower",
    "daylily_flower",
    "eye_plant",
    "fescue_grass",
    "fly_trap",
    "golden_mushroom",
    "hemp_bush",
    "lilac_flower",
    "moss_grass",
    "mucky_brambles",
    "oak_sapling",
    "potato",
    "pumpkin",
    "purple_mushroom",
    "raspberry_bush",
    "red_mushroom",
    "rose_flower",
    "rubber_sapling",
    "sakura_sapling",
    "sapling",
    "spiky_plant",
    "switch_grass",
    "wheat_bush",
    "coral",
    "sea_anemone",
    "ultraviolet",
    "blue_mushroom",
    "fire_flower",
    "marigold_flower",
    "morningglory_flower",
    "peony_flower",
    "sun_flower",
  ],

  // Gaia Flora Growth
  gaiaFloraGrowthSoil: ["grass", "moss"],
  gaiaFloraGrowthFlora: [
    "azalea_flower",
    "bell_flower",
    "cotton_bush",
    "dandelion_flower",
    "daylily_flower",
    "eye_plant",
    "fly_trap",
    "hemp_bush",
    "ivy_vine",
    "lilac_flower",
    "mucky_brambles",
    "pumpkin",
    "purple_mushroom",
    "raspberry_bush",
    "red_mushroom",
    "rose_flower",
    "spiky_plant",
    "switch_grass",
  ],

  // Gaia Flora Muck
  gaiaFloraMuckFlora: [
    ["bell_flower", "fly_trap"],
    ["azalea_flower", "eye_plant"],
    ["bell_flower", "spiky_plant"],
    ["dandelion_flower", "mucky_brambles"],
    ["daylily_flower", "fly_trap"],
    ["lilac_flower", "eye_plant"],
    ["rose_flower", "spiky_plant"],
    ["cotton_bush", "mucky_brambles"],
    ["hemp_bush", "fly_trap"],
    ["red_mushroom", "purple_mushroom"],
  ],

  // Gaia Leaf Growth
  gaiaLeafGrowthRoots: [
    ["birch_leaf", "birch_log"],
    ["oak_leaf", "oak_log"],
    ["rubber_leaf", "rubber_log"],
    ["sakura_leaf", "sakura_log"],
  ],

  // Gaia Tree Growth
  gaiaTreeGrowthSoils: ["dirt", "grass", "moss"],
  gaiaTreeGrowthLogs: ["birch_log", "oak_log", "rubber_log", "sakura_log"],

  // Gaia Ore Growth
  gaiaOreGrowthOres: [
    ["neptunium_ore", 0.02],
    ["diamond_ore", 0.08],
    ["gold_ore", 0.2],
    ["silver_ore", 0.4],
    ["coal_ore", 0.3],
  ] as const,

  //
  // Trigger Server
  //
  triggerBatchWindowMs: 1,
  triggerRetryDelayMs: 250,
  triggerTransactionMaxAttempts: 10,
  triggerExpiryHz: 2,

  // Notifications Server
  notificationsAckTtl: 5_000,
  notificationsBatchWindowMs: 500,
  notificationsRetryDelayMs: 10_000,
  discoveryTypesToNotify: [
    "grown",
    "fished",
    "takenPhoto",
  ] as LifetimeStatsType[],

  //
  // Task Server
  //
  taskServerTickIntervalMs: 1000,

  //
  // Proxy Server
  //
  proxyServerImageTtlMs: 0,

  //
  // Map Server
  //
  mapServerPhotoMinDistance: 5,
  mapServerPhotoNumToCalculate: 30,
  overrideMapMetadata: <Partial<FirestoreWorldMap>>{
    tileWebPTemplateKey: "world-map/prod/1666156457399/tiles/{z}/{x}/{y}.webp",
    webPFullKey: "world-map/prod/1666156457399/total_world_map.webp",
    webPFullTileKey: "world-map/prod/1666156457399/total_world_map_tile.webp",
  },
  mapTileStalenessThresholdMs: 7 * 24 * 60 * 60 * 1000, // 1 week
  mapTileFlushPeriodMs: 1 * 60 * 1000, // 1 minute
  mapTileFlushSize: 100,
  mapTileFlushConcurrency: 10,

  //
  // Newton
  //
  newtonTickTimeMs: 1000 / 10,
  newtonFlushHz: 10,
  newtonMaxTickCatchup: 4,

  //
  // Sidefx
  //
  sidefxFlushHz: 10,

  //
  // Gremlins
  //
  gremlinStartingArea: [
    [0, 75, 0],
    [0, 75, 0],
  ] as AABB,
  // How long each Gremlin will wait before initiating their initial connection,
  // helpful for staggering deployments.
  gremlinsWaitBeforeInitialConnectRangeMs: [5_000, 120_000] as [number, number],
  // How long each Gremlin will wait before retrying their connection. For
  // example if they're having connection problems, this will avoid a high
  // rate of reconnect attempts. Expressed as a range in order to introduce
  // some variability and stagger the connections.
  gremlinsWaitBeforeReconnectRangeMs: [5_000, 20_000] as [number, number],
  gremlinsPopulation: 0,
  gremlinsTickIntervalMs: 1000 / 10,
  // After this amount of time since coming online, they are deleted. Combined
  // with keep-alive will continue to push this into the future (so this must be
  // larger than the keepalive).
  gremlinsExpirationSecs: 30,
  // How often the gremlin clients send a keep-alive ping.
  gremlinsKeepAliveMs: 5_000,
  // How often it will artificially disconnect after connecting.
  gremlinsDisconnectAfterMs: 10 * 60_000,
  gremlinsRiseTimeSecs: 5,
  // Change wearables when done rising.
  gremlinsChanceToSwitchWearables: 0.1,
  gremlinsChanceToEquipNothing: 0.05,
  gremlinsMaxTurnTimeSecs: 4,
  gremlinsMinFlyTimeSecs: 5,
  gremlinsMaxFlyTimeSecs: 30,
  gremlinsSpeedMetersPerSec: 6,
  gremlinsTurnSpeedInRevsPerSec: 0.2,
  gremlinsBuildTimeSecs: 60,
  gremlinsBuildStepTimeSecs: 10,
  gremlinsChanceToBuild: 0.1,
  gremlinsBuildRestoreTimeSecs: 60, // In case they fail to take it away.
  gremlinsUnmuckTimeSecs: 60,
  gremlinsChanceToUnMuck: 0.1,
  // Chat only when done rising.
  gremlinsChanceToChat: 0.1,
  gremlinsChatConversationLength: 3,
  gremlinsChatMessages: [
    "You Should Just Buy Orange Juice In Cartons. It's A Lot Easier.",
    "Cuz' They Plant Gremlins In Their Machinery!",
    "This Is A Cocoon, And Inside He's Going Through Changes. Lots Of Changes.",
    "No, You're Drunk.",
    "You Always Get To Drive!",
    "Now I Have Another Reason To Hate Christmas.",
    "You Teach Him To Watch Television?",
    "Fire, The Untamed Element, Oldest Of Man's Mysteries, Giver Of Warmth, Destroyer Of Forests. Right Now, This Building Is On Fire!",
    "There Are Some Things That Man Was Not Meant To Splice!",
    "Well, It's Rather Brutal Here. We're Advising Our Clients To Put Everything They've Got Into Canned Food And Shotguns!",
  ] as string[],

  animaTerrainTickTimeMs: 40,
  animaSpawnTickTimeMs: 20,

  // How frequently NPC state is updated.
  animaNpcTickTimeMs: 100,

  // Range in which an Anima server instance considers itself to have an
  // acceptable work load. As long as it stays within this range, it won't
  // request changes to its workload. The value is given in terms of fraction
  // of animaNpcTickTimeMs. The upper bound should be less than 1.0 to leave
  // some room for overhead and execution spikes like garbage collection.
  animaTargetTickTimeRange: [0.6, 0.75],

  // The interval at which the Anima server will re-evaluate its workload.
  animaTargetTickReevalIntervalMs: 1000,

  // How many anima to change in a single apply call.
  animaNpcTickBatchSize: 500,

  // A global spawn limit to safe-guard against bugs that cause rapid unlimited
  // spawning. Needs to be manually adjusted as the world grows in size, and
  // should cause alerts to be fired when surpassed.
  animaGlobalSpawnLimit: 15000,

  // NPCs tick at a rate proportional to their closest player.
  animaTickByDistance: [
    [32, 1], // For every tick, tick once within 32 units
    [64, 2], // Tick every four ticks
    [96, 4],
    [128, 16], // Tick every 16
    [192, 64], // Tick every 64
    [256, 128], // Tick every 128
  ] as [number, number][],

  // NPCs that are far from any players do not need to be given much attention,
  // so we don't tick them often. But we still tick them to give them some
  // opportunity to respond to the chaning world (e.g. death due to day/night
  // cycle changing). This setting indicates how many regular ticks go by
  // for each "far from players" tick. The larger the number, the less often
  // we tick NPCs far from any player.
  animaFarFromPlayerTickRatio: 256,

  // A global scale factor for spawn event density.
  animaGlobalSpawnDensityScale: 1.0,

  // If greater than 1, anima will run up to that many catchup ticks on NPCs if
  // it falls behind on NPC tick processing, otherwise ticks are dropped.
  // A danger with values larger than 1 is that Anima enters a negative
  // performance feedback loop where the catch up ticks result in more slow
  // downs.
  animaNpcMaxFixedTicksPerTick: 3,

  // Farming
  farmingVerbosity: 0,
  farmingShardMinTickIntervalSecs: 10,
  farmingPlantMinTickIntervalSecs: 10,
  // Plants should only update at most 6 entities per plant per tick.
  // Warn if we somehow update more than 100 entities in a single tick.
  farmingPlantsPerTick: 10,
  farmingWarnApplyBatchSize: 100,

  // Minigames
  minigames: {
    max_arena_volume: 100 * 100 * 100,
    tick_rate: 10,
  },

  // Camera server-side Chrome rendering
  chromeHeadlessMode: true as "new" | true,
  chromeDumpIo: false,
  chromeFlags: ["--no-sandbox", "--disable-setuid-sandbox"],

  // Leaderboard to discord sync
  leaderboardToDiscordIgnoreUsers: [] as BiomesId[],
  leaderboardToDiscordSync: [] as [LeaderboardCategory, number, string][],
});

export type GlobalConfigEvents = {
  changed: () => void;
};

declare global {
  // eslint-disable-next-line no-var
  var CONFIG: typeof DEFAULT_CONFIG;
  // eslint-disable-next-line no-var
  var CONFIG_EVENTS: TypedEventEmitter<GlobalConfigEvents>;
}

export function bootstrapGlobalConfig(value?: typeof DEFAULT_CONFIG) {
  if (global.CONFIG_EVENTS === undefined) {
    global.CONFIG_EVENTS =
      new EventEmitter() as TypedEventEmitter<GlobalConfigEvents>;
    global.CONFIG_EVENTS.setMaxListeners(Infinity);
  }
  if (value !== undefined) {
    global.CONFIG = value;
    return;
  }
  if (!global.CONFIG) {
    if (!process.env.IS_SERVER && !process.env.MOCHA_TEST) {
      log.fatal(
        "You're using server-only config on the client! This is a bug!"
      );
    } else {
      global.CONFIG = cloneDeep(DEFAULT_CONFIG);
    }
  }
}

export function updateGlobalConfig(config: typeof CONFIG) {
  Object.assign(CONFIG, config);
  CONFIG_EVENTS.emit("changed");
}

export function copyConfig() {
  return cloneDeep(CONFIG);
}

// TODO: see if we should make this explicit
bootstrapGlobalConfig();
