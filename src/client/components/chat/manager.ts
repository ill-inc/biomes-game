import type { PointerLockManager } from "@/client/components/contexts/PointerLockContext";
import { beginTrade } from "@/client/components/inventory/helpers";
import type { ClientContextSubset } from "@/client/game/context";
import type { BiomesUser } from "@/client/game/context_managers/auth_manager";
import type { ClientInput } from "@/client/game/context_managers/input";
import type { LocalPlayer } from "@/client/game/resources/local_player";
import { makeReport } from "@/client/game/util/report";
import { warpToPosition } from "@/client/game/util/warping";
import { changeRole } from "@/client/util/roles";
import type {
  EntityBatchRequest,
  EntityBatchResponse,
} from "@/pages/api/admin/batch_get";

import type { CreateNpcRequest } from "@/pages/api/admin/create_npc";
import type { GiveItemRequest } from "@/pages/api/admin/give_item";
import type { KillAllNpcsRequest } from "@/pages/api/admin/kill_all_npcs";
import type { PlaceNpcRequest } from "@/pages/api/admin/place_npc";
import type {
  LoadPresetRequest,
  LoadPresetResponse,
} from "@/pages/api/admin/player_presets/load";
import type {
  SavePresetRequest,
  SavePresetResponse,
} from "@/pages/api/admin/player_presets/save";
import type { ResetQuestsRequest } from "@/pages/api/admin/quests/reset";
import type { ResetRecipesRequest } from "@/pages/api/admin/recipes/reset";
import type { ResetInventoryRequest } from "@/pages/api/admin/reset_inventory";
import type { AdminSendMessageBody } from "@/pages/api/admin/send_message";
import type { SpawnRequest } from "@/pages/api/admin/spawn";
import type { WhoPlayer } from "@/pages/api/chat/who";
import { zSpecialRoles } from "@/shared/acl_types";
import { BikkieRuntime, getBiscuits } from "@/shared/bikkie/active";
import type { SchemaPath } from "@/shared/bikkie/schema/biomes";
import { bikkie } from "@/shared/bikkie/schema/biomes";
import type {
  ChatMessage,
  EmoteMessageEmoteType,
} from "@/shared/chat/messages";
import { zEmoteMessageEmoteType } from "@/shared/chat/messages";
import {
  GiveMinigameKitEvent,
  UpdatePlayerHealthEvent,
} from "@/shared/ecs/gen/events";
import { EntitySerde } from "@/shared/ecs/gen/json_serde";
import { GremlinSelector, LabelSelector } from "@/shared/ecs/gen/selectors";
import type { EmoteType, ItemBag, MinigameType } from "@/shared/ecs/gen/types";
import { zEmoteType, zMinigameType } from "@/shared/ecs/gen/types";
import { countOf, createBag } from "@/shared/game/items";
import { itemBagToString } from "@/shared/game/items_serde";
import type { BiomesId } from "@/shared/ids";
import {
  INVALID_BIOMES_ID,
  parseBiomesId,
  safeParseBiomesId,
} from "@/shared/ids";
import { log } from "@/shared/logging";
import type { Vec3 } from "@/shared/math/types";
import { fireAndForget } from "@/shared/util/async";
import {
  jsonFetch,
  jsonPost,
  jsonPostNoBody,
} from "@/shared/util/fetch_helpers";
import { ok } from "assert";
import { includes, keys, startCase, toNumber } from "lodash";

export const DM_COMMANDS = [
  "message",
  "msg",
  "m",
  "dm",
  "pm",
  "tell",
  "tm",
  "directmessage",
  "dirmsg",
  "dirm",
  "dmess",
];

export const USER_DIRECT_TARGET_COMMANDS = [...DM_COMMANDS, "profile", "trade"];

