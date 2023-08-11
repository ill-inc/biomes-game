import { uploadToBucket } from "@/server/web/cloud_storage/cloud_storage";
import type { WebServerContextSubset } from "@/server/web/context";
import {
  DoNotSendResponse,
  biomesApiHandler,
  zDoNotSendResponse,
} from "@/server/web/util/api_middleware";
import { ok } from "assert";
import md5 from "md5";
import mime from "mime-types";
import { z } from "zod";

export const zYoutubeThumbnailRequest = z.object({
  kind: z.literal("youtube"),
  videoId: z.string(),
});

export const zTwitchThumbnailRequest = z.object({
  kind: z.literal("twitch"),
  channel: z.string(),
});

export const zMediaImageRequest = z.discriminatedUnion("kind", [
  zYoutubeThumbnailRequest,
  zTwitchThumbnailRequest,
]);

export type MediaImageRequest = z.infer<typeof zMediaImageRequest>;

export const zMediaImageResponse = z.object({
  url: z.string().optional(),
});
export type MediaImageResponse = z.infer<typeof zMediaImageResponse>;

const ALLOWED_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg"];

async function mediaImageRequestToUrl(
  context: WebServerContextSubset<"twitchBot">,
  request: MediaImageRequest
): Promise<string> {
  switch (request.kind) {
    case "youtube": {
      return `https://img.youtube.com/vi/${request.videoId}/hqdefault.jpg`;
    }
    case "twitch": {
      const channel = await context.twitchBot.getChannel(request.channel);
      ok(channel, `Channel not found: ${request.channel}`);
      return channel.thumbnailUrl;
    }
  }
}

export default biomesApiHandler(
  {
    auth: "optional",
    query: zMediaImageRequest,
    response: zDoNotSendResponse,
  },

  async ({ context, query: request, unsafeResponse }) => {
    const { db, serverCache } = context;
    const hash = md5(JSON.stringify(request));
    const [cachedImage] = await serverCache.get("images-cache", hash);
    if (cachedImage) {
      unsafeResponse.redirect(cachedImage.url);
      return DoNotSendResponse;
    }
    const doc = await db.collection("images-cache").doc(hash).get();
    if (doc.exists) {
      // Store in faster serverCache.
      const url = doc.data()!.url;
      await serverCache.set(
        CONFIG.proxyServerImageTtlMs,
        "images-cache",
        hash,
        { url }
      );
      unsafeResponse.redirect(url);
      return DoNotSendResponse;
    }

    const url = await mediaImageRequestToUrl(context, request);
    const response = await fetch(url);
    ok(response.ok, `Error getting image: ${url}`);

    const contentType = response.headers.get("content-type");
    const extension = mime.extension(contentType ?? "");
    ok(
      extension && ALLOWED_IMAGE_EXTENSIONS.includes(extension),
      `Invalid image type: ${contentType}`
    );

    const filename = `proxy-images/${hash}.${extension}`;
    await uploadToBucket(
      "biomes-static",
      filename,
      Buffer.from(await response.arrayBuffer())
    );
    const biomesUrl = `https://static.biomes.gg/${filename}`;
    const image = { url: biomesUrl };
    await db.collection("images-cache").doc(hash).set(image);
    await serverCache.set(
      CONFIG.proxyServerImageTtlMs,
      "images-cache",
      hash,
      image
    );

    unsafeResponse.redirect(biomesUrl);
    return DoNotSendResponse;
  }
);
