import { zCameraService, type CameraService } from "@/server/camera/api";
import { registerCameraService } from "@/server/camera/service";
import type { SharedServerContext } from "@/server/shared/context";
import { sharedServerContext } from "@/server/shared/context";
import { runServer } from "@/server/shared/main";
import { HostPort } from "@/server/shared/ports";
import type { ServerCamera } from "@/server/shared/screenshots/camera";
import { registerServerCamera } from "@/server/shared/screenshots/camera";
import type { ZrpcServer } from "@/server/shared/zrpc/server";
import { registerRpcServer } from "@/server/shared/zrpc/server";
import { RegistryBuilder } from "@/shared/registry";

export interface CameraServerContext extends SharedServerContext {
  camera: ServerCamera;
  cameraService: CameraService;
  rpcServer: ZrpcServer;
}

void runServer(
  "camera",
  () =>
    new RegistryBuilder<CameraServerContext>()
      .install(sharedServerContext)
      .bind("camera", registerServerCamera)
      .bind("cameraService", registerCameraService)
      .bind("rpcServer", () => registerRpcServer())
      .build(),
  async (context) => {
    context.rpcServer.install(zCameraService, context.cameraService);
    await context.rpcServer.start(HostPort.rpcPort);
  }
);
