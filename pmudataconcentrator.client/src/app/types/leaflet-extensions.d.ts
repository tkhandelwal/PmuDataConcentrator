import * as L from 'leaflet';

declare module 'leaflet' {
  namespace control {
    function zoom(options?: Control.ZoomOptions): Control.Zoom;
    function scale(options?: Control.ScaleOptions): Control.Scale;
  }
  
  interface MarkerClusterGroupOptions extends LayerOptions {
    chunkedLoading?: boolean;
    spiderfyOnMaxZoom?: boolean;
    showCoverageOnHover?: boolean;
    zoomToBoundsOnClick?: boolean;
    maxClusterRadius?: number;
    iconCreateFunction?: (cluster: any) => Icon | DivIcon;
  }
  
  class MarkerClusterGroup extends FeatureGroup {
    constructor(options?: MarkerClusterGroupOptions);
    getChildCount(): number;
    getAllChildMarkers(): Marker[];
    clearLayers(): this;
  }
  
  function markerClusterGroup(options?: MarkerClusterGroupOptions): MarkerClusterGroup;
  
  interface HeatLayerOptions {
    radius?: number;
    blur?: number;
    maxZoom?: number;
    gradient?: { [key: number]: string };
  }
  
  interface HeatLayer extends Layer {
    setLatLngs(latlngs: number[][]): this;
    addLatLng(latlng: number[]): this;
  }
  
  function heatLayer(latlngs: number[][], options?: HeatLayerOptions): HeatLayer;
  
  // Extend DivIcon interface
  interface DivIconOptions {
    className?: string;
    html?: string | HTMLElement;
    iconSize?: PointExpression;
    iconAnchor?: PointExpression;
  }
}
