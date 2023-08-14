import { RootErrorBoundary } from "@/client/components/RootErrorBoundary";
import SplashPage from "@/pages/splash";
import Head from "next/head";
import homeBg from "/public/splash/home-bg.png";

export interface BiomesHeadTagProps {
  refinedTitle?: string;
  description?: string;
  embedImage?: string;
  cardMode?: "summary" | "summary_large_image";
}

export const BiomesHeadTag: React.FunctionComponent<BiomesHeadTagProps> = (
  props
) => {
  const desc =
    props.description ??
    "A massively-multiplayer world where you can collect, craft, build, and trade with others.";

  const title = props.refinedTitle
    ? `${props.refinedTitle} | Biomes`
    : "Biomes";

  const embedImage = props.embedImage ?? homeBg.src;
  const imageAlt = props.embedImage
    ? "Overhead view of a Biomes world"
    : "People and animals standing on a hill in a Biomes world";
  const cardMode: BiomesHeadTagProps["cardMode"] =
    props.cardMode ?? "summary_large_image";

  return (
    <Head>
      {/* Boilerplate */}
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="manifest" href="https://static.biomes.gg/pwa/manifest.json" />
      {/* General */}
      <title>{title}</title>
      <meta name="description" content={desc} />
      {/* Open Graph / Facebook */}
      <meta property="og:title" content={title} />
      <meta name="og:description" content={desc} />
      <meta name="og:image" content={embedImage} />
      <meta name="og:image:secure_url" content={embedImage} />
      <meta name="og:image:type" content="image/x-png" />
      <meta name="og:image:alt" content={imageAlt} />
      <meta name="twitter:card" content={cardMode} />
      {/* Theming */}
      <meta name="theme-color" content="#42A0C3"></meta>
    </Head>
  );
};

export default function Index({}: {}) {
  return (
    <RootErrorBoundary>
      <BiomesHeadTag description="Biomes is an open source sandbox MMORPG built for the web using web technologies" />
      <SplashPage
        onLogin={() => {
          window.location.href = "/at";
        }}
      />
    </RootErrorBoundary>
  );
}
