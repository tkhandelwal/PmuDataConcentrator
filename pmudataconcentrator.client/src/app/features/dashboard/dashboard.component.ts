import { Component, OnInit, OnDestroy, signal, computed, effect, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { animate, style, transition, trigger, state } from '@angular/animations';
import { PmuDataService } from '../../core/services/pmu-data.service';
import { MapViewComponent } from '../map-view/map-view.component';
import { FrequencyChartComponent } from '../charts/frequency-chart.component';
import { PmuStatusCardComponent } from '../pmu-status-card/pmu-status-card.component';
import { EventLogComponent } from '../event-log/event-log.component';
import { SystemHealthComponent } from '../system-health/system-health.component';
import { Subject, takeUntil, interval, animationFrameScheduler } from 'rxjs';
import { filter, debounceTime } from 'rxjs/operators';

// Define types
interface SystemMetrics {
  avgFrequency: number;
  avgRocof: number;
  maxFrequencyDev: number;
  minFrequency: number;
  maxFrequency: number;
  voltageStability: number;
  phaseAngleSpread: number;
  dataLatency: number;
}

interface AlertThresholds {
  frequencyMin: number;
  frequencyMax: number;
  rocofMax: number;
  voltageMin: number;
  voltageMax: number;
  phaseAngleMax: number;
}

interface MapLayers {
  transmission: boolean;
  zones: boolean;
  weather: boolean;
}

interface Alert {
  id: string;
  message: string;
  severity: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatGridListModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDividerModule,
    MatChipsModule,
    MatMenuModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MapViewComponent,
    FrequencyChartComponent,
    PmuStatusCardComponent,
    EventLogComponent,
    SystemHealthComponent
  ],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ]),
    trigger('pulse', [
      state('normal', style({ transform: 'scale(1)' })),
      state('alert', style({ transform: 'scale(1.05)' })),
      transition('normal <=> alert', animate('500ms ease-in-out'))
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('500ms ease-in', style({ opacity: 1 }))
      ])
    ])
  ],
  template: `
    <div class="dashboard-container" [class.dark-theme]="isDarkMode()">
      <!-- Header -->
      <header class="dashboard-header" @slideIn>
        <div class="header-left">
          <div class="logo-section">
            <mat-icon class="logo-icon">electric_bolt</mat-icon>
            <div>
              <h1 class="gradient-text">PMU Data Concentrator</h1>
              <div class="subtitle">Wide Area Monitoring System</div>
            </div>
          </div>
          <div class="system-info">
            <div class="info-item">
              <mat-icon>access_time</mat-icon>
              <span>{{ currentTime() }}</span>
            </div>
            <mat-divider [vertical]="true"></mat-divider>
            <div class="info-item">
              <mat-icon>speed</mat-icon>
              <span>{{ updateRate() }} Hz</span>
            </div>
          </div>
        </div>
        
        <div class="header-right">
          <!-- System Status Indicators -->
          <div class="status-indicators">
            <div class="status-item" [class.alert]="isSystemAlert()" [@pulse]="alertState()">
              <mat-icon [style.color]="getSystemStatusColor()">
                {{ getSystemStatusIcon() }}
              </mat-icon>
              <span>{{ getSystemStatus() }}</span>
            </div>
          </div>

          <!-- Connection Status -->
          <div class="connection-status" [class.connected]="isConnected()">
            <mat-icon>{{ isConnected() ? 'wifi' : 'wifi_off' }}</mat-icon>
            <span>{{ connectionStatus() }}</span>
            <mat-progress-spinner 
              *ngIf="isReconnecting()"
              mode="indeterminate" 
              diameter="16">
            </mat-progress-spinner>
          </div>

          <!-- Action Buttons -->
          <div class="action-buttons">
            <mat-button-toggle-group [(value)]="viewMode" aria-label="View mode">
              <mat-button-toggle value="grid" matTooltip="Grid View">
                <mat-icon>grid_view</mat-icon>
              </mat-button-toggle>
              <mat-button-toggle value="list" matTooltip="List View">
                <mat-icon>view_list</mat-icon>
              </mat-button-toggle>
            </mat-button-toggle-group>

            <button mat-icon-button [matMenuTriggerFor]="settingsMenu" matTooltip="Settings">
              <mat-icon>settings</mat-icon>
            </button>
            
            <button mat-icon-button (click)="exportData()" matTooltip="Export Data" [disabled]="isExporting()">
              <mat-icon>{{ isExporting() ? 'hourglass_empty' : 'download' }}</mat-icon>
            </button>
            
            <button mat-icon-button (click)="toggleFullscreen()" matTooltip="Fullscreen">
              <mat-icon>{{ isFullscreen() ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
            </button>
          </div>
        </div>

        <!-- Settings Menu -->
        <mat-menu #settingsMenu="matMenu" class="settings-menu">
          <button mat-menu-item (click)="toggleDarkMode()">
            <mat-icon>{{ isDarkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
            <span>{{ isDarkMode() ? 'Light Mode' : 'Dark Mode' }}</span>
          </button>
          <button mat-menu-item (click)="openAlertSettings()">
            <mat-icon>notifications_active</mat-icon>
            <span>Alert Settings</span>
          </button>
          <button mat-menu-item (click)="openDataSettings()">
            <mat-icon>storage</mat-icon>
            <span>Data Settings</span>
          </button>
          <mat-divider></mat-divider>
          <button mat-menu-item (click)="showAbout()">
            <mat-icon>info</mat-icon>
            <span>About</span>
          </button>
        </mat-menu>
      </header>

      <!-- Alert Banner -->
      <div class="alert-banner" *ngIf="activeAlerts().length > 0" @slideIn>
        <mat-icon>warning</mat-icon>
        <span>{{ activeAlerts()[0].message }}</span>
        <button mat-icon-button (click)="dismissAlert(activeAlerts()[0].id)">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Main Grid Layout -->
      <div class="dashboard-grid" [class.list-view]="viewMode === 'list'">
        <!-- System Overview Card -->
        <mat-card class="dashboard-card system-overview-card" @fadeIn>
          <mat-card-header>
            <mat-card-title>
              <mat-icon>dashboard</mat-icon>
              System Overview
              <div class="chip-filters live-chip">
                <button mat-stroked-button 
                        [class.active]="isLiveData()" 
                        (click)="toggleLiveData()">
                  <mat-icon>fiber_manual_record</mat-icon>
                  {{ isLiveData() ? 'LIVE' : 'PAUSED' }}
                </button>
              </div>
            </mat-card-title>
            <button mat-icon-button (click)="toggleLiveData()" [matTooltip]="isLiveData() ? 'Pause' : 'Resume'">
              <mat-icon>{{ isLiveData() ? 'pause' : 'play_arrow' }}</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content>
            <div class="overview-grid">
              <div class="overview-item primary">
                <div class="overview-icon">
                  <mat-icon>electric_bolt</mat-icon>
                </div>
                <div class="overview-content">
                  <div class="overview-value">{{ systemMetrics().avgFrequency | number:'1.4-4' }}</div>
                  <div class="overview-label">System Frequency (Hz)</div>
                  <div class="overview-trend" [class.positive]="frequencyTrend() > 0" [class.negative]="frequencyTrend() < 0">
                    <mat-icon>{{ frequencyTrend() > 0 ? 'trending_up' : frequencyTrend() < 0 ? 'trending_down' : 'trending_flat' }}</mat-icon>
                    {{ Math.abs(frequencyTrend()) | number:'1.3-3' }} Hz/min
                  </div>
                </div>
              </div>

              <div class="overview-item">
                <div class="overview-icon">
                  <mat-icon>speed</mat-icon>
                </div>
                <div class="overview-content">
                  <div class="overview-value">{{ systemMetrics().avgRocof | number:'1.3-3' }}</div>
                  <div class="overview-label">Avg ROCOF (Hz/s)</div>
                  <mat-progress-bar 
                    mode="determinate" 
                    [value]="getRocofPercentage()"
                    [color]="getRocofSeverity()">
                  </mat-progress-bar>
                </div>
              </div>

              <div class="overview-item">
                <div class="overview-icon">
                  <mat-icon>router</mat-icon>
                </div>
                <div class="overview-content">
                  <div class="overview-value">{{ activePmuCount() }}/{{ totalPmuCount() }}</div>
                  <div class="overview-label">Active PMUs</div>
                  <div class="overview-subtext">{{ getPmuAvailability() | number:'1.1-1' }}% Available</div>
                </div>
              </div>

              <div class="overview-item">
                <div class="overview-icon">
                  <mat-icon>timeline</mat-icon>
                </div>
                <div class="overview-content">
                  <div class="overview-value">{{ totalSamples() | number }}</div>
                  <div class="overview-label">Samples/sec</div>
                  <div class="overview-subtext">{{ getDataThroughput() }} MB/s</div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- System Health Card -->
        <mat-card class="dashboard-card system-health-card" @fadeIn>
          <mat-card-header>
            <mat-card-title>
              <mat-icon>monitor_heart</mat-icon>
              System Health
              <button mat-icon-button (click)="refreshHealth()" matTooltip="Refresh">
                <mat-icon>refresh</mat-icon>
              </button>
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <app-system-health 
              [frequency]="systemMetrics().avgFrequency"
              [rocof]="systemMetrics().avgRocof"
              [pmuCount]="activePmuCount()"
              [dataQuality]="dataQuality()">
            </app-system-health>
          </mat-card-content>
        </mat-card>

        <!-- Map View -->
        <mat-card class="dashboard-card map-card" @fadeIn>
          <mat-card-header>
            <mat-card-title>
              <mat-icon>map</mat-icon>
              Geographic Overview
              <div class="chip-filters">
                <button mat-stroked-button 
                        [class.active]="mapFilter() === 'all'" 
                        (click)="setMapFilter('all')">All</button>
                <button mat-stroked-button 
                        [class.active]="mapFilter() === 'alerts'" 
                        (click)="setMapFilter('alerts')">Alerts</button>
                <button mat-stroked-button 
                        [class.active]="mapFilter() === 'offline'" 
                        (click)="setMapFilter('offline')">Offline</button>
              </div>
            </mat-card-title>
            <button mat-icon-button [matMenuTriggerFor]="mapMenu" matTooltip="Map Options">
              <mat-icon>more_vert</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content>
            <app-map-view 
              [pmuData]="filteredPmuData()"
              (pmuSelected)="onPmuSelected($event)">
            </app-map-view>
          </mat-card-content>
        </mat-card>

        <!-- Map Options Menu -->
        <mat-menu #mapMenu="matMenu">
          <button mat-menu-item (click)="toggleMapLayer('transmission')">
            <mat-icon>{{ mapLayers().transmission ? 'check_box' : 'check_box_outline_blank' }}</mat-icon>
            <span>Transmission Lines</span>
          </button>
          <button mat-menu-item (click)="toggleMapLayer('zones')">
            <mat-icon>{{ mapLayers().zones ? 'check_box' : 'check_box_outline_blank' }}</mat-icon>
            <span>Control Zones</span>
          </button>
          <button mat-menu-item (click)="toggleMapLayer('weather')">
            <mat-icon>{{ mapLayers().weather ? 'check_box' : 'check_box_outline_blank' }}</mat-icon>
            <span>Weather Overlay</span>
          </button>
        </mat-menu>

        <!-- Real-time Frequency Chart -->
        <mat-card class="dashboard-card frequency-card" @fadeIn>
          <mat-card-header>
            <mat-card-title>
              <mat-icon>show_chart</mat-icon>
              System Frequency Trend
              <mat-button-toggle-group [(value)]="chartTimeWindow" aria-label="Time window">
                <mat-button-toggle value="60">1m</mat-button-toggle>
                <mat-button-toggle value="300">5m</mat-button-toggle>
                <mat-button-toggle value="900">15m</mat-button-toggle>
                <mat-button-toggle value="3600">1h</mat-button-toggle>
              </mat-button-toggle-group>
            </mat-card-title>
            <button mat-icon-button (click)="expandChart('frequency')" matTooltip="Expand">
              <mat-icon>open_in_full</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content>
            <app-frequency-chart 
              [pmuData]="pmuDataList()"
              [timeWindow]="chartTimeWindow">
            </app-frequency-chart>
          </mat-card-content>
        </mat-card>

        <!-- Advanced Metrics -->
        <mat-card class="dashboard-card metrics-card" @fadeIn>
          <mat-card-header>
            <mat-card-title>
              <mat-icon>analytics</mat-icon>
              Advanced Metrics
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="metrics-grid">
              <div class="metric-item primary">
                <div class="metric-header">
                  <mat-icon>tune</mat-icon>
                  <span>Frequency Range</span>
                </div>
                <div class="metric-content">
                  <div class="metric-range">
                    <span class="range-min">{{ systemMetrics().minFrequency | number:'1.3-3' }}</span>
                    <div class="range-bar">
                      <div class="range-indicator" [style.left.%]="getFrequencyPosition()"></div>
                    </div>
                    <span class="range-max">{{ systemMetrics().maxFrequency | number:'1.3-3' }}</span>
                  </div>
                  <div class="metric-label">Hz (Min - Max)</div>
                </div>
              </div>
              
              <div class="metric-item">
                <div class="metric-header">
                  <mat-icon>electrical_services</mat-icon>
                  <span>Voltage Stability</span>
                </div>
                <div class="metric-content">
                  <div class="metric-value">{{ systemMetrics().voltageStability | number:'1.1-1' }}%</div>
                  <mat-progress-bar 
                    mode="determinate" 
                    [value]="systemMetrics().voltageStability"
                    color="primary">
                  </mat-progress-bar>
                </div>
              </div>
              
              <div class="metric-item">
                <div class="metric-header">
                  <mat-icon>transform</mat-icon>
                  <span>Phase Angle Spread</span>
                </div>
                <div class="metric-content">
                  <div class="metric-value">{{ systemMetrics().phaseAngleSpread | number:'1.1-1' }}°</div>
                  <div class="metric-status" [class.warning]="systemMetrics().phaseAngleSpread > 30">
                    {{ getPhaseAngleStatus() }}
                  </div>
                </div>
              </div>
              
              <div class="metric-item">
                <div class="metric-header">
                  <mat-icon>timer</mat-icon>
                  <span>Data Latency</span>
                </div>
                <div class="metric-content">
                  <div class="metric-value">{{ systemMetrics().dataLatency | number:'1.0-0' }} ms</div>
                  <div class="metric-status" [class.good]="systemMetrics().dataLatency < 100">
                    {{ getLatencyStatus() }}
                  </div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Event Log -->
        <mat-card class="dashboard-card events-card" @fadeIn>
          <mat-card-header>
            <mat-card-title>
              <mat-icon 
                [matBadge]="unacknowledgedEventCount()" 
                matBadgeColor="warn" 
                [matBadgeHidden]="unacknowledgedEventCount() === 0"
                [attr.aria-hidden]="unacknowledgedEventCount() === 0 ? 'true' : 'false'"
                [attr.aria-label]="unacknowledgedEventCount() + ' unacknowledged events'">
                notifications
              </mat-icon>
              System Events
              <div class="chip-filters">
                <button mat-stroked-button 
                        [class.active]="eventFilter() === 'all'" 
                        (click)="setEventFilter('all')">All</button>
                <button mat-stroked-button 
                        [class.active]="eventFilter() === 'critical'" 
                        (click)="setEventFilter('critical')">Critical</button>
                <button mat-stroked-button 
                        [class.active]="eventFilter() === 'unack'" 
                        (click)="setEventFilter('unack')">Unack</button>
              </div>
            </mat-card-title>
            <button mat-icon-button (click)="acknowledgeAllEvents()" 
                    matTooltip="Acknowledge All" 
                    [disabled]="unacknowledgedEventCount() === 0">
              <mat-icon>done_all</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content>
            <app-event-log 
              [events]="filteredEvents()"
              (eventAcknowledged)="onEventAcknowledged($event)">
            </app-event-log>
          </mat-card-content>
        </mat-card>

        <!-- PMU Status Grid -->
        <mat-card class="dashboard-card pmu-grid-card" @fadeIn>
          <mat-card-header>
            <mat-card-title>
              <mat-icon>device_hub</mat-icon>
              PMU Status
              <div class="pmu-summary">
                <span class="summary-item good">
                  <mat-icon>check_circle</mat-icon>
                  {{ getHealthyPmuCount() }}
                </span>
                <span class="summary-item warning">
                  <mat-icon>warning</mat-icon>
                  {{ getWarningPmuCount() }}
                </span>
                <span class="summary-item critical">
                  <mat-icon>error</mat-icon>
                  {{ getCriticalPmuCount() }}
                </span>
                <span class="summary-item offline">
                  <mat-icon>cancel</mat-icon>
                  {{ getOfflinePmuCount() }}
                </span>
              </div>
            </mat-card-title>
            <div class="pmu-controls">
              <mat-form-field appearance="outline" class="search-field">
                <mat-label>Search PMUs</mat-label>
                <input matInput [(ngModel)]="pmuSearchTerm" placeholder="Name or ID">
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>
              <mat-button-toggle-group [(value)]="pmuSortBy" aria-label="Sort by">
                <mat-button-toggle value="id">ID</mat-button-toggle>
                <mat-button-toggle value="name">Name</mat-button-toggle>
                <mat-button-toggle value="status">Status</mat-button-toggle>
              </mat-button-toggle-group>
            </div>
          </mat-card-header>
          <mat-card-content>
            <div class="pmu-grid" [class.compact]="viewMode === 'list'">
              <app-pmu-status-card 
                *ngFor="let pmu of sortedFilteredPmuData(); trackBy: trackByPmuId"
                [pmuData]="pmu"
                [isSelected]="selectedPmuId() === pmu.pmuId"
                (click)="onPmuSelected(pmu.pmuId)"
                @fadeIn>
              </app-pmu-status-card>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Loading Overlay -->
      <div class="loading-overlay" *ngIf="isLoading()">
        <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
        <p>Loading PMU data...</p>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      min-height: 100vh;
      background: #0a0a0a;
      padding: 20px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      transition: all 0.3s ease;
    }

    .dashboard-container.dark-theme {
      background: #0a0a0a;
    }

    /* Header Styles */
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding: 20px;
      background: linear-gradient(145deg, #1a1a1a 0%, #0f0f0f 100%);
      border-radius: 16px;
      border: 1px solid #2a2a2a;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 32px;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #00d4ff;
      filter: drop-shadow(0 0 10px rgba(0, 212, 255, 0.5));
    }

    .header-left h1 {
      font-size: 28px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.5px;
    }

    .subtitle {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
    }

    .system-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #999;
    }

    .info-item mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #00d4ff;
    }

    mat-divider[vertical] {
      height: 24px;
      margin: 0 8px;
      background: #333;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 24px;
    }

    .status-indicators {
      display: flex;
      gap: 16px;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 20px;
      font-size: 14px;
      transition: all 0.3s ease;
    }

    .status-item.alert {
      background: rgba(244, 67, 54, 0.1);
      border: 1px solid rgba(244, 67, 54, 0.3);
    }

    .status-item mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
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
      border: 1px solid rgba(76, 175, 80, 0.3);
    }

    .connection-status mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .action-buttons {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Alert Banner */
    .alert-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      background: rgba(244, 67, 54, 0.1);
      border: 1px solid rgba(244, 67, 54, 0.3);
      border-radius: 8px;
      margin-bottom: 20px;
      color: #ff6b6b;
    }

    .alert-banner mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Grid Layout */
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      grid-auto-rows: minmax(100px, auto);
      gap: 20px;
    }

    .dashboard-grid.list-view {
      grid-template-columns: 1fr;
    }

    /* Card Styles */
    .dashboard-card {
      background: linear-gradient(145deg, #1a1a1a 0%, #0f0f0f 100%);
      border: 1px solid #2a2a2a;
      border-radius: 16px;
      overflow: hidden;
      transition: all 0.3s ease;
      position: relative;
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
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 16px;
      font-weight: 500;
      margin: 0;
      flex: 1;
    }

    mat-card-title mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #00d4ff;
    }

    /* Chip Filters */
    .chip-filters {
      display: flex;
      gap: 8px;
      margin-left: auto;
    }

    .chip-filters button {
      font-size: 12px;
      height: 32px;
      line-height: 32px;
      padding: 0 16px;
      border-color: #666;
      color: #999;
    }

    .chip-filters button.active {
      background: rgba(0, 212, 255, 0.1);
      border-color: #00d4ff;
      color: #00d4ff;
    }

    .chip-filters.live-chip button.active {
      background: rgba(76, 175, 80, 0.1);
      border-color: #4caf50;
      color: #4caf50;
    }

    .chip-filters.live-chip button.active mat-icon {
      font-size: 8px;
      width: 8px;
      height: 8px;
      margin-right: 4px;
      animation: pulse-dot 1.5s infinite;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    /* Grid item sizes */
    .system-overview-card { grid-column: span 12; grid-row: span 1; }
    .system-health-card { grid-column: span 3; grid-row: span 2; }
    .map-card { grid-column: span 6; grid-row: span 4; }
    .frequency-card { grid-column: span 3; grid-row: span 2; }
    .metrics-card { grid-column: span 3; grid-row: span 2; }
    .events-card { grid-column: span 3; grid-row: span 2; }
    .pmu-grid-card { grid-column: span 12; grid-row: span 3; }

    /* Overview Grid */
    .overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .overview-item {
      display: flex;
      gap: 16px;
      padding: 20px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      transition: all 0.3s ease;
    }

    .overview-item:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(0, 212, 255, 0.3);
      transform: translateY(-2px);
    }

    .overview-item.primary {
      background: linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(0, 153, 255, 0.1) 100%);
      border-color: rgba(0, 212, 255, 0.2);
    }

    .overview-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: rgba(0, 212, 255, 0.1);
      border-radius: 12px;
      flex-shrink: 0;
    }

    .overview-icon mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: #00d4ff;
    }

    .overview-content {
      flex: 1;
      min-width: 0;
    }

    .overview-value {
      font-size: 28px;
      font-weight: 700;
      color: #00d4ff;
      margin-bottom: 4px;
      font-variant-numeric: tabular-nums;
    }

    .overview-label {
      font-size: 12px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .overview-trend {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      color: #999;
    }

    .overview-trend.positive {
      color: #4caf50;
    }

    .overview-trend.negative {
      color: #f44336;
    }

    .overview-trend mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .overview-subtext {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .metric-item {
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

    .metric-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      font-size: 13px;
      color: #999;
    }

    .metric-header mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #00d4ff;
    }

    .metric-value {
      font-size: 24px;
      font-weight: 600;
      color: #00d4ff;
      margin-bottom: 8px;
      font-variant-numeric: tabular-nums;
    }

    .metric-range {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .range-bar {
      flex: 1;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      position: relative;
    }

    .range-indicator {
      position: absolute;
      top: -4px;
      width: 12px;
      height: 12px;
      background: #00d4ff;
      border-radius: 50%;
      border: 2px solid #1a1a1a;
      transform: translateX(-50%);
      box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
    }

    .range-min, .range-max {
      font-size: 12px;
      color: #666;
      font-variant-numeric: tabular-nums;
    }

    .metric-status {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .metric-status.good {
      color: #4caf50;
    }

    .metric-status.warning {
      color: #ff9800;
    }

    .metric-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* PMU Summary */
    .pmu-summary {
      display: flex;
      gap: 16px;
      margin-left: auto;
      font-size: 14px;
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .summary-item mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .summary-item.good { color: #4caf50; }
    .summary-item.warning { color: #ff9800; }
    .summary-item.critical { color: #f44336; }
    .summary-item.offline { color: #666; }

    /* PMU Controls */
    .pmu-controls {
      display: flex;
      gap: 16px;
      align-items: center;
      margin-left: auto;
    }

    .search-field {
      width: 200px;
    }

    ::ng-deep .search-field .mat-form-field-wrapper {
      padding-bottom: 0;
    }

    ::ng-deep .search-field .mat-form-field-appearance-outline .mat-form-field-wrapper {
      margin: 0;
    }

    ::ng-deep .search-field .mat-form-field-appearance-outline .mat-form-field-flex {
      padding: 0 12px;
      height: 40px;
    }

    ::ng-deep .search-field .mat-form-field-appearance-outline .mat-form-field-infix {
      padding: 8px 0;
      border-top: 0;
    }

    /* PMU Grid */
    .pmu-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }

    .pmu-grid.compact {
      grid-template-columns: 1fr;
    }

    /* Loading Overlay */
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      z-index: 9999;
    }

    .loading-overlay p {
      color: #999;
      font-size: 14px;
    }

    /* Settings Menu */
    ::ng-deep .settings-menu {
      background: #1a1a1a;
      border: 1px solid #333;
    }

    ::ng-deep .settings-menu .mat-menu-item {
      color: #e0e0e0;
    }

    ::ng-deep .settings-menu .mat-menu-item:hover {
      background: rgba(0, 212, 255, 0.1);
    }

    /* Gradient Text */
    .gradient-text {
      background: linear-gradient(135deg, #00d4ff 0%, #0099ff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* Responsive Design */
    @media (max-width: 1600px) {
      .dashboard-grid {
        grid-template-columns: repeat(8, 1fr);
      }
      .system-health-card { grid-column: span 4; }
      .map-card { grid-column: span 8; }
      .frequency-card { grid-column: span 4; }
      .metrics-card { grid-column: span 4; }
      .events-card { grid-column: span 4; }
    }

    @media (max-width: 1200px) {
      .dashboard-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .header-left {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .header-right {
        justify-content: space-between;
      }

      .dashboard-grid {
        grid-template-columns: repeat(4, 1fr);
      }
      
      .system-overview-card { grid-column: span 4; }
      .system-health-card { grid-column: span 4; }
      .map-card { grid-column: span 4; }
      .frequency-card { grid-column: span 4; }
      .metrics-card { grid-column: span 4; }
      .events-card { grid-column: span 4; }
      .pmu-grid-card { grid-column: span 4; }
    }

    @media (max-width: 768px) {
      .dashboard-container {
        padding: 12px;
      }

      .dashboard-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      
      .dashboard-card {
        grid-column: span 1 !important;
      }

      .overview-grid {
        grid-template-columns: 1fr;
      }

      .metrics-grid {
        grid-template-columns: 1fr;
      }

      .metric-item.primary {
        grid-column: span 1;
      }

      .pmu-grid {
        grid-template-columns: 1fr;
      }

      .action-buttons {
        flex-wrap: wrap;
      }

      .chip-filters {
        flex-wrap: wrap;
      }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Inject services
  public pmuDataService = inject(PmuDataService);
  private snackBar = inject(MatSnackBar);
  
  // View state
  viewMode = 'grid';
  chartTimeWindow = 300;
  pmuSearchTerm = '';
  pmuSortBy = 'id';
  
  // Signals for reactive state
  isLoading = signal(false);
  isConnected = signal(false);
  isReconnecting = signal(false);
  connectionStatus = signal('Connecting...');
  currentTime = signal('');
  updateRate = signal(30);
  isDarkMode = signal(true);
  isFullscreen = signal(false);
  isLiveData = signal(true);
  isExporting = signal(false);
  
  // System metrics
  systemMetrics = signal<SystemMetrics>({
    avgFrequency: 60.0,
    avgRocof: 0.0,
    maxFrequencyDev: 0.0,
    minFrequency: 60.0,
    maxFrequency: 60.0,
    voltageStability: 100,
    phaseAngleSpread: 0,
    dataLatency: 0
  });
  
  // PMU data
  pmuCount = signal(0);
  activePmuCount = signal(0);
  totalPmuCount = signal(12); // Expected PMUs
  dataQuality = signal(100);
  totalSamples = signal(0);
  frequencyTrend = signal(0);
  selectedPmuId = signal<number | null>(null);
  
  // Events
  eventCount = signal(0);
  unacknowledgedEventCount = signal(0);
  recentEvents = signal<any[]>([]);
  eventFilter = signal<'all' | 'critical' | 'unack'>('all');
  
  // Alerts
  activeAlerts = signal<Alert[]>([]);
  alertState = signal<'normal' | 'alert'>('normal');
  
  // Map
  mapFilter = signal<'all' | 'alerts' | 'offline'>('all');
  mapLayers = signal<MapLayers>({
    transmission: true,
    zones: false,
    weather: false
  });
  
  // Alert thresholds
  private alertThresholds: AlertThresholds = {
    frequencyMin: 59.5,
    frequencyMax: 60.5,
    rocofMax: 1.0,
    voltageMin: 0.95,
    voltageMax: 1.05,
    phaseAngleMax: 45
  };
  
  // Computed values
  pmuDataList = computed(() => this.pmuDataService.pmuDataList());
  
  filteredPmuData = computed(() => {
    const data = this.pmuDataList();
    const filter = this.mapFilter();
    
    switch (filter) {
      case 'alerts':
        return data.filter(pmu => this.hasAlert(pmu));
      case 'offline':
        return data.filter(pmu => this.isOffline(pmu));
      default:
        return data;
    }
  });
  
  sortedFilteredPmuData = computed(() => {
    let data = this.pmuDataList();
    
    // Apply search filter
    if (this.pmuSearchTerm) {
      const searchLower = this.pmuSearchTerm.toLowerCase();
      data = data.filter(pmu => 
        pmu.stationName?.toLowerCase().includes(searchLower) ||
        pmu.pmuId.toString().includes(searchLower)
      );
    }
    
    // Apply sorting
    return [...data].sort((a, b) => {
      switch (this.pmuSortBy) {
        case 'name':
          return (a.stationName || '').localeCompare(b.stationName || '');
        case 'status':
          return this.getPmuStatus(b) - this.getPmuStatus(a);
        default:
          return a.pmuId - b.pmuId;
      }
    });
  });
  
  filteredEvents = computed(() => {
    const events = this.recentEvents();
    const filter = this.eventFilter();
    
    switch (filter) {
      case 'critical':
        return events.filter(e => e.severity === 2);
      case 'unack':
        return events.filter(e => !e.isAcknowledged);
      default:
        return events;
    }
  });
  
  // Math reference for template
  Math = Math;

  constructor() {
    // Set up reactive effects in constructor (injection context)
    effect(() => {
      const data = this.pmuDataService.pmuDataList();
      this.updateMetrics(data);
      this.checkAlerts(data);
    });
    
    // Monitor connection status
    effect(() => {
      const connected = this.pmuDataList().length > 0;
      this.isConnected.set(connected);
      this.connectionStatus.set(connected ? 'Connected' : 'Disconnected');
    });
  }

  ngOnInit(): void {
    // Start loading
    this.isLoading.set(true);
    
    // Update current time every second
    this.updateClock();
    
    // Subscribe to real-time events
    this.subscribeToEvents();
    
    // Simulate data updates
    this.simulateDataUpdates();
    
    // Check for fullscreen changes
    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen.set(!!document.fullscreenElement);
    });
    
    // Initial data load
    setTimeout(() => {
      this.isLoading.set(false);
    }, 1000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private updateClock(): void {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const now = new Date();
        this.currentTime.set(now.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }));
      });
  }
  
  private subscribeToEvents(): void {
    this.pmuDataService.getEventStream()
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        const events = this.recentEvents();
        this.recentEvents.set([event, ...events].slice(0, 100));
        this.eventCount.set(this.eventCount() + 1);
        
        if (!event.isAcknowledged) {
          this.unacknowledgedEventCount.update(count => count + 1);
        }
        
        // Show notification for critical events
        if (event.severity === 2) {
          this.snackBar.open(`Critical Event: ${event.description}`, 'Acknowledge', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }
  
  private simulateDataUpdates(): void {
    // Simulate frequency trend
    interval(5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.pmuDataList().length > 0 && this.isLiveData()) {
          const trend = (Math.random() - 0.5) * 0.01;
          this.frequencyTrend.set(trend);
        }
      });
    
    // Simulate occasional alerts
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (Math.random() < 0.1 && this.isLiveData()) {
          this.addAlert({
            id: Date.now().toString(),
            message: 'System frequency deviation detected',
            severity: 'warning'
          });
        }
      });
  }

  private updateMetrics(pmuDataList: any[]): void {
    this.pmuCount.set(pmuDataList.length);
    this.activePmuCount.set(pmuDataList.filter(pmu => !this.isOffline(pmu)).length);
    
    if (pmuDataList.length > 0) {
      // Calculate system metrics
      const frequencies = pmuDataList.map(pmu => pmu.frequency);
      const avgFreq = frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length;
      const minFreq = Math.min(...frequencies);
      const maxFreq = Math.max(...frequencies);
      
      const rocofs = pmuDataList.map(pmu => Math.abs(pmu.rocof));
      const avgRocof = rocofs.reduce((sum, r) => sum + r, 0) / rocofs.length;
      
      // Calculate voltage stability (simplified)
      const voltages = pmuDataList.map(pmu => {
        const vPhasor = pmu.phasors?.find((p: any) => p.type === 0);
        return vPhasor ? vPhasor.magnitude : 1.0;
      });
      const avgVoltage = voltages.reduce((sum, v) => sum + v, 0) / voltages.length;
      const voltageStability = 100 - Math.abs(1.0 - avgVoltage) * 100;
      
      // Calculate phase angle spread
      const angles = pmuDataList.map(pmu => {
        const vPhasor = pmu.phasors?.find((p: any) => p.type === 0);
        return vPhasor ? vPhasor.angle : 0;
      });
      const minAngle = Math.min(...angles);
      const maxAngle = Math.max(...angles);
      const phaseAngleSpread = maxAngle - minAngle;
      
      // Calculate data latency
      const latencies = pmuDataList.map(pmu => {
        const now = Date.now();
        const timestamp = new Date(pmu.timestamp).getTime();
        return now - timestamp;
      });
      const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
      
      this.systemMetrics.set({
        avgFrequency: avgFreq,
        avgRocof: avgRocof,
        maxFrequencyDev: Math.max(Math.abs(avgFreq - 60.0), Math.abs(maxFreq - minFreq)),
        minFrequency: minFreq,
        maxFrequency: maxFreq,
        voltageStability: voltageStability,
        phaseAngleSpread: phaseAngleSpread,
        dataLatency: avgLatency
      });
      
      // Calculate data quality
      const goodQuality = pmuDataList.filter(pmu => pmu.quality === 0).length;
      this.dataQuality.set((goodQuality / pmuDataList.length) * 100);
      
      // Update samples per second
      this.totalSamples.set(pmuDataList.length * this.updateRate());
    }
  }
  
  private checkAlerts(pmuDataList: any[]): void {
    const metrics = this.systemMetrics();
    const alerts: Alert[] = [];
    
    // Check frequency
    if (metrics.avgFrequency < this.alertThresholds.frequencyMin ||
        metrics.avgFrequency > this.alertThresholds.frequencyMax) {
      alerts.push({
        id: 'freq-1',
        message: `System frequency ${metrics.avgFrequency.toFixed(3)} Hz is outside normal range`,
        severity: 'critical'
      });
    }
    
    // Check ROCOF
    if (metrics.avgRocof > this.alertThresholds.rocofMax) {
      alerts.push({
        id: 'rocof-1',
        message: `High rate of frequency change detected: ${metrics.avgRocof.toFixed(3)} Hz/s`,
        severity: 'warning'
      });
    }
    
    // Check phase angle
    if (metrics.phaseAngleSpread > this.alertThresholds.phaseAngleMax) {
      alerts.push({
        id: 'phase-1',
        message: `Large phase angle spread detected: ${metrics.phaseAngleSpread.toFixed(1)}°`,
        severity: 'warning'
      });
    }
    
    // Update alert state
    if (alerts.length > 0 && this.activeAlerts().length === 0) {
      this.alertState.set('alert');
      setTimeout(() => this.alertState.set('normal'), 500);
    }
    
    // Only add new alerts
    const currentAlertIds = this.activeAlerts().map(a => a.id);
    const newAlerts = alerts.filter(a => !currentAlertIds.includes(a.id));
    if (newAlerts.length > 0) {
      this.activeAlerts.update(current => [...current, ...newAlerts]);
    }
  }
  
  // Helper methods
  isSystemAlert(): boolean {
    const metrics = this.systemMetrics();
    return metrics.avgFrequency < 59.5 || metrics.avgFrequency > 60.5 ||
           metrics.avgRocof > 1.0 || metrics.phaseAngleSpread > 45;
  }
  
  getSystemStatus(): string {
    if (this.isSystemAlert()) return 'ALERT';
    if (this.systemMetrics().avgRocof > 0.5) return 'WARNING';
    return 'NORMAL';
  }
  
  getSystemStatusIcon(): string {
    if (this.isSystemAlert()) return 'error';
    if (this.systemMetrics().avgRocof > 0.5) return 'warning';
    return 'check_circle';
  }
  
  getSystemStatusColor(): string {
    if (this.isSystemAlert()) return '#f44336';
    if (this.systemMetrics().avgRocof > 0.5) return '#ff9800';
    return '#4caf50';
  }
  
  getPmuAvailability(): number {
    return (this.activePmuCount() / this.totalPmuCount()) * 100;
  }
  
  getDataThroughput(): string {
    const bytesPerSample = 200; // Approximate
    const throughput = this.totalSamples() * bytesPerSample / (1024 * 1024);
    return throughput.toFixed(2);
  }
  
  getRocofPercentage(): number {
    const maxRocof = 2.0; // Maximum expected ROCOF
    return Math.min(100, (this.systemMetrics().avgRocof / maxRocof) * 100);
  }
  
  getRocofSeverity(): 'primary' | 'accent' | 'warn' {
    const rocof = this.systemMetrics().avgRocof;
    if (rocof < 0.5) return 'primary';
    if (rocof < 1.0) return 'accent';
    return 'warn';
  }
  
  getFrequencyPosition(): number {
    const metrics = this.systemMetrics();
    const range = metrics.maxFrequency - metrics.minFrequency;
    if (range === 0) return 50;
    return ((metrics.avgFrequency - metrics.minFrequency) / range) * 100;
  }
  
  getPhaseAngleStatus(): string {
    const spread = this.systemMetrics().phaseAngleSpread;
    if (spread < 15) return 'STABLE';
    if (spread < 30) return 'NORMAL';
    if (spread < 45) return 'WARNING';
    return 'CRITICAL';
  }
  
  getLatencyStatus(): string {
    const latency = this.systemMetrics().dataLatency;
    if (latency < 50) return 'EXCELLENT';
    if (latency < 100) return 'GOOD';
    if (latency < 200) return 'FAIR';
    return 'POOR';
  }
  
  getHealthyPmuCount(): number {
    return this.pmuDataList().filter(pmu => 
      !this.hasAlert(pmu) && !this.isOffline(pmu)
    ).length;
  }
  
  getWarningPmuCount(): number {
    return this.pmuDataList().filter(pmu => 
      this.hasWarning(pmu) && !this.isOffline(pmu)
    ).length;
  }
  
  getCriticalPmuCount(): number {
    return this.pmuDataList().filter(pmu => 
      this.hasCritical(pmu) && !this.isOffline(pmu)
    ).length;
  }
  
  getOfflinePmuCount(): number {
    return this.totalPmuCount() - this.activePmuCount();
  }
  
  hasAlert(pmu: any): boolean {
    return this.hasWarning(pmu) || this.hasCritical(pmu);
  }
  
  hasWarning(pmu: any): boolean {
    return Math.abs(pmu.frequency - 60.0) > 0.2 || Math.abs(pmu.rocof) > 0.5;
  }
  
  hasCritical(pmu: any): boolean {
    return Math.abs(pmu.frequency - 60.0) > 0.5 || Math.abs(pmu.rocof) > 1.0;
  }
  
  isOffline(pmu: any): boolean {
    const now = Date.now();
    const timestamp = new Date(pmu.timestamp).getTime();
    return (now - timestamp) > 5000; // Offline if no data for 5 seconds
  }
  
  getPmuStatus(pmu: any): number {
    if (this.isOffline(pmu)) return 0;
    if (this.hasCritical(pmu)) return 1;
    if (this.hasWarning(pmu)) return 2;
    return 3;
  }
  
  // Event handlers
  onPmuSelected(pmuId: number): void {
    this.selectedPmuId.set(this.selectedPmuId() === pmuId ? null : pmuId);
  }
  
  onEventAcknowledged(eventId: string): void {
    this.recentEvents.update(events => 
      events.map(e => e.id === eventId ? { ...e, isAcknowledged: true } : e)
    );
    this.unacknowledgedEventCount.update(count => Math.max(0, count - 1));
  }
  
  acknowledgeAllEvents(): void {
    this.recentEvents.update(events => 
      events.map(e => ({ ...e, isAcknowledged: true }))
    );
    this.unacknowledgedEventCount.set(0);
    
    this.snackBar.open('All events acknowledged', 'OK', {
      duration: 2000
    });
  }
  
  toggleLiveData(): void {
    this.isLiveData.update(live => !live);
    
    this.snackBar.open(
      this.isLiveData() ? 'Live updates resumed' : 'Live updates paused',
      'OK',
      { duration: 2000 }
    );
  }
  
  toggleDarkMode(): void {
    this.isDarkMode.update(dark => !dark);
  }
  
  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }
  
  exportData(): void {
    this.isExporting.set(true);
    
    // Simulate export
    setTimeout(() => {
      this.isExporting.set(false);
      this.snackBar.open('Data exported successfully', 'Open', {
        duration: 3000
      }).onAction().subscribe(() => {
        // Open exported file
      });
    }, 2000);
  }
  
  refreshHealth(): void {
    // Trigger health recalculation
    this.updateMetrics(this.pmuDataList());
  }
  
  setMapFilter(filter: 'all' | 'alerts' | 'offline'): void {
    this.mapFilter.set(filter);
  }
  
  setEventFilter(filter: 'all' | 'critical' | 'unack'): void {
    this.eventFilter.set(filter);
  }
  
  toggleMapLayer(layer: keyof MapLayers): void {
    this.mapLayers.update(layers => ({
      ...layers,
      [layer]: !layers[layer]
    }));
  }
  
  expandChart(chartType: string): void {
    // Open chart in dialog or new route
    console.log('Expanding chart:', chartType);
  }
  
  openAlertSettings(): void {
    // Open alert settings dialog
    console.log('Opening alert settings');
  }
  
  openDataSettings(): void {
    // Open data settings dialog
    console.log('Opening data settings');
  }
  
  showAbout(): void {
    // Show about dialog
    this.snackBar.open('PMU Data Concentrator v1.0.0', 'OK', {
      duration: 3000
    });
  }
  
  dismissAlert(alertId: string): void {
    this.activeAlerts.update(alerts => 
      alerts.filter(a => a.id !== alertId)
    );
  }
  
  addAlert(alert: Alert): void {
    this.activeAlerts.update(alerts => [...alerts, alert]);
    this.alertState.set('alert');
    setTimeout(() => this.alertState.set('normal'), 500);
  }
  
  trackByPmuId(index: number, pmu: any): number {
    return pmu.pmuId;
  }
}
