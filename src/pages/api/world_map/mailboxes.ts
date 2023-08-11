import type { LazyEntity } from "@/server/shared/ecs/gen/lazy";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { bikkieDerived, getBiscuits } from "@/shared/bikkie/active";
import { zBiomesId } from "@/shared/ids";
import { zVec3f } from "@/shared/math/types";
import { compact } from "lodash";
import { z } from "zod";

export const zMailbox = z.object({
  id: zBiomesId,
  pos: zVec3f,
});

export type Mailbox = z.infer<typeof zMailbox>;

export const zMailboxesResponse = zMailbox.array();

export type MailboxesResponse = z.infer<typeof zMailboxesResponse>;

const mailboxIds = bikkieDerived("mailboxes", () => {
  const placeables = getBiscuits("/items/placeables");
  return placeables.filter((e) => e.isMailbox).map((e) => e.id);
});

export default biomesApiHandler(
  {
    auth: "optional",
    response: zMailboxesResponse,
  },
  async ({ context: { askApi } }) => {
    const ret = await Promise.all(
      mailboxIds().map((itemId): Promise<LazyEntity[]> => {
        return askApi.getByKeys({
          kind: "placeablesByItemId",
          itemId,
        });
      })
    );

    return ret.flatMap((entities): Array<Mailbox> => {
      return compact(
        entities.map((e): Mailbox | undefined => {
          const position = e.position();
          if (!position) {
            return;
          }

          return {
            id: e.id,
            pos: [...position.v],
          };
        })
      );
    });
  }
);
