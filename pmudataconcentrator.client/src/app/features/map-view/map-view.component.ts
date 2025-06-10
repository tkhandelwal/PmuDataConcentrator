import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div id="pmu-map" class="map-container"></div>
  `,
  styles: [`
    .map-container {
      width: 100%;
      height: 100%;
      min-height: 400px;
      border-radius: 8px;
      overflow: hidden;
      position: relative;
    }

    :host ::ng-deep {
      .leaflet-tile-pane {
        filter: brightness(0.6) contrast(1.2) saturate(0.8);
      }

      .leaflet-control-zoom {
        border: 1px solid #333;
        box-shadow: none;
      }

      .leaflet-control-zoom a {
        background-color: #1a1a1a;
        color: #00d4ff;
        border-bottom: 1px solid #333;
      }

      .leaflet-control-zoom a:hover {
        background-color: #2a2a2a;
      }

      .pmu-marker {
        background: radial-gradient(circle, #00d4ff 0%, #0099ff 100%);
        border: 2px solid #fff;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: 12px;
        box-shadow: 0 0 20px rgba(0, 212, 255, 0.8);
        transition: all 0.3s ease;
        cursor: pointer;
      }

      .pmu-marker:hover {
        transform: scale(1.2);
        box-shadow: 0 0 30px rgba(0, 212, 255, 1);
        z-index: 1000 !important;
      }

      .pmu-marker.warning {
        background: radial-gradient(circle, #ff9800 0%, #f57c00 100%);
        box-shadow: 0 0 20px rgba(255, 152, 0, 0.8);
      }

      .pmu-marker.alarm {
        background: radial-gradient(circle, #f44336 0%, #d32f2f 100%);
        box-shadow: 0 0 20px rgba(244, 67, 54, 0.8);
        animation: pulse 1s infinite;
      }

      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
      }

      .leaflet-popup-content-wrapper {
        background: rgba(26, 26, 26, 0.95);
        color: #e0e0e0;
        border: 1px solid #333;
        border-radius: 12px;
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      }

      .leaflet-popup-tip {
        background: rgba(26, 26, 26, 0.95);
        border: 1px solid #333;
      }

      .leaflet-popup-close-button {
        color: #999;
      }

      .leaflet-popup-close-button:hover {
        color: #fff;
      }

      .transmission-line {
        stroke: #0099ff;
        stroke-width: 2;
        stroke-opacity: 0.4;
        fill: none;
        filter: drop-shadow(0 0 3px #0099ff);
        stroke-dasharray: 5, 10;
        animation: flow 20s linear infinite;
      }

      @keyframes flow {
        to {
          stroke-dashoffset: -15;
        }
      }

      .transmission-line:hover {
        stroke-opacity: 0.8;
        stroke-width: 3;
      }
    }
  `]
})
export class MapViewComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() pmuData: any[] = [];
  @Output() pmuSelected = new EventEmitter<number>();
  
  private map!: L.Map;
  private markersLayer = new L.LayerGroup();
  private linesLayer = new L.LayerGroup();
  private markers = new Map<number, L.Marker>();

  ngOnInit(): void {
    // Initialize Leaflet default icon
    const iconRetinaUrl = 'assets/marker-icon-2x.png';
    const iconUrl = 'assets/marker-icon.png';
    const shadowUrl = 'assets/marker-shadow.png';
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initializeMap(), 100);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pmuData'] && this.map) {
      this.updateMarkers();
    }
  }

  private initializeMap(): void {
    this.map = L.map('pmu-map', {
      center: [39.8283, -98.5795], // Center of USA
      zoom: 4,
      zoomControl: true,
      attributionControl: false
    });

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(this.map);

    this.linesLayer.addTo(this.map);
    this.markersLayer.addTo(this.map);

    // Add transmission lines
    this.addTransmissionLines();

    // Add custom controls
    this.addCustomControls();
  }

  private addTransmissionLines(): void {
    const transmissionLines = [
      { from: [47.6062, -122.3321], to: [45.5152, -122.6784] }, // Seattle-Portland
      { from: [45.5152, -122.6784], to: [37.7749, -122.4194] }, // Portland-SF
      { from: [37.7749, -122.4194], to: [34.0522, -118.2437] }, // SF-LA
      { from: [34.0522, -118.2437], to: [33.4484, -112.0740] }, // LA-Phoenix
      { from: [33.4484, -112.0740], to: [39.7392, -104.9903] }, // Phoenix-Denver
      { from: [39.7392, -104.9903], to: [41.8781, -87.6298] }, // Denver-Chicago
      { from: [41.8781, -87.6298], to: [42.3314, -83.0458] }, // Chicago-Detroit
      { from: [42.3314, -83.0458], to: [40.7128, -74.0060] }, // Detroit-NYC
      { from: [40.7128, -74.0060], to: [42.3601, -71.0589] }, // NYC-Boston
      { from: [41.8781, -87.6298], to: [29.7604, -95.3698] }, // Chicago-Houston
      { from: [29.7604, -95.3698], to: [25.7617, -80.1918] }, // Houston-Miami
    ];

    transmissionLines.forEach(line => {
      const polyline = L.polyline([line.from, line.to] as L.LatLngTuple[], {
        className: 'transmission-line'
      });
      
      this.linesLayer.addLayer(polyline);
    });
  }

  private updateMarkers(): void {
    this.pmuData.forEach(pmu => {
      if (!this.markers.has(pmu.pmuId)) {
        const marker = this.createPmuMarker(pmu);
        this.markers.set(pmu.pmuId, marker);
        this.markersLayer.addLayer(marker);
      } else {
        // Update existing marker
        const marker = this.markers.get(pmu.pmuId)!;
        this.updateMarkerStatus(marker, pmu);
      }
    });
  }

  private createPmuMarker(pmu: any): L.Marker {
    const icon = L.divIcon({
      className: `pmu-marker ${this.getStatusClass(pmu)}`,
      html: `<span>${pmu.pmuId}</span>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const marker = L.marker([pmu.latitude, pmu.longitude], { icon });
    
    marker.bindPopup(this.createPopupContent(pmu), {
      maxWidth: 300,
      minWidth: 250
    });

    marker.on('click', () => {
      this.pmuSelected.emit(pmu.pmuId);
    });

    return marker;
  }

  private updateMarkerStatus(marker: L.Marker, pmu: any): void {
    const element = marker.getElement();
    if (element) {
      element.className = `pmu-marker ${this.getStatusClass(pmu)}`;
      
      // Update popup content
      const popup = marker.getPopup();
      if (popup) {
        popup.setContent(this.createPopupContent(pmu));
      }
    }
  }

  private getStatusClass(pmu: any): string {
    if (Math.abs(pmu.frequency - 60.0) > 0.5 || Math.abs(pmu.rocof) > 1.0) {
      return 'alarm';
    }
    if (Math.abs(pmu.frequency - 60.0) > 0.2 || Math.abs(pmu.rocof) > 0.5) {
      return 'warning';
    }
    return 'normal';
  }

  private createPopupContent(pmu: any): string {
    const status = this.getStatusClass(pmu);
    const statusIcon = status === 'alarm' ? '🔴' : status === 'warning' ? '🟡' : '🟢';
    
    return `
      <div style="padding: 10px;">
        <h3 style="margin: 0 0 10px 0; color: #00d4ff; font-size: 16px;">
          ${statusIcon} ${pmu.stationName}
        </h3>
        <table style="width: 100%; font-size: 13px;">
          <tr>
            <td style="padding: 4px 0; color: #999;">Frequency:</td>
            <td style="text-align: right; font-weight: bold; color: #fff;">
              ${pmu.frequency.toFixed(3)} Hz
            </td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #999;">ROCOF:</td>
            <td style="text-align: right; font-weight: bold; color: #fff;">
              ${pmu.rocof.toFixed(3)} Hz/s
            </td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #999;">Voltage:</td>
            <td style="text-align: right; font-weight: bold; color: #fff;">
              ${(pmu.phasors[0]?.magnitude / 1000).toFixed(1)} kV
            </td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #999;">Status:</td>
            <td style="text-align: right; font-weight: bold;">
              <span style="color: ${status === 'alarm' ? '#f44336' : status === 'warning' ? '#ff9800' : '#4caf50'};">
                ${status.toUpperCase()}
              </span>
            </td>
          </tr>
        </table>
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #333;">
          <small style="color: #666;">
            Last Update: ${new Date(pmu.timestamp).toLocaleTimeString()}
          </small>
        </div>
      </div>
    `;
  }

  private addCustomControls(): void {
    const legend = L.Control.extend({
      options: { position: 'topright' },
      onAdd: () => {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        container.style.cssText = `
          background: rgba(26, 26, 26, 0.9);
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #333;
        `;
        
        container.innerHTML = `
          <div style="color: #e0e0e0; font-size: 12px;">
            <div style="margin-bottom: 8px; font-weight: bold; color: #00d4ff;">PMU Status</div>
            <div style="display: flex; align-items: center; margin-bottom: 4px;">
              <span style="width: 12px; height: 12px; background: #4caf50; border-radius: 50%; 
                     display: inline-block; margin-right: 8px; box-shadow: 0 0 4px #4caf50;"></span>
              Normal Operation
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 4px;">
              <span style="width: 12px; height: 12px; background: #ff9800; border-radius: 50%; 
                     display: inline-block; margin-right: 8px; box-shadow: 0 0 4px #ff9800;"></span>
              Warning
            </div>
            <div style="display: flex; align-items: center;">
              <span style="width: 12px; height: 12px; background: #f44336; border-radius: 50%; 
                     display: inline-block; margin-right: 8px; box-shadow: 0 0 4px #f44336;"></span>
              Alarm
            </div>
          </div>
        `;
        
        return container;
      }
    });
    
    new legend().addTo(this.map);
  }
}
