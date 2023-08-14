import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import clsx from "clsx";
import React from "react";

import styles from "./index.module.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero hero--primary", styles.heroBanner)}>
      <div className="container">
        <div>
          <img
            style={{
              width: "50vw",
              filter: "invert(0)",
            }}
            src={require("@site/static/img/biomes-logo.png").default}
          />
        </div>
        <h2>{siteConfig.tagline}</h2>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro"
          >
            Jump into the docs!
          </Link>
        </div>
        <img
          style={{
            marginTop: "5px",
            borderRadius: "10px",
          }}
          src={require("@site/static/img/hero-bg.png").default}
        />
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  return (
    <Layout
      title={`Docs`}
      description="An open source sandbox MMORPG built for the web using web technologies"
    >
      <HomepageHeader />
      <main></main>
    </Layout>
  );
}
