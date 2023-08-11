import type {
  TakeScreenshotRequest,
  zCameraService,
} from "@/server/camera/api";
import type { CameraServerContext } from "@/server/camera/main";
import type { ServerCamera } from "@/server/shared/screenshots/camera";
import type { ZService } from "@/server/shared/zrpc/server_types";
import type { RegistryLoader } from "@/shared/registry";
import type { RpcContext } from "@/shared/zrpc/core";
import { RpcError } from "@/shared/zrpc/errors";
import * as grpc from "@/shared/zrpc/grpc";

export class CameraServiceImpl implements ZService<typeof zCameraService> {
  constructor(private readonly camera: ServerCamera) {}

  async takeScreenshot(_context: RpcContext, request: TakeScreenshotRequest) {
    try {
      return await this.camera.takeScreenshot(
        request.position,
        request.orientation
      );
    } catch (error) {
      throw new RpcError(grpc.status.INTERNAL, String(error));
    }
  }
}

export async function registerCameraService<C extends CameraServerContext>(
  loader: RegistryLoader<C>
) {
  return new CameraServiceImpl(await loader.get("camera"));
}
