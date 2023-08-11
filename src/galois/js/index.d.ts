declare module "three" {
  export * from "@types/three";

  import { WebGLRenderer as BaseWebGLRenderer } from "@types/three";

  export class WebGLRenderer extends BaseWebGLRenderer {
    outputColorSpace: string;
  }
}
