import type { SendMessageRequest } from "@/server/shared/chat/api";
import type { PlayerSpatialObserver } from "@/server/shared/chat/player_observer";
import { WATERMARK_MESSAGE_KINDS } from "@/shared/chat/messages";
import type { ChannelName, Envelope, MessageVolume } from "@/shared/chat/types";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { Vec3 } from "@/shared/math/types";
import { autoId } from "@/shared/util/auto_id";
import { removeFalsyInPlace } from "@/shared/util/object";

export interface PositionProvider {
  copyPosition: (id: BiomesId) => Promise<Vec3 | undefined>;
}

export async function wrapInEnvelope(
  { id: providedId, localTime, from, spatial, message, to }: SendMessageRequest,
  players: PositionProvider
): Promise<Envelope> {
  const envelope: Envelope = {
    id: providedId ?? autoId(),
    createdAt: Date.now(),
    localTime: localTime ?? Date.now(),
    from,
    spatial,
    message,
    to,
  };
  if (envelope.from && envelope.spatial) {
    envelope.spatial.position = await players.copyPosition(envelope.from);
  }
  return removeFalsyInPlace(envelope);
}

export function determineChannel({
  channel: channelOverrides,
  to,
}: {
  channel?: ChannelName;
  to?: BiomesId;
}) {
  return channelOverrides ?? (to ? "dm" : "chat");
}

export function determineRadius(volume: MessageVolume): number | undefined {
  switch (volume) {
    case "whisper":
      return CONFIG.playerWhisperRadius ?? CONFIG.playerChatRadius;
    case "chat":
      return CONFIG.playerChatRadius;
    case "yell":
      return CONFIG.playerYellRadius ?? CONFIG.playerChatRadius;
  }
}

const NO_ECHO_CHANNELS = new Set<ChannelName>(["activity"]);

export type EnvelopeForTargetting = Pick<
  Envelope,
  "from" | "spatial" | "to" | "message"
> & { id?: string };

export function determineImmediateTargets(
  channelName: ChannelName,
  envelope: EnvelopeForTargetting
): Set<BiomesId> {
  const targets = new Set<BiomesId>();
  if (WATERMARK_MESSAGE_KINDS.has(envelope.message.kind)) {
    if (envelope.from) {
      targets.add(envelope.from);
    }
    return targets;
  }
  if (!NO_ECHO_CHANNELS.has(channelName) && envelope.from) {
    targets.add(envelope.from);
  }
  if (envelope.to) {
    targets.add(envelope.to);
    return targets;
  }
  return targets;
}

export function hasSpatialTargets(
  envelope: EnvelopeForTargetting
): envelope is EnvelopeForTargetting & { spatial: { position: Vec3 } } {
  return Boolean(
    !WATERMARK_MESSAGE_KINDS.has(envelope.message.kind) &&
      !envelope.to &&
      envelope.spatial?.position
  );
}

export function determineSpatialTargets(
  players: PlayerSpatialObserver,
  envelope: EnvelopeForTargetting
): Set<BiomesId> {
  const targets = new Set<BiomesId>();
  if (!hasSpatialTargets(envelope)) {
    return targets;
  }
  const threshold = determineRadius(envelope.spatial.volume);
  if (!threshold) {
    log.warn(
      `Chat message ${envelope.id} ignored, muted radius ${envelope.spatial.volume}`
    );
    return targets;
  }
  for (const id of players.scanSphere({
    center: envelope.spatial.position,
    radius: threshold,
  })) {
    targets.add(id);
  }
  return targets;
}

export function determineTargets(
  players: PlayerSpatialObserver,
  channelName: ChannelName,
  envelope: EnvelopeForTargetting
): Set<BiomesId> {
  const targets = determineImmediateTargets(channelName, envelope);
  for (const target of determineSpatialTargets(players, envelope)) {
    targets.add(target);
  }
  return targets;
}

export function shouldPush(
  channelName: ChannelName,
  envelope: EnvelopeForTargetting
) {
  switch (channelName) {
    case "activity":
      if (
        CONFIG.activityMessagesToPush.includes(
          envelope.message
            .kind as (typeof CONFIG.activityMessagesToPush)[number]
        )
      ) {
        return true;
      }
      break;
    case "dm":
      return true;
  }
  return false;
}
