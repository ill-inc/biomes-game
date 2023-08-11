import type { ClientContext } from "@/client/game/context";
import type { ClientResources } from "@/client/game/resources/types";
import type { SettingsKey } from "@/client/util/typed_local_storage";
import { getTypedStorageItem } from "@/client/util/typed_local_storage";
import type { AudioAssetType } from "@/galois/assets/audio";
import { audioFiles, getAudioAssetPaths } from "@/galois/assets/audio";
import type { AssetPath } from "@/galois/interface/asset_paths";
import type { RegistryLoader } from "@/shared/registry";
import { fireAndForget } from "@/shared/util/async";
import { MultiMap } from "@/shared/util/collections";
import type { Extends } from "@/shared/util/type_helpers";
import { ok } from "assert";
import { clamp, round, sample } from "lodash";
import * as THREE from "three";

export type VolumeSettingsType = Extends<
  SettingsKey,
  | "settings.volume"
  | "settings.volume.music"
  | "settings.volume.effects"
  | "settings.volume.media"
  | "settings.volume.voice"
>;

export const VOLUME_TYPE_VOLUME_MULTIPLER = new Map<SettingsKey, number>([
  ["settings.volume.music", 0.2],
  ["settings.volume.effects", 0.2],
  ["settings.volume.media", 0.4],
  ["settings.volume.voice", 0.6],
]);

export const ASSET_TYPE_VOLUME_MULTIPLER = new Map<AudioAssetType, number>([
  ["camera_select", 0.1],
  ["footsteps", 6.0],
]);

type BackgroundMusicEffect = "none" | "water";

// JS keeps compaining about non-finite numbers if we set volume...
function fixVolume(volume: number) {
  const rounded = round(volume, 4);
  return isFinite(rounded) ? rounded : 0;
}

type AudioTrackType = "music" | "muck_music";

interface AudioTrack {
  audio: THREE.Audio;
}

export class AudioManager {
  private audioListener: THREE.AudioListener | undefined;

  private audioTracks: Map<AudioTrackType, AudioTrack> = new Map();
  private currentTrack: AudioTrack | undefined;

  private backgroundMusicAttenuation = 0;
  private prefetched = false;
  private muted = false;

  private activeRegistry: Map<THREE.PositionalAudio, number> = new Map();
  private activeAssets: MultiMap<AudioAssetType, THREE.Audio> = new MultiMap();

  constructor(private resources: ClientResources) {}

  stop() {
    for (const [audio] of this.activeRegistry.entries()) {
      audio.stop();
      this.activeRegistry.delete(audio);
    }
  }

  hotHandoff(old: AudioManager) {
    this.activeRegistry = old.activeRegistry;
    this.activeAssets = old.activeAssets;
    old.stop();
  }

  setActive(audio: THREE.PositionalAudio, time: number) {
    this.activeRegistry.set(audio, time);
  }

  purgeInactive(time: number) {
    const PURGE_TIME = 1;
    for (const [audio, lastActive] of this.activeRegistry.entries()) {
      if (time > lastActive + PURGE_TIME) {
        audio.stop();
        this.activeRegistry.delete(audio);
      }
    }
  }

  prefetchAudioAssets() {
    if (!this.prefetched) {
      prefetchAudioAssets(this.resources);
      this.prefetched = true;
    }
  }

  getAudioListener() {
    return this.audioListener;
  }

  isRunning() {
    return this.audioListener && this.audioListener.context.state === "running";
  }

  async resumeAudio() {
    if (!this.isRunning()) {
      if (!this.audioListener) {
        this.audioListener = new THREE.AudioListener();
        const camera = this.resources.get("/scene/camera");
        camera.three.add(this.audioListener);
        this.resources.set("/audio", {
          listener: this.audioListener,
          manager: this,
        });
      }
      await this.audioListener.context.resume();
      await this.startBackgroundMusic();
      this.prefetchAudioAssets();
    }
  }

  async startBackgroundMusic() {
    if (!this.audioListener || this.currentTrack) {
      return;
    }
    const loadTrack = async (
      audioTrackType: AudioTrackType,
      assetType: AudioAssetType
    ) => {
      if (!this.audioListener || this.audioTracks.has(audioTrackType)) {
        return;
      }
      const assetPath = sample(getAudioAssetPaths(assetType))!;
      const audio = new THREE.Audio(this.audioListener);
      const buffer = await this.resources.get("/audio/buffer", assetPath);
      if (!buffer) {
        // Should we try to start it later to avoid race conditions?
        return;
      }
      audio.setBuffer(buffer);
      audio.setLoop(true);
      audio.setFilters(this.getBackgroundMusicFilters());
      audio.gain.gain.value = 0;
      audio.play();
      this.audioTracks.set(audioTrackType, { audio });
    };

    await Promise.all([
      loadTrack("music", "music"),
      loadTrack("muck_music", "muck_music"),
    ]);

    this.setBackgroundMusicTrack("music");
  }

