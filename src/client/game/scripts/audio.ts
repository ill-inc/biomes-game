import type { AudioManager } from "@/client/game/context_managers/audio_manager";
import type { ClientTable } from "@/client/game/game";
import type { ClientResources } from "@/client/game/resources/types";
import type { Script } from "@/client/game/scripts/script_controller";
import { AudioSourceSelector } from "@/shared/ecs/gen/selectors";
import { dist } from "@/shared/math/linear";
import { clamp } from "lodash";

export const SOUND_REF = 4; // distance around the source where the volume is max
export const SOUND_DISTANCE = 20; // distance from ref to 0 volume
export const SOUND_DEADZONE = 32; // distance beyond that where the youtube player is still around at 0 volume

export class AudioScript implements Script {
  readonly name = "audio";

  constructor(
    private readonly resources: ClientResources,
    private readonly table: ClientTable,
    private readonly audioManager: AudioManager
  ) {}

  tick(_dt: number) {
    const cameraPos = this.resources.get("/scene/camera").pos();

    const audioSources = [
      ...this.table.scan(
        AudioSourceSelector.query.spatial.inSphere(
          {
            center: cameraPos,
            radius: SOUND_REF + SOUND_DISTANCE + SOUND_DEADZONE,
          },
          {
            approx: true,
          }
        )
      ),
    ]
      .filter(
        (entity) =>
          !!entity.video_component.video_url && !entity.video_component.muted
      )
      .map((entity) => ({
        entity,
        distance: dist(entity.position.v, cameraPos),
      }))
      .sort((a, b) => a.distance - b.distance);

    const closestSource = audioSources?.[0];

    const maxVolume = this.audioManager.getVolume("settings.volume.media");
    const calculateVolume = (dist: number) =>
      clamp(
        ((SOUND_REF + SOUND_DISTANCE - dist) / SOUND_DISTANCE) * maxVolume,
        0,
        maxVolume
      );

    const { inWater, muckyness } = this.resources.get("/camera/environment");
    this.audioManager.setBackgroundMusicTrack(
      muckyness.get() > 0 ? "muck_music" : "music"
    );

    if (closestSource) {
      const volume = calculateVolume(closestSource.distance);
      this.audioManager.setBackgroundMusicAttenuation(
        (3.0 * volume) / maxVolume
      );
    } else {
      this.audioManager.setBackgroundMusicAttenuation(0);
    }

    if (inWater) {
      this.audioManager.setBackgroundMusicEffect("water");
    } else {
      this.audioManager.setBackgroundMusicEffect("none");
    }
  }
}
