import { Component, OnInit, OnDestroy, ViewChild, ElementRef, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';
import { PmuDataService } from '../../../core/services/pmu-data.service';
import Globe from 'globe.gl';

@Component({
  selector: 'app-globe-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="globe-view-container">
      <mat-card class="globe-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>public</mat-icon>
            Global PMU Network
          </mat-card-title>
          <div class="controls">
            <mat-slide-toggle [(ngModel)]="showHeatmap">Heat Map</mat-slide-toggle>
            <mat-slide-toggle [(ngModel)]="showTransmissionLines">Transmission Lines</mat-slide-toggle>
            <mat-slide-toggle [(ngModel)]="showLabels">Labels</mat-slide-toggle>
            
            <mat-form-field>
              <mat-select [(value)]="dataLayer" (selectionChange)="updateDataLayer()">
                <mat-option value="frequency">Frequency</mat-option>
                <mat-option value="voltage">Voltage</mat-option>
                <mat-option value="phase">Phase Angle</mat-option>
                <mat-option value="power">Power Flow</mat-option>
              </mat-select>
            </mat-form-field>
            
            <button mat-icon-button (click)="resetView()">
              <mat-icon>refresh</mat-icon>
            </button>
            <button mat-icon-button (click)="toggleFullscreen()">
              <mat-icon>{{ isFullscreen() ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
            </button>
          </div>
        </mat-card-header>
        
        <mat-card-content>
          <div #globeContainer class="globe-container" [class.fullscreen]="isFullscreen()">
            <div class="loading" *ngIf="isLoading()">
              <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
              <p>Loading PMU network...</p>
            </div>
          </div>
          
          <!-- Info Panel -->
          <div class="info-panel" *ngIf="selectedPmu()">
            <h3>{{ selectedPmu().stationName }}</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Frequency:</span>
                <span class="value" [class.alarm]="isFrequencyAlarm(selectedPmu())">
                  {{ selectedPmu().frequency | number:'1.3-3' }} Hz
                </span>
              </div>
              <div class="info-item">
                <span class="label">Voltage:</span>
                <span class="value">{{ getVoltage(selectedPmu()) | number:'1.1-1' }} kV</span>
              </div>
              <div class="info-item">
                <span class="label">Phase Angle:</span>
                <span class="value">{{ getPhaseAngle(selectedPmu()) | number:'1.1-1' }}°</span>
              </div>
              <div class="info-item">
                <span class="label">ROCOF:</span>
                <span class="value" [class.alarm]="isRocofAlarm(selectedPmu())">
                  {{ selectedPmu().rocof | number:'1.3-3' }} Hz/s
                </span>
              </div>
            </div>
            <button mat-button (click)="viewPmuDetails()">View Details</button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .globe-view-container {
      height: 100%;
      padding: 20px;
    }

    .globe-card {
      height: 100%;
      background: #1a1a1a;
      border: 1px solid #333;
    }

    mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16px;
      border-bottom: 1px solid #333;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 20px;
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    mat-form-field {
      width: 120px;
    }

    .globe-container {
      position: relative;
      width: 100%;
      height: calc(100vh - 300px);
      min-height: 500px;
      background: #0a0a0a;
      border-radius: 8px;
      overflow: hidden;
    }

    .globe-container.fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      height: 100vh;
      z-index: 9999;
    }

    .loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }

    .loading p {
      margin-top: 16px;
      color: #999;
    }

    .info-panel {
      position: absolute;
      bottom: 20px;
      left: 20px;
      background: rgba(26, 26, 26, 0.95);
      border: 1px solid #333;
      border-radius: 12px;
      padding: 20px;
      backdrop-filter: blur(10px);
      min-width: 300px;
    }

    .info-panel h3 {
      margin: 0 0 16px 0;
      color: #00d4ff;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
    }

    .label {
      font-size: 12px;
      color: #999;
      text-transform: uppercase;
    }

    .value {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
    }

    .value.alarm {
      color: #f44336;
    }
  `]
})
export class GlobeViewComponent implements OnInit, OnDestroy {
  @ViewChild('globeContainer', { static: true }) globeContainer!: ElementRef;

  private destroy$ = new Subject<void>();
  private globe: any;

  // UI State
  isLoading = signal(true);
  isFullscreen = signal(false);
  selectedPmu = signal<any>(null);

  // Display options
  showHeatmap = true;
  showTransmissionLines = true;
  showLabels = true;
  dataLayer = 'frequency';

  // Data
  private pmuData: any[] = [];
  private transmissionLines: any[] = [];

  constructor(private pmuDataService: PmuDataService) {
    // React to PMU data changes
    effect(() => {
      const data = this.pmuDataService.pmuDataList();
      if (data && data.length > 0) {
        this.updatePmuData(data);
      }
    });
  }

  ngOnInit(): void {
    this.initializeGlobe();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.globe) {
      this.globe._destructor();
    }
  }

  private initializeGlobe(): void {
    requestAnimationFrame(() => {
      // Globe is a factory function, not a constructor
      this.globe = Globe(this.globeContainer.nativeElement)
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
        .showAtmosphere(true)
        .atmosphereColor('#00d4ff')
        .atmosphereAltitude(0.15)
        .enablePointerInteraction(true);

      // Set initial view
      this.globe.pointOfView({ lat: 39.8283, lng: -98.5795, altitude: 2.5 });

      // Setup layers
      this.setupPmuLayer();
      this.setupTransmissionLayer();
      this.setupHeatmapLayer();

      this.isLoading.set(false);
    });
  }

  private setupPmuLayer(): void {
    this.globe
      .pointsData(this.pmuData)
      .pointLat('latitude')
      .pointLng('longitude')
      .pointColor((d: any) => this.getPmuColor(d))
      .pointAltitude((d: any) => this.getAltitudeByDataLayer(d))
      .pointRadius((d: any) => this.getPmuRadius(d))
      .pointLabel((d: any) => this.getPmuLabel(d))
      .onPointClick((pmu: any) => this.onPmuClick(pmu))
      .onPointHover((pmu: any) => this.onPmuHover(pmu));
  }

  private setupTransmissionLayer(): void {
    this.globe
      .arcsData(this.showTransmissionLines ? this.transmissionLines : [])
      .arcStartLat('startLat')
      .arcStartLng('startLng')
      .arcEndLat('endLat')
      .arcEndLng('endLng')
      .arcColor((d: any) => this.getLineColor(d))
      .arcStroke((d: any) => this.getLineWidth(d))
      .arcDashLength(0.4)
      .arcDashGap(0.2)
      .arcDashAnimateTime((d: any) => 2000 / (d.loading / 100))
      .arcLabel((d: any) => this.getLineLabel(d))
      .onArcClick(this.onLineClick.bind(this));
  }

  private setupHeatmapLayer(): void {
    if (this.showHeatmap) {
      const heatmapData = this.generateHeatmapData();

      this.globe
        .hexBinPointsData(heatmapData)
        .hexBinPointLat('lat')
        .hexBinPointLng('lng')
        .hexBinPointWeight('weight')
        .hexAltitude((d: any) => d.sumWeight * 0.001)
        .hexBinResolution(4)
        .hexTopColor((d: any) => this.getHeatmapColor(d))
        .hexSideColor((d: any) => this.getHeatmapColor(d))
        .hexBinMerge(true)
        .hexTransitionDuration(1000);
    }
  }

  private loadData(): void {
    // Load transmission line data
    this.transmissionLines = [
      { startLat: 47.9560, startLng: -118.9819, endLat: 47.9951, endLng: -119.6296, voltage: 500, loading: 75 },
      { startLat: 47.9951, startLng: -119.6296, endLat: 46.4165, endLng: -119.4888, voltage: 500, loading: 82 },
      { startLat: 35.2110, startLng: -120.8560, endLat: 33.3689, endLng: -117.5556, voltage: 500, loading: 95 },
      { startLat: 33.3689, startLng: -117.5556, endLat: 33.3881, endLng: -112.8627, voltage: 500, loading: 77 },
      { startLat: 42.1269, startLng: -89.2552, endLat: 41.7264, endLng: -90.3103, voltage: 765, loading: 91 },
      { startLat: 41.0897, startLng: -76.1474, endLat: 39.7589, endLng: -76.2692, voltage: 500, loading: 85 }
    ];

    // Subscribe to PMU data
    this.pmuDataService.getPmuDataObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.updatePmuData(data);
      });
  }

  private updatePmuData(data: any[]): void {
    this.pmuData = data;

    if (this.globe) {
      this.globe.pointsData(this.pmuData);

      if (this.showHeatmap) {
        this.setupHeatmapLayer();
      }
    }
  }

  private getPmuColor(pmu: any): string {
    if (this.dataLayer === 'frequency') {
      const deviation = Math.abs(pmu.frequency - 60.0);
      if (deviation > 0.5) return '#f44336';
      if (deviation > 0.2) return '#ff9800';
      return '#4caf50';
    } else if (this.dataLayer === 'voltage') {
      const voltage = this.getVoltage(pmu) / 345; // Normalized
      if (voltage < 0.95 || voltage > 1.05) return '#f44336';
      if (voltage < 0.97 || voltage > 1.03) return '#ff9800';
      return '#4caf50';
    }

    return '#00d4ff';
  }

  private getPmuRadius(pmu: any): number {
    const baseRadius = 0.5;

    if (this.dataLayer === 'power') {
      const power = this.getPower(pmu);
      return baseRadius + (power / 1000) * 0.5;
    }

    return baseRadius;
  }

  private getAltitudeByDataLayer(pmu: any): number {
    switch (this.dataLayer) {
      case 'frequency':
        return Math.abs(pmu.frequency - 60.0) * 0.1;
      case 'voltage':
        return Math.abs(1.0 - this.getVoltage(pmu) / 345) * 0.1;
      case 'phase':
        return Math.abs(this.getPhaseAngle(pmu)) / 360 * 0.1;
      case 'power':
        return this.getPower(pmu) / 10000 * 0.1;
      default:
        return 0.01;
    }
  }

  private getPmuLabel(pmu: any): string {
    if (!this.showLabels) return '';

    return `
      <div style="background: rgba(26,26,26,0.9); padding: 8px; border-radius: 4px;">
        <strong>${pmu.stationName}</strong><br>
        Frequency: ${pmu.frequency.toFixed(3)} Hz<br>
        Voltage: ${this.getVoltage(pmu).toFixed(1)} kV<br>
        ROCOF: ${pmu.rocof.toFixed(3)} Hz/s
      </div>
    `;
  }

  private generateHeatmapData(): any[] {
    return this.pmuData.map(pmu => ({
      lat: pmu.latitude,
      lng: pmu.longitude,
      weight: this.getHeatmapWeight(pmu)
    }));
  }

  private getHeatmapWeight(pmu: any): number {
    switch (this.dataLayer) {
      case 'frequency':
        return Math.abs(pmu.frequency - 60.0) * 10;
      case 'voltage':
        return Math.abs(1.0 - this.getVoltage(pmu) / 345) * 100;
      case 'phase':
        return Math.abs(this.getPhaseAngle(pmu)) / 10;
      case 'power':
        return this.getPower(pmu) / 100;
      default:
        return 1;
    }
  }

  private getHeatmapColor(d: any): string {
    const intensity = d.sumWeight / d.points.length;

    if (intensity > 5) return '#ff0000';
    if (intensity > 3) return '#ff9800';
    if (intensity > 1) return '#ffeb3b';
    return '#4caf50';
  }

  private getLineColor(line: any): string {
    if (line.loading > 90) return '#f44336';
    if (line.loading > 80) return '#ff9800';
    return '#00d4ff';
  }

  private getLineWidth(line: any): number {
    return 1 + (line.loading / 100) * 3;
  }

  private getLineLabel(line: any): string {
    return `
      <div style="background: rgba(26,26,26,0.9); padding: 8px; border-radius: 4px;">
        ${line.voltage} kV Transmission Line<br>
        Loading: ${line.loading}%<br>
        Power Flow: ${(line.loading * line.voltage * 1.732 / 100).toFixed(0)} MW
      </div>
    `;
  }

  // Helper methods
  getVoltage(pmu: any): number {
    if (!pmu.phasors || pmu.phasors.length === 0) return 0;
    const vPhasor = pmu.phasors.find((p: any) => p.type === 0);
    return vPhasor ? vPhasor.magnitude / 1000 : 0;
  }

  getPhaseAngle(pmu: any): number {
    if (!pmu.phasors || pmu.phasors.length === 0) return 0;
    const vPhasor = pmu.phasors.find((p: any) => p.type === 0);
    return vPhasor ? vPhasor.angle : 0;
  }

  getPower(pmu: any): number {
    if (!pmu.phasors || pmu.phasors.length < 2) return 0;
    const vPhasor = pmu.phasors.find((p: any) => p.type === 0);
    const iPhasor = pmu.phasors.find((p: any) => p.type === 1);

    if (vPhasor && iPhasor) {
      return vPhasor.magnitude * iPhasor.magnitude * 1.732 / 1000000; // MW
    }

    return 0;
  }

  isFrequencyAlarm(pmu: any): boolean {
    return Math.abs(pmu.frequency - 60.0) > 0.5;
  }

  isRocofAlarm(pmu: any): boolean {
    return Math.abs(pmu.rocof) > 1.0;
  }

  // Event handlers
  onPmuClick(pmu: any): void {
    this.selectedPmu.set(pmu);
  }

  onPmuHover(pmu: any): void {
    // Could show tooltip
  }

  onLineClick(line: any): void {
    console.log('Line clicked:', line);
  }

  updateDataLayer(): void {
    this.setupPmuLayer();

    if (this.showHeatmap) {
      this.setupHeatmapLayer();
    }
  }

  viewPmuDetails(): void {
    const pmu = this.selectedPmu();
    if (pmu) {
      // Navigate to PMU details
      console.log('View details for PMU:', pmu.pmuId);
    }
  }

  resetView(): void {
    this.globe.pointOfView({ lat: 39.8283, lng: -98.5795, altitude: 2.5 }, 1000);
  }

  toggleFullscreen(): void {
    const container = this.globeContainer.nativeElement;

    if (!document.fullscreenElement) {
      container.requestFullscreen();
      this.isFullscreen.set(true);
    } else {
      document.exitFullscreen();
      this.isFullscreen.set(false);
    }
  }
}