  setBackgroundMusicTrack(trackType: AudioTrackType) {
    if (!this.audioListener) {
      return;
    }
    const context = this.audioListener.context;
    const newTrack = this.audioTracks.get(trackType);
    if (newTrack === this.currentTrack) {
      return;
    }
    this.currentTrack = this.audioTracks.get(trackType);

    // Crossfade volume to the current track.
    for (const track of this.audioTracks.values()) {
      if (track !== this.currentTrack) {
        track.audio.gain.gain.cancelScheduledValues(context.currentTime);
        track.audio.gain.gain.linearRampToValueAtTime(
          0,
          context.currentTime + 5
        );
      }
    }
    this.currentTrack?.audio.gain.gain.cancelScheduledValues(
      context.currentTime
    );
    this.currentTrack?.audio.gain.gain.linearRampToValueAtTime(
      this.getVolume("settings.volume.music"),
      context.currentTime + 5
    );
  }

  setBackgroundMusicAttenuation(value: number) {
    const attenuation = clamp(value, 0, 1);
    if (this.backgroundMusicAttenuation !== attenuation) {
      this.backgroundMusicAttenuation = attenuation;
      this.updateBackgroundMusicVolume();
    }
  }

  updateBackgroundMusicVolume() {
    const volume = this.getVolume("settings.volume.music");
    this.currentTrack?.audio.setVolume(volume);
  }

  private getBackgroundMusicFilters() {
    ok(this.audioListener, "Cannot apply an effect to undefined listener");
    const lowpass = this.audioListener.context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 0.5 * this.audioListener.context.sampleRate;
    return [lowpass];
  }

  setBackgroundMusicEffect(effect: BackgroundMusicEffect) {
    if (
      !this.audioListener ||
      !this.currentTrack ||
      !this.currentTrack.audio.filters.length
    ) {
      return;
    }

    const context = this.audioListener.context;

    if (effect === "water") {
      const lowpass = this.currentTrack.audio.filters[0] as BiquadFilterNode;
      lowpass.frequency.setTargetAtTime(200, context.currentTime, 0.2);
    } else {
      const lowpass = this.currentTrack.audio.filters[0] as BiquadFilterNode;
      const nyquist = 0.5 * context.sampleRate;
      lowpass.frequency.setTargetAtTime(nyquist, context.currentTime, 0.2);
    }
  }

  getBuffer(assetPath: AssetPath) {
    return this.resources.cached("/audio/buffer", assetPath);
  }

  playSound(
    assetType: AudioAssetType,
    options: {
      idempotent: boolean;
    } = {
      idempotent: false,
    }
  ) {
    if (options.idempotent && this.activeAssets.hasAny(assetType)) {
      return;
    }

    fireAndForget(
      (async () => {
        if (!this.audioListener) {
          return;
        }

        const assetPath = sample(getAudioAssetPaths(assetType))!;
        const volume = this.getVolume("settings.volume.effects", assetType);
        if (volume === 0) {
          return;
        }
        const sound = new THREE.Audio(this.audioListener);
        const buffer = await this.resources.get("/audio/buffer", assetPath);
        if (buffer) {
          this.activeAssets.add(assetType, sound);
          sound.setBuffer(buffer);
          sound.setVolume(volume);
          sound.onEnded = () => {
            sound.disconnect();
            this.activeAssets.delete(assetType, sound);
          };
          sound.play();
        }
      })()
    );
  }

  muteAll() {
    this.muted = true;
    this.currentTrack?.audio.setVolume(0);
  }

  getVolume(type: VolumeSettingsType, assetType?: AudioAssetType) {
    if (this.muted) {
      return 0;
    }
    const volume = (getTypedStorageItem(type) ?? 0) / 100;
    const generalMultipler =
      (getTypedStorageItem("settings.volume") ?? 0) / 100;
    const backgroundMultiplier =
      type === "settings.volume.music"
        ? 1 - this.backgroundMusicAttenuation
        : 1;
    const assetTypeMultiplier = assetType
      ? ASSET_TYPE_VOLUME_MULTIPLER.get(assetType) ?? 1
      : 1;
    const volumeTypeMultiplier = VOLUME_TYPE_VOLUME_MULTIPLER.get(type) ?? 1;

    const result = fixVolume(
      volume *
        generalMultipler *
        backgroundMultiplier *
        assetTypeMultiplier *
        volumeTypeMultiplier
    );

    return result;
  }
}

function prefetchAudioAssets(resources: ClientResources) {
  audioFiles.forEach((file) =>
    resources.cached("/audio/buffer", file as AssetPath)
  );
}

export async function loadAudioManager(loader: RegistryLoader<ClientContext>) {
  return new AudioManager(await loader.get("resources"));
}
