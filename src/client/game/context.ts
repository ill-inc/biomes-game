import type { GardenHose } from "@/client/events/api";
import type { ChatIo } from "@/client/game/chat/io";
import type { MailMan } from "@/client/game/chat/mailman";
import type { ClientConfig } from "@/client/game/client_config";
import type { AudioManager } from "@/client/game/context_managers/audio_manager";
import type { AuthManager } from "@/client/game/context_managers/auth_manager";
import type { BiomesAsync } from "@/client/game/context_managers/biomes_async";
import type { ClientCache } from "@/client/game/context_managers/client_cache";
import type { ClientIo } from "@/client/game/context_managers/client_io";
import type { Events } from "@/client/game/context_managers/events";
import type { ResourcesPipeToGardenHose } from "@/client/game/context_managers/garden_hose";
import type { ClientInput } from "@/client/game/context_managers/input";
import type { Loop } from "@/client/game/context_managers/loop";
import type { MapManager } from "@/client/game/context_managers/map_manager";
import type { NotificationsManager } from "@/client/game/context_managers/notifications_manager";
import type { NUXManager } from "@/client/game/context_managers/nux_manager";
import type { PermissionsManager } from "@/client/game/context_managers/permissions_manager";
import type { PushManager } from "@/client/game/context_managers/push_manager";
import type { RequestBatchers } from "@/client/game/context_managers/request_batchers";
import type { SocialManager } from "@/client/game/context_managers/social_manager";
import type { Telemetry } from "@/client/game/context_managers/telemetry";
import type { WasmAllocationTracing } from "@/client/game/context_managers/wasm_memory_tracing";
import type { ClientTable } from "@/client/game/game";
import type { MarchHelper } from "@/client/game/helpers/march";
import type { RendererController } from "@/client/game/renderers/renderer_controller";
import type {
  ClientReactResources,
  ClientResources,
  ClientResourcesStats,
} from "@/client/game/resources/types";
import type { ScriptController } from "@/client/game/scripts/script_controller";
import type { ClientWorkerClient } from "@/client/game/worker/api";
import type { ClientMods } from "@/server/shared/minigames/client_mods";
import type { OobFetcher } from "@/shared/api/oob";
import type { InitialState } from "@/shared/api/sync";
import type { ChangeBuffer } from "@/shared/ecs/change";
import type { VersionedTable, WriteableTable } from "@/shared/ecs/table";
import type { IndexedResources } from "@/shared/game/ecs_indexed_resources";
import type { BiomesId } from "@/shared/ids";
import type { VoxelooModule } from "@/shared/wasm/types";

// The early context is post-authentication (you can assume the user is logged in),
// however prior loading the world state. So cannot assume anything of the player.
export interface EarlyClientContext {
  authManager: AuthManager;
  bikkieLoaded: boolean;
  changeBuffer: ChangeBuffer;
  chatIo: ChatIo;
  clientCache: ClientCache;
  clientConfig: ClientConfig;
  earlyTable: ClientTable;
  serverTable: WriteableTable & VersionedTable<number>;
  gardenHose: GardenHose;
  io: ClientIo;
  marchHelper: MarchHelper;
  oobFetcher: OobFetcher;
  pushManager: PushManager;
  telemetry: Telemetry;
  tracing: WasmAllocationTracing | undefined;
  userId: BiomesId;
  voxeloo: VoxelooModule;
  worker: ClientWorkerClient | undefined;
}

// The main context is only after some amount of world is loaded. You can assume
// you have some player information (e.g. position).
export interface ClientContext extends EarlyClientContext {
  async: BiomesAsync;
  audioManager: AudioManager;
  events: Events;
  input: ClientInput;
  loop: Loop;
  indexedResources: IndexedResources;
  initialState: InitialState;
  mailman: MailMan;
  mapManager: MapManager;
  nuxManager: NUXManager;
  clientMods: ClientMods;
  notificationsManager: NotificationsManager;
  permissionsManager: PermissionsManager;
  reactResources: ClientReactResources;
  rendererController: RendererController;
  resources: ClientResources;
  resourcesStats: ClientResourcesStats;
  resourcesPipeToGardenHose: ResourcesPipeToGardenHose;
  rendererScripts: ScriptController;
  requestBatchers: RequestBatchers;
  scripts: ScriptController;
  socialManager: SocialManager;
  table: ClientTable;
}

export type ClientContextSubset<T extends keyof ClientContext> = Pick<
  ClientContext,
  T
>;

export type ClientContextKeysFor<T> = T extends (
  deps: infer U,
  ...args: any[]
) => unknown
  ? U extends Partial<ClientContext>
    ? keyof U
    : never
  : never;

export type ClientContextSubsetFor<T> = ClientContextSubset<
  ClientContextKeysFor<T>
>;
