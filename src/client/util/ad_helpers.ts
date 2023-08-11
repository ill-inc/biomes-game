import {
  GA_MEASUREMENT_ID,
  LINKED_IN_PARTNER_ID,
  META_PIXEL_ID,
  REDDIT_PIXEL_ID,
  TWITTER_PIXEL_ID,
} from "@/shared/constants";
import { useRouter } from "next/router";
import { useEffect } from "react";
import type * as ReactPixel from "react-facebook-pixel";
import ReactGA from "react-ga4";
import LinkedInTag from "react-linkedin-insight";

interface ConversionDef {
  gaCategory?: string;
  action: string;
  googleAdsSendTo: string;
  linkedInConversionId?: string;
  twitterConversionId?: string;
  facebookPixelEvent?: string;
}

export const CONVERSION_ACTIONS = {
  clickPlay: {
    action: "click_play",
    googleAdsSendTo: "AW-11024326846/bi0ICID2pKkYEL7B54gp",
    linkedInConversionId: "13076666",
    twitterConversionId: "tw-of6mz-of6nf",
    facebookPixelEvent: "ClickPlay",
  },
  authenticatedLoad: {
    action: "authenticated_load",
    googleAdsSendTo: "AW-11024326846/CEJ9CJeFtKkYEL7B54gp",
    linkedInConversionId: "13076658",
    twitterConversionId: "tw-of6mz-of6nh",
    facebookPixelEvent: "AuthenticatedLoad",
  },
} as Record<string, ConversionDef>;

const TWITTER_PAGE_LOAD_EVENT = "tw-of6mz-of6na";

function getOrInitTwitterPixel():
  | ((cmd: string, ...args: any[]) => void)
  | undefined {
  if (typeof (window as any).twq === "function") {
    (window as any).twq as ((cmd: string, ...args: any[]) => void) | undefined;
  }
  /* eslint-disable */
  !((function (e: any, t: any, n: any, s?: any, u?: any, a?: any) {
    e.twq ||
      ((s = e.twq =
        function () {
          s.exe ? s.exe.apply(s, arguments) : s.queue.push(arguments);
        }),
      (s.version = "1.1"),
      (s.queue = []),
      (u = t.createElement(n)),
      (u.async = !0),
      (u.src = "https://static.ads-twitter.com/uwt.js"),
      (a = t.getElementsByTagName(n)[0]),
      a.parentNode.insertBefore(u, a));
  })(window, document, "script") as any);
  /* eslint-enable */
  const twq = (window as any).twq;
  if (twq && typeof twq === "function") {
    twq("config", TWITTER_PIXEL_ID);
    return twq;
  }
}

function getOrInitRedditPixel():
  | ((cmd: string, ...args: any[]) => void)
  | undefined {
  if (typeof (window as any).rdt === "function") {
    (window as any).rdt as ((cmd: string, ...args: any[]) => void) | undefined;
  }
  /* eslint-disable */
  !((function (w: any, d: any) {
    if (!w.rdt) {
      var p = (w.rdt = function () {
        (p as any).sendEvent
          ? (p as any).sendEvent.apply(p, arguments)
          : (p as any).callQueue.push(arguments);
      });
      (p as any).callQueue = [];
      const t = d.createElement("script");
      (t.src = "https://www.redditstatic.com/ads/pixel.js"), (t.async = !0);
      const s = d.getElementsByTagName("script")[0];
      s.parentNode.insertBefore(t, s);
    }
  })(window, document) as any);
  /* eslint-enable*/

  const rdt = (window as any).rdt;
  if (rdt && typeof rdt === "function") {
    rdt("init", REDDIT_PIXEL_ID, {
      optOut: false,
      useDecimalCurrencyValues: true,
    });
    return rdt;
  }
}

let fbPixelPromise: Promise<typeof ReactPixel> | undefined;
function getOrInitFBPixel() {
  if (fbPixelPromise) {
    return fbPixelPromise;
  }

  fbPixelPromise = new Promise((resolve) => {
    void import("react-facebook-pixel")
      .then((module) => module.default)
      // eslint-disable-next-line @typescript-eslint/naming-convention
      .then((ReactPixel) => {
        ReactPixel.init(META_PIXEL_ID, undefined, {
          autoConfig: false,
          debug: false,
        });
        ReactPixel.pageView();
        resolve(ReactPixel);
      });
  });

  return fbPixelPromise;
}

export function useInstallTrackers() {
  const router = useRouter();

  useEffect(() => {
    if (process.env.IS_SERVER) {
      return;
    }

    // Twitter
    const twq = getOrInitTwitterPixel();
    twq?.("event", TWITTER_PAGE_LOAD_EVENT);

    const handleRouteChange = (url: string) => {
      // Google
      ReactGA.set({ page: url });
      ReactGA.send({
        hitType: "pageview",
        page: url,
      });

      void getOrInitFBPixel().then((pixel) => {
        pixel.pageView();
      });

      twq?.("event", TWITTER_PAGE_LOAD_EVENT);

      // Reddit
      rdt?.("track", "PageVisit");
    };

    // Google
    ReactGA.initialize(GA_MEASUREMENT_ID);
    ReactGA.set({ page: router.pathname });
    ReactGA.send({
      hitType: "pageview",
      page: router.asPath,
    });

    // Linked in
    LinkedInTag.init(LINKED_IN_PARTNER_ID, "dc");

    // Reddit
    const rdt = getOrInitRedditPixel();
    rdt?.("track", "PageVisit");

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, []);
}

export function trackConversion(name: keyof typeof CONVERSION_ACTIONS) {
  if (process.env.IS_SERVER) {
    return;
  }

  const def = CONVERSION_ACTIONS[name];

  ReactGA.event({
    category: def.gaCategory ?? "General",
    action: def.action,
  });

  if (def.googleAdsSendTo) {
    ReactGA.gtag("event", def.action, {
      action: "conversion",
      category: "Conversion",
      send_to: def.googleAdsSendTo,
    });
  }
  if (def.linkedInConversionId) {
    LinkedInTag.track(def.linkedInConversionId);
  }
  if (def.twitterConversionId) {
    const twq = getOrInitTwitterPixel();
    twq?.("event", def.twitterConversionId);
  }
  if (def.facebookPixelEvent) {
    void getOrInitFBPixel().then((pixel) => {
      pixel.trackCustom(def.facebookPixelEvent!);
    });
  }
}
