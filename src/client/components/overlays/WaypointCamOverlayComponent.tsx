import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  ClickIcon,
  getClickIcon,
  ShortcutText,
} from "@/client/components/system/ShortcutText";

export const WaypointCamOverlayComponent: React.FunctionComponent = () => {
  const { reactResources } = useClientContext();
  const track = reactResources.use("/scene/waypoint_camera/track");
  const active = reactResources.use("/scene/waypoint_camera/active");
  if (active.kind === "active") {
    return <></>;
  }

  return (
    <div className="selection-inspect-overlay click-message">
      <div className="inspect">
        <div>
          <ShortcutText shortcut={<img src={getClickIcon("primary")} />}>
            Press <ClickIcon type="primary" /> to place waypoint
          </ShortcutText>
        </div>
        <div>
          <ShortcutText shortcut={<img src={getClickIcon("secondary")} />}>
            Press <ClickIcon type="secondary" /> to start
          </ShortcutText>
        </div>
      </div>

      <div className="inspect">
        {track.speed.toFixed(2)} m/s
        <ShortcutText
          shortcut="F"
          keyCode="KeyF"
          onKeyDown={() => {
            reactResources.update("/scene/waypoint_camera/track", (t) => {
              t.speed += 0.25;
            });
          }}
        >
          Faster
        </ShortcutText>
        <ShortcutText
          shortcut="G"
          keyCode="KeyG"
          onKeyDown={() => {
            reactResources.update("/scene/waypoint_camera/track", (t) => {
              t.speed -= 0.25;
              if (t.speed < 0) {
                t.speed = 0;
              }
            });
          }}
        >
          Slower
        </ShortcutText>
      </div>
      <div className="inspect">
        {track.waypoints.length} waypoints
        <ShortcutText
          shortcut="H"
          keyCode="KeyH"
          onKeyDown={() => {
            reactResources.update("/scene/waypoint_camera/track", (t) => {
              t.waypoints.pop();
            });
          }}
        >
          Delete Last
        </ShortcutText>
      </div>
    </div>
  );
};
