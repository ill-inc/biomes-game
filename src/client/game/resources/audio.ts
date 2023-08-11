import type { ClientContext } from "@/client/game/context";
import type { AudioManager } from "@/client/game/context_managers/audio_manager";
import type {
  ClientResourceDeps,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import type { AssetPath } from "@/galois/interface/asset_paths";
import { resolveAssetUrl } from "@/galois/interface/asset_paths";
import type { RegistryLoader } from "@/shared/registry";
import * as THREE from "three";

export interface AudioResource {
  manager?: AudioManager;
  listener?: THREE.AudioListener;
}

function fetchAudioBuffer(path: AssetPath): Promise<AudioBuffer> {
  // Note: We cannot load samples if the AudioContext is missing, or there will be a warning in the console.
  // So make sure it exists before calling this function.
  return new Promise((resolve, reject) => {
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load(
      resolveAssetUrl(path),
      function (buffer) {
        resolve(buffer);
      },
      undefined,
      reject
    );
  });
}

async function genAudioBuffer(deps: ClientResourceDeps, path: AssetPath) {
  const { listener: audioListener, manager: audioManager } = deps.get("/audio");
  if (!audioListener || !audioManager) {
    return;
  }
  return fetchAudioBuffer(path);
}

export async function addAudioResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.add("/audio/buffer", genAudioBuffer);
  builder.addGlobal("/audio", {});
}
