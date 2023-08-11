import styles from "@/client/styles/admin.art.module.css";
import { resolveAssetUrl } from "@/galois/interface/asset_paths";

export const DefaultTool: React.FunctionComponent<{}> = ({}) => {
  return (
    <div className={styles["grid-col"]} style={{ height: "100%" }}>
      <img
        style={{
          width: "25em",
          height: "25em",
          imageRendering: "pixelated",
        }}
        src={resolveAssetUrl("icons/pickaxe")}
      />
    </div>
  );
};
