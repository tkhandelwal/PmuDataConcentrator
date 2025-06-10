// pmudataconcentrator.client/src/app/features/map-view/map-view.component.ts
import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.heat';

// Declare the global L with extended types
declare global {
  interface Window {
    L: typeof L;
  }
}

// Add type declarations for Leaflet extensions
declare module 'leaflet' {
  export function heatLayer(latlngs: number[][], options?: any): any;
}

interface TransmissionLine {
  id: string;
  from: [number, number];
  to: [number, number];
  voltage: number;
  loading: number;
  status: 'normal' | 'overload' | 'outage';
}

interface VoltageContour {
  lat: number;
  lng: number;
  voltage: number;
}

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="map-wrapper">
      <div id="pmu-map" class="map-container"></div>
      
      <!-- Map Controls -->
      <div class="map-controls">
        <button class="control-btn" (click)="toggleHeatmap()" [class.active]="showHeatmap">
          <mat-icon>gradient</mat-icon>
          <span>Heat Map</span>
        </button>
        <button class="control-btn" (click)="toggleClustering()" [class.active]="useClustering">
          <mat-icon>hub</mat-icon>
          <span>Clustering</span>
        </button>
        <button class="control-btn" (click)="toggleTransmissionLines()" [class.active]="showTransmissionLines">
          <mat-icon>power</mat-icon>
          <span>Grid Lines</span>
        </button>
        <button class="control-btn" (click)="toggleVoltageContours()" [class.active]="showVoltageContours">
          <mat-icon>layers</mat-icon>
          <span>Voltage Contours</span>
        </button>
        <button class="control-btn" (click)="centerOnAlerts()">
          <mat-icon>warning</mat-icon>
          <span>Show Alerts</span>
        </button>
      </div>
      
      <!-- Real-time Statistics Overlay -->
      <div class="map-stats-overlay">
        <div class="stat-item">
          <span class="stat-label">Active PMUs</span>
          <span class="stat-value">{{ activePmuCount }}/{{ totalPmuCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Avg Frequency</span>
          <span class="stat-value">{{ avgFrequency | number:'1.3-3' }} Hz</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">System Load</span>
          <span class="stat-value">{{ systemLoad | number:'1.0-0' }} MW</span>
        </div>
      </div>
      
      <!-- Zone Information Panel -->
      <div class="zone-info-panel" *ngIf="selectedZone">
        <h4>{{ selectedZone.name }}</h4>
        <div class="zone-stats">
          <p>Generation: {{ selectedZone.generation | number:'1.0-0' }} MW</p>
          <p>Load: {{ selectedZone.load | number:'1.0-0' }} MW</p>
          <p>Import/Export: {{ selectedZone.netExchange | number:'1.0-0' }} MW</p>
          <p>Reserve Margin: {{ selectedZone.reserveMargin | number:'1.1-1' }}%</p>
        </div>
        <button class="close-btn" (click)="selectedZone = null">×</button>
      </div>
    </div>
  `,
  styles: [`
    .map-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
    }

    .map-container {
      width: 100%;
      height: 100%;
      min-height: 300px;
      max-height: 500px;
      border-radius: 8px;
      overflow: hidden;
      position: relative;
    }

    @media (max-width: 1200px) {
      .map-container {
        min-height: 250px;
        max-height: 400px;
      }
    }

    @media (max-width: 768px) {
      .map-container {
        min-height: 200px;
        max-height: 300px;
      }
    }

    .map-controls {
      position: absolute;
      top: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 1000;
    }

    @media (max-width: 768px) {
      .map-controls {
        top: 10px;
        right: 10px;
        gap: 4px;
      }
    }

    .control-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: rgba(26, 26, 26, 0.95);
      border: 1px solid #333;
      border-radius: 8px;
      color: #999;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 12px;
      backdrop-filter: blur(10px);
      white-space: nowrap;
    }

    @media (max-width: 768px) {
      .control-btn {
        padding: 6px 10px;
        font-size: 11px;
        gap: 4px;
      }
      
      .control-btn span {
        display: none;
      }
    }

    .control-btn:hover {
      background: rgba(0, 212, 255, 0.1);
      border-color: #00d4ff;
      color: #00d4ff;
    }

    .control-btn.active {
      background: rgba(0, 212, 255, 0.2);
      border-color: #00d4ff;
      color: #00d4ff;
      box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
    }

    .map-stats-overlay {
      position: absolute;
      bottom: 20px;
      left: 20px;
      background: rgba(26, 26, 26, 0.95);
      border: 1px solid #333;
      border-radius: 12px;
      padding: 16px;
      backdrop-filter: blur(10px);
      z-index: 1000;
    }

    @media (max-width: 768px) {
      .map-stats-overlay {
        bottom: 10px;
        left: 10px;
        padding: 12px;
        font-size: 12px;
      }
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 8px;
    }

    .stat-item:last-child {
      margin-bottom: 0;
    }

    .stat-label {
      font-size: 12px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-value {
      font-size: 16px;
      font-weight: 600;
      color: #00d4ff;
      font-variant-numeric: tabular-nums;
    }

    @media (max-width: 768px) {
      .stat-value {
        font-size: 14px;
      }
    }

    .zone-info-panel {
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(26, 26, 26, 0.95);
      border: 1px solid #333;
      border-radius: 12px;
      padding: 20px;
      backdrop-filter: blur(10px);
      z-index: 1001;
      min-width: 250px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    }

    .zone-info-panel h4 {
      margin: 0 0 16px 0;
      color: #00d4ff;
      font-size: 18px;
    }

    .zone-stats p {
      margin: 8px 0;
      font-size: 14px;
      color: #e0e0e0;
    }

    .close-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      background: none;
      border: none;
      color: #999;
      font-size: 24px;
      cursor: pointer;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    :host ::ng-deep {
      .leaflet-tile-pane {
        filter: brightness(0.6) contrast(1.2) saturate(0.8);
      }

      .leaflet-control-zoom {
        display: none;
      }

      .pmu-marker {
        background: radial-gradient(circle, #00d4ff 0%, #0099ff 100%);
        border: 2px solid #fff;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: 12px;
        box-shadow: 0 0 20px rgba(0, 212, 255, 0.8);
        transition: all 0.3s ease;
        cursor: pointer;
        position: relative;
      }

      .pmu-marker::before {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: radial-gradient(circle, transparent, rgba(0, 212, 255, 0.3));
        animation: radar-pulse 2s infinite;
      }

      @keyframes radar-pulse {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        100% {
          transform: scale(2.5);
          opacity: 0;
        }
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

      .pmu-marker.warning::before {
        background: radial-gradient(circle, transparent, rgba(255, 152, 0, 0.3));
      }

      .pmu-marker.alarm {
        background: radial-gradient(circle, #f44336 0%, #d32f2f 100%);
        box-shadow: 0 0 20px rgba(244, 67, 54, 0.8);
        animation: alarm-flash 1s infinite;
      }

      .pmu-marker.alarm::before {
        background: radial-gradient(circle, transparent, rgba(244, 67, 54, 0.3));
        animation: radar-pulse 1s infinite;
      }

      @keyframes alarm-flash {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }

      .pmu-marker.offline {
        background: #666;
        box-shadow: none;
        opacity: 0.5;
      }

      .pmu-marker.offline::before {
        display: none;
      }

      .leaflet-popup-content-wrapper {
        background: rgba(26, 26, 26, 0.95);
        color: #e0e0e0;
        border: 1px solid #333;
        border-radius: 12px;
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        max-width: 350px;
      }

      .leaflet-popup-tip {
        background: rgba(26, 26, 26, 0.95);
        border: 1px solid #333;
      }

      .leaflet-popup-close-button {
        color: #999;
        font-size: 20px;
        padding: 8px;
      }

      .leaflet-popup-close-button:hover {
        color: #fff;
      }

      .transmission-line {
        stroke-width: 3;
        fill: none;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .transmission-line.normal {
        stroke: #00d4ff;
        stroke-opacity: 0.6;
        filter: drop-shadow(0 0 3px #00d4ff);
      }

      .transmission-line.overload {
        stroke: #ff9800;
        stroke-opacity: 0.8;
        stroke-width: 4;
        filter: drop-shadow(0 0 5px #ff9800);
        animation: overload-pulse 2s infinite;
      }

      @keyframes overload-pulse {
        0%, 100% { stroke-opacity: 0.8; }
        50% { stroke-opacity: 0.4; }
      }

      .transmission-line.outage {
        stroke: #f44336;
        stroke-opacity: 0.9;
        stroke-dasharray: 10, 5;
        filter: drop-shadow(0 0 5px #f44336);
      }

      .transmission-line:hover {
        stroke-width: 5;
        stroke-opacity: 1;
        cursor: pointer;
      }

      .voltage-contour {
        fill-opacity: 0.3;
        stroke-width: 1;
        stroke-opacity: 0.5;
      }

      .voltage-low {
        fill: #f44336;
        stroke: #f44336;
      }

      .voltage-normal {
        fill: #4caf50;
        stroke: #4caf50;
      }

      .voltage-high {
        fill: #ff9800;
        stroke: #ff9800;
      }

      .control-zone {
        fill-opacity: 0.1;
        stroke: #00d4ff;
        stroke-width: 2;
        stroke-dasharray: 5, 5;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .control-zone:hover {
        fill-opacity: 0.2;
        stroke-width: 3;
      }

      .leaflet-marker-cluster {
        background: rgba(0, 212, 255, 0.2);
        border: 2px solid #00d4ff;
      }

      .leaflet-marker-cluster div {
        background: rgba(0, 212, 255, 0.8);
        color: #fff;
        font-weight: 600;
      }

      .leaflet-marker-cluster.alarm {
        background: rgba(244, 67, 54, 0.2);
        border-color: #f44336;
      }

      .leaflet-marker-cluster.alarm div {
        background: rgba(244, 67, 54, 0.8);
      }
    }
  `]
})
export class MapViewComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @Input() pmuData: any[] = [];
  @Input() showTransmissionGrid: boolean = true;
  @Input() showZones: boolean = false;
  @Input() showWeather: boolean = false;
  @Output() pmuSelected = new EventEmitter<number>();
  @Output() lineSelected = new EventEmitter<string>();
  @Output() zoneSelected = new EventEmitter<string>();

  private map!: any;
  private markersLayer!: any;
  private linesLayer: any;
  private zonesLayer: any;
  private heatmapLayer: any;
  private voltageContoursLayer: any;
  private markers = new Map<number, any>();
  private transmissionLines = new Map<string, any>();
  private updateInterval: any;
  private animationFrame: any;

  // Control states
  showHeatmap = false;
  useClustering = true;
  showTransmissionLines = true;
  showVoltageContours = false;

  // Statistics
  activePmuCount = 0;
  totalPmuCount = 118;
  avgFrequency = 60.0;
  systemLoad = 0;

  // Selected zone info
  selectedZone: any = null;

  // Performance optimization
  private updateThrottle: any;
  private lastUpdateTime = 0;
  private readonly UPDATE_INTERVAL = 1000; // Update every second

  // IEEE 118-bus transmission lines with realistic parameters
  private readonly transmissionData: TransmissionLine[] = [
    // Pacific Northwest Interconnections
    { id: 'GC-CJ', from: [47.9560, -118.9819], to: [47.9951, -119.6296], voltage: 500, loading: 75, status: 'normal' },
    { id: 'CJ-HAN', from: [47.9951, -119.6296], to: [46.4165, -119.4888], voltage: 500, loading: 82, status: 'normal' },
    { id: 'HAN-JD', from: [46.4165, -119.4888], to: [45.7166, -120.6930], voltage: 500, loading: 68, status: 'normal' },
    { id: 'JD-MCN', from: [45.7166, -120.6930], to: [45.9360, -119.2973], voltage: 500, loading: 71, status: 'normal' },

    // California Corridor
    { id: 'DC-SO', from: [35.2110, -120.8560], to: [33.3689, -117.5556], voltage: 500, loading: 89, status: 'overload' },
    { id: 'SO-PV', from: [33.3689, -117.5556], to: [33.3881, -112.8627], voltage: 500, loading: 77, status: 'normal' },
    { id: 'PV-FC', from: [33.3881, -112.8627], to: [36.6868, -108.4826], voltage: 500, loading: 65, status: 'normal' },

    // Midwest Grid
    { id: 'BY-QC', from: [42.1269, -89.2552], to: [41.7264, -90.3103], voltage: 765, loading: 91, status: 'overload' },
    { id: 'QC-LS', from: [41.7264, -90.3103], to: [41.2434, -88.6709], voltage: 765, loading: 73, status: 'normal' },

    // Texas Interconnection
    { id: 'CP-ST', from: [32.2987, -97.7853], to: [28.7954, -96.0413], voltage: 345, loading: 0, status: 'outage' },

    // Eastern Interconnection
    { id: 'SQ-PB', from: [41.0897, -76.1474], to: [39.7589, -76.2692], voltage: 500, loading: 85, status: 'normal' },
    { id: 'PB-SL', from: [39.7589, -76.2692], to: [39.4627, -75.5358], voltage: 500, loading: 79, status: 'normal' },

    // Inter-regional Ties
    { id: 'WECC-SPP', from: [36.6868, -108.4826], to: [39.7392, -104.9903], voltage: 500, loading: 94, status: 'overload' },
    { id: 'SPP-MISO', from: [39.7392, -104.9903], to: [41.8781, -87.6298], voltage: 765, loading: 76, status: 'normal' },
    { id: 'MISO-PJM', from: [41.8781, -87.6298], to: [41.0897, -76.1474], voltage: 765, loading: 88, status: 'normal' },
  ];

  // Control zones
  private readonly controlZones = [
    {
      id: 'WECC',
      name: 'Western Electricity Coordinating Council',
      bounds: [[32, -124], [49, -102]],
      generation: 185420,
      load: 178950,
      netExchange: 6470,
      reserveMargin: 15.2
    },
    {
      id: 'SPP',
      name: 'Southwest Power Pool',
      bounds: [[28, -104], [42, -90]],
      generation: 98760,
      load: 95230,
      netExchange: 3530,
      reserveMargin: 18.5
    },
    {
      id: 'MISO',
      name: 'Midcontinent ISO',
      bounds: [[36, -95], [49, -82]],
      generation: 142380,
      load: 138640,
      netExchange: 3740,
      reserveMargin: 21.3
    },
    {
      id: 'PJM',
      name: 'PJM Interconnection',
      bounds: [[36, -84], [42, -74]],
      generation: 178920,
      load: 172460,
      netExchange: 6460,
      reserveMargin: 16.8
    },
    {
      id: 'ERCOT',
      name: 'Electric Reliability Council of Texas',
      bounds: [[25.5, -106], [36.5, -93.5]],
      generation: 86540,
      load: 84320,
      netExchange: 2220,
      reserveMargin: 12.1
    }
  ];

  constructor() {
    // Initialize layer groups
    this.linesLayer = (L as any).layerGroup();
    this.zonesLayer = (L as any).layerGroup();
    this.voltageContoursLayer = (L as any).layerGroup();
  }

  ngOnInit(): void {
    this.initializeIcons();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initializeMap(), 100);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pmuData'] && this.map && this.pmuData) {
      // Throttle updates for performance
      const now = Date.now();
      if (now - this.lastUpdateTime > this.UPDATE_INTERVAL) {
        this.lastUpdateTime = now;
        clearTimeout(this.updateThrottle);
        this.updateThrottle = setTimeout(() => {
          this.updateMarkers();
          this.updateStatistics();
          this.updateTransmissionLines();
          if (this.showHeatmap) {
            this.updateHeatmap();
          }
          if (this.showVoltageContours) {
            this.updateVoltageContours();
          }
        }, 100);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.updateThrottle) {
      clearTimeout(this.updateThrottle);
    }
    this.map?.remove();
  }

  private initializeIcons(): void {
    // Initialize default Leaflet icons
    const iconDefault = (L as any).icon({
      iconUrl: 'assets/marker-icon.png',
      iconRetinaUrl: 'assets/marker-icon-2x.png',
      shadowUrl: 'assets/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });
    ((L as any).Marker as any).prototype.options.icon = iconDefault;
  }

  private initializeMap(): void {
    // Initialize map centered on USA
    this.map = (L as any).map('pmu-map', {
      center: [39.8283, -98.5795],
      zoom: 4,
      minZoom: 3,  // Add minimum zoom
      maxZoom: 10, // Add maximum zoom
      maxBounds: [  // Add bounds to prevent panning too far
        [-10, -180],  // Southwest coordinates
        [85, -30]     // Northeast coordinates  
      ],
      maxBoundsViscosity: 1.0,  // How strong to snap back to bounds
      zoomControl: true,
      attributionControl: false,
      preferCanvas: true,
      renderer: (L as any).canvas({ padding: 0.5 }) // Canvas renderer for better performance
    });

    // Add dark tile layer
    (L as any).tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 10,
      minZoom: 3,
      subdomains: 'abcd',
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 2
    }).addTo(this.map);

    // Initialize marker cluster group with performance optimizations
    this.markersLayer = (L as any).markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 60,
      disableClusteringAtZoom: 10,
      animate: false,
      removeOutsideVisibleBounds: true,
      spiderfyDistanceMultiplier: 2,
      iconCreateFunction: (cluster: any) => {
        const childCount = cluster.getChildCount();
        const markers = cluster.getAllChildMarkers();
        const hasAlarm = markers.some((m: any) => m.options.className?.includes('alarm'));
        const hasWarning = markers.some((m: any) => m.options.className?.includes('warning'));

        let className = 'leaflet-marker-cluster ';
        if (hasAlarm) className += 'alarm';
        else if (hasWarning) className += 'warning';

        return (L as any).divIcon({
          html: `<div><span>${childCount}</span></div>`,
          className: className,
          iconSize: (L as any).point(40, 40)
        });
      }
    });

    // Add layers to map
    this.zonesLayer.addTo(this.map);
    this.linesLayer.addTo(this.map);
    this.voltageContoursLayer.addTo(this.map);
    this.markersLayer.addTo(this.map);

    // Initialize control zones
    this.initializeControlZones();

    // Initialize transmission lines
    this.initializeTransmissionLines();

    // Add custom controls
    this.addCustomControls();

    // Set up real-time updates
    this.startRealtimeUpdates();

    // Handle map events
    this.map.on('click', () => {
      this.selectedZone = null;
    });

    // Optimize map interactions
    this.map.on('zoomstart', () => {
      this.map.options.updateWhenZooming = false;
    });

    this.map.on('zoomend', () => {
      this.map.options.updateWhenZooming = true;
    });
  }

  private initializeControlZones(): void {
    this.controlZones.forEach(zone => {
      const bounds = (L as any).latLngBounds(zone.bounds as any);
      const rect = (L as any).rectangle(bounds, {
        className: 'control-zone',
        weight: 2,
        interactive: true
      });

      rect.on('click', (e: any) => {
        (L as any).DomEvent.stopPropagation(e);
        this.selectedZone = zone;
        this.zoneSelected.emit(zone.id);
      });

      rect.bindTooltip(zone.name, {
        permanent: false,
        direction: 'center'
      });

      this.zonesLayer.addLayer(rect);
    });
  }

  private initializeTransmissionLines(): void {
    this.transmissionData.forEach(line => {
      const polyline = (L as any).polyline([line.from, line.to], {
        className: `transmission-line ${line.status}`,
        weight: 3,
        interactive: true
      });

      polyline.on('click', (e: any) => {
        (L as any).DomEvent.stopPropagation(e);
        this.showLineInfo(line);
        this.lineSelected.emit(line.id);
      });

      polyline.bindTooltip(this.createLineTooltip(line), {
        permanent: false,
        direction: 'center'
      });

      this.transmissionLines.set(line.id, polyline);
      this.linesLayer.addLayer(polyline);
    });
  }

  private createLineTooltip(line: TransmissionLine): string {
    const statusIcon = line.status === 'outage' ? '⚠️' :
      line.status === 'overload' ? '🔴' : '🟢';
    return `
      <div style="text-align: center;">
        <strong>${line.id}</strong><br>
        ${line.voltage} kV<br>
        Loading: ${line.loading}%<br>
        Status: ${statusIcon} ${line.status}
      </div>
    `;
  }

  private showLineInfo(line: TransmissionLine): void {
    const content = `
      <div style="padding: 15px;">
        <h4 style="margin: 0 0 10px 0; color: #00d4ff;">Transmission Line ${line.id}</h4>
        <table style="width: 100%;">
          <tr>
            <td>Voltage Level:</td>
            <td style="text-align: right; font-weight: bold;">${line.voltage} kV</td>
          </tr>
          <tr>
            <td>Current Loading:</td>
            <td style="text-align: right; font-weight: bold; color: ${line.loading > 90 ? '#f44336' : line.loading > 80 ? '#ff9800' : '#4caf50'}">
              ${line.loading}%
            </td>
          </tr>
          <tr>
            <td>Power Flow:</td>
            <td style="text-align: right; font-weight: bold;">${(line.loading * line.voltage * 1.732 / 100).toFixed(0)} MW</td>
          </tr>
          <tr>
            <td>Status:</td>
            <td style="text-align: right; font-weight: bold; color: ${line.status === 'outage' ? '#f44336' : line.status === 'overload' ? '#ff9800' : '#4caf50'}">
              ${line.status.toUpperCase()}
            </td>
          </tr>
        </table>
      </div>
    `;

    const center = (L as any).latLng(
      (line.from[0] + line.to[0]) / 2,
      (line.from[1] + line.to[1]) / 2
    );

    (L as any).popup()
      .setLatLng(center)
      .setContent(content)
      .openOn(this.map);
  }

  private updateMarkers(): void {
    // Batch marker updates for performance
    const markersToAdd: any[] = [];
    const markersToUpdate: Map<number, any> = new Map();

    this.pmuData.forEach(pmu => {
      const lat = pmu.latitude ?? pmu.Latitude;
      const lon = pmu.longitude ?? pmu.Longitude;

      if (lat === undefined || lon === undefined) {
        return;
      }

      if (!this.markers.has(pmu.pmuId)) {
        const marker = this.createPmuMarker(pmu);
        this.markers.set(pmu.pmuId, marker);
        markersToAdd.push(marker);
      } else {
        markersToUpdate.set(pmu.pmuId, pmu);
      }
    });

    // Add new markers in batch
    if (markersToAdd.length > 0) {
      this.markersLayer.addLayers(markersToAdd);
    }

    // Update existing markers
    markersToUpdate.forEach((pmu, pmuId) => {
      const marker = this.markers.get(pmuId);
      if (marker) {
        this.updateMarkerStatus(marker, pmu);
      }
    });
  }

  private createPmuMarker(pmu: any): any {
    const lat = pmu.latitude ?? pmu.Latitude;
    const lon = pmu.longitude ?? pmu.Longitude;
    const name = pmu.stationName ?? pmu.StationName ?? `PMU ${pmu.pmuId}`;

    const status = this.getPmuStatus(pmu);
    const icon = (L as any).divIcon({
      className: `pmu-marker ${status}`,
      html: `<span>${pmu.pmuId}</span>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = (L as any).marker([lat, lon], {
      icon,
      className: status
    });

    marker.bindPopup(() => this.createEnhancedPopupContent(pmu), {
      maxWidth: 350,
      minWidth: 300,
      className: 'pmu-popup'
    });

    marker.on('click', () => {
      this.pmuSelected.emit(pmu.pmuId);
      this.animateMarkerSelection(marker);
    });

    return marker;
  }

  private updateMarkerStatus(marker: any, pmu: any): void {
    const status = this.getPmuStatus(pmu);
    const element = marker.getElement();
    if (element) {
      element.className = `pmu-marker ${status}`;

      const popup = marker.getPopup();
      if (popup && popup.isOpen()) {
        popup.setContent(this.createEnhancedPopupContent(pmu));
      }
    }
  }

  private getPmuStatus(pmu: any): string {
    const now = Date.now();
    const timestamp = new Date(pmu.timestamp).getTime();

    if ((now - timestamp) > 5000) return 'offline';
    if (Math.abs(pmu.frequency - 60.0) > 0.5 || Math.abs(pmu.rocof) > 1.0) return 'alarm';
    if (Math.abs(pmu.frequency - 60.0) > 0.2 || Math.abs(pmu.rocof) > 0.5) return 'warning';
    return 'normal';
  }

  private createEnhancedPopupContent(pmu: any): string {
    const status = this.getPmuStatus(pmu);
    const statusIcon = status === 'offline' ? '⚫' :
      status === 'alarm' ? '🔴' :
        status === 'warning' ? '🟡' : '🟢';
    const name = pmu.stationName ?? pmu.StationName ?? `PMU ${pmu.pmuId}`;
    const freq = pmu.frequency ?? pmu.Frequency ?? 0;
    const rocof = pmu.rocof ?? pmu.Rocof ?? 0;

    // Get phasor data
    let voltage = 0, angle = 0, current = 0;
    if (pmu.phasors && pmu.phasors.length > 0) {
      const voltagePhasor = pmu.phasors.find((p: any) =>
        (p.type === 0 || p.Type === 0) &&
        ((p.name || p.Name || '').startsWith('V'))
      );
      const currentPhasor = pmu.phasors.find((p: any) =>
        (p.type === 1 || p.Type === 1) &&
        ((p.name || p.Name || '').startsWith('I'))
      );

      if (voltagePhasor) {
        voltage = (voltagePhasor.magnitude ?? voltagePhasor.Magnitude ?? 0) / 1000;
        angle = voltagePhasor.angle ?? voltagePhasor.Angle ?? 0;
      }
      if (currentPhasor) {
        current = currentPhasor.magnitude ?? currentPhasor.Magnitude ?? 0;
      }
    }

    const apparentPower = voltage * current * 1.732 / 1000; // MVA

    return `
      <div style="padding: 15px;">
        <h3 style="margin: 0 0 15px 0; color: #00d4ff; font-size: 18px; display: flex; align-items: center; gap: 8px;">
          ${statusIcon} ${name}
        </h3>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 15px;">
          <div style="background: rgba(0, 212, 255, 0.1); padding: 10px; border-radius: 8px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #00d4ff;">${freq.toFixed(3)}</div>
            <div style="font-size: 11px; color: #999; text-transform: uppercase;">Hz</div>
          </div>
          <div style="background: rgba(0, 212, 255, 0.1); padding: 10px; border-radius: 8px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: ${Math.abs(rocof) > 0.5 ? '#ff9800' : '#00d4ff'};">${rocof.toFixed(3)}</div>
            <div style="font-size: 11px; color: #999; text-transform: uppercase;">Hz/s</div>
          </div>
        </div>
        
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #333;">
            <td style="padding: 8px 0; color: #999;">Voltage:</td>
            <td style="text-align: right; font-weight: bold; color: #fff;">
              ${voltage.toFixed(1)} kV ∠${angle.toFixed(1)}°
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #333;">
            <td style="padding: 8px 0; color: #999;">Current:</td>
            <td style="text-align: right; font-weight: bold; color: #fff;">
              ${current.toFixed(0)} A
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #333;">
            <td style="padding: 8px 0; color: #999;">Power:</td>
            <td style="text-align: right; font-weight: bold; color: #fff;">
              ${apparentPower.toFixed(1)} MVA
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #999;">Status:</td>
            <td style="text-align: right; font-weight: bold;">
              <span style="color: ${status === 'alarm' ? '#f44336' : status === 'warning' ? '#ff9800' : status === 'offline' ? '#666' : '#4caf50'};">
                ${status.toUpperCase()}
              </span>
            </td>
          </tr>
        </table>
        
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #333;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #666;">
            <span>PMU ID: ${pmu.pmuId}</span>
            <span>${new Date(pmu.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
        
        <div style="margin-top: 10px; display: flex; gap: 8px;">
          <button onclick="window.pmuMapComponent.viewPmuDetails(${pmu.pmuId})" 
                  style="flex: 1; padding: 8px; background: rgba(0, 212, 255, 0.2); border: 1px solid #00d4ff; 
                         color: #00d4ff; border-radius: 4px; cursor: pointer; font-size: 12px;">
            View Details
          </button>
          <button onclick="window.pmuMapComponent.viewPmuHistory(${pmu.pmuId})" 
                  style="flex: 1; padding: 8px; background: rgba(0, 212, 255, 0.2); border: 1px solid #00d4ff; 
                         color: #00d4ff; border-radius: 4px; cursor: pointer; font-size: 12px;">
            History
          </button>
        </div>
      </div>
    `;
  }

  private animateMarkerSelection(marker: any): void {
    const element = marker.getElement();
    if (element) {
      element.style.transition = 'transform 0.3s ease';
      element.style.transform = 'scale(1.5)';
      setTimeout(() => {
        element.style.transform = 'scale(1)';
      }, 300);
    }
  }

  private updateStatistics(): void {
    this.activePmuCount = this.pmuData.filter(pmu => this.getPmuStatus(pmu) !== 'offline').length;

    if (this.pmuData.length > 0) {
      const frequencies = this.pmuData.map(pmu => pmu.frequency || pmu.Frequency || 60);
      this.avgFrequency = frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length;

      // Calculate system load from phasor data
      let totalPower = 0;
      this.pmuData.forEach(pmu => {
        if (pmu.phasors && pmu.phasors.length > 0) {
          const vPhasor = pmu.phasors.find((p: any) => (p.type === 0 || p.Type === 0));
          const iPhasor = pmu.phasors.find((p: any) => (p.type === 1 || p.Type === 1));
          if (vPhasor && iPhasor) {
            const v = (vPhasor.magnitude ?? vPhasor.Magnitude ?? 0) / 1000;
            const i = iPhasor.magnitude ?? iPhasor.Magnitude ?? 0;
            totalPower += v * i * 1.732 / 1000; // Convert to MW
          }
        }
      });
      this.systemLoad = totalPower;
    }
  }

  private updateTransmissionLines(): void {
    // Update line status based on PMU data
    this.transmissionLines.forEach((line: any, id: string) => {
      const lineData = this.transmissionData.find(l => l.id === id);
      if (lineData) {
        // Simulate loading changes
        lineData.loading = Math.min(100, Math.max(0, lineData.loading + (Math.random() - 0.5) * 5));

        // Update line appearance based on loading
        const newStatus = lineData.loading === 0 ? 'outage' :
          lineData.loading > 90 ? 'overload' : 'normal';

        if (newStatus !== lineData.status) {
          lineData.status = newStatus;
          line.setStyle({ className: `transmission-line ${newStatus}` });
        }

        // Update tooltip
        line.setTooltipContent(this.createLineTooltip(lineData));
      }
    });
  }

  private updateHeatmap(): void {
    if (!this.heatmapLayer) {
      // Initialize heatmap layer
      const heatData = this.pmuData.map(pmu => {
        const lat = pmu.latitude ?? pmu.Latitude;
        const lon = pmu.longitude ?? pmu.Longitude;
        const intensity = Math.abs(pmu.frequency - 60.0) * 100;
        return [lat, lon, intensity];
      });

      // Use L.heatLayer
      this.heatmapLayer = (L as any).heatLayer(heatData as [number, number, number][], {
        radius: 50,
        blur: 30,
        maxZoom: 10,
        gradient: {
          0.0: 'blue',
          0.25: 'cyan',
          0.5: 'green',
          0.75: 'yellow',
          1.0: 'red'
        }
      });
    } else {
      // Update existing heatmap
      const heatData = this.pmuData.map(pmu => {
        const lat = pmu.latitude ?? pmu.Latitude;
        const lon = pmu.longitude ?? pmu.Longitude;
        const intensity = Math.abs(pmu.frequency - 60.0) * 100;
        return [lat, lon, intensity];
      });

      this.heatmapLayer.setLatLngs(heatData as [number, number, number][]);
    }
  }

  private updateVoltageContours(): void {
    this.voltageContoursLayer.clearLayers();

    // Create voltage contour regions based on PMU data
    const gridSize = 30; // Reduced grid resolution for performance
    const bounds = this.map.getBounds();
    const latStep = (bounds.getNorth() - bounds.getSouth()) / gridSize;
    const lngStep = (bounds.getEast() - bounds.getWest()) / gridSize;

    // Batch contour creation
    const contours: any[] = [];

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const lat = bounds.getSouth() + i * latStep;
        const lng = bounds.getWest() + j * lngStep;

        const voltage = this.interpolateVoltage(lat, lng);
        const color = voltage < 0.95 ? 'voltage-low' :
          voltage > 1.05 ? 'voltage-high' : 'voltage-normal';

        const rect = (L as any).rectangle([
          [lat, lng],
          [lat + latStep, lng + lngStep]
        ], {
          className: `voltage-contour ${color}`,
          weight: 0,
          interactive: false
        });

        contours.push(rect);
      }
    }

    // Add all contours at once
    this.voltageContoursLayer.addLayers(contours);
  }

  private interpolateVoltage(lat: number, lng: number): number {
    // Simple inverse distance weighted interpolation
    let sumVoltage = 0;
    let sumWeight = 0;

    this.pmuData.forEach(pmu => {
      const pmuLat = pmu.latitude ?? pmu.Latitude;
      const pmuLng = pmu.longitude ?? pmu.Longitude;

      if (pmuLat && pmuLng && pmu.phasors && pmu.phasors.length > 0) {
        const vPhasor = pmu.phasors.find((p: any) => (p.type === 0 || p.Type === 0));
        if (vPhasor) {
          const voltage = (vPhasor.magnitude ?? vPhasor.Magnitude ?? 1.0) /
            ((pmu.nominalVoltage ?? 345000) / 1000); // Per unit

          const distance = Math.sqrt(
            Math.pow(lat - pmuLat, 2) + Math.pow(lng - pmuLng, 2)
          );

          const weight = 1 / (distance + 0.01); // Avoid division by zero
          sumVoltage += voltage * weight;
          sumWeight += weight;
        }
      }
    });

    return sumWeight > 0 ? sumVoltage / sumWeight : 1.0;
  }

  private addCustomControls(): void {
    // Add zoom controls
    (L as any).control.zoom({
      position: 'bottomright'
    }).addTo(this.map);

    // Add scale
    (L as any).control.scale({
      position: 'bottomleft',
      metric: true,
      imperial: true
    }).addTo(this.map);

    // Make component accessible globally for popup buttons
    (window as any).pmuMapComponent = {
      viewPmuDetails: (pmuId: number) => this.pmuSelected.emit(pmuId),
      viewPmuHistory: (pmuId: number) => console.log('View history for PMU', pmuId)
    };
  }

  private startRealtimeUpdates(): void {
    // Use requestAnimationFrame for smooth animations
    const animate = () => {
      this.transmissionLines.forEach((line: any, id: string) => {
        const lineData = this.transmissionData.find(l => l.id === id);
        if (lineData && lineData.status === 'normal') {
          // Animate power flow
          const element = (line as any).getElement?.();
          if (element && element.style) {
            const currentOffset = parseInt(element.style.strokeDashoffset || '0');
            element.style.strokeDashoffset = `${(currentOffset - 1) % 15}`;
          }
        }
      });

      this.animationFrame = requestAnimationFrame(animate);
    };

    // Start animation only when visible
    if (document.visibilityState === 'visible') {
      animate();
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        animate();
      } else {
        cancelAnimationFrame(this.animationFrame);
      }
    });
  }

  // Control methods
  toggleHeatmap(): void {
    this.showHeatmap = !this.showHeatmap;
    if (this.showHeatmap) {
      this.updateHeatmap();
      if (this.heatmapLayer) {
        this.map.addLayer(this.heatmapLayer);
      }
    } else if (this.heatmapLayer) {
      this.map.removeLayer(this.heatmapLayer);
    }
  }

  toggleClustering(): void {
    this.useClustering = !this.useClustering;
    if (!this.useClustering) {
      // Remove clustering
      this.markersLayer.clearLayers();
      this.markers.forEach((marker: any) => {
        this.map.addLayer(marker);
      });
    } else {
      // Re-enable clustering
      this.markers.forEach((marker: any) => {
        this.map.removeLayer(marker);
      });
      this.markersLayer.addLayers(Array.from(this.markers.values()));
    }
  }

  toggleTransmissionLines(): void {
    this.showTransmissionLines = !this.showTransmissionLines;
    if (this.showTransmissionLines) {
      this.map.addLayer(this.linesLayer);
    } else {
      this.map.removeLayer(this.linesLayer);
    }
  }

  toggleVoltageContours(): void {
    this.showVoltageContours = !this.showVoltageContours;
    if (this.showVoltageContours) {
      this.updateVoltageContours();
      this.map.addLayer(this.voltageContoursLayer);
    } else {
      this.map.removeLayer(this.voltageContoursLayer);
    }
  }

  centerOnAlerts(): void {
    const alertPositions: any[] = [];

    this.markers.forEach((marker: any) => {
      const element = marker.getElement();
      if (element && (element.className.includes('alarm') || element.className.includes('warning'))) {
        alertPositions.push(marker.getLatLng());
      }
    });

    if (alertPositions.length > 0) {
      const bounds = (L as any).latLngBounds(alertPositions);
      this.map.fitBounds(bounds, { padding: [50, 50] });
    }
  }
}
