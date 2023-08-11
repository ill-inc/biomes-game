import { SplashHeader } from "@/client/components/static_site/SplashHeader";
import Head from "next/head";
import type { PropsWithChildren } from "react";
import React from "react";
import homeBg from "/public/splash/home-bg.png";

export interface OpenGraphMetadata {
  title?: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  description?: string;
  url?: string;
  type?: "website";

  twitterSiteHandle?: string;
  twitterCardType?: "summary" | "summary_large_image" | "app" | "player";
}

export const StaticPage: React.FunctionComponent<
  PropsWithChildren<{
    extraClassName?: string;
    title?: string;
    openGraphMetadata?: OpenGraphMetadata;
  }>
> = ({ extraClassName, title, openGraphMetadata, children }) => {
  return (
    <div className={`static ${extraClassName}`}>
      <Head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#42A0C3"></meta>
        <title>{title ?? "Biomes"} </title>
        <meta
          property="og:title"
          content={openGraphMetadata?.title ?? "Biomes"}
        />
        <meta
          property="og:image"
          content={openGraphMetadata?.image ?? homeBg.src}
        />
        {openGraphMetadata?.imageWidth && (
          <meta
            property="og:image:width"
            content={String(openGraphMetadata.imageWidth)}
          />
        )}
        {openGraphMetadata?.imageHeight && (
          <meta
            property="og:image:width"
            content={String(openGraphMetadata.imageWidth)}
          />
        )}
        {openGraphMetadata?.description && (
          <meta
            property="og:description"
            content={openGraphMetadata.description}
          />
        )}
        {openGraphMetadata?.url && (
          <meta property="og:url" content={openGraphMetadata.url} />
        )}
        <meta
          property="og:type"
          content={openGraphMetadata?.type ?? "website"}
        />

        <meta
          name="twitter:card"
          content={openGraphMetadata?.twitterCardType ?? "summary_large_image"}
        />
        <meta
          property="twitter:site"
          content={openGraphMetadata?.twitterSiteHandle ?? "@biomesgg"}
        />
      </Head>

      <SplashHeader onLoginClick={() => {}} />

      <div className={`content ${extraClassName}`}>{children}</div>
    </div>
  );
};

export default StaticPage;
