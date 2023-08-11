import type { ZService } from "@/server/shared/zrpc/server_types";
import { zVec3f } from "@/shared/math/types";
import type { BlockGeometryBuffer } from "@/shared/wasm/types/galois";
import type { ZClient } from "@/shared/zrpc/core";
import { zservice } from "@/shared/zrpc/service";
import type { ZodType } from "zod";
import { z } from "zod";

export const zGenBlockMeshRequest = z.object({
  encodedIsomorpisms: z.instanceof(Uint8Array),
  encodedOcclusions: z.instanceof(Uint8Array),
  v0: zVec3f,
});

export type GenBlockMeshRequest = z.infer<typeof zGenBlockMeshRequest>;

export const zGenBlockMeshResponse = z.object({
  geometry: z.any() as ZodType<BlockGeometryBuffer>,
});

export type GenBlockMeshResponse = z.infer<typeof zGenBlockMeshResponse>;

export const zClientWorker = zservice("worker").addRpc(
  "genBlockMesh",
  zGenBlockMeshRequest,
  zGenBlockMeshResponse
);

export type ClientWorkerService = ZService<typeof zClientWorker>;
export type ClientWorkerClient = ZClient<typeof zClientWorker>;