export const DM_COMMAND_REGEX = new RegExp(
  `^\/(?:${DM_COMMANDS.join("|")})\\s+([^\\s]+)\\s+(.*)`,
  "i"
);
export const USER_DIRECT_TARGET_COMMAND_PREFIX_REGEX = new RegExp(
  `^\/(?:${[USER_DIRECT_TARGET_COMMANDS].join("|")})\\s+([^\\s]+)$`,
  "i"
);
export const USER_DIRECT_TARGET_REPLACE_REGEX = new RegExp(
  `^(\/(?:${USER_DIRECT_TARGET_COMMANDS.join("|")})\\s+)(?:[^\\s]+)(.*)`,
  "i"
);

export const ADMIN_GIVE_REGEX = new RegExp(
  "^(/admin\\s+give\\s+)([a-zA-Z0-9_-]*)$",
  "i"
);

export const ADMIN_SPAWN_REGEX = new RegExp(
  "^(/admin\\s+spawn\\s+)([a-zA-Z0-9_-]*)$",
  "i"
);

export const ADMIN_CREATE_NPC_REGEX = new RegExp(
  "^(/admin\\s+createNpc\\s+)([a-zA-Z0-9_-]*)$",
  "i"
);

export const ADMIN_PLACE_NPC_REGEX = new RegExp(
  "^(/admin\\s+npc\\s+)(.*)\\s*$",
  "i"
);

function parseItemNameOrId(
  schemaPaths: SchemaPath[],
  nameOrId: string
): BiomesId | undefined {
  const itemId = safeParseBiomesId(nameOrId);
  if (itemId) {
    return itemId;
  }
  // Try to find a biscuit with the given name first.
  for (const schemaPath of schemaPaths) {
    const all = BikkieRuntime.get().getBiscuits(bikkie.getSchema(schemaPath));
    for (const biscuit of all) {
      if (biscuit.name === nameOrId) {
        return biscuit.id;
      }
    }
  }
  // If that fails, try to find a biscuit with the given display name.
  for (const schemaPath of schemaPaths) {
    const all = BikkieRuntime.get().getBiscuits(bikkie.getSchema(schemaPath));
    for (const biscuit of all) {
      const displayName = biscuit.displayName;
      if (
        displayName &&
        (displayName.toLowerCase() === nameOrId.toLowerCase() ||
          startCase(nameOrId).toLowerCase() ===
            startCase(displayName).toLowerCase())
      ) {
        return biscuit.id;
      }
    }
  }
}

function parseItemStringAsBag(
  schemaPaths: SchemaPath[],
  item: string,
  countString: string
): ItemBag | undefined {
  let count = toNumber(countString);
  ok(!isNaN(count), "Invalid item count, expected form IDxCOUNT");
  count = Math.floor(count);
  if (count <= 0) {
    return;
  }

  const id = parseItemNameOrId(schemaPaths, item);
  ok(id !== undefined, `Unknown item ${item}`);
  return createBag(countOf(id, undefined, BigInt(count)));
}
export class ChatManager {
  private lastSentTypingIndicator?: number;

  constructor(
    private deps: ClientContextSubset<
      | "userId"
      | "events"
      | "chatIo"
      | "socialManager"
      | "mailman"
      | "reactResources"
      | "resources"
      | "authManager"
      | "input"
      | "gardenHose"
      | "rendererController"
      | "table"
    > & {
      pointerLockManager: PointerLockManager;
    }
  ) {}

  onType(input: string) {
    if (
      !input.startsWith("/") &&
      (!this.lastSentTypingIndicator ||
        performance.now() - this.lastSentTypingIndicator > 1000)
    ) {
      void this.deps.chatIo.sendMessage("whisper", {
        kind: "typing",
      });
      this.lastSentTypingIndicator = performance.now();
    }
  }

  private async handleDie(playerId: BiomesId) {
    await this.deps.events.publish(
      new UpdatePlayerHealthEvent({
        id: playerId,
        hp: 0,
        damageSource: {
          kind: "suicide",
        },
      })
    );
  }

