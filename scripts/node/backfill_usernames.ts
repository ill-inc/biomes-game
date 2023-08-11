import { saveUsername } from "@/server/web/db/users";
import { findUniqueByUsername } from "@/server/web/db/users_fetch";
import { runWebServerScript } from "@/server/web/script_runner";
import { parseBiomesId } from "@/shared/ids";

// This script backfills creation timestamps for posts, likes, etc. and rebuilds counts
runWebServerScript(async (context) => {
  console.log(context.config);
  const allUsers = (await context.db.collection("users").get()).docs;
  await Promise.all(
    allUsers.map(async (user) => {
      const id = parseBiomesId(user.id);
      const username = user.data().username ?? `${Math.random()}`;
      if (username.endsWith("-backfill")) {
        const newname = username.substring(
          0,
          username.length - "-backfill".length
        );
        await saveUsername(context.db, id, newname);
        console.log(
          "Recovered",
          await findUniqueByUsername(context.db, newname)
        );
      } else {
        await saveUsername(context.db, id, `${username}-backfill`);
        console.log(`Saved ${username}-backfill`);
        await saveUsername(context.db, id, username);
        console.log(
          "Recovered",
          await findUniqueByUsername(context.db, username)
        );
      }
    })
  );
});

export {};
