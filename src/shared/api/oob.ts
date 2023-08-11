import type { Entity } from "@/shared/ecs/gen/entities";
import { zEntity } from "@/shared/ecs/zod";
import type { BiomesId } from "@/shared/ids";
import { zBiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { binaryPost } from "@/shared/util/fetch_helpers";
import { asyncBackoffOnAllErrors } from "@/shared/util/retry_helpers";
import { zrpcDeserialize } from "@/shared/zrpc/serde";
import { z } from "zod";

export const zOobRequest = z.object({
  ids: zBiomesId.array().max(1000),
});

export type OobRequest = z.infer<typeof zOobRequest>;

export const zOobResponse = z.object({
  entities: z.tuple([z.number(), zEntity.optional()]).array(),
});

export type OobResponse = z.infer<typeof zOobResponse>;
export type OobVersionAndEntity = [number, Entity | undefined];

export interface OobFetcher {
  fetch(ids: BiomesId[]): Promise<OobVersionAndEntity[]>;
}

export class RemoteOobFetcher implements OobFetcher {
  private readonly url: string;

  constructor(userId: BiomesId) {
    this.url =
      process.env.NODE_ENV === "production"
        ? "/sync/oob"
        : `http://${window.location.hostname}:${process.env.OOB_PORT}/sync/oob?u=${userId}`;
  }

  async fetch(ids: BiomesId[]): Promise<OobVersionAndEntity[]> {
    if (ids.length === 0) {
      return [];
    }
    // It's very important that OOB succeeds as it is part of sync and
    // other critical functionality, as such add a retry for it.
    try {
      return await asyncBackoffOnAllErrors(
        async () => {
          const response = await binaryPost<OobRequest>(this.url, { ids });
          const { entities } = zrpcDeserialize(response, zOobResponse);
          return entities.map(([tick, wrapped]) => [tick, wrapped?.entity]);
        },
        {
          baseMs: 500,
          exponent: 2,
          maxMs: 5000,
          jitter: 500,
        }
      );
    } catch (error) {
      log.error("oobFetch failed", { error });
      throw error;
    }
  }
}
