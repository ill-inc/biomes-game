import type { ChatApi } from "@/server/shared/chat/api";
import type { LazyChange } from "@/server/shared/ecs/lazy";
import type { WorldApi } from "@/server/shared/world/api";
import type { SyncIndex } from "@/server/sync/subscription/sync_index";
import { BackgroundTaskController } from "@/shared/abort";
import { ChannelSet } from "@/shared/chat/chat_channel";
import type { Delivery } from "@/shared/chat/types";
import type { Closable } from "@/shared/closable";
import type { BiomesId } from "@/shared/ids";
import { Latch } from "@/shared/util/async";

export class ChatObserver {
  private readonly controller = new BackgroundTaskController();
  private readonly pendingChats = new ChannelSet();
  private readonly watch: Closable;
  private teamController?: BackgroundTaskController;
  private subscribedTeamId?: BiomesId;

  constructor(
    private readonly context: {
      chatApi: ChatApi;
      worldApi: WorldApi;
      syncIndex: SyncIndex;
    },
    private readonly userId: BiomesId
  ) {
    this.watch = context.syncIndex.watchOne(userId, (change) =>
      this.onChange(change)
    );
  }

  private onChange(change: LazyChange) {
    if (change.kind === "delete") {
      return;
    }
    if (!change.entity.altersPlayerCurrentTeam()) {
      return;
    }
    this.subscribeToCurrentTeam();
  }

  private get currentTeamId(): BiomesId | undefined {
    const knowledge = this.context.syncIndex.getKnowledge(this.userId);
    return knowledge?.team ?? undefined;
  }

  private subscribeToCurrentTeam() {
    if (this.subscribedTeamId === this.currentTeamId) {
      return;
    }
    const oldController = this.teamController;
    if (oldController) {
      this.controller.runInBackground("cancel-old-team", () =>
        oldController.abortAndWait()
      );
    }
    this.teamController = this.controller.chain();
    const subscriptionToStart = (this.subscribedTeamId = this.currentTeamId);
    if (subscriptionToStart) {
      this.teamController.runInBackground("team-chat", async (signal) => {
        for await (const delivery of this.context.chatApi.subscribe(
          subscriptionToStart,
          signal
        )) {
          this.pendingChats.accept(delivery);
        }
      });
    }
  }

  async start(): Promise<Delivery[]> {
    const initial = new Latch();
    this.controller.runInBackground("chat", async (signal) => {
      for await (const delivery of this.context.chatApi.subscribe(
        this.userId,
        signal
      )) {
        this.pendingChats.accept(delivery);
        initial.signal();
      }
    });
    this.subscribeToCurrentTeam();
    await initial.wait(CONFIG.syncMaxChatBootstrapDelayMs);
    return this.pull();
  }

  async stop() {
    await this.controller.abortAndWait();
    this.pendingChats.clear();
    this.watch.close();
  }

  pull(): Delivery[] {
    return this.pendingChats.pop();
  }
}
