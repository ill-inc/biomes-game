import type { AssetExportsServer } from "@/galois/interface/asset_server/exports";
import type { AskApi } from "@/server/ask/api";
import type { CameraClient } from "@/server/camera/api";
import type { LogicApi } from "@/server/shared/api/logic";
import type { BiomesBakery } from "@/server/shared/bikkie/registry";
import type { ChatApi } from "@/server/shared/chat/api";
import type { SharedServerContext } from "@/server/shared/context";
import type { DiscordBot } from "@/server/shared/discord";
import type { Firehose } from "@/server/shared/firehose/api";
import type { IdGenerator } from "@/server/shared/ids/generator";
import type { ServerMods } from "@/server/shared/minigames/server_mods";
import type { BDB } from "@/server/shared/storage";
import type { ServerTaskProcessor } from "@/server/shared/tasks/server_tasks/server_task_processor";
import type { TwitchBot } from "@/server/shared/twitch/twitch";
import type { WorldApi } from "@/server/shared/world/api";
import type { ApiApp, NextApiRequestWithContext } from "@/server/web/app";
import type { BigQueryConnection } from "@/server/web/bigquery";
import type { WebServerConfig } from "@/server/web/config";
import type { SessionStore } from "@/server/web/db/sessions";
import type { ServerCache } from "@/server/web/server_cache";
import type { SourceMapCache } from "@/server/web/source_maps";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { IncomingMessage } from "http";
import type {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
} from "next";

export interface WebServerContext extends SharedServerContext {
  app: ApiApp;
  assetExportsServer: AssetExportsServer;
  bakery: BiomesBakery;
  bigQuery: BigQueryConnection;
  cameraClient: CameraClient;
  chatApi: ChatApi;
  config: WebServerConfig;
  db: BDB;
  discordBot: DiscordBot;
  twitchBot: TwitchBot;
  firehose: Firehose;
  serverMods: ServerMods;
  idGenerator: IdGenerator;
  logicApi: LogicApi;
  askApi: AskApi;
  serverCache: ServerCache;
  serverTaskProcessor: ServerTaskProcessor;
  sessionStore: SessionStore;
  sourceMapCache: SourceMapCache;
  worldApi: WorldApi;
  voxeloo: VoxelooModule;
}

export type WebServerContextSubset<T extends keyof WebServerContext> = Pick<
  WebServerContext,
  T
>;

export type WebServerRequest = IncomingMessage & { context: WebServerContext };

export type WebServerApiRequest = NextApiRequestWithContext<WebServerContext>;
export type WebServerServerSidePropsContext = GetServerSidePropsContext & {
  req: GetServerSidePropsContext["req"] & {
    context: WebServerContext;
  };
};

export type InferWebServerSidePropsType<T> = T extends GetServerSideProps<
  infer P,
  any
>
  ? P
  : T extends (
      context: WebServerServerSidePropsContext
    ) => Promise<GetServerSidePropsResult<infer P>>
  ? P
  : never;