  private async handleHurt(playerId: BiomesId, damage = 1) {
    await this.deps.events.publish(
      new UpdatePlayerHealthEvent({
        id: playerId,
        hpDelta: -damage,
        damageSource: {
          kind: "suicide",
        },
      })
    );
  }

  private async handleAdminCommand(userId: BiomesId, command: string) {
    try {
      const adminSubcommandMatch = command.match(/^\/admin\s+(.*)$/i);
      ok(
        adminSubcommandMatch,
        "Expected a command of the form '/admin COMMAND ...'"
      );
      const subCommand = adminSubcommandMatch[1].trim();

      const minigameKitCommandMatch = subCommand.match(
        /^(kit|minigameKit)(\s+[^\s]+)?/
      );
      const giveCommandMatch = subCommand.match(
        /^(give)\s+([^\s]+)(?:\s+([1-9][0-9]*))?(?:\s+([^\s]+))?$/i
      );
      const spawnCommandMatch = subCommand.match(/^(spawn)\s+([^\s].*)/i);
      const createNpcCommandMatch = subCommand.match(
        /^(createNpc)\s+([^\s].*)/i
      );
      const placeNpcCommandMatch = subCommand.match(/^(npc)\s+([^\s].*)/i);
      const killAllNpcsMatch = subCommand.match(
        /^(killAllNpcs)(?:\s+([^\s]*))?/i
      );
      const killAllGremlinsMatch = subCommand.match(/^(killAllGremlins)\s*?/i);
      const blessCommandMatch = subCommand.match(/^(bless)/i);
      const resetCommandMatch = subCommand.match(
        /^(reset)\s+(quests|recipes|inventory)$/i
      );
      const testNotifyCommandMatch = subCommand.match(
        /^(test\s+notify)\s+(challenge_unlock|challenge_complete|team_invite|accept_team_invite)\s*(\d+)?$/i
      );
      const addRoleMatch = subCommand.match(/^(add(\s*|_|-)role)\s*(.*)$/i);
      const removeRoleMatch = subCommand.match(
        /^(remove(\s*|_|-)role)\s*(.*)$/i
      );

      if (giveCommandMatch) {
        const item = giveCommandMatch[2];
        const count = giveCommandMatch[3];
        const targetUserName = giveCommandMatch[4];
        ok(item, "You must specify an item string");
        const bag = parseItemStringAsBag(
          ["/recipes", "/items"],
          item,
          count || "1"
        );
        if (bag === undefined) {
          return;
        }
        const targetId = targetUserName
          ? (await this.deps.socialManager.resolveUserName(targetUserName))
              ?.user.id
          : userId;
        if (!targetId) {
          this.deps.mailman.showChatError(
            `Unable to resolve user: ${targetUserName}`
          );
          return;
        }
        await jsonPost<void, GiveItemRequest>("/api/admin/give_item", {
          userId: targetId,
          serializedBag: itemBagToString(bag),
          giveTarget: "inventory",
        });
      } else if (minigameKitCommandMatch) {
        const kit = (minigameKitCommandMatch[2] ?? "").trim();
        const validKits = keys(zMinigameType.Values);
        if (!validKits.includes(kit)) {
          this.deps.mailman.showChatError(
            `Invalid kit: ${kit} - valid kits are ${validKits.join(", ")}`
          );
          return;
        }
        fireAndForget(
          this.deps.events.publish(
            new GiveMinigameKitEvent({
              id: userId,
              kit: {
                kind: kit as MinigameType,
              },
            })
          )
        );
      } else if (spawnCommandMatch) {
        const [npcType, quantity] = spawnCommandMatch[2].split(" ");

        ok(npcType, "You must specify an npc string");
        const typeId = parseItemNameOrId(["/npcs/types"], npcType);
        if (typeId === undefined) {
          this.deps.mailman.showChatError(
            `Could not find NPC Type for: ${npcType}`
          );
          return;
        }
        const quantityParsed = parseInt(quantity);
        const quantityNumber = !isNaN(quantityParsed) ? quantityParsed : 1;

        for (let i = 0; i < quantityNumber; ++i) {
          await jsonPost<void, SpawnRequest>("/api/admin/spawn", {
            userId,
            typeId,
          });
        }
      } else if (createNpcCommandMatch) {
        const [npcType, name] = createNpcCommandMatch[2].split(" ", 2);
        ok(npcType, "You must specify an NPC type");
        const typeId = parseItemNameOrId(["/npcs/types"], npcType);
        if (typeId === undefined) {
          this.deps.mailman.showChatError(
            `Could not find NPC Type for: ${npcType}`
          );
          return;
        }
        const displayName = name.trim();
        if (!displayName) {
          this.deps.mailman.showChatError("You must name the NPC");
          return;
        }
        const id = await jsonPost<BiomesId, CreateNpcRequest>(
          "/api/admin/create_npc",
          {
            userId,
            typeId,
            displayName,
          }
        );
        this.deps.mailman.showChatError(`Created NPC ${id}`);
      } else if (placeNpcCommandMatch) {
        const npcIdOrName = placeNpcCommandMatch[2].trim();
        if (!npcIdOrName || isNaN(+npcIdOrName)) {
          this.deps.mailman.showChatError("You must specify an NPC ID");
          return;
        }

        await jsonPost<void, PlaceNpcRequest>("/api/admin/place_npc", {
          userId,
          npcId: parseBiomesId(npcIdOrName),
        });
      } else if (killAllNpcsMatch) {
        let maybeNpcType: BiomesId | undefined = undefined;

        if (killAllNpcsMatch.length >= 3 && killAllNpcsMatch[2]) {
          maybeNpcType = parseItemNameOrId(
            ["/npcs/types"],
            killAllNpcsMatch[2]
          );
          if (maybeNpcType === undefined) {
            this.deps.mailman.showChatError(
              `NPC type id ${maybeNpcType} is not an NPC`
            );
            return;
          }
        }

        await jsonPost<void, KillAllNpcsRequest>("/api/admin/kill_all_npcs", {
          userId,
          npcTypeId: maybeNpcType,
        });
      } else if (killAllGremlinsMatch) {
        await jsonPostNoBody<void>("/api/admin/kill_all_gremlins");
      } else if (blessCommandMatch) {
        const splitCommand = subCommand.split(/\s+/);
        ok(
          splitCommand.length == 1 || splitCommand.length == 2,
          "Expected zero or one parameter for bless command."
        );
        // If no user is specified, default to the command issuer.
        const targetId =
          splitCommand.length == 2
            ? (await this.deps.socialManager.resolveUserName(splitCommand[1]))
                ?.user.id
            : userId;

        if (!targetId) {
          this.deps.mailman.showChatError(
            `Unable to resolve user: ${splitCommand[1]}`
          );
          return;
        }

        // No parameters, just put a whole bunch of every block into the player's
        // overflow so that they can build with them care free!
        const bag = createBag(
          ...getBiscuits(bikkie.schema.blocks).flatMap((b) => {
            if (!b.terrainName) {
              // Don't add blocks that don't have a terrainName, they won't
              // be placeable in the world.
              return [];
            }
            // 10000 should be enough blocks for anyone!
            return [countOf(b.id, undefined, 10000n)];
          }),
          ...getBiscuits(bikkie.schema.items.blessed).map(({ id }) =>
            countOf(id, undefined, 1n)
          )
        );

        // There's a lot of different block types to give out here, so add them
        // to the overflow, which has much more capacity than the inventory.
        return await jsonPost<void, GiveItemRequest>("/api/admin/give_item", {
          userId: targetId,
          serializedBag: itemBagToString(bag),
          giveTarget: "overflow",
        });
      } else if (resetCommandMatch) {
        const thing = resetCommandMatch[2];
        if (thing.toLowerCase() === "quests") {
          return await jsonPost<void, ResetQuestsRequest>(
            "/api/admin/quests/reset",
            {
              userId,
              resetAll: true,
              challengeStateMap: {},
            }
          );
        } else if (thing.toLowerCase() === "recipes") {
          await jsonPost<void, ResetRecipesRequest>(
            "/api/admin/recipes/reset",
            {
              userId: userId,
            }
          );
        } else if (thing.toLowerCase() == "inventory") {
          await jsonPost<void, ResetInventoryRequest>(
            "/api/admin/reset_inventory",
            {
              userId: userId,
            }
          );
        } else {
          this.deps.mailman.showChatError(`Unknown thing '${thing}'`);
        }
      } else if (testNotifyCommandMatch) {
        const type = testNotifyCommandMatch[2];
        const maybeId =
          testNotifyCommandMatch[3] === undefined
            ? undefined
            : parseInt(testNotifyCommandMatch[3]);

        const messageToSend = ((): ChatMessage => {
          if (type === "challenge_unlock") {
            return {
              kind: "challenge_unlock",
              challengeId: (maybeId ?? 4106334661387928) as BiomesId,
            };
          } else if (type === "challenge_complete") {
            return {
              kind: "challenge_complete",
              challengeId: (maybeId ?? 4106334661387928) as BiomesId,
            };
          } else if (type === "accept_team_invite") {
            const playerTeam = this.deps.resources.get(
              "/ecs/c/player_current_team",
              userId
            );
            return {
              kind: "joined_my_team",
              player: userId,
              teamId: (maybeId ??
                playerTeam?.team_id ??
                INVALID_BIOMES_ID) as BiomesId,
            };
          } else {
            const playerTeam = this.deps.resources.get(
              "/ecs/c/player_current_team",
              userId
            );
            return {
              kind: "invitedToTeam",
              entityId: userId,
              inviterId: userId,
              teamId: (maybeId ??
                playerTeam?.team_id ??
                INVALID_BIOMES_ID) as BiomesId,
            };
          }
        })();

        await jsonPost<void, AdminSendMessageBody>("/api/admin/send_message", {
          request: {
            to: userId,
            channel: "activity",
            message: messageToSend,
          },
        });
      } else if (addRoleMatch || removeRoleMatch) {
        const isAdd = !!addRoleMatch;
        const role = isAdd
          ? addRoleMatch[3]
          : removeRoleMatch
          ? removeRoleMatch[3]
          : null;

        if (!role) {
          return;
        }

        void this.handleChangeRoleCommand({
          role,
          isAdd,
        });
      } else {
        this.deps.mailman.showChatError("Unknown command!");
      }
    } catch (error: any) {
      this.deps.mailman.showChatError(error);
      return;
    }
  }

