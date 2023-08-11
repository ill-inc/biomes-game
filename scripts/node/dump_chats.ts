import { determineEmployeeUserId } from "@/server/shared/bootstrap/sync";
import { RedisChatApi } from "@/server/shared/chat/redis/redis";
import { connectToRedis } from "@/server/shared/redis/connection";
import { scriptInit } from "@/server/shared/script_init";
import { WorldApi } from "@/server/shared/world/api";
import { safeParseBiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { DefaultMap, compactMap } from "@/shared/util/collections";
import { render } from "prettyjson";

// kubectl port-forward redis-other-0 9000:6379
// LOCAL_REDIS_PORT=9000 ./b script dump_chats [id]
async function main(rawId?: string) {
  await scriptInit();

  const id = safeParseBiomesId(rawId) ?? (await determineEmployeeUserId());
  log.info("Scanning chat content for user", { id });

  const api = new RedisChatApi(
    0 as unknown as WorldApi,
    await connectToRedis("chat")
  );

  await api.healthy();
  const deliveries = await api.export(id);

  const countByChannel = new DefaultMap<string, number>(() => 0);
  for (const delivery of deliveries) {
    countByChannel.set(
      delivery.channelName,
      countByChannel.get(delivery.channelName) + (delivery.mail?.length ?? 0)
    );
    if (delivery.mail) {
      log.info(
        render(
          compactMap(delivery.mail, (m) =>
            m.message.kind === "text" ? m.message.content : undefined
          )
        )
      );
    }
  }

  for (const [channelName, count] of countByChannel) {
    log.info(`${channelName}: ${count}`);
  }
  await api.stop();
}

const [id] = process.argv.slice(2);
main(id);
