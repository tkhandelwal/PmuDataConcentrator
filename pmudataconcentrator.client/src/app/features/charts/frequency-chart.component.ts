// pmudataconcentrator.client/src/app/features/analytics/frequency-analysis.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Subject, takeUntil, interval } from 'rxjs';
import { PmuDataService } from '../../core/services/pmu-data.service';

Chart.register(...registerables);

interface FrequencyStatistics {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  rms: number;
  skewness: number;
  kurtosis: number;
}

interface SpectralComponent {
  frequency: number;
  amplitude: number;
  phase: number;
  damping: number;
}

@Component({
  selector: 'app-frequency-analysis',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatSlideToggleModule,
    MatTableModule,
    MatSortModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="frequency-analysis-container">
      <!-- Real-time Frequency Monitoring -->
      <div class="analysis-grid">
        <mat-card class="frequency-chart-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>show_chart</mat-icon>
              System Frequency
            </mat-card-title>
            <div class="chart-controls">
              // pmudataconcentrator.client/src/app/features/analytics/frequency-analysis.component.ts (continued)
              <mat-select [(value)]="timeWindow" (selectionChange)="updateTimeWindow()">
                <mat-option value="60">1 min</mat-option>
                <mat-option value="300">5 min</mat-option>
                <mat-option value="900">15 min</mat-option>
                <mat-option value="3600">1 hour</mat-option>
              </mat-select>
              <mat-slide-toggle [(ngModel)]="showAllPmus">Show All PMUs</mat-slide-toggle>
              <button mat-icon-button (click)="pauseChart()">
                <mat-icon>{{ isPaused ? 'play_arrow' : 'pause' }}</mat-icon>
              </button>
            </div>
          </mat-card-header>
          <mat-card-content>
            <canvas #frequencyChart></canvas>
          </mat-card-content>
        </mat-card>

        <!-- Frequency Statistics -->
        <mat-card class="statistics-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>analytics</mat-icon>
              Frequency Statistics
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="stats-grid">
              <div class="stat-item primary">
                <div class="stat-value">{{ statistics.mean | number:'1.4-4' }}</div>
                <div class="stat-label">Mean (Hz)</div>
                <div class="stat-deviation" [class.positive]="statistics.mean > 60" [class.negative]="statistics.mean < 60">
                  {{ statistics.mean - 60 | number:'+1.4-4' }} Hz
                </div>
              </div>
              
              <div class="stat-item">
                <div class="stat-value">{{ statistics.stdDev | number:'1.4-4' }}</div>
                <div class="stat-label">Std Dev (Hz)</div>
                <mat-progress-bar 
                  mode="determinate" 
                  [value]="getStdDevPercentage()"
                  [color]="getStdDevColor()">
                </mat-progress-bar>
              </div>
              
              <div class="stat-item">
                <div class="stat-value">{{ statistics.min | number:'1.3-3' }}</div>
                <div class="stat-label">Min (Hz)</div>
                <div class="stat-time">{{ minTime }}</div>
              </div>
              
              <div class="stat-item">
                <div class="stat-value">{{ statistics.max | number:'1.3-3' }}</div>
                <div class="stat-label">Max (Hz)</div>
                <div class="stat-time">{{ maxTime }}</div>
              </div>
              
              <div class="stat-item">
                <div class="stat-value">{{ statistics.rms | number:'1.4-4' }}</div>
                <div class="stat-label">RMS (Hz)</div>
              </div>
              
              <div class="stat-item">
                <div class="stat-value">{{ nadir | number:'1.3-3' }}</div>
                <div class="stat-label">Nadir (Hz)</div>
                <div class="stat-time">{{ nadirTime }}</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- ROCOF Analysis -->
        <mat-card class="rocof-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>speed</mat-icon>
              Rate of Change (ROCOF)
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <canvas #rocofChart></canvas>
            <div class="rocof-stats">
              <div class="rocof-item">
                <span>Current:</span>
                <strong [style.color]="getRocofColor(currentRocof)">
                  {{ currentRocof | number:'1.3-3' }} Hz/s
                </strong>
              </div>
              <div class="rocof-item">
                <span>Max:</span>
                <strong>{{ maxRocof | number:'1.3-3' }} Hz/s</strong>
              </div>
              <div class="rocof-item">
                <span>Events:</span>
                <strong>{{ rocofEvents }}</strong>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Spectral Analysis -->
        <mat-card class="spectral-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>equalizer</mat-icon>
              Spectral Analysis
            </mat-card-title>
            <button mat-button (click)="runFFT()">
              <mat-icon>refresh</mat-icon>
              Update FFT
            </button>
          </mat-card-header>
          <mat-card-content>
            <canvas #spectralChart></canvas>
            <div class="spectral-components">
              <h4>Dominant Oscillation Modes</h4>
              <table mat-table [dataSource]="spectralComponents" matSort>
                <ng-container matColumnDef="frequency">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Frequency (Hz)</th>
                  <td mat-cell *matCellDef="let comp">{{ comp.frequency | number:'1.3-3' }}</td>
                </ng-container>
                
                <ng-container matColumnDef="amplitude">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Amplitude</th>
                  <td mat-cell *matCellDef="let comp">{{ comp.amplitude | number:'1.4-4' }}</td>
                </ng-container>
                
                <ng-container matColumnDef="damping">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Damping (%)</th>
                  <td mat-cell *matCellDef="let comp">
                    <span [style.color]="getDampingColor(comp.damping)">
                      {{ comp.damping | number:'1.1-1' }}
                    </span>
                  </td>
                </ng-container>
                
                <ng-container matColumnDef="type">
                  <th mat-header-cell *matHeaderCellDef>Type</th>
                  <td mat-cell *matCellDef="let comp">
                    <span class="mode-type" [class]="getModeType(comp.frequency)">
                      {{ getModeType(comp.frequency) }}
                    </span>
                  </td>
                </ng-container>
                
                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Inter-area Oscillations -->
        <mat-card class="oscillation-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>waves</mat-icon>
              Inter-area Oscillations
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <canvas #oscillationChart></canvas>
            <div class="oscillation-alert" *ngIf="hasOscillation">
              <mat-icon>warning</mat-icon>
              <span>Active oscillation detected at {{ oscillationFrequency | number:'1.2-2' }} Hz</span>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Frequency Distribution -->
        <mat-card class="distribution-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>bar_chart</mat-icon>
              Frequency Distribution
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <canvas #distributionChart></canvas>
            <div class="distribution-stats">
              <div class="dist-item">
                <span>Skewness:</span>
                <strong>{{ statistics.skewness | number:'1.3-3' }}</strong>
              </div>
              <div class="dist-item">
                <span>Kurtosis:</span>
                <strong>{{ statistics.kurtosis | number:'1.3-3' }}</strong>
              </div>
              <div class="dist-item">
                <span>Within ±0.05 Hz:</span>
                <strong>{{ compliancePercentage | number:'1.1-1' }}%</strong>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Analysis Controls -->
      <div class="analysis-controls">
        <button mat-raised-button color="primary" (click)="exportData()">
          <mat-icon>download</mat-icon>
          Export Data
        </button>
        <button mat-raised-button (click)="generateReport()">
          <mat-icon>description</mat-icon>
          Generate Report
        </button>
        <button mat-raised-button (click)="runModalAnalysis()" [disabled]="isAnalyzing">
          <mat-icon>psychology</mat-icon>
          Modal Analysis
          <mat-progress-spinner 
            *ngIf="isAnalyzing"
            mode="indeterminate" 
            diameter="20">
          </mat-progress-spinner>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .frequency-analysis-container {
      height: 100%;
      padding: 20px;
      overflow-y: auto;
    }

    .analysis-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 20px;
    }

    @media (max-width: 1400px) {
      .analysis-grid {
        grid-template-columns: 1fr;
      }
    }

    mat-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    mat-card-header {
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      margin: 0;
    }

    mat-card-title mat-icon {
      color: #00d4ff;
    }

    .chart-controls {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    /* Frequency Chart */
    .frequency-chart-card canvas {
      height: 300px !important;
    }

    /* Statistics */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .stat-item {
      text-align: center;
      padding: 16px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .stat-item.primary {
      grid-column: span 3;
      background: linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(0, 153, 255, 0.1) 100%);
      border-color: rgba(0, 212, 255, 0.2);
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #00d4ff;
      margin-bottom: 4px;
      font-variant-numeric: tabular-nums;
    }

    .stat-label {
      font-size: 12px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-deviation {
      font-size: 14px;
      font-weight: 600;
      margin-top: 8px;
    }

    .stat-deviation.positive { color: #ff9800; }
    .stat-deviation.negative { color: #f44336; }

    .stat-time {
      font-size: 11px;
      color: #666;
      margin-top: 4px;
    }

    /* ROCOF */
    .rocof-card canvas {
      height: 200px !important;
      margin-bottom: 16px;
    }

    .rocof-stats {
      display: flex;
      justify-content: space-around;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .rocof-item {
      text-align: center;
    }

    .rocof-item span {
      display: block;
      font-size: 12px;
      color: #999;
      margin-bottom: 4px;
    }

    .rocof-item strong {
      font-size: 18px;
    }

    /* Spectral Analysis */
    .spectral-card canvas {
      height: 250px !important;
      margin-bottom: 20px;
    }

    .spectral-components h4 {
      margin: 0 0 16px 0;
      color: #00d4ff;
      font-size: 14px;
    }

    .mode-type {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .mode-type.inter-area {
      background: rgba(244, 67, 54, 0.2);
      color: #f44336;
    }

    .mode-type.local {
      background: rgba(255, 152, 0, 0.2);
      color: #ff9800;
    }

    .mode-type.control {
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
    }

    /* Oscillations */
    .oscillation-card canvas {
      height: 200px !important;
    }

    .oscillation-alert {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: rgba(255, 152, 0, 0.1);
      border: 1px solid rgba(255, 152, 0, 0.3);
      border-radius: 8px;
      margin-top: 16px;
      color: #ff9800;
    }

    /* Distribution */
    .distribution-card canvas {
      height: 200px !important;
      margin-bottom: 16px;
    }

    .distribution-stats {
      display: flex;
      justify-content: space-around;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .dist-item {
      text-align: center;
    }

    .dist-item span {
      display: block;
      font-size: 12px;
      color: #999;
      margin-bottom: 4px;
    }

    .dist-item strong {
      font-size: 16px;
      color: #00d4ff;
    }

    /* Controls */
    .analysis-controls {
      display: flex;
      justify-content: center;
      gap: 16px;
      padding: 20px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
    }

    mat-progress-spinner {
      display: inline-block;
      margin-left: 8px;
    }
  `]
})
export class FrequencyAnalysisComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('frequencyChart') frequencyChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('rocofChart') rocofChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('spectralChart') spectralChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('oscillationChart') oscillationChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('distributionChart') distributionChartCanvas!: ElementRef<HTMLCanvasElement>;
  
  private destroy$ = new Subject<void>();
  private frequencyChart?: Chart;
  private rocofChart?: Chart;
  private spectralChart?: Chart;
  private oscillationChart?: Chart;
  private distributionChart?: Chart;
  
  // Data buffers
  private frequencyBuffer: { time: Date; frequencies: Map<number, number> }[] = [];
  private rocofBuffer: { time: Date; rocofs: Map<number, number> }[] = [];
  private maxBufferSize = 3600; // 1 hour at 1Hz
  
  // Analysis parameters
  timeWindow = 300; // seconds
  showAllPmus = false;
  isPaused = false;
  isAnalyzing = false;
  
  // Statistics
  statistics: FrequencyStatistics = {
    mean: 60.0,
    median: 60.0,
    stdDev: 0.0,
    min: 60.0,
    max: 60.0,
    rms: 60.0,
    skewness: 0.0,
    kurtosis: 0.0
  };
  
  // ROCOF data
  currentRocof = 0.0;
  maxRocof = 0.0;
  rocofEvents = 0;
  
  // Frequency extremes
  nadir = 60.0;
  nadirTime = '';
  minTime = '';
  maxTime = '';
  
  // Spectral analysis
  spectralComponents: SpectralComponent[] = [];
  displayedColumns = ['frequency', 'amplitude', 'damping', 'type'];
  
  // Oscillation detection
  hasOscillation = false;
  oscillationFrequency = 0.0;
  
  // Compliance
  compliancePercentage = 100;
  
  constructor(private pmuDataService: PmuDataService) {}
  
  ngOnInit(): void {
    this.subscribeToData();
  }
  
  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeCharts();
    }, 100);
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    this.frequencyChart?.destroy();
    this.rocofChart?.destroy();
    this.spectralChart?.destroy();
    this.oscillationChart?.destroy();
    this.distributionChart?.destroy();
  }
  
  private subscribeToData(): void {
    // Subscribe to PMU data stream
    this.pmuDataService.getPmuDataStream()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        if (!this.isPaused) {
          this.processFrequencyData(data);
        }
      });
    
    // Subscribe to system state
    this.pmuDataService.getSystemState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.updateSystemFrequency(state.avgFrequency);
      });
    
    // Periodic analysis
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.isPaused) {
          this.updateStatistics();
          this.updateCharts();
          this.detectOscillations();
        }
      });
  }
  
  private processFrequencyData(pmuData: any): void {
    const now = new Date();
    
    // Add to frequency buffer
    let currentEntry = this.frequencyBuffer.find(
      entry => Math.abs(entry.time.getTime() - now.getTime()) < 100
    );
    
    if (!currentEntry) {
      currentEntry = { time: now, frequencies: new Map() };
      this.frequencyBuffer.push(currentEntry);
    }
    
    currentEntry.frequencies.set(pmuData.pmuId, pmuData.frequency);
    
    // Add to ROCOF buffer
    let rocofEntry = this.rocofBuffer.find(
      entry => Math.abs(entry.time.getTime() - now.getTime()) < 100
    );
    
    if (!rocofEntry) {
      rocofEntry = { time: now, rocofs: new Map() };
      this.rocofBuffer.push(rocofEntry);
    }
    
    rocofEntry.rocofs.set(pmuData.pmuId, pmuData.rocof);
    
    // Update current ROCOF
    this.currentRocof = pmuData.rocof;
    if (Math.abs(pmuData.rocof) > Math.abs(this.maxRocof)) {
      this.maxRocof = pmuData.rocof;
    }
    
    // Count ROCOF events
    if (Math.abs(pmuData.rocof) > 1.0) {
      this.rocofEvents++;
    }
    
    // Track nadir
    if (pmuData.frequency < this.nadir) {
      this.nadir = pmuData.frequency;
      this.nadirTime = now.toLocaleTimeString();
    }
    
    // Maintain buffer size
    const cutoffTime = new Date(now.getTime() - this.maxBufferSize * 1000);
    this.frequencyBuffer = this.frequencyBuffer.filter(entry => entry.time > cutoffTime);
    this.rocofBuffer = this.rocofBuffer.filter(entry => entry.time > cutoffTime);
  }
  
  private updateSystemFrequency(avgFrequency: number): void {
    // Update statistics with system average
    const recentData = this.getRecentData(this.timeWindow);
    if (recentData.length > 0) {
      this.statistics = this.calculateStatistics(recentData);
    }
  }
  
  private getRecentData(windowSeconds: number): number[] {
    const cutoff = new Date(Date.now() - windowSeconds * 1000);
    const frequencies: number[] = [];
    
    this.frequencyBuffer
      .filter(entry => entry.time > cutoff)
      .forEach(entry => {
        const avgFreq = Array.from(entry.frequencies.values())
          .reduce((sum, f) => sum + f, 0) / entry.frequencies.size;
        frequencies.push(avgFreq);
      });
    
    return frequencies;
  }
  
  private calculateStatistics(data: number[]): FrequencyStatistics {
    if (data.length === 0) {
      return this.statistics;
    }
    
    // Basic statistics
    const sorted = [...data].sort((a, b) => a - b);
    const n = data.length;
    const mean = data.reduce((sum, x) => sum + x, 0) / n;
    const median = n % 2 === 0 ? 
      (sorted[n/2 - 1] + sorted[n/2]) / 2 : 
      sorted[Math.floor(n/2)];
    
    // Standard deviation
    const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    // RMS
    const rms = Math.sqrt(data.reduce((sum, x) => sum + x * x, 0) / n);
    
    // Skewness
    const skewness = n > 2 ? 
      data.reduce((sum, x) => sum + Math.pow((x - mean) / stdDev, 3), 0) / n : 0;
    
    // Kurtosis
    const kurtosis = n > 3 ? 
      data.reduce((sum, x) => sum + Math.pow((x - mean) / stdDev, 4), 0) / n - 3 : 0;
    
    // Min/Max with timestamps
    const minIndex = data.indexOf(Math.min(...data));
    const maxIndex = data.indexOf(Math.max(...data));
    
    if (minIndex >= 0 && minIndex < this.frequencyBuffer.length) {
      this.minTime = this.frequencyBuffer[minIndex].time.toLocaleTimeString();
    }
    
    if (maxIndex >= 0 && maxIndex < this.frequencyBuffer.length) {
      this.maxTime = this.frequencyBuffer[maxIndex].time.toLocaleTimeString();
    }
    
    return {
      mean,
      median,
      stdDev,
      min: Math.min(...data),
      max: Math.max(...data),
      rms,
      skewness,
      kurtosis
    };
  }
  
  private initializeCharts(): void {
    this.initializeFrequencyChart();
    this.initializeRocofChart();
    this.initializeSpectralChart();
    this.initializeOscillationChart();
    this.initializeDistributionChart();
  }
  
  private initializeFrequencyChart(): void {
    const ctx = this.frequencyChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    
    this.frequencyChart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: []
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { 
              color: '#999',
              usePointStyle: true,
              font: { size: 11 }
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(26, 26, 26, 0.95)',
            titleColor: '#00d4ff',
            callbacks: {
              label: (context: any) => {
                return `${context.dataset.label}: ${context.parsed.y.toFixed(4)} Hz`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              displayFormats: {
                second: 'HH:mm:ss',
                minute: 'HH:mm'
              }
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#666' }
          },
          y: {
            min: 59.5,
            max: 60.5,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#666',
              callback: (value: any) => `${value} Hz`
            }
          }
        }
      }
    });
  }
  
  private initializeRocofChart(): void {
    const ctx = this.rocofChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    
    this.rocofChart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: 'ROCOF',
          data: [],
          borderColor: '#ff9800',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(26, 26, 26, 0.95)',
            callbacks: {
              label: (context: any) => `${context.parsed.y.toFixed(3)} Hz/s`
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#666' }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#666',
              callback: (value: any) => `${value} Hz/s`
            }
          }
        }
      }
    });
  }
  
  private initializeSpectralChart(): void {
    const ctx = this.spectralChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    
    this.spectralChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Power Spectral Density',
          data: [],
          backgroundColor: 'rgba(0, 212, 255, 0.5)',
          borderColor: '#00d4ff',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(26, 26, 26, 0.95)',
            callbacks: {
              label: (context: any) => `${context.parsed.y.toFixed(6)} Hz²`
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Frequency (Hz)',
              color: '#999'
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#666' }
          },
          y: {
            type: 'logarithmic',
            title: {
              display: true,
              text: 'PSD',
              color: '#999'
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#666' }
          }
        }
      }
    });
  }
  
  private initializeOscillationChart(): void {
    const ctx = this.oscillationChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    
    this.oscillationChart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: []
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#999' }
          }
        },
        scales: {
          x: {
            type: 'time',
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#666' }
          },
          y: {
            title: {
              display: true,
              text: 'Frequency Deviation (mHz)',
              color: '#999'
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#666' }
          }
        }
      }
    });
  }
  
  private initializeDistributionChart(): void {
    const ctx = this.distributionChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    
    this.distributionChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Frequency Distribution',
          data: [],
          backgroundColor: 'rgba(76, 175, 80, 0.5)',
          borderColor: '#4caf50',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(26, 26, 26, 0.95)',
            callbacks: {
              label: (context: any) => `Count: ${context.parsed.y}`
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Frequency (Hz)',
              color: '#999'
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#666' }
          },
          y: {
            title: {
              display: true,
              text: 'Count',
              color: '#999'
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#666' }
          }
        }
      }
    });
  }
  
  private updateStatistics(): void {
    const recentData = this.getRecentData(this.timeWindow);
    if (recentData.length > 0) {
      this.statistics = this.calculateStatistics(recentData);
      
      // Calculate compliance
      const withinBounds = recentData.filter(f => Math.abs(f - 60.0) <= 0.05).length;
      this.compliancePercentage = (withinBounds / recentData.length) * 100;
    }
  }
  
  private updateCharts(): void {
    this.updateFrequencyChart();
    this.updateRocofChart();
    this.updateDistributionChart();
  }
  
  private updateFrequencyChart(): void {
    if (!this.frequencyChart) return;
    
    const cutoff = new Date(Date.now() - this.timeWindow * 1000);
    const datasets: any[] = [];
    
    if (this.showAllPmus) {
      // Show individual PMU traces
      const pmuIds = new Set<number>();
      this.frequencyBuffer.forEach(entry => {
        entry.frequencies.forEach((_, id) => pmuIds.add(id));
      });
      
      pmuIds.forEach(pmuId => {
        const data = this.frequencyBuffer
          .filter(entry => entry.time > cutoff && entry.frequencies.has(pmuId))
          .map(entry => ({
            x: entry.time,
            y: entry.frequencies.get(pmuId)
          }));
        
        if (data.length > 0) {
          datasets.push({
            label: `PMU ${pmuId}`,
            data,
            borderColor: this.getPmuColor(pmuId),
            backgroundColor: 'transparent',
            borderWidth: 1,
            pointRadius: 0,
            tension: 0.1
          });
        }
      });
    } else {
      // Show system average
      const avgData = this.frequencyBuffer
        .filter(entry => entry.time > cutoff)
        .map(entry => {
          const frequencies = Array.from(entry.frequencies.values());
          const avg = frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length;
          return { x: entry.time, y: avg };
        });
      
      datasets.push({
        label: 'System Average',
        data: avgData,
        borderColor: '#00d4ff',
        backgroundColor: 'rgba(0, 212, 255, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
        fill: true
      });
    }
    
    // Add reference lines
    const timeRange = this.frequencyBuffer
      .filter(entry => entry.time > cutoff)
      .map(entry => entry.time);
    
    if (timeRange.length > 0) {
      datasets.push({
        label: 'Nominal',
        data: [
          { x: timeRange[0], y: 60 },
          { x: timeRange[timeRange.length - 1], y: 60 }
        ],
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderDash: [5, 5],
        borderWidth: 1,
        pointRadius: 0,
        fill: false
      });
    }
    
    this.frequencyChart.data.datasets = datasets;
    this.frequencyChart.update('none');
  }
  
  private updateRocofChart(): void {
    if (!this.rocofChart) return;
    
    const cutoff = new Date(Date.now() - this.timeWindow * 1000);
    const rocofData = this.rocofBuffer
      .filter(entry => entry.time > cutoff)
      .map(entry => {
        const rocofs = Array.from(entry.rocofs.values());
        const avg = rocofs.reduce((sum, r) => sum + r, 0) / rocofs.length;
        return { x: entry.time, y: avg };
      });
    
    this.rocofChart.data.datasets[0].data = rocofData;
    this.rocofChart.update('none');
  }
  
  private updateDistributionChart(): void {
    if (!this.distributionChart) return;
    
    const frequencies = this.getRecentData(this.timeWindow);
    if (frequencies.length === 0) return;
    
    // Create histogram bins
    const binSize = 0.01; // 10 mHz bins
    const minFreq = Math.floor(Math.min(...frequencies) / binSize) * binSize;
    const maxFreq = Math.ceil(Math.max(...frequencies) / binSize) * binSize;
    
    const bins = new Map<number, number>();
    for (let bin = minFreq; bin <= maxFreq; bin += binSize) {
      bins.set(bin, 0);
    }
    
    frequencies.forEach(freq => {
      const bin = Math.floor(freq / binSize) * binSize;
      bins.set(bin, (bins.get(bin) || 0) + 1);
    });
    
    const labels = Array.from(bins.keys()).map(bin => bin.toFixed(3));
    const data = Array.from(bins.values());
    
    this.distributionChart.data.labels = labels;
    this.distributionChart.data.datasets[0].data = data;
    this.distributionChart.update('none');
  }
  
  private detectOscillations(): void {
    // Simple oscillation detection using frequency deviation
    const recentData = this.getRecentData(30); // Last 30 seconds
    if (recentData.length < 30) return;
    
    // Calculate frequency deviations
    const deviations = recentData.map(f => f - 60.0);
    
    // Perform simple FFT to find dominant frequencies
    const fftResult = this.performFFT(deviations);
    
    // Find peaks in spectrum
    const peaks = this.findSpectralPeaks(fftResult);
    
    if (peaks.length > 0 && peaks[0].amplitude > 0.01) {
      this.hasOscillation = true;
      this.oscillationFrequency = peaks[0].frequency;
      
      // Update oscillation chart
      this.updateOscillationChart(deviations);
    } else {
      this.hasOscillation = false;
    }
  }
  
  private performFFT(data: number[]): { frequency: number; amplitude: number }[] {
    // Simplified FFT implementation for demonstration
    const n = data.length;
    const frequencies: { frequency: number; amplitude: number }[] = [];
    
    for (let k = 0; k < n / 2; k++) {
      const frequency = k / n; // Normalized frequency
      let real = 0;
      let imag = 0;
      
      for (let i = 0; i < n; i++) {
        const angle = 2 * Math.PI * k * i / n;
        real += data[i] * Math.cos(angle);
        imag -= data[i] * Math.sin(angle);
      }
      
      const amplitude = Math.sqrt(real * real + imag * imag) / n;
      frequencies.push({ frequency: frequency * 30, amplitude }); // Convert to Hz (30 samples/sec)
    }
    
    return frequencies;
  }
  
  private findSpectralPeaks(spectrum: { frequency: number; amplitude: number }[]): SpectralComponent[] {
    const peaks: SpectralComponent[] = [];
    
    for (let i = 1; i < spectrum.length - 1; i++) {
      if (spectrum[i].amplitude > spectrum[i - 1].amplitude &&
          spectrum[i].amplitude > spectrum[i + 1].amplitude &&
          spectrum[i].amplitude > 0.001) {
        
        // Estimate damping from peak width
        const damping = this.estimateDamping(spectrum, i);
        
        peaks.push({
          frequency: spectrum[i].frequency,
          amplitude: spectrum[i].amplitude,
          phase: 0, // Phase calculation omitted for simplicity
          damping
        });
      }
    }
    
    return peaks.sort((a, b) => b.amplitude - a.amplitude);
  }
  
  private estimateDamping(spectrum: any[], peakIndex: number): number {
    // Simplified damping estimation from peak width
    const peakAmplitude = spectrum[peakIndex].amplitude;
    const halfPower = peakAmplitude / Math.sqrt(2);
    
    let leftIndex = peakIndex;
    let rightIndex = peakIndex;
    
    while (leftIndex > 0 && spectrum[leftIndex].amplitude > halfPower) leftIndex--;
    while (rightIndex < spectrum.length - 1 && spectrum[rightIndex].amplitude > halfPower) rightIndex++;
    
    const bandwidth = spectrum[rightIndex].frequency - spectrum[leftIndex].frequency;
    const damping = bandwidth / (2 * spectrum[peakIndex].frequency) * 100;
    
    return Math.min(Math.max(damping, 0), 20); // Limit to 0-20%
  }
  
  private updateOscillationChart(deviations: number[]): void {
    if (!this.oscillationChart) return;
    
    const times = this.frequencyBuffer
      .slice(-deviations.length)
      .map(entry => entry.time);
    
    const data = times.map((time, i) => ({
      x: time,
      y: deviations[i] * 1000 // Convert to mHz
    }));
    
    this.oscillationChart.data.datasets = [{
      label: 'Frequency Deviation',
      data,
      borderColor: '#ff9800',
      backgroundColor: 'rgba(255, 152, 0, 0.1)',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.1
    }];
    
    this.oscillationChart.update('none');
  }
  
  private getPmuColor(pmuId: number): string {
    const colors = [
      '#00d4ff', '#ff9800', '#4caf50', '#f44336', '#9c27b0',
      '#3f51b5', '#009688', '#ffeb3b', '#795548', '#607d8b'
    ];
    return colors[pmuId % colors.length];
  }
  
  // Control methods
  updateTimeWindow(): void {
    this.updateCharts();
  }
  
  pauseChart(): void {
    this.isPaused = !this.isPaused;
  }
  
  runFFT(): void {
    const frequencies = this.getRecentData(60); // Last minute
    const deviations = frequencies.map(f => f - 60.0);
    
    const fftResult = this.performFFT(deviations);
    this.spectralComponents = this.findSpectralPeaks(fftResult);
    
    // Update spectral chart
    if (this.spectralChart) {
      this.spectralChart.data.labels = fftResult.map(r => r.frequency.toFixed(2));
      this.spectralChart.data.datasets[0].data = fftResult.map(r => r.amplitude);
      this.spectralChart.update();
    }
  }
  
  async runModalAnalysis(): Promise<void> {
  this.isAnalyzing = true;
  
  try {
    // Use firstValueFrom instead of toPromise()
    const result = await firstValueFrom(this.pmuDataService.performModalAnalysis());
    console.log('Modal analysis result:', result);
    
    // Process and display results
    if (result && result.modes) {
      this.spectralComponents = result.modes.map((mode: any) => ({
        frequency: mode.frequency,
        amplitude: 0.01, // Placeholder
        phase: 0,
        damping: mode.damping * 100
      }));
    }
  } catch (error) {
    console.error('Modal analysis failed:', error);
  } finally {
    this.isAnalyzing = false;
  }
}
  
  exportData(): void {
    // Prepare data for export
    const data = this.frequencyBuffer.map(entry => {
      const avgFreq = Array.from(entry.frequencies.values())
        .reduce((sum, f) => sum + f, 0) / entry.frequencies.size;
      
      return {
        timestamp: entry.time.toISOString(),
        frequency: avgFreq,
        min: Math.min(...Array.from(entry.frequencies.values())),
        max: Math.max(...Array.from(entry.frequencies.values())),
        stdDev: this.calculateStdDev(Array.from(entry.frequencies.values()))
      };
    });
    
    // Convert to CSV
    const csv = this.convertToCSV(data);
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frequency_data_${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
  
  private calculateStdDev(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
  
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');
    
    return csv;
  }
  
  generateReport(): void {
    console.log('Generating frequency analysis report...');
    // Implement report generation
  }
  
  // Helper methods
  getStdDevPercentage(): number {
    return Math.min(100, (this.statistics.stdDev / 0.05) * 100);
  }
  
  getStdDevColor(): 'primary' | 'accent' | 'warn' {
    if (this.statistics.stdDev < 0.01) return 'primary';
    if (this.statistics.stdDev < 0.03) return 'accent';
    return 'warn';
  }
  
  getRocofColor(rocof: number): string {
    const absRocof = Math.abs(rocof);
    if (absRocof < 0.5) return '#4caf50';
    if (absRocof < 1.0) return '#ff9800';
    return '#f44336';
  }
  
  getDampingColor(damping: number): string {
    if (damping > 10) return '#4caf50';
    if (damping > 5) return '#ff9800';
    return '#f44336';
  }
  
  getModeType(frequency: number): string {
    if (frequency < 0.1) return 'inter-area';
    if (frequency < 1.0) return 'local';
    return 'control';
  }
}
