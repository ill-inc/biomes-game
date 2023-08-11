import { AdminPage } from "@/client/components/admin/AdminPage";
import styles from "@/client/styles/admin.player_presets.module.css";
import { biomesGetServerSideProps } from "@/server/web/util/ssp_middleware";
import type { InferGetServerSidePropsType } from "next";
import { useRouter } from "next/router";
import React from "react";

export const getServerSideProps = biomesGetServerSideProps(
  {
    auth: "admin",
  },
  async ({ context: { askApi } }) => {
    const presets = await askApi.scanAll("presets");
    return {
      props: {
        presets: presets.map((preset) => ({
          id: preset.id,
          name: preset.label()?.text || preset.id.toString(),
        })),
      },
    };
  }
);

export const PlayerPresets: React.FunctionComponent<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ presets }) => {
  const router = useRouter();

  return (
    <AdminPage>
      <h1>Player Presets</h1>
      <div className={styles["create"]}>
        Presets. Manage in-game with:
        <pre>/preset save &lt;name&gt;</pre>
        <pre>/preset load &lt;name&gt;</pre>
      </div>
      <ul className={styles["preset-list"]}>
        {presets.map((preset) => (
          <li
            key={preset.id}
            onClick={() => {
              void router.push(`/admin/player_presets/${preset.id}`);
            }}
          >
            <div className={styles["preset-name"]}>{preset.name}</div>
            <div className={styles["preset-id"]}>({preset.id})</div>
          </li>
        ))}
      </ul>
    </AdminPage>
  );
};
export default PlayerPresets;
