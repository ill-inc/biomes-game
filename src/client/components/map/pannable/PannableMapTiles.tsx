import {
  mapTileURL,
  pannableWorldBoundsFromData,
} from "@/client/components/map/helpers";

import type { CustomURLTileLayerProps } from "@/client/components/map/CustomURLTileLayer";
import CustomURLTileLayer from "@/client/components/map/CustomURLTileLayer";
import type { MapTileMetadata } from "@/server/web/db/map";
import type { TileType } from "@/shared/map/types";
import { GridLayer as LGridLayer } from "leaflet";
import "leaflet/dist/leaflet.css";
import React from "react";
function monkeyPatchGridLayerForHairline() {
  if ((LGridLayer.prototype as any).__hasPatchedHairline === true) {
    return;
  }

  /*
    HACK: fix hairline fractures in leaflet tiles
    this works by adding an epsilon to tile size that should leave scaling untouched
    combined with a CSS trick

    .leaflet-tile-container img {
      will-change: transform;
      outline: 1px solid transparent;
    }
  */
  (LGridLayer.prototype as any).__hasPatchedHairline = true;
  const originalInitTile = (LGridLayer.prototype as any)._initTile;
  LGridLayer.include({
    _initTile: function (tile: any) {
      originalInitTile.call(this, tile);

      const tileSize = this.getTileSize();

      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      tile.style.width = tileSize.x + 0.5 + "px";
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      tile.style.height = tileSize.y + 0.5 + "px";
    },
  });
}

export const PannableMapTiles: React.FunctionComponent<{
  mapData: MapTileMetadata;
  tileType?: TileType;
}> = React.memo(({ mapData, tileType = "fog" }) => {
  monkeyPatchGridLayerForHairline();
  const layerProps: CustomURLTileLayerProps = {
    bounds: pannableWorldBoundsFromData(mapData),
    url: mapData.tileImageTemplateURL,
    tileFn: (xy, zoom) => {
      return mapTileURL(mapData, tileType, xy, zoom);
    },
  };
  if (typeof window !== "undefined" && window.devicePixelRatio > 1.0) {
    // Workaround for retina displays - request tiles at the next zoom level and pretend half size
    layerProps.tileSize = mapData.tileSize / 2.0;
    layerProps.minNativeZoom = mapData.tileMinZoomLevel;
    layerProps.maxNativeZoom = mapData.tileMaxZoomLevel - 1;
    layerProps.zoomOffset = 1;
    layerProps.minZoom = -10;
  } else {
    layerProps.tileSize = mapData.tileSize;
    layerProps.minNativeZoom = mapData.tileMinZoomLevel;
    layerProps.maxNativeZoom = mapData.tileMaxZoomLevel;
    layerProps.minZoom = -10;
  }

  return <CustomURLTileLayer {...layerProps} />;
});
