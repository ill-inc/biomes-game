import { resolvePreset } from "@/pages/api/admin/player_presets/save";
import { copyPlayer, newPlayer } from "@/server/logic/utils/players";
import {
  connectForeignAuth,
  findLinkForForeignAuth,
} from "@/server/shared/auth/auth_link";
import type { EmailAuthFlowState } from "@/server/shared/auth/email";
import { sendLoginEmail } from "@/server/shared/auth/email";
import { encodeAuthState } from "@/server/shared/auth/foreign";
import { PLAYTEST_MARKER_INVITE_CODE } from "@/server/shared/auth/types";
import { getUserOrCreateIfNotExists } from "@/server/web/db/users";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { Expires, Iced, PresetApplied } from "@/shared/ecs/gen/components";
import { PatchableEntity } from "@/shared/ecs/gen/delta";
import { zBiomesId } from "@/shared/ids";
import { randomString } from "@/shared/util/helpers";
import { compact } from "lodash";
import { z } from "zod";

export const zPlaytestPresetRequest = z.object({
  preset: zBiomesId,
  emails: z.string().email().array(),
  expire: z.boolean().optional(),
});
export type PlaytestPresetRequest = z.infer<typeof zPlaytestPresetRequest>;

function generatePlaytesterUsername() {
  return `Playtester${randomString(4).toUpperCase()}`;
}

export default biomesApiHandler(
  {
    auth: "admin",
    body: zPlaytestPresetRequest,
  },
  async ({
    context: { db, idGenerator, worldApi, askApi },
    body: { preset, emails, expire },
    auth: { userId },
    unsafeRequest,
  }) => {
    const resolvedPreset = await resolvePreset(preset, worldApi, askApi);
    okOrAPIError(resolvedPreset, "not_found");
    const presetEntity = (await worldApi.get(resolvedPreset.id))?.materialize();
    okOrAPIError(presetEntity, "not_found");
    // Remove dupes
    const uniqueEmails = [...new Set(emails)];
    // Check if any of the emails are already in use.
    const usedEmails = compact(
      (
        await Promise.allSettled(
          uniqueEmails.map(async (email) => {
            if (await findLinkForForeignAuth(db, "email", email)) {
              return email;
            }
          })
        )
      ).filter((x) => x.status === "fulfilled" && x.value !== undefined)
    );
    okOrAPIError(
      usedEmails.length === 0,
      "bad_param",
      "Email(s) already used!"
    );
    await Promise.all(
      uniqueEmails.map(async (email) => {
        // Create their login.
        const link = await findLinkForForeignAuth(db, "email", email);
        okOrAPIError(!link, "bad_param", "Email already used!");

        // Connect their login to a user-id.
        const newUserId = await idGenerator.next();
        await connectForeignAuth(
          db,
          "email",
          {
            provider: "email",
            id: email,
            email,
            inviteCode: PLAYTEST_MARKER_INVITE_CODE,
          },
          newUserId
        );

        // Create the user ID
        const username = generatePlaytesterUsername();
        okOrAPIError(
          await getUserOrCreateIfNotExists(
            db,
            newUserId,
            username,
            PLAYTEST_MARKER_INVITE_CODE
          ),
          "bad_param",
          "Username already used!"
        );

        let player = newPlayer(newUserId, username);
        const playerDelta = new PatchableEntity(player);
        copyPlayer(new PatchableEntity(presetEntity), playerDelta);
        player = {
          ...player,
          ...playerDelta.finishAsNew(),
        };

        // Setup the ECS state appropriately
        await worldApi.apply({
          changes: [
            {
              kind: "create",
              entity: {
                ...player,
                // Mark the preset appropriately.
                preset_prototype: undefined,
                preset_applied: PresetApplied.create({
                  preset_id: presetEntity.id,
                  applier_id: userId,
                  applied_at: secondsSinceEpoch(),
                }),
                // They start iced, connection will de-ice them.
                iced: Iced.create(),
                ...(expire
                  ? {
                      expires: Expires.create({
                        trigger_at:
                          // Expire after a week.
                          secondsSinceEpoch() + 7 * 24 * 60 * 60,
                      }),
                    }
                  : {}),
              },
            },
          ],
        });

        // Send a login link.
        const url = new URL(
          "/auth/email/callback",
          `http://${unsafeRequest.headers.host}`
        );
        url.searchParams.set(
          "state",
          encodeAuthState<EmailAuthFlowState>({ e: email }, "30m")
        );
        if (process.env.NODE_ENV === "production") {
          url.protocol = "https:";
        }
        await sendLoginEmail(email, url.toString());
      })
    );
  }
);