  private async handleChangeRoleCommand({
    role: rawRole,
    isAdd,
  }: {
    role: string;
    isAdd: boolean;
  }): Promise<void> {
    const parsedRole = zSpecialRoles.safeParse(rawRole);
    if (!parsedRole.success) {
      this.deps.mailman.showChatError(`Invalid role '${rawRole}'`);
      return;
    }
    const role = parsedRole.data;
    await changeRole(this.deps, role, isAdd);
    this.deps.mailman.showChatInfo(
      `${isAdd ? "Added" : "Removed"} role ${role}`
    );

    // Expire the role after expiry time.
    if (isAdd) {
      const ROLE_EXPIRY_MS = 1000 * 60 * 10; // 10 minutes
      setTimeout(() => {
        void (async () => {
          // Removing a role user does not have is a no-op.
          await changeRole(this.deps, role, false);
          this.deps.mailman.showChatInfo(`${role} role expired`);
        })();
      }, ROLE_EXPIRY_MS);
    }
  }

  private async handleFlyingCommand(
    localPlayer: LocalPlayer,
    currentUser: BiomesUser,
    command: string
  ) {
    if (
      !currentUser.hasSpecialRole("flying") ||
      !["fly", "land"].includes(command)
    ) {
      this.deps.mailman.showChatError(`Unknown command '/${command}'`);
    } else {
      localPlayer.adminFlying = command === "fly";
    }
  }

