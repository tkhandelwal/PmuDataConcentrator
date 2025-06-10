// src/app/types/leaflet-extensions.d.ts
import * as L from 'leaflet';

declare module 'leaflet' {
  export namespace control {
    function zoom(options?: L.Control.ZoomOptions): L.Control.Zoom;
    function scale(options?: L.Control.ScaleOptions): L.Control.Scale;
  }

  export interface MarkerClusterGroupOptions extends L.LayerOptions {
    chunkedLoading?: boolean;
    spiderfyOnMaxZoom?: boolean;
    showCoverageOnHover?: boolean;
    zoomToBoundsOnClick?: boolean;
    maxClusterRadius?: number | ((zoom: number) => number);
    iconCreateFunction?: ((cluster: any) => L.Icon | L.DivIcon);
    disableClusteringAtZoom?: number;
    animate?: boolean;
    removeOutsideVisibleBounds?: boolean;
  }

  export function markerClusterGroup(options?: MarkerClusterGroupOptions): any;

  export interface HeatLayerOptions {
    radius?: number;
    blur?: number;
    maxZoom?: number;
    gradient?: { [key: number]: string };
    minOpacity?: number;
    max?: number;
  }

  export interface HeatLayer extends L.Layer {
    setLatLngs(latlngs: L.LatLngExpression[]): this;
    addLatLng(latlng: L.LatLngExpression): this;
    setOptions(options: HeatLayerOptions): this;
  }

  export function heatLayer(latlngs: L.LatLngExpression[], options?: HeatLayerOptions): HeatLayer;
}
