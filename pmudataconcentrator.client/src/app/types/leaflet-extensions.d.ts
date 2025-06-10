// pmudataconcentrator.client/src/app/types/leaflet-extensions.d.ts
declare module 'leaflet.markercluster' {
  import * as L from 'leaflet';
  
  interface MarkerClusterGroupOptions extends L.LayerOptions {
    chunkedLoading?: boolean;
    spiderfyOnMaxZoom?: boolean;
    showCoverageOnHover?: boolean;
    zoomToBoundsOnClick?: boolean;
    maxClusterRadius?: number;
    iconCreateFunction?: (cluster: any) => L.DivIcon;
  }
  
  export class MarkerClusterGroup extends L.FeatureGroup {
    constructor(options?: MarkerClusterGroupOptions);
  }
}

declare module 'leaflet.heat' {
  import * as L from 'leaflet';
  
  interface HeatLayerOptions {
    radius?: number;
    blur?: number;
    maxZoom?: number;
    gradient?: { [key: number]: string };
  }
  
  export function heatLayer(latlngs: number[][], options?: HeatLayerOptions): L.Layer;
}