  private async handleNoClipCommand(
    localPlayer: LocalPlayer,
    currentUser: BiomesUser
  ) {
    if (!currentUser.hasSpecialRole("noClip")) {
      this.deps.mailman.showChatError(`Unknown command`);
    } else {
      localPlayer.adminNoClip = !localPlayer.adminNoClip;
    }
  }

  private async resolveTeleportTarget(arg: string): Promise<Vec3 | undefined> {
    const parts = arg.split(/[\s|,]/).map(parseFloat);
    if (parts.length === 3 && parts.every((x) => !isNaN(x))) {
      return parts as Vec3;
    }
    const biomesId = safeParseBiomesId(arg);
    if (biomesId) {
      const byId = this.deps.table.get(biomesId);
      if (byId?.position) {
        return [...byId.position.v];
      }
    }

    if (arg.match(/^\s*g(remlin)?\s*$/)) {
      for (const entity of this.deps.table.scan(GremlinSelector.query.all())) {
        if (entity.position) {
          this.deps.mailman.showChatError(
            `At ${entity.label?.text} / ${entity.id}`
          );
          return [...entity.position.v];
        }
      }
    }

    const local = this.deps.table.get(LabelSelector.query.key(arg));
    if (local?.position) {
      return [...local.position.v];
    }
    const id = (await this.deps.socialManager.resolveUserName(arg))?.user?.id;
    if (!id) {
      return;
    }
    try {
      const res = await jsonPost<EntityBatchResponse, EntityBatchRequest>(
        "/api/admin/batch_get",
        {
          ids: [id],
          components: ["position"],
        }
      );
      const entity = EntitySerde.deserialize(res.entities[0], false);
      return entity.position!.v;
    } catch (error: any) {
      log.warn(`Unable to locate user ${arg}`, { error });
      return;
    }
  }

