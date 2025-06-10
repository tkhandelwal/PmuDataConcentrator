import { Component, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { PmuDataService } from '../../core/services/pmu-data.service';
import { MapViewComponent } from '../map-view/map-view.component';
import { FrequencyChartComponent } from '../charts/frequency-chart.component';
import { PmuStatusCardComponent } from '../pmu-status-card/pmu-status-card.component';
import { EventLogComponent } from '../event-log/event-log.component';
import { SystemHealthComponent } from '../system-health/system-health.component';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatGridListModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDividerModule,
    MatChipsModule,
    MapViewComponent,
    FrequencyChartComponent,
    PmuStatusCardComponent,
    EventLogComponent,
    SystemHealthComponent
  ],
  template: `
    <div class="dashboard-container">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-left">
          <h1 class="gradient-text">PMU Data Concentrator</h1>
          <div class="system-time">{{ currentTime() }}</div>
        </div>
        <div class="header-right">
          <div class="connection-status" [class.connected]="isConnected()">
            <mat-icon>{{ isConnected() ? 'wifi' : 'wifi_off' }}</mat-icon>
            <span>{{ isConnected() ? 'Connected' : 'Disconnected' }}</span>
          </div>
          <button mat-icon-button [matTooltip]="'System Settings'">
            <mat-icon>settings</mat-icon>
          </button>
          <button mat-icon-button [matTooltip]="'Export Data'">
            <mat-icon>download</mat-icon>
          </button>
        </div>
      </header>

      <!-- Main Grid Layout -->
      <div class="dashboard-grid">
        <!-- System Health Overview -->
        <mat-card class="dashboard-card system-health-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>monitor_heart</mat-icon>
              System Health
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <app-system-health 
              [frequency]="avgFrequency()"
              [rocof]="avgRocof()"
              [pmuCount]="pmuCount()"
              [dataQuality]="dataQuality()">
            </app-system-health>
          </mat-card-content>
        </mat-card>

        <!-- Map View -->
        <mat-card class="dashboard-card map-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>map</mat-icon>
              Geographic Overview
              <mat-chip class="pmu-count-chip">{{ pmuCount() }} PMUs</mat-chip>
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <app-map-view 
              [pmuData]="pmuDataList()"
              (pmuSelected)="onPmuSelected($event)">
            </app-map-view>
          </mat-card-content>
        </mat-card>

        <!-- Real-time Frequency Chart -->
        <mat-card class="dashboard-card frequency-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>show_chart</mat-icon>
              System Frequency Trend
            </mat-card-title>
            <button mat-icon-button [matTooltip]="'Expand Chart'">
              <mat-icon>open_in_full</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content>
            <app-frequency-chart 
              [pmuData]="pmuDataList()"
              [timeWindow]="300">
            </app-frequency-chart>
          </mat-card-content>
        </mat-card>

        <!-- System Metrics -->
        <mat-card class="dashboard-card metrics-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>analytics</mat-icon>
              Key Metrics
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="metrics-grid">
              <div class="metric-item primary">
                <div class="metric-value">{{ avgFrequency() | number:'1.3-3' }}</div>
                <div class="metric-label">Average Frequency (Hz)</div>
                <div class="metric-change" [class.positive]="frequencyTrend() > 0">
                  <mat-icon>{{ frequencyTrend() > 0 ? 'trending_up' : 'trending_down' }}</mat-icon>
                  {{ Math.abs(frequencyTrend()) | number:'1.3-3' }} Hz/min
                </div>
              </div>
              
              <div class="metric-item">
                <div class="metric-value">{{ avgRocof() | number:'1.3-3' }}</div>
                <div class="metric-label">Avg ROCOF (Hz/s)</div>
              </div>
              
              <div class="metric-item">
                <div class="metric-value">{{ dataQuality() | number:'1.0-0' }}%</div>
                <div class="metric-label">Data Quality</div>
              </div>
              
              <div class="metric-item">
                <div class="metric-value">{{ totalSamples() | number }}</div>
                <div class="metric-label">Samples/sec</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Event Log -->
        <mat-card class="dashboard-card events-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon 
                [matBadge]="eventCount()" 
                matBadgeColor="warn" 
                [matBadgeHidden]="eventCount() === 0">
                notifications
              </mat-icon>
              System Events
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <app-event-log [events]="recentEvents()"></app-event-log>
          </mat-card-content>
        </mat-card>

        <!-- PMU Status Grid -->
        <mat-card class="dashboard-card pmu-grid-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>device_hub</mat-icon>
              PMU Status
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="pmu-grid">
              <app-pmu-status-card 
                *ngFor="let pmu of pmuDataList()" 
                [pmuData]="pmu"
                [isSelected]="selectedPmuId() === pmu.pmuId"
                (click)="onPmuSelected(pmu.pmuId)">
              </app-pmu-status-card>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      min-height: 100vh;
      background: #0a0a0a;
      padding: 20px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding: 0 8px;
    }

    .header-left {
      display: flex;
      align-items: baseline;
      gap: 20px;
    }

    .header-left h1 {
      font-size: 32px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.5px;
    }

    .system-time {
      font-size: 14px;
      color: #666;
      font-variant-numeric: tabular-nums;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 20px;
      font-size: 14px;
      color: #999;
      transition: all 0.3s ease;
    }

    .connection-status.connected {
      background: rgba(76, 175, 80, 0.1);
      color: #4caf50;
    }

    .connection-status mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .gradient-text {
      background: linear-gradient(135deg, #00d4ff 0%, #0099ff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      grid-auto-rows: minmax(100px, auto);
      gap: 20px;
    }

    .dashboard-card {
      background: linear-gradient(145deg, #1a1a1a 0%, #0f0f0f 100%);
      border: 1px solid #2a2a2a;
      border-radius: 16px;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .dashboard-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      border-color: #333;
    }

    mat-card-header {
      background: rgba(255, 255, 255, 0.02);
      padding: 16px 20px;
      margin: -16px -16px 16px -16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 16px;
      font-weight: 500;
      margin: 0;
    }

    mat-card-title mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #00d4ff;
    }

    .pmu-count-chip {
      margin-left: auto;
      background: rgba(0, 212, 255, 0.1);
      color: #00d4ff;
      font-size: 12px;
      padding: 4px 12px;
      min-height: 24px;
    }

    /* Grid item sizes */
    .system-health-card { grid-column: span 3; grid-row: span 2; }
    .map-card { grid-column: span 6; grid-row: span 4; }
    .frequency-card { grid-column: span 3; grid-row: span 2; }
    .metrics-card { grid-column: span 3; grid-row: span 2; }
    .events-card { grid-column: span 3; grid-row: span 2; }
    .pmu-grid-card { grid-column: span 12; grid-row: span 3; }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .metric-item {
      text-align: center;
      padding: 16px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      transition: all 0.3s ease;
    }

    .metric-item:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(0, 212, 255, 0.3);
    }

    .metric-item.primary {
      grid-column: span 2;
      background: linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(0, 153, 255, 0.1) 100%);
      border-color: rgba(0, 212, 255, 0.2);
    }

    .metric-value {
      font-size: 32px;
      font-weight: 700;
      color: #00d4ff;
      margin-bottom: 8px;
      font-variant-numeric: tabular-nums;
    }

    .metric-label {
      font-size: 12px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .metric-change {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      margin-top: 8px;
      font-size: 14px;
      color: #999;
    }

    .metric-change.positive {
      color: #4caf50;
    }

    .metric-change mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .pmu-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    @media (max-width: 1400px) {
      .dashboard-grid {
        grid-template-columns: repeat(8, 1fr);
      }
      .system-health-card { grid-column: span 4; }
      .map-card { grid-column: span 8; }
      .frequency-card { grid-column: span 4; }
      .metrics-card { grid-column: span 4; }
      .events-card { grid-column: span 4; }
      .pmu-grid-card { grid-column: span 8; }
    }

    @media (max-width: 768px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
      .dashboard-card {
        grid-column: span 1 !important;
      }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Signals for reactive state
  pmuCount = signal(0);
  avgFrequency = signal(60.0);
  avgRocof = signal(0.0);
  dataQuality = signal(100);
  totalSamples = signal(0);
  frequencyTrend = signal(0);
  eventCount = signal(0);
  recentEvents = signal<any[]>([]);
  selectedPmuId = signal<number | null>(null);
  isConnected = signal(true);
  currentTime = signal(new Date().toLocaleString());
  
  // Computed values
  pmuDataList = computed(() => this.pmuDataService.pmuDataList());
  
  // Math reference for template
  Math = Math;

  constructor(public pmuDataService: PmuDataService) {}

  ngOnInit(): void {
    // Update current time every second
    setInterval(() => {
      this.currentTime.set(new Date().toLocaleString());
    }, 1000);

    // Subscribe to PMU data updates
    effect(() => {
      const data = this.pmuDataService.pmuDataList();
      this.updateMetrics(data);
    });

    // Subscribe to real-time events
    this.pmuDataService.getEventStream()
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        const events = this.recentEvents();
        this.recentEvents.set([event, ...events].slice(0, 10));
        this.eventCount.set(this.eventCount() + 1);
      });

    // Simulate frequency trend
    setInterval(() => {
      if (this.pmuDataList().length > 0) {
        const trend = (Math.random() - 0.5) * 0.01;
        this.frequencyTrend.set(trend);
      }
    }, 5000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateMetrics(pmuDataList: any[]): void {
    this.pmuCount.set(pmuDataList.length);
    
    if (pmuDataList.length > 0) {
      // Calculate average frequency
      const avgFreq = pmuDataList.reduce((sum, pmu) => sum + pmu.frequency, 0) / pmuDataList.length;
      this.avgFrequency.set(avgFreq);
      
      // Calculate average ROCOF
      const avgRocof = pmuDataList.reduce((sum, pmu) => sum + Math.abs(pmu.rocof), 0) / pmuDataList.length;
      this.avgRocof.set(avgRocof);
      
      // Calculate data quality (simplified)
      const goodQuality = pmuDataList.filter(pmu => pmu.quality === 0).length;
      this.dataQuality.set((goodQuality / pmuDataList.length) * 100);
      
      // Update samples per second (30 samples/sec per PMU)
      this.totalSamples.set(pmuDataList.length * 30);
    }
  }

  onPmuSelected(pmuId: number): void {
    this.selectedPmuId.set(this.selectedPmuId() === pmuId ? null : pmuId);
  }
}
