import type { ChatServerContext } from "@/server/chat/context";
import type { PlayerSpatialObserver } from "@/server/shared/chat/player_observer";
import type { RedisChatDistributor } from "@/server/shared/chat/redis/distribution";
import { BackgroundTaskController } from "@/shared/abort";
import type { RegistryLoader } from "@/shared/registry";

export class ChatServer {
  private readonly controller = new BackgroundTaskController();

  constructor(
    private readonly playerSpatialObserver: PlayerSpatialObserver,
    private readonly redisChatDistributor: RedisChatDistributor
  ) {}

  async start() {
    await this.playerSpatialObserver.start();
    this.controller.runInBackground("distribute", (signal) =>
      this.redisChatDistributor.runForever(signal)
    );
  }

  async stop() {
    await this.controller.abortAndWait();
    await this.playerSpatialObserver.stop();
  }
}

export async function registerChatServer<C extends ChatServerContext>(
  loader: RegistryLoader<C>
) {
  const [players, redisChatDistributor] = await Promise.all([
    loader.get("playerSpatialObserver"),
    loader.get("redisChatDistributor"),
  ]);
  return new ChatServer(players, redisChatDistributor);
}
