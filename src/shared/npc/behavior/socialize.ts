import { secondsSinceEpoch } from "@/shared/ecs/config";
import type { BiomesId } from "@/shared/ids";
import { zBiomesId } from "@/shared/ids";
import { dist, sub, yaw } from "@/shared/math/linear";
import type { ReadonlyVec3, Vec3 } from "@/shared/math/types";
import { createHistogram } from "@/shared/metrics/metrics";
import { Timer } from "@/shared/metrics/timer";
import type { Path } from "@/shared/npc/behavior/pathfinding";
import {
  AStarPathfinder,
  GraphImpl,
  findNextTargetOnPath,
  stuckWhilePathfinding,
  updatePathfindingPosition,
  zPathfindingComponent,
} from "@/shared/npc/behavior/pathfinding";
import type { Environment } from "@/shared/npc/environment";
import type { BehaviorSocializeParams } from "@/shared/npc/npc_types";
import type { SimulatedNpc } from "@/shared/npc/simulated";
import { ok } from "assert";
import { clamp, sample } from "lodash";
import { exponentialBuckets } from "prom-client";
import { z } from "zod";

const npcPathfindingTimeMs = createHistogram({
  name: "anima_npc_pathfinding_ms",
  help: "How long it takes to calculate paths for an NPC, in milliseconds.",
  labelNames: ["type"],
  buckets: exponentialBuckets(0.1, 2, 12),
});

export const zSocializeComponent = z.object({
  socialize: z
    .object({
      // The NPC that this NPC is talking to or approaching,
      friend: zBiomesId.optional(),
      // The previous NPC that this NPC talked to.
      previousFriend: zBiomesId.optional(),
      // Time in seconds when the NPC "met" its friend. We say an NPC "met" a friend when they're within
      // MAX_MEETING_DISTANCE of each other.
      meetingTime: z.number().optional(),
      // Time in seconds that an NPC will spend "meeting" a friend.
      meetingDuration: z.number().optional(),
      // Pathfinding behavior.
      pathfinding: zPathfindingComponent.optional(),
      // State.
      state: z.enum([
        // Meeting a friend.
        "with-friend",
        // Traveling forwards a friend.
        "moving-towards-friend",
        // Has no friend.
        "friendless",
        // Finding a path to a friend.
        "finding-a-path",
      ]),
    })
    .default({ state: "friendless" }),
});
export type SocializeComponent = z.infer<
  typeof zSocializeComponent
>["socialize"];
export type SocializingState = SocializeComponent["state"];

type NpcMovement = { forwardSpeed: number };

const MAX_MEETING_DISTANCE = 1.2;

class SocializingNpc {
  private initializedThisFrame: boolean = false;
  constructor(
    private env: Environment,
    private npc: SimulatedNpc,
    private stayNearPoint: ReadonlyVec3,
    private params: BehaviorSocializeParams
  ) {
    if (npc.state?.socialize === undefined) {
      npc.mutableState().socialize = { state: "friendless" };
      this.initializedThisFrame = true;
    }
  }

  get state(): SocializeComponent {
    return this.npc.state.socialize as SocializeComponent;
  }

  get mutableState(): SocializeComponent {
    return this.npc.mutableState().socialize!;
  }

  tick(): NpcMovement {
    if (this.initializedThisFrame) {
      return { forwardSpeed: 0 };
    }
    const movement = this.tickState();
    return movement ?? { forwardSpeed: 0 };
  }

  tickState(): NpcMovement | undefined {
    switch (this.state.state) {
      case "friendless":
        return this.friendless();
      case "moving-towards-friend":
        return this.movingTowardsFriend();
      case "with-friend":
        return this.withFriend();
      case "finding-a-path":
        return this.findingAPathToFriend();
    }
  }

  friendless(): NpcMovement | undefined {
    const newFriend = this.findNewFriend();
    if (newFriend === undefined) {
      return;
    }

    const state = this.mutableState;
    state.previousFriend = state.friend;
    state.friend = newFriend;
    state.meetingTime = undefined;
    state.meetingDuration = clamp(
      Math.random() * MAX_MEETING_DISTANCE,
      this.params.minMeetingDuration,
      this.params.maxMeetingDuration
    );
    state.state = "finding-a-path";
  }

  findingAPathToFriend(): NpcMovement | undefined {
    ok(this.npc.state.socialize?.friend);
    const state = this.mutableState;
    const path = this.findPathToFriend();
    if (path === undefined) {
      // Could not find a path, so now you're friendless.
      state.state = "friendless";
      return;
    }

    state.pathfinding = {
      path,
      searchTime: secondsSinceEpoch(),
      position: this.npc.position as Vec3,
    };
    state.state = "moving-towards-friend";
  }