  private async handleTeleportCommand(
    currentUser: BiomesUser,
    command: string,
    arg: string
  ) {
    if (
      !currentUser.hasSpecialRole("admin") ||
      !["tp", "teleport"].includes(command)
    ) {
      this.deps.mailman.showChatError(`Unknown command '/${command}'`);
      return;
    }
    const target = await this.resolveTeleportTarget(arg);
    if (!target) {
      this.deps.mailman.showChatError(`Unknown target '${arg}'`);
      return;
    }
    await warpToPosition(this.deps, target);
  }

  private async handlePullCommand(arg: string) {
    const targetId = await this.deps.socialManager.resolveUserNameOrId(arg);
    const pos = this.deps.reactResources.get("/scene/local_player").player
      .position;
    await warpToPosition(this.deps, pos, targetId);
  }

  private async handlePresetCommand(
    input: ClientInput,
    currentUser: BiomesUser,
    command: string,
    action: string,
    preset: string
  ) {
    if (!currentUser.hasSpecialRole("admin")) {
      return;
    }
    if (command !== "preset") {
      return;
    }
    if (!["load", "save"].includes(action)) {
      return;
    }

    const floatPreset = parseFloat(preset);
    const presetQuery = isNaN(floatPreset) ? preset : (floatPreset as BiomesId);
    if (action === "load") {
      try {
        const res = await jsonPost<LoadPresetResponse, LoadPresetRequest>(
          "/api/admin/player_presets/load",
          {
            preset: presetQuery,
            playerId: currentUser.id,
          }
        );
        ok(res && res.pos.length === 3);
        await warpToPosition(this.deps, res.pos as Vec3);
        this.deps.mailman.showChatInfo(`Loaded preset ${presetQuery}`);
      } catch (error: any) {
        this.deps.mailman.showChatError(`Unable to load preset ${presetQuery}`);
      }
    } else {
      try {
        await jsonPost<SavePresetResponse, SavePresetRequest>(
          "/api/admin/player_presets/save",
          {
            preset: presetQuery,
            playerId: currentUser.id,
          }
        );
        this.deps.mailman.showChatInfo(`Saved preset ${presetQuery}`);
      } catch (error: any) {
        this.deps.mailman.showChatError(`Unable to save preset ${presetQuery}`);
      }
    }
  }

