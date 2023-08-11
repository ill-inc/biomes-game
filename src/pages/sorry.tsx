import { DISCORD_URL, TWITTER_URL } from "@/shared/constants";
import Head from "next/head";
import Link from "next/link";
import biomesLogoImage from "/public/splash/biomes-logo.png";

export default function Sorry() {
  const year = new Date().getFullYear();
  return (
    <>
      <Head>
        <meta name="theme-color" content="#42A0C3"></meta>
      </Head>

      <main className="splash-page">
        <>
          <header className="splash-header">
            <div className="left">
              <Link href="/" passHref>
                <img src={biomesLogoImage.src} />
              </Link>
            </div>

            <div className="right">
              <a href={DISCORD_URL} target="_blank" rel="noreferrer">
                Discord
              </a>
              <a href={TWITTER_URL} target="_blank" rel="noreferrer">
                Twitter
              </a>
            </div>
          </header>

          <section className="intro">
            <section className="description">
              Sorry \uD83D\uDE2D Not available right now.
            </section>
          </section>

          <footer>
            <div className="left" />
            <div className="center">
              <a href="https://ill.inc">
                &copy; {year} Global Illumination, Inc.
              </a>
            </div>
            <div className="right" />
          </footer>
        </>
      </main>
    </>
  );
}
