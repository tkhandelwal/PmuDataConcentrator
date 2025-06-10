// src/app/features/monitoring/frequency-monitor/frequency-monitor.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';
import { PmuDataService } from '../../../core/services/pmu-data.service';
import { FrequencyChartComponent } from '../../charts/frequency-chart.component';

@Component({
  selector: 'app-frequency-monitor',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    FrequencyChartComponent
  ],
  template: `
    <div class="frequency-monitor-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>show_chart</mat-icon>
            Real-time Frequency Monitoring
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <div class="monitor-grid">
            <div class="current-frequency">
              <h3>Current System Frequency</h3>
              <div class="frequency-display">
                <span class="frequency-value">{{ currentFrequency | number:'1.4-4' }}</span>
                <span class="frequency-unit">Hz</span>
              </div>
              <div class="frequency-deviation" [class.alarm]="isFrequencyAlarm()">
                Deviation: {{ frequencyDeviation | number:'+1.4-4' }} Hz
              </div>
            </div>
            
            <div class="frequency-stats">
              <div class="stat-item">
                <span class="stat-label">Min</span>
                <span class="stat-value">{{ minFrequency | number:'1.3-3' }} Hz</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Max</span>
                <span class="stat-value">{{ maxFrequency | number:'1.3-3' }} Hz</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Avg</span>
                <span class="stat-value">{{ avgFrequency | number:'1.3-3' }} Hz</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Std Dev</span>
                <span class="stat-value">{{ stdDevFrequency | number:'1.4-4' }}</span>
              </div>
            </div>
          </div>
          
          <div class="chart-container">
            <app-frequency-chart 
              [pmuData]="pmuDataArray"
              [timeWindow]="300">
            </app-frequency-chart>
          </div>
          
          <div class="rocof-section">
            <h3>Rate of Change of Frequency (ROCOF)</h3>
            <div class="rocof-display">
              <span class="rocof-value" [class.alarm]="isRocofAlarm()">
                {{ currentRocof | number:'1.3-3' }}
              </span>
              <span class="rocof-unit">Hz/s</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .frequency-monitor-container {
      height: 100%;
      padding: 20px;
    }
    
    .monitor-grid {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .current-frequency {
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    
    .frequency-display {
      margin: 20px 0;
    }
    
    .frequency-value {
      font-size: 48px;
      font-weight: 700;
      color: #00d4ff;
    }
    
    .frequency-unit {
      font-size: 24px;
      color: #999;
      margin-left: 8px;
    }
    
    .frequency-deviation {
      font-size: 16px;
      color: #4caf50;
    }
    
    .frequency-deviation.alarm {
      color: #f44336;
    }
    
    .frequency-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    
    .stat-item {
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    
    .stat-label {
      display: block;
      font-size: 12px;
      color: #999;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    
    .stat-value {
      font-size: 20px;
      font-weight: 600;
      color: #fff;
    }
    
    .chart-container {
      height: 400px;
      margin: 20px 0;
    }
    
    .rocof-section {
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    
    .rocof-display {
      margin-top: 16px;
    }
    
    .rocof-value {
      font-size: 36px;
      font-weight: 600;
      color: #00d4ff;
    }
    
    .rocof-value.alarm {
      color: #f44336;
    }
    
    .rocof-unit {
      font-size: 18px;
      color: #999;
      margin-left: 8px;
    }
    
    h3 {
      margin: 0 0 16px 0;
      color: #00d4ff;
    }
  `]
})
export class FrequencyMonitorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentFrequency = 60.0;
  frequencyDeviation = 0.0;
  minFrequency = 60.0;
  maxFrequency = 60.0;
  avgFrequency = 60.0;
  stdDevFrequency = 0.0;
  currentRocof = 0.0;
  pmuDataArray: any[] = [];

  constructor(private pmuDataService: PmuDataService) { }

  ngOnInit(): void {
    this.subscribeToData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToData(): void {
    this.pmuDataService.getSystemState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.currentFrequency = state.avgFrequency;
        this.frequencyDeviation = state.avgFrequency - 60.0;
        this.minFrequency = state.minFrequency;
        this.maxFrequency = state.maxFrequency;
        this.avgFrequency = state.avgFrequency;
      });

    // Subscribe to PMU data
    this.pmuDataService.getPmuDataStream()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.pmuDataArray = [...this.pmuDataArray, data].slice(-300);
        if (data.rocof !== undefined) {
          this.currentRocof = data.rocof;
        }
      });
  }

  isFrequencyAlarm(): boolean {
    return Math.abs(this.frequencyDeviation) > 0.5;
  }

  isRocofAlarm(): boolean {
    return Math.abs(this.currentRocof) > 1.0;
  }
}