  async handleChatSubmission(input: string) {
    if (input.length === 0) {
      return;
    }

    // Sometimes keyboard events will come after the lock is released, ignore for some small duration
    this.deps.pointerLockManager.setDeadZone(100);

    const localPlayer = this.deps.reactResources.get("/scene/local_player");
    const dieMatch = input.match(/^\/die/i);
    const hurtMatch = input.match(/^\/hurt/i);
    const emoteMatch = input.match(
      /^\/(applause|clap|dance|flex|laugh|point|rock|sit|wave)/i
    );
    const yellMatch = input.match(/^\/(yell|shout) (.*)/i);
    const whoMatch = input.match(/^\/who\s*$/i);
    const teamMatch = input.match(/^\/(?:team|t)\s+(.*)\s*/i);
    const dmMatch = input.match(DM_COMMAND_REGEX);
    const replyMatch = input.match(/^\/(?:reply|r)\s+(.*)\s*/i);
    const targetedCommandMatch = input.match(/^\/(profile|trade)\s+([^\s]+)/);
    const adminCommandMatch = input.match(/^\/(admin)/i);
    const reportMatch = input.match(/^\/(report)\s*(.*)\s*$/i);
    const helpMatch = input.match(/^\/help$/i);
    const flyingMatch = input.match(/^\/(fly|land)/i);
    const noClipMatch = input.match(/^\/noclip\s*$/i);
    const teleportMatch = input.match(
      /^\/(tp|teleport)\s+(.+?|[-.\d]+(\s*,\s*|\s+)[-.\d]+(\s*,\s*|\s+)[-.\d]+)\s*$/i
    );
    const pullMatch = input.match(/^\/(pull)\s+([^\s]+)\s*$/i);
    const presetMatch = input.match(/^\/(preset)\s?(load|save)\s+(.+)\s*$/i);
    if (dieMatch) {
      void this.handleDie(localPlayer.id);
    } else if (hurtMatch) {
      let amount = parseInt(hurtMatch[2] ?? "1");
      if (isNaN(amount)) {
        amount = 1;
      }
      void this.handleHurt(localPlayer.id, amount);
    } else if (emoteMatch) {
      const emoteType = emoteStringToEmoteType(emoteMatch[1].toLowerCase());
      localPlayer.player.eagerEmote(
        this.deps.events,
        this.deps.reactResources,
        emoteType
      );
      if (includes(zEmoteMessageEmoteType.Values, emoteType)) {
        void this.deps.chatIo.sendMessage("chat", {
          kind: "emote",
          emote_type: emoteType as EmoteMessageEmoteType,
        });
      }
    } else if (targetedCommandMatch) {
      const command = targetedCommandMatch[1];
      const target = targetedCommandMatch[2];
      void (async () => {
        const targetId = await this.deps.socialManager.resolveUserNameOrId(
          target
        );
        if (!targetId) {
          this.deps.mailman.showChatError("Unknown user '" + target + "'");
          return;
        }
        switch (command) {
          case "profile":
            this.deps.reactResources.set("/game_modal", {
              kind: "generic_miniphone",
              rootPayload: {
                type: "profile",
                userId: targetId,
              },
            });
            break;
          case "trade":
            try {
              const tradeId = await beginTrade(this.deps, targetId);
              this.deps.reactResources.set("/game_modal", {
                kind: "generic_miniphone",
                rootPayload: {
                  type: "trade",
                  tradeId,
                },
              });
            } catch (error: any) {
              this.deps.mailman.showChatError(error);
            }
            break;
        }
      })();
    } else if (yellMatch) {
      void this.deps.chatIo.sendMessage("yell", {
        kind: "text",
        content: yellMatch[2],
      });
    } else if (whoMatch) {
      try {
        const players = await jsonFetch<WhoPlayer[]>("/api/chat/who");
        this.deps.mailman.showChatInfo(
          `${players.map((p) => p.name).join(", ")} ${
            players.length > 1 ? "are" : "is"
          } online now`
        );
      } catch (error) {
        this.deps.mailman.showChatError("Unable to fetch who list");
      }
    } else if (teamMatch) {
      const teamId = this.deps.resources.get(
        "/ecs/c/player_current_team",
        localPlayer.id
      )?.team_id;
      if (!teamId) {
        this.deps.mailman.showChatError("You are not on a team");
        return;
      }
      void this.deps.chatIo.sendMessage(
        "chat",
        {
          kind: "text",
          content: teamMatch[1],
        },
        teamId
      );
    } else if (dmMatch) {
      const userId = await this.deps.socialManager.resolveUserNameOrId(
        dmMatch[1]
      );
      if (!userId) {
        this.deps.mailman.showChatError(
          `Unable to resolve username '${dmMatch[1]}'`
        );
        return;
      }
      void this.deps.chatIo.sendMessage(
        "chat",
        {
          kind: "text",
          content: dmMatch[2],
        },
        userId
      );
    } else if (replyMatch) {
      const lastAuthor = this.deps.mailman.getLastDmAuthor();
      if (!lastAuthor) {
        this.deps.mailman.showChatError("No one to reply to");
      } else {
        void this.deps.chatIo.sendMessage(
          "chat",
          {
            kind: "text",
            content: replyMatch[1],
          },
          lastAuthor
        );
      }
    } else if (adminCommandMatch) {
      void this.handleAdminCommand(localPlayer.id, input);
    } else if (flyingMatch) {
      void this.handleFlyingCommand(
        localPlayer,
        this.deps.authManager.currentUser,
        flyingMatch[1]
      );
    } else if (noClipMatch) {
      void this.handleNoClipCommand(
        localPlayer,
        this.deps.authManager.currentUser
      );
    } else if (teleportMatch) {
      void this.handleTeleportCommand(
        this.deps.authManager.currentUser,
        teleportMatch[1],
        teleportMatch[2]
      );
    } else if (pullMatch) {
      void this.handlePullCommand(pullMatch[2].trim());
    } else if (presetMatch) {
      void this.handlePresetCommand(
        this.deps.input,
        this.deps.authManager.currentUser,
        presetMatch[1],
        presetMatch[2],
        presetMatch[3].trim()
      );
    } else if (reportMatch) {
      void makeReport(this.deps, {
        target: { kind: "bug" },
        reason: "quick",
        otherReason: reportMatch[2] || "Something is wrong!",
      }).then(() => {
        this.deps.mailman.showChatInfo(
          "Thank you! Your report has been received by the Biomes Development team."
        );
      });
    } else if (helpMatch) {
      this.deps.reactResources.set("/game_modal", { kind: "game_settings" });
      this.deps.pointerLockManager.unlock();
    } else if (input.startsWith("/")) {
      // Don't let typo'd DMs leak.
      this.deps.mailman.showChatError("Unknown command '" + input + "'");
    } else {
      void this.deps.chatIo.sendMessage("chat", {
        kind: "text",
        content: input,
      });
    }
  }
}

function emoteStringToEmoteType(emoteString: string): EmoteType {
  switch (emoteString) {
    case "clap":
      return "applause";
    default:
      return zEmoteType.parse(emoteString);
  }
}
