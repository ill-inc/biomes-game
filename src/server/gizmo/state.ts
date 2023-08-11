import type { ChatMessage } from "@/shared/chat/messages";
import type { Event } from "@/shared/ecs/gen/events";
import type { Vec2f, Vec3f } from "@/shared/ecs/gen/types";
import type { IndexedEcsResourcePaths } from "@/shared/game/ecs_indexed_resources";
import type { EcsResourcePaths } from "@/shared/game/ecs_resources";
import type { TerrainResourcePaths } from "@/shared/game/resources/terrain";
import type { BiomesId } from "@/shared/ids";
import type { TypedResources } from "@/shared/resources/types";

export interface ActionContext {
  id: BiomesId;
  timeInState: number;
  dt: number;
  prevState: GremlinState;
  resources: TypedResources<
    EcsResourcePaths & TerrainResourcePaths & IndexedEcsResourcePaths
  >;
}

export interface Action {
  tick: (input: ActionContext) => GremlinState;
}

export type WearablesAssignment = Map<BiomesId, BiomesId | undefined>;

export interface GremlinState {
  position: Vec3f;
  orientation: Vec2f;
  action: Action;
  selectedItem: BiomesId | undefined;
  wearableAssignment: WearablesAssignment;
  unmucker: boolean;
  messages: ChatMessage[];
  events: Event[];
}

export function moveVertically(state: GremlinState, delta: number) {
  return {
    ...state,
    position: [
      state.position[0],
      state.position[1] + delta,
      state.position[2],
    ] as Vec3f,
  };
}
