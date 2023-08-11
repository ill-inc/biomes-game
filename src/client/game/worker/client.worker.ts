import { WasmSimd } from "@/client/game/client_config";
import { loadVoxeloo } from "@/client/game/webasm";
import type {
  ClientWorkerService,
  GenBlockMeshRequest,
} from "@/client/game/worker/api";
import { zClientWorker } from "@/client/game/worker/api";
import { inWorkerMessagePort, isInWorker } from "@/client/game/worker/util";
import { usingAll } from "@/shared/deletable";
import { loadShapeIndex } from "@/shared/game/resources/isomorphisms";
import { SHARD_SHAPE } from "@/shared/game/shard";
import { Tensor } from "@/shared/wasm/tensors";
import type { RpcContext } from "@/shared/zrpc/core";
import { MessagePortZrpcServer } from "@/shared/zrpc/messageport_server";
import { ok } from "assert";

export class ClientWorkerImpl implements ClientWorkerService {
  private readonly voxeloo = loadVoxeloo({
    wasmBinary: { simd: WasmSimd.Normal },
    voxelooMemoryMb: 16,
  });
  private readonly shapeIndex = (async () =>
    loadShapeIndex(await this.voxeloo))();

  async genBlockMesh(_rpc: RpcContext, request: GenBlockMeshRequest) {
    const voxeloo = await this.voxeloo;
    const shapeIndex = await this.shapeIndex;
    return {
      geometry: usingAll(
        [
          Tensor.make(voxeloo, SHARD_SHAPE, "U32"),
          Tensor.make(voxeloo, SHARD_SHAPE, "U8"),
        ],
        (isomorpisms, occlusions) => {
          isomorpisms.load(request.encodedIsomorpisms);
          occlusions.load(request.encodedOcclusions);
          return voxeloo.toBlockGeometry(
            isomorpisms.cpp,
            occlusions.cpp,
            shapeIndex,
            request.v0
          );
        }
      ),
    };
  }
}

ok(isInWorker());

// Notes:
// - It is important that there is a synchronous path from the start
// of this script to registering the on-message handler (in the server
// constructor), otherwise messages may be handled prior to the service
// being registered.
// - You cannot depend on 'host.ts', even transitively, from this file. This
// makes Webpack unhappy and you'll get errors about hashes.
const server = new MessagePortZrpcServer(inWorkerMessagePort());
server.install(zClientWorker, new ClientWorkerImpl());
