import type { ClientContext } from "@/client/game/context";
import type { AudioManager } from "@/client/game/context_managers/audio_manager";
import type { Events } from "@/client/game/context_managers/events";
import { PlaceEffect } from "@/client/game/helpers/place_effect";
import type {
  AttackInfo,
  DestroyInfo,
  PressAndHoldInfo,
} from "@/client/game/interact/types";
import type { Player } from "@/client/game/resources/players";
import type {
  ClientResourceDeps,
  ClientResources,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import type { FishingInfo } from "@/client/game/util/fishing/state_machine";
import type { WarpingInfo } from "@/client/game/util/warping";
import type { Buff, EmoteType, Item } from "@/shared/ecs/gen/types";
import { attackIntervalSeconds } from "@/shared/game/damage";
import { INVALID_BIOMES_ID, type BiomesId } from "@/shared/ids";
import type { ReadonlyAABB, ReadonlyVec3 } from "@/shared/math/types";
import type { RegistryLoader } from "@/shared/registry";

type PlayerStatus = "alive" | "dead" | "respawning";

export class LocalPlayer {
  player!: Readonly<Player>;
  adminFlying = false;
  adminNoClip = false;
  buffs: Readonly<Buff[]> = [];

  destroyInfo?: DestroyInfo;

  warpingInfo?: WarpingInfo;
  fallAllowsDamage: boolean = true;
  lastWarp?: number;

  talkingToNpc?: BiomesId = undefined;

  playerStatus: PlayerStatus = "alive";
  pressAndHoldItemInfo?: PressAndHoldInfo;
  fishingInfo?: FishingInfo;
  craftingStation?: {
    entityId: BiomesId;
    aabb: ReadonlyAABB;
  };

  attackInfo?: AttackInfo;
  #attackCount = 0;

  feedFireInfo?: {
    start: number;
    position: ReadonlyVec3;
  };
  id: BiomesId = INVALID_BIOMES_ID;

  constructor(deps: ClientResourceDeps) {
    this.update(deps);
  }

  update(deps: ClientResourceDeps) {
    const syncTarget = deps.get("/server/sync_target");
    this.id =
      syncTarget.kind === "localUser" ? syncTarget.userId : INVALID_BIOMES_ID;
    this.player = deps.get("/sim/player", this.id);
    this.buffs = deps.get("/player/applicable_buffs").buffs;
  }

  onPlaceBlock(
    events: Events,
    resources: ClientResources,
    audioManager: AudioManager,
    now: number,
    placePos: ReadonlyVec3,
    face: number | undefined
  ) {
    this.player.eagerEmote(events, resources, "place");
    this.player.setSound(resources, audioManager, "place", "place_block");
    if (face !== undefined) {
      this.player.setPlaceEffect(
        new PlaceEffect(resources, placePos, now, face)
      );
    }
  }

  get attackCount() {
    return this.#attackCount;
  }

  startAttack(
    time: number,
    tool: Item | undefined,
    resources: ClientResources,
    events: Events,
    audioManager: AudioManager
  ) {
    ++this.#attackCount;

    this.player.setSound(resources, audioManager, "attack", "swing", {
      resetIfAlreadyPlaying: true,
    });

    const attackEmotes: EmoteType[] = ["attack1", "attack2"];

    this.player.eagerEmote(
      events,
      resources,
      attackEmotes[this.attackCount % attackEmotes.length]
    );

    this.attackInfo = {
      start: time,
      duration: attackIntervalSeconds(tool),
    };
  }

  isAttacking(time: number) {
    return (
      this.attackInfo !== undefined &&
      time - this.attackInfo.start < this.attackInfo.duration
    );
  }

  lastAttackTime(): number | undefined {
    return this.attackInfo?.start;
  }
}

export async function addLocalPlayerResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.addDynamic(
    "/scene/local_player",
    (deps: ClientResourceDeps) => new LocalPlayer(deps),
    (deps: ClientResourceDeps, player: LocalPlayer) => {
      player.update(deps);
    }
  );
}
