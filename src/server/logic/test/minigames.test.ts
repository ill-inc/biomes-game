import { newPlayer } from "@/server/logic/utils/players";
import { GameEvent } from "@/server/shared/api/game_event";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { TestLogicApi } from "@/server/test/test_helpers";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import {
  MinigameComponent,
  MinigameInstance,
  Stashed,
} from "@/shared/ecs/gen/components";
import { QuitMinigameEvent } from "@/shared/ecs/gen/events";
import type { BiomesId } from "@/shared/ids";
import type { VoxelooModule } from "@/shared/wasm/types";
import assert from "assert";

const ID_A = 41 as BiomesId;
const ID_B = 42 as BiomesId;
const ID_C = 43 as BiomesId;
const ID_D = 44 as BiomesId;

describe("Minigames", () => {
  let voxeloo!: VoxelooModule;
  before(async () => {
    voxeloo = await loadVoxeloo();
  });

  let logic: TestLogicApi;
  beforeEach(async () => {
    logic = new TestLogicApi(voxeloo);
  });

  it("Should be able to quit a game", async () => {
    const table = logic.world;
    table.writeableTable.apply([
      {
        kind: "create",
        tick: 1,
        entity: {
          ...newPlayer(ID_A, "Alice"),
          position: { v: [0, 0, 0] },
          playing_minigame: {
            minigame_id: ID_B,
            minigame_instance_id: ID_D,
            minigame_type: "simple_race",
          },
        },
      },
      {
        kind: "create",
        tick: 1,
        entity: {
          id: ID_B,
          created_by: {
            created_at: secondsSinceEpoch(),
            id: ID_A,
          },
          minigame_component: MinigameComponent.create({
            metadata: {
              kind: "simple_race",
              checkpoint_ids: new Set(),
              end_ids: new Set(),
              start_ids: new Set(),
            },
          }),
        },
      },
      {
        kind: "create",
        tick: 1,
        entity: {
          id: ID_C,
          stashed: Stashed.create({}),
        },
      },
      {
        kind: "create",
        tick: 1,
        entity: {
          id: ID_D,
          created_by: {
            created_at: secondsSinceEpoch(),
            id: ID_B,
          },
          minigame_instance: MinigameInstance.create({
            minigame_id: ID_B,
            finished: false,
            active_players: new Map([
              [
                ID_A,
                {
                  entry_stash_id: ID_C,
                  entry_position: [0, 0, 0],
                  entry_warped_to: undefined,
                  entry_time: secondsSinceEpoch(),
                },
              ],
            ]),
            state: {
              kind: "simple_race",
              reached_checkpoints: new Map(),
              player_state: "waiting",
              deaths: 10,
              started_at: secondsSinceEpoch(),
              finished_at: undefined,
            },
          }),
        },
      },
    ]);

    await logic.publish(
      new GameEvent(
        ID_A,
        new QuitMinigameEvent({
          id: ID_A,
          minigame_id: ID_B,
          minigame_instance_id: ID_D,
        })
      )
    );

    const player = table.table.get(ID_A);
    assert.ok(player?.playing_minigame === undefined);

    const gameInstance = table.table.get(ID_D);
    assert.ok(gameInstance?.minigame_instance);
    assert.ok(gameInstance.minigame_instance.finished);

    assert.equal(0, gameInstance.minigame_instance.active_players.size);
  });
});
