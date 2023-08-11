import StaticPage from "@/pages/static-page";
import type { WebServerServerSidePropsContext } from "@/server/web/context";
import type { MapTileMetadata } from "@/server/web/db/map";
import { fetchTileMetadata } from "@/server/web/db/map";
import dynamic from "next/dynamic";

// The `leaflet` component references `window` during module load, so
// we can't do any server side rendering with it.
const StaticMap = dynamic(() => import("@/client/components/map/StaticMap"), {
  ssr: false,
});

export const MapPage: React.FunctionComponent<{
  tileMetadata: MapTileMetadata;
}> = ({ tileMetadata }) => {
  return (
    <StaticPage extraClassName="full">
      <div className="fullpage-map pannable-map-container relative z-0 h-full">
        <StaticMap tileMetadata={tileMetadata} />
      </div>
    </StaticPage>
  );
};

export async function getServerSideProps(
  context: WebServerServerSidePropsContext
) {
  const tileMetadata = await fetchTileMetadata(context.req.context.db);
  return {
    props: {
      tileMetadata,
    },
  };
}

export default MapPage;