  movingTowardsFriend(): NpcMovement | undefined {
    ok(this.state.pathfinding?.path);
    updatePathfindingPosition(
      this.mutableState.pathfinding!,
      this.npc.position
    );
    if (this.justMetFriend()) {
      this.mutableState.meetingTime = secondsSinceEpoch();
      this.mutableState.state = "with-friend";
      this.lookAt(this.friendPosition()!);
      return;
    }

    if (stuckWhilePathfinding(this.state.pathfinding)) {
      // Give up on finding the friend.
      this.mutableState.state = "friendless";
      return;
    }

    return { forwardSpeed: this.moveTowardsFriend() };
  }

  withFriend(): NpcMovement | undefined {
    ok(this.state.meetingTime && this.state.meetingDuration);
    const timeWithFriend = secondsSinceEpoch() - this.state.meetingTime;
    if (timeWithFriend >= this.state.meetingDuration) {
      // Done meeting with friend - find a new friend.
      this.mutableState.state = "friendless";
    }

    return;
  }

  // Finds a new friend out a list of candidate friends.
  findNewFriend(): BiomesId | undefined {
    let candidates = this.findNearbyCandidateFriends();

    candidates = candidates.filter((npcId) => {
      return npcId !== this.state.previousFriend && npcId !== this.state.friend;
    });

    // Select a random friend out of the pool of candidates.
    return sample(candidates);
  }

  findNearbyCandidateFriends(): BiomesId[] {
    const out: BiomesId[] = [];

    for (const npcId of this.env.ecsMetaIndex.npc_selector.scanSphere({
      center: this.stayNearPoint,
      radius: this.params.searchRadius,
    })) {
      const npc = this.env.resources.get("/ecs/entity", npcId);
      if (!npc?.quest_giver) {
        continue;
      }

      out.push(npcId);
    }

    return out;
  }

  friendPosition(): ReadonlyVec3 | undefined {
    if (this.state.state === "friendless" || this.state.friend === undefined) {
      return undefined;
    }

    const friend = this.env.resources.get("/ecs/entity", this.state.friend);
    return friend?.position?.v;
  }

  // Generate a path to the Npc's friend.
  findPathToFriend(): Path | undefined {
    const src = this.npc.position;
    const graph = new GraphImpl();
    const srcNode = graph.closestNode(src);
    const friendPosition = this.friendPosition();
    if (!friendPosition) {
      return undefined;
    }
    const destNode = graph.closestNode(friendPosition);
    if (!srcNode || !destNode) {
      return undefined;
    }

    const timer = new Timer();
    const path = new AStarPathfinder(
      graph,
      srcNode,
      destNode,
      this.env.resources
    ).findPath();
    npcPathfindingTimeMs.observe({ type: this.npc.type.name }, timer.elapsed);
    return path;
  }

  // Predicate to check if an NPC just met its friend.
  justMetFriend(): boolean {
    if (
      this.state.meetingTime !== undefined ||
      this.state.friend === undefined
    ) {
      // Npc just met friend or doesn't have a friend to meet.
      return false;
    }

    const friend = this.env.resources.get("/ecs/entity", this.state.friend);
    const friendPosition = friend?.position?.v ?? [0, 0, 0];
    return dist(friendPosition, this.npc.position) <= MAX_MEETING_DISTANCE;
  }

  // Moves the NPC towards it's friend. Returns the speed the Npc moves.
  moveTowardsFriend(): number {
    ok(this.state.pathfinding?.path);

    const target = findNextTargetOnPath(
      this.npc.position,
      this.state.pathfinding.path
    );

    if (target === undefined) {
      return 0;
    }

    this.lookAt(target);
    return this.npc.type.walkSpeed;
  }

  // Rotate to face the target.
  lookAt(target: ReadonlyVec3) {
    const targetVector = sub(target, this.npc.position);
    const angleToFriend = yaw(targetVector);

    if (angleToFriend !== this.npc.state.rotateTarget) {
      this.npc.mutableState().rotateTarget = angleToFriend;
    }
  }
}

export function socializeTick(
  env: Environment,
  npc: SimulatedNpc,
  stayNearPoint: ReadonlyVec3,
  params: BehaviorSocializeParams
): NpcMovement {
  return new SocializingNpc(env, npc, stayNearPoint, params).tick();
}
