import styles from "@/client/styles/admin.module.css";
import { useRouter } from "next/router";
import type { PropsWithChildren } from "react";
import React, { useState } from "react";

const LinkButton: React.FunctionComponent<
  PropsWithChildren<{ path: string }>
> = ({ path, children }) => {
  const router = useRouter();
  const active = router.pathname.startsWith(path);
  return (
    <a
      className={`header-link link ${active ? "active" : ""} `}
      style={{ color: active ? "var(--light-purple)" : "" }}
      onClick={(e) => {
        e.preventDefault();
        void router.push(path);
      }}
    >
      {children}
    </a>
  );
};

export const AdminPage: React.FunctionComponent<
  PropsWithChildren<{ dontScroll?: boolean }>
> = ({ children, dontScroll }) => {
  const router = useRouter();
  const [headerUsername, setHeaderUsername] = useState("");
  const [headerBiomesId, setHeaderBiomesId] = useState("");

  return (
    <div className={styles["admin-page"]}>
      <section className={styles["admin-header"]}>
        <section className={styles["admin-header-links"]}>
          <div className={styles["link-button"]}>
            <div className={styles["link-button"]}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (headerUsername !== "") {
                    void router.push(
                      `/admin/user/${encodeURIComponent(headerUsername)}`
                    );
                  }
                }}
              >
                <input
                  type="text"
                  placeholder="Search Username or ID"
                  value={headerUsername}
                  onChange={(e) => {
                    setHeaderUsername(e.target.value);
                  }}
                />
              </form>
            </div>
            <div className={styles["link-button"]}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (headerBiomesId !== "") {
                    void router.push(
                      `/admin/ecs/${encodeURIComponent(headerBiomesId)}`
                    );
                  }
                }}
              >
                <input
                  type="text"
                  placeholder="Search ECS Entity"
                  value={headerBiomesId}
                  onChange={(e) => {
                    setHeaderBiomesId(e.target.value);
                  }}
                />
              </form>
            </div>
          </div>
          <div className={styles["link-button"]}>
            <LinkButton path="/admin/bikkie">Bikkie</LinkButton>
            <LinkButton path="/admin/quests">Quests</LinkButton>
            <LinkButton path="/admin/robots">Robots</LinkButton>
            <LinkButton path="/admin/metaquests">Metaquests</LinkButton>
            <LinkButton path="/admin/players">Players</LinkButton>
            <LinkButton path="/admin/player_presets">Player Presets</LinkButton>
            <LinkButton path="/admin/invite_codes">Invites</LinkButton>
            <LinkButton path="/admin/source_maps">Source Maps</LinkButton>
            <LinkButton path="/admin/bikkie/log">Bikkie Log</LinkButton>
            <LinkButton path="/admin/integrity_item">Item Check</LinkButton>
            <LinkButton path="/admin/image_selector">Image Selector</LinkButton>
            <LinkButton path="/admin/particle_editor">
              Particle Editor
            </LinkButton>
          </div>
        </section>
      </section>
      <section
        className={`${styles["admin-sectional-contents"]} ${
          dontScroll ? styles["admin-sectional-fixed-height"] : ""
        }`}
      >
        {children}
      </section>
    </div>
  );
};
