import { scriptInit } from "@/server/shared/script_init";
import { createBdb, createStorageBackend } from "@/server/shared/storage";
import { StoragePath } from "@/server/shared/storage/biomes";
import { zFirestoreFeedPost } from "@/server/web/db/types";
import { PostTaggedObject, zPostTaggedObject } from "@/shared/types";
import { isEqual } from "lodash";

const BIOMES_INCEPTION_MS = 1631174400000;

// This script backfills creation timestamps for posts, likes, etc. and rebuilds counts
async function backfillDb() {
  await scriptInit();

  const storage = await createStorageBackend("firestore");
  const db = createBdb(storage);

  const allFeedPosts = (
    await db.backing.collection("feed-posts" as StoragePath).get()
  ).docs;
  await Promise.all(
    allFeedPosts.map(async (post) => {
      try {
        zFirestoreFeedPost.parse(post.data());
      } catch (error) {
        console.log(`Error parsing ${post.id}: ${error}`);
      }

      if (post.data().tagged) {
        const tagged: PostTaggedObject[] = [];
        for (const existing of post.data().tagged as any[]) {
          try {
            const pto = zPostTaggedObject.parse(existing);
            if (typeof pto.id !== "string") {
              tagged.push(pto);
              continue;
            }
            const mapped = global.LEGACY_ID_MAPPING?.[pto.id];
            if (mapped !== undefined) {
              tagged.push({ ...pto, id: mapped });
            }
          } catch (error) {
            console.log(`Error parsing tagged object: ${error}`);
          }
        }
        if (!isEqual(tagged, post.data().tagged)) {
          console.log(`Correcting post tag for ${post.id}`);
          await post.ref.update({
            tagged,
          });
        }
      }

      if (post.data().createMs === undefined) {
        console.log(`Backfilling creation timestamp for post ${post.id}`);
        await post.ref.update({
          createMs: BIOMES_INCEPTION_MS,
        });
      }

      if (post.data().media === undefined) {
        console.log(`Backfilling media for post ${post.id}`);
        await post.ref.update({
          media: [
            {
              cloudBucket: post.data().cloudBucket,
              cloudImageLocations: post.data().cloudImageLocations,
              metadata: post.data().metadata,
              caption: post.data().caption,
            },
          ],
        });
      }

      if ((post.data() as any).media?.length > 0) {
        const media = (post.data() as any).media[0];
        if (!media.cloudImageLocations && post.data().pngPath) {
          console.log(`Backfilling pngPath for post ${post.id}`);
          await post.ref.update({
            media: [
              {
                cloudBucket: "biomes-social",
                cloudImageLocations: {
                  png_1280w: post.data().pngPath,
                },
                metadata: post.data().metadata,
                caption: post.data().caption,
              },
            ],
          });
        }
      }

      const likes = (await post.ref.collection("likes" as StoragePath).get())
        .docs;
      const warps = (await post.ref.collection("warps" as StoragePath).get())
        .docs;
      const comments = (
        await post.ref.collection("comments" as StoragePath).get()
      ).docs;
      const numComments = comments.length;
      const numLikes = likes.length;
      const numWarps = warps.length;
      if (post.data().likes !== numLikes) {
        console.log(`Backfilling likes to ${numLikes} for ${post.id}`);
        await post.ref.update({
          likes: numLikes,
        });
      }
      if (post.data().warps !== numWarps) {
        console.log(`Backfilling warps to ${numWarps} for ${post.id}`);
        await post.ref.update({
          warps: numWarps,
        });
      }
      if (post.data().comments !== numComments) {
        console.log(`Backfilling comments to ${numComments} for ${post.id}`);
        await post.ref.update({
          comments: numComments,
        });
      }

      await Promise.all(
        likes.map(async (likeRecord) => {
          if (likeRecord.data().createMs === undefined) {
            console.log(
              `Backfilling like creation record timestamp for ${likeRecord.id}`
            );
            likeRecord.ref.update({
              createMs: BIOMES_INCEPTION_MS,
            });
          }
        })
      );

      await Promise.all(
        warps.map(async (warpRecord) => {
          if (warpRecord.data().createMs === undefined) {
            console.log(
              `Backfilling warp creation record timestamp for ${warpRecord.id}`
            );
            warpRecord.ref.update({
              createMs: BIOMES_INCEPTION_MS,
            });
          }
        })
      );
    })
  );

  const allUsers = (await db.collection("users").get()).docs;
  await Promise.all(
    allUsers.map(async (user) => {
      type refT = typeof user.ref;
      const allFollowing = await user.ref.collection("follows").get();
      const allFollowed = await user.ref.collection("followed-by").get();
      const allPosts = await db
        .collection("feed-posts")
        .where("userId", "==", user.id)
        .get();

      await Promise.all(
        allFollowing.docs.map(async (followingRecord) => {
          if (followingRecord.data().createMs === undefined) {
            console.log(
              `Backfilling follow creation timestamp for ${followingRecord.id}`
            );
            await followingRecord.ref.update({
              createMs: BIOMES_INCEPTION_MS,
            });
          }
        })
      );

      await Promise.all(
        allFollowed.docs.map(async (followedRecord) => {
          if (followedRecord.data().createMs === undefined) {
            console.log(
              `Backfilling followed creation timestamp for ${followedRecord.id}`
            );
            await followedRecord.ref.update({
              createMs: BIOMES_INCEPTION_MS,
            });
          }
        })
      );

      if (allFollowing.docs.length !== user.data().numFollowing) {
        console.log(
          `Backfilling follow count ${user.id} to ${allFollowing.docs.length}`
        );
        await user.ref.update({
          numFollowing: allFollowing.docs.length,
        });
      }

      if (allFollowed.docs.length !== user.data().numFollowers) {
        console.log(
          `Backfilling followed count ${user.id} to ${allFollowed.docs.length}`
        );
        await user.ref.update({
          numFollowers: allFollowed.docs.length,
        });
      }

      const numPhotos = allPosts.docs.reduce(
        (acc, post) => acc + (post.data()?.media?.length ?? 0),
        0
      );
      if (numPhotos !== user.data().numPhotos) {
        console.log(`Backfilling photo count ${user.id} to ${numPhotos}`);
        await user.ref.update({
          numPhotos,
        });
      }
    })
  );
}

backfillDb();
