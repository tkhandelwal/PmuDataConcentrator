// src/app/types/leaflet-extensions.d.ts
import * as L from 'leaflet';

declare module 'leaflet' {
  // Just declare what we need with 'any' types
  function markerClusterGroup(options?: any): any;
  function heatLayer(latlngs: any[], options?: any): any;
}
