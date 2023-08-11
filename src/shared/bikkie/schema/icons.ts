import type { Vec3 } from "@/shared/math/types";

export interface IconSettings {
  cameraDir?: Vec3;
  lightingDir?: Vec3;
  brightness?: number;
  contrast?: number;
  saturation?: number;
}

export const DEFAULT_ICON_SETTINGS: IconSettings = {
  cameraDir: [1, 1, -1],
  lightingDir: [7, 5, -11],
  brightness: 1.4,
  contrast: 1.0,
  saturation: 1.2,
};

export const DEFAULT_WEARABLE_ICON_SETTINGS: IconSettings = {
  cameraDir: [-1, 1, -1],
  lightingDir: [-7, 5, -11],
  brightness: 1.4,
  contrast: 1.0,
  saturation: 1.2,
};

export function encodeIconSettings(settings: IconSettings): string {
  return JSON.stringify({
    camera_dir: settings.cameraDir,
    lighting_dir: settings.lightingDir,
    brightness: settings.brightness,
    contrast: settings.contrast,
    saturation: settings.saturation,
  });
}
