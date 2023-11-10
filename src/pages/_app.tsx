import "@/client/styles/admin.css";
import "@/client/styles/admin.ecs.css";
import "@/client/styles/biomes.css";
import "@/client/styles/challenges.css";
import "@/client/styles/collections.css";
import "@/client/styles/crafting.css";
import "@/client/styles/edit_character.css";
import "@/client/styles/global.css";
import "@/client/styles/hud.css";
import "@/client/styles/inventory.css";
import "@/client/styles/map.css";
import "@/client/styles/mini_phone.css";
import "@/client/styles/outfit-stand.css";
import "@/client/styles/social.css";
import "@/client/styles/splash.css";
import "@/client/styles/static.css";
import { useInstallTrackers } from "@/client/util/ad_helpers";
import { reportFunnelStage } from "@/shared/funnel";
import "leaflet/dist/leaflet.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  useInstallTrackers();
  useEffect(
    () =>
      reportFunnelStage("landOnWebsite", {
        extra: {
          path: router.pathname,
        },
      }),
    []
  );

  if ("serverError" in pageProps) {
    // TODO: Better Server Error Handling.
    return <></>;
  }
  return <Component {...pageProps} />;
}
