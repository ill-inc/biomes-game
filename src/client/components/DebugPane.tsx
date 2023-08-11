import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { buildTimestamp } from "@/shared/build";
import { voxelShard } from "@/shared/game/shard";
import { orientationToRotation } from "@/shared/math/rotation";
import { observeUrl } from "@/shared/util/urls";

export function DebugPane() {
  const context = useClientContext();
  const localPlayer = context.reactResources.use("/scene/local_player");

  // Render the panel
  const [x, y, z] = localPlayer.player.position;
  const rotation = orientationToRotation(localPlayer.player.orientation);

  const shardId = voxelShard(x, y, z);
  const terrain = context.resources.get("/ecs/terrain", shardId);

  const ruleset = context.resources.get("/ruleset/current");

  const { muckyness } = context.resources.get(
    "/players/environment/muckyness",
    localPlayer.id
  );
  const { waterDepth } = context.resources.get(
    "/players/environment/water",
    localPlayer.id
  );

  return (
    <div className="debug-pane">
      <p>Build: {process.env.BUILD_ID ?? "unknown"}</p>
      <p>Built At: {new Date(buildTimestamp()).toString()}</p>
      <p>
        <a
          href={observeUrl(localPlayer.player.position)}
          target="_blank"
          rel="noreferrer"
        >
          {x.toFixed(1)}, {y.toFixed(1)}, {z.toFixed(1)} (xyz)
        </a>
      </p>
      <p>RuleSet: {ruleset.name} </p>
      <p>Terrain ID: {terrain?.id ?? "unknown"}</p>
      <p>Water Depth: {waterDepth}</p>
      <p>Muckyness: {muckyness}</p>
      <p>{rotation} (rotation)</p>
      <p>
        {localPlayer.player
          .getEyeAdaptationSpatialLighting()
          .map((val) => val.toFixed(2))
          .join(", ")}{" "}
        (eye adaptation: irradiance, sky visibility)
      </p>
      <p>{context.resources.count()} (resources)</p>
    </div>
  );
}
