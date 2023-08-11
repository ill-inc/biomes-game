import { runWebServerScript } from "@/server/web/script_runner";

// This script backfills deletion flag for all posts
runWebServerScript(async (context) => {
  console.log(context.config);
  const allFeedPosts = (await context.db.collection("feed-posts").get()).docs;
  console.log("allFeedPosts", allFeedPosts);
  await Promise.all(
    allFeedPosts.map(async (post) => {
      if (post.data().deleted === undefined) {
        console.log(`Backfilling deletion flag for post ${post.id}`);
      }
    })
  );
});

export {};
