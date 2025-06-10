declare module 'leaflet.heat' {
  import * as L from 'leaflet';
  
  interface HeatLayerOptions {
    minOpacity?: number;
    maxZoom?: number;
    max?: number;
    radius?: number;
    blur?: number;
    gradient?: { [key: number]: string };
  }
  
  interface HeatLayer extends L.Layer {
    setLatLngs(latlngs: L.LatLngExpression[]): this;
    addLatLng(latlng: L.LatLngExpression): this;
    setOptions(options: HeatLayerOptions): this;
  }
  
  function heatLayer(latlngs: L.LatLngExpression[], options?: HeatLayerOptions): HeatLayer;
}

declare module 'leaflet' {
  function heatLayer(latlngs: any[], options?: any): any;
}
