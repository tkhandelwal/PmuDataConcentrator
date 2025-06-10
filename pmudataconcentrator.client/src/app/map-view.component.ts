import { Component, Input, OnInit, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { PmuData } from '../../core/models';

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
      border-radius: 8px;
      overflow: hidden;
    }

    :host ::ng-deep {
      .leaflet-tile-pane {
        filter: brightness(0.6) contrast(1.2);
      }

      .pmu-marker {
        background: radial-gradient(circle, #00d4ff 0%, #0099ff 100%);
        border: 2px solid #fff;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: 12px;
        box-shadow: 0 0 20px rgba(0, 212, 255, 0.8);
        transition: all 0.3s;
      }

      .pmu-marker:hover {
        transform: scale(1.2);
        box-shadow: 0 0 30px rgba(0, 212, 255, 1);
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
        border-radius: 8px;
        backdrop-filter: blur(10px);
      }

      .leaflet-popup-tip {
        background: rgba(26, 26, 26, 0.95);
      }

      .transmission-line {
        stroke: #0099ff;
        stroke-width: 2;
        stroke-opacity: 0.6;
        fill: none;
        filter: drop-shadow(0 0 3px #0099ff);
      }

      .transmission-line.active {
        stroke: #00ff00;
        stroke-width: 3;
        animation: flow 2s linear infinite;
      }

      @keyframes flow {
        to {
          stroke-dashoffset: -20;
        }
      }
    }
  `]
})
export class MapViewComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() pmuData: PmuData[] = [];
  
  private map!: L.Map;
  private markersLayer = new L.LayerGroup();
  private linesLayer = new L.LayerGroup();
  private markers = new Map<number, L.Marker>();

  ngOnInit(): void {
    // Initialize Leaflet icon fix
    const iconRetinaUrl = 'assets/marker-icon-2x.png';
    const iconUrl = 'assets/marker-icon.png';
    const shadowUrl = 'assets/marker-shadow.png';
    const iconDefault = L.icon({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = iconDefault;
  }

  ngAfterViewInit(): void {
    this.initializeMap();
    this.addTransmissionLines();
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

    // Dark theme tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(this.map);

    this.markersLayer.addTo(this.map);
    this.linesLayer.addTo(this.map);

    // Add custom controls
    this.addCustomControls();
  }

  private addTransmissionLines(): void {
    // Define major transmission corridors
    const transmissionLines = [
      { from: [47.6062, -122.3321], to: [45.5152, -122.6784], voltage: 500 }, // Seattle-Portland
      { from: [45.5152, -122.6784], to: [37.7749, -122.4194], voltage: 500 }, // Portland-SF
      { from: [37.7749, -122.4194], to: [34.0522, -118.2437], voltage: 500 }, // SF-LA
      { from: [34.0522, -118.2437], to: [33.4484, -112.0740], voltage: 500 }, // LA-Phoenix
      { from: [33.4484, -112.0740], to: [39.7392, -104.9903], voltage: 345 }, // Phoenix-Denver
      { from: [39.7392, -104.9903], to: [41.8781, -87.6298], voltage: 765 }, // Denver-Chicago
      { from: [41.8781, -87.6298], to: [42.3314, -83.0458], voltage: 345 }, // Chicago-Detroit
      { from: [42.3314, -83.0458], to: [40.7128, -74.0060], voltage: 765 }, // Detroit-NYC
      { from: [40.7128, -74.0060], to: [42.3601, -71.0589], voltage: 345 }, // NYC-Boston
      { from: [41.8781, -87.6298], to: [29.7604, -95.3698], voltage: 500 }, // Chicago-Houston
      { from: [29.7604, -95.3698], to: [25.7617, -80.1918], voltage: 500 }, // Houston-Miami
    ];

    transmissionLines.forEach(line => {
      const polyline = L.polyline([line.from, line.to] as L.LatLngTuple[], {
        className: 'transmission-line',
        weight: line.voltage === 765 ? 3 : 2
      });
      
      polyline.bindTooltip(`${line.voltage}kV Transmission Line`, {
        permanent: false,
        direction: 'center'
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

  private createPmuMarker(pmu: PmuData): L.Marker {
    const icon = L.divIcon({
      className: 'pmu-marker',
      html: `<span>${pmu.pmuId}</span>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    const marker = L.marker([pmu.latitude, pmu.longitude], { icon });
    
    const popupContent = `
      <div style="min-width: 250px;">
        <h3 style="margin: 0 0 10px 0; color: #00d4ff;">${pmu.stationName}</h3>
        <table style="width: 100%; font-size: 12px;">
          <tr>
            <td style="padding: 4px 0;">Frequency:</td>
            <td style="text-align: right; font-weight: bold;">${pmu.frequency.toFixed(3)} Hz</td>
          </tr>
          <tr>
            <td style="padding: 4px 0;">ROCOF:</td>
            <td style="text-align: right; font-weight: bold;">${pmu.rocof.toFixed(3)} Hz/s</td>
          </tr>
          <tr>
            <td style="padding: 4px 0;">Status:</td>
            <td style="text-align: right;">
              <span class="status-indicator ${this.getStatusClass(pmu)}"></span>
              ${this.getStatusText(pmu)}
            </td>
          </tr>
        </table>
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #333;">
          <small style="color: #999;">Last Update: ${new Date(pmu.timestamp).toLocaleTimeString()}</small>
        </div>
      </div>
    `;
    
    marker.bindPopup(popupContent);
    return marker;
  }

  private updateMarkerStatus(marker: L.Marker, pmu: PmuData): void {
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

  private getStatusClass(pmu: PmuData): string {
    if (Math.abs(pmu.frequency - 60.0) > 0.5 || Math.abs(pmu.rocof) > 1.0) {
      return 'alarm';
    }
    if (Math.abs(pmu.frequency - 60.0) > 0.2 || Math.abs(pmu.rocof) > 0.5) {
      return 'warning';
    }
    return 'normal';
  }

  private getStatusText(pmu: PmuData): string {
    const statusClass = this.getStatusClass(pmu);
    switch (statusClass) {
      case 'alarm': return 'ALARM';
      case 'warning': return 'WARNING';
      default: return 'NORMAL';
    }
  }

  private createPopupContent(pmu: PmuData): string {
    // Same as in createPmuMarker
    return '';
  }

  private addCustomControls(): void {
    const customControl = L.Control.extend({
      options: {
        position: 'topright'
      },
      onAdd: () => {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        container.style.background = 'rgba(26, 26, 26, 0.9)';
        container.style.padding = '10px';
        container.style.borderRadius = '4px';
        
        container.innerHTML = `
          <div style="color: #e0e0e0; font-size: 12px;">
            <div style="margin-bottom: 8px; font-weight: bold;">Legend</div>
            <div style="display: flex; align-items: center; margin-bottom: 4px;">
              <span class="status-indicator online" style="margin-right: 8px;"></span>
              Normal Operation
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 4px;">
              <span class="status-indicator warning" style="margin-right: 8px;"></span>
              Warning
            </div>
            <div style="display: flex; align-items: center;">
              <span class="status-indicator offline" style="margin-right: 8px;"></span>
              Alarm
            </div>
          </div>
        `;
        
        return container;
      }
    });
    
    new customControl().addTo(this.map);
  }
}
