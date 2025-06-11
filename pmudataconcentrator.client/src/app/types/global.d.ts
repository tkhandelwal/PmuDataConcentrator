// src/app/types/global.d.ts
/// <reference types="leaflet" />
/// <reference types="three" />

declare module 'leaflet.markercluster' {
  import * as L from 'leaflet';

  interface MarkerClusterGroupOptions extends L.LayerOptions {
    chunkedLoading?: boolean;
    spiderfyOnMaxZoom?: boolean;
    showCoverageOnHover?: boolean;
    zoomToBoundsOnClick?: boolean;
    maxClusterRadius?: number;
    disableClusteringAtZoom?: number;
    animate?: boolean;
    removeOutsideVisibleBounds?: boolean;
  }

  interface MarkerClusterGroup extends L.FeatureGroup {
    addLayers(layers: L.Layer[]): this;
    clearLayers(): this;
  }

  function markerClusterGroup(options?: MarkerClusterGroupOptions): MarkerClusterGroup;

  module L {
    export { markerClusterGroup };
  }
}

declare module 'leaflet.heat' {
  import * as L from 'leaflet';

  interface HeatLayerOptions {
    radius?: number;
    blur?: number;
    maxZoom?: number;
    max?: number;
    gradient?: { [key: number]: string };
  }

  interface HeatLayer extends L.Layer {
    setLatLngs(latlngs: number[][]): this;
  }

  function heatLayer(latlngs: number[][], options?: HeatLayerOptions): HeatLayer;

  module L {
    export { heatLayer };
  }
}

// Fix for ChartConfiguration types
declare module 'chart.js' {
  interface ChartConfiguration {
    [key: string]: any;
  }
}

export { };
