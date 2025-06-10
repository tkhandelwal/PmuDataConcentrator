// pmudataconcentrator.client/src/app/features/analytics/voltage-stability.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field'; // Add this
import { MatSliderModule } from '@angular/material/slider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Subject, takeUntil } from 'rxjs';
import { PmuDataService } from '../../core/services/pmu-data.service';

Chart.register(...registerables);

interface VoltageStabilityIndex {
  timestamp: Date;
  vsi: number;
  lmpi: number;
  fvsi: number;
  vcpi: number;
}

interface BusVoltage {
  busId: number;
  voltage: number;
  angle: number;
  deviation: number;
  stability: 'stable' | 'marginal' | 'critical';
}

@Component({
  selector: 'app-voltage-stability',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatSliderModule,
    MatProgressBarModule
  ],
  template: `
    <div class="voltage-stability-container">
      <mat-tab-group>
        <!-- Real-time Monitoring Tab -->
        <mat-tab label="Real-time Monitoring">
          <div class="monitoring-grid">
            <!-- VSI Gauge -->
            <mat-card class="vsi-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>speed</mat-icon>
                  Voltage Stability Index (VSI)
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="gauge-container">
                  <canvas #vsiGauge></canvas>
                  <div class="gauge-value">{{ currentVSI | number:'1.3-3' }}</div>
                  <div class="gauge-label">{{ getStabilityStatus() }}</div>
                </div>
                <div class="stability-indicators">
                  <div class="indicator" [class.active]="currentVSI > 0.7">
                    <mat-icon>check_circle</mat-icon>
                    <span>Stable</span>
                  </div>
                  <div class="indicator" [class.active]="currentVSI <= 0.7 && currentVSI > 0.3">
                    <mat-icon>warning</mat-icon>
                    <span>Marginal</span>
                  </div>
                  <div class="indicator" [class.active]="currentVSI <= 0.3">
                    <mat-icon>error</mat-icon>
                    <span>Critical</span>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Voltage Profile -->
            <mat-card class="voltage-profile-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>show_chart</mat-icon>
                  System Voltage Profile
                </mat-card-title>
                <button mat-icon-button (click)="toggleVoltageView()">
                  <mat-icon>{{ showPU ? 'percent' : 'electric_bolt' }}</mat-icon>
                </button>
              </mat-card-header>
              <mat-card-content>
                <canvas #voltageProfile></canvas>
              </mat-card-content>
            </mat-card>

            <!-- Stability Indices -->
            <mat-card class="indices-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>analytics</mat-icon>
                  Stability Indices
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="index-item">
                  <span class="index-label">L-Index (LMPI)</span>
                  <div class="index-bar">
                    <mat-progress-bar 
                      mode="determinate" 
                      [value]="currentLMPI * 100"
                      [color]="getIndexColor(currentLMPI)">
                    </mat-progress-bar>
                  </div>
                  <span class="index-value">{{ currentLMPI | number:'1.3-3' }}</span>
                </div>
                
                <div class="index-item">
                  <span class="index-label">Fast VSI (FVSI)</span>
                  <div class="index-bar">
                    <mat-progress-bar 
                      mode="determinate" 
                      [value]="currentFVSI * 100"
                      [color]="getIndexColor(currentFVSI)">
                    </mat-progress-bar>
                  </div>
                  <span class="index-value">{{ currentFVSI | number:'1.3-3' }}</span>
                </div>
                
                <div class="index-item">
                  <span class="index-label">V-Q Sensitivity</span>
                  <div class="index-bar">
                    <mat-progress-bar 
                      mode="determinate" 
                      [value]="vqSensitivity * 100"
                      [color]="getIndexColor(vqSensitivity)">
                    </mat-progress-bar>
                  </div>
                  <span class="index-value">{{ vqSensitivity | number:'1.3-3' }}</span>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Critical Buses -->
            <mat-card class="critical-buses-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>warning</mat-icon>
                  Critical Buses
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="bus-list">
                  <div *ngFor="let bus of criticalBuses" 
                       class="bus-item"
                       [class.critical]="bus.stability === 'critical'"
                       [class.marginal]="bus.stability === 'marginal'">
                    <div class="bus-info">
                      <span class="bus-name">Bus {{ bus.busId }}</span>
                      <span class="bus-voltage">{{ bus.voltage | number:'1.3-3' }} p.u.</span>
                    </div>
                    <div class="bus-status">
                      <mat-icon [style.color]="getBusStatusColor(bus)">
                        {{ getBusStatusIcon(bus) }}
                      </mat-icon>
                      <span class="deviation">{{ bus.deviation > 0 ? '+' : '' }}{{ bus.deviation | number:'1.1-1' }}%</span>
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- PV Curve Analysis Tab -->
        <mat-tab label="P-V Curve Analysis">
          <div class="pv-analysis">
            <div class="pv-controls">
              <mat-form-field>
                <mat-label>Select Bus</mat-label>
                <mat-select [(value)]="selectedBus">
                  <mat-option *ngFor="let bus of availableBuses" [value]="bus">
                    Bus {{ bus }}
                  </mat-option>
                </mat-select>
              </mat-form-field>
              
              <mat-slider
                min="0"
                max="200"
                step="10"
                [(value)]="loadingLevel"
                thumbLabel>
              </mat-slider>
              <span>Loading: {{ loadingLevel }}%</span>
              
              <button mat-raised-button color="primary" (click)="runPVAnalysis()">
                <mat-icon>play_arrow</mat-icon>
                Run Analysis
              </button>
            </div>
            
            <div class="pv-chart-container">
              <canvas #pvCurve></canvas>
            </div>
            
            <div class="pv-results">
              <div class="result-item">
                <span>Critical Point:</span>
                <strong>{{ criticalPoint.power | number:'1.0-0' }} MW @ {{ criticalPoint.voltage | number:'1.3-3' }} p.u.</strong>
              </div>
              <div class="result-item">
                <span>Margin:</span>
                <strong [style.color]="getMarginColor()">{{ loadingMargin | number:'1.1-1' }}%</strong>
              </div>
              <div class="result-item">
                <span>Nose Point:</span>
                <strong>{{ nosePoint.voltage | number:'1.3-3' }} p.u.</strong>
              </div>
            </div>
          </div>
        </mat-tab>

        <!-- Contingency Analysis Tab -->
        <mat-tab label="Contingency Analysis">
          <div class="contingency-analysis">
            <mat-card>
              <mat-card-header>
                <mat-card-title>N-1 Contingency Screening</mat-card-title>
                <button mat-button (click)="runContingencyAnalysis()">
                  <mat-icon>refresh</mat-icon>
                  Run Analysis
                </button>
              </mat-card-header>
              <mat-card-content>
                <div class="contingency-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Contingency</th>
                        <th>Type</th>
                        <th>VSI Impact</th>
                        <th>Voltage Violations</th>
                        <th>Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let cont of contingencyResults" 
                          [class.severe]="cont.severity === 'severe'"
                          [class.moderate]="cont.severity === 'moderate'">
                        <td>{{ cont.name }}</td>
                        <td>{{ cont.type }}</td>
                        <td>{{ cont.vsiImpact | number:'1.3-3' }}</td>
                        <td>{{ cont.violations }}</td>
                        <td>
                          <span class="severity-badge" [class]="cont.severity">
                            {{ cont.severity }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Historical Trends Tab -->
        <mat-tab label="Historical Trends">
          <div class="historical-trends">
            <canvas #historicalChart></canvas>
            <div class="trend-stats">
              <div class="stat">
                <mat-icon>trending_down</mat-icon>
                <span>Min VSI: {{ minVSI | number:'1.3-3' }}</span>
              </div>
              <div class="stat">
                <mat-icon>trending_up</mat-icon>
                <span>Max VSI: {{ maxVSI | number:'1.3-3' }}</span>
              </div>
              <div class="stat">
                <mat-icon>functions</mat-icon>
                <span>Avg VSI: {{ avgVSI | number:'1.3-3' }}</span>
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .voltage-stability-container {
      height: 100%;
      padding: 20px;
    }

    .monitoring-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      padding: 20px;
    }

    @media (max-width: 1200px) {
      .monitoring-grid {
        grid-template-columns: 1fr;
      }
    }

    mat-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    mat-card-header {
      margin-bottom: 16px;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
    }

    mat-card-title mat-icon {
      color: #00d4ff;
    }

    /* VSI Gauge Styles */
    .gauge-container {
      position: relative;
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .gauge-value {
      position: absolute;
      font-size: 36px;
      font-weight: 700;
      color: #00d4ff;
    }

    .gauge-label {
      position: absolute;
      bottom: 20px;
      font-size: 14px;
      color: #999;
      text-transform: uppercase;
    }

    .stability-indicators {
      display: flex;
      justify-content: space-around;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      opacity: 0.3;
      transition: all 0.3s ease;
    }

    .indicator.active {
      opacity: 1;
    }

    .indicator mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .indicator:nth-child(1).active mat-icon { color: #4caf50; }
    .indicator:nth-child(2).active mat-icon { color: #ff9800; }
    .indicator:nth-child(3).active mat-icon { color: #f44336; }

    /* Voltage Profile */
    .voltage-profile-card canvas {
      height: 250px !important;
    }

    /* Stability Indices */
    .index-item {
      margin-bottom: 20px;
    }

    .index-item:last-child {
      margin-bottom: 0;
    }

    .index-label {
      display: block;
      font-size: 12px;
      color: #999;
      margin-bottom: 8px;
      text-transform: uppercase;
    }

    .index-bar {
      position: relative;
      margin-bottom: 4px;
    }

    .index-value {
      display: block;
      text-align: right;
      font-size: 14px;
      font-weight: 600;
      color: #00d4ff;
    }

    /* Critical Buses */
    .bus-list {
      max-height: 300px;
      overflow-y: auto;
    }

    .bus-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      margin-bottom: 8px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      transition: all 0.3s ease;
    }

    .bus-item:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(0, 212, 255, 0.3);
    }

    .bus-item.marginal {
      border-color: rgba(255, 152, 0, 0.3);
      background: rgba(255, 152, 0, 0.05);
    }

    .bus-item.critical {
      border-color: rgba(244, 67, 54, 0.3);
      background: rgba(244, 67, 54, 0.05);
    }

    .bus-info {
      display: flex;
      flex-direction: column;
    }

    .bus-name {
      font-weight: 500;
      color: #e0e0e0;
    }

    .bus-voltage {
      font-size: 12px;
      color: #999;
    }

    .bus-status {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .deviation {
      font-size: 14px;
      font-weight: 600;
    }

    /* PV Analysis */
    .pv-analysis {
      padding: 20px;
    }

    .pv-controls {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 20px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
    }

    .pv-chart-container {
      height: 400px;
      margin-bottom: 20px;
    }

    .pv-results {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .result-item {
      padding: 16px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
      text-align: center;
    }

    .result-item span {
      display: block;
      font-size: 12px;
      color: #999;
      margin-bottom: 8px;
    }

    .result-item strong {
      font-size: 18px;
      color: #00d4ff;
    }

    /* Contingency Analysis */
    .contingency-analysis {
      padding: 20px;
    }

    .contingency-table {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      text-align: left;
      padding: 12px;
      background: rgba(0, 212, 255, 0.1);
      border-bottom: 2px solid rgba(0, 212, 255, 0.3);
      font-weight: 600;
      color: #00d4ff;
    }

    td {
      padding: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    tr:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    tr.moderate {
      background: rgba(255, 152, 0, 0.05);
    }

    tr.severe {
      background: rgba(244, 67, 54, 0.05);
    }

    .severity-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .severity-badge.low {
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
    }

    .severity-badge.moderate {
      background: rgba(255, 152, 0, 0.2);
      color: #ff9800;
    }

    .severity-badge.severe {
      background: rgba(244, 67, 54, 0.2);
      color: #f44336;
    }

    /* Historical Trends */
    .historical-trends {
      padding: 20px;
    }

    .trend-stats {
      display: flex;
      justify-content: space-around;
      margin-top: 20px;
      padding: 20px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .stat mat-icon {
      color: #00d4ff;
    }
  `]
})
export class VoltageStabilityComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('vsiGauge') vsiGaugeCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('voltageProfile') voltageProfileCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pvCurve') pvCurveCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('historicalChart') historicalCanvas!: ElementRef<HTMLCanvasElement>;
  
  private destroy$ = new Subject<void>();
  private vsiGaugeChart?: Chart;
  private voltageProfileChart?: Chart;
  private pvCurveChart?: Chart;
  private historicalChart?: Chart;
  
  // Real-time data
  currentVSI = 0.85;
  currentLMPI = 0.12;
  currentFVSI = 0.18;
  vqSensitivity = 0.25;
  
  // Bus data
  busVoltages: BusVoltage[] = [];
  criticalBuses: BusVoltage[] = [];
  availableBuses = Array.from({length: 118}, (_, i) => i + 1);
  
  // PV Analysis
  selectedBus = 1;
  loadingLevel = 100;
  criticalPoint = { power: 1250, voltage: 0.92 };
  nosePoint = { voltage: 0.88 };
  loadingMargin = 25;
  
  // Contingency Analysis
  contingencyResults = [
    { name: 'Line 1-2', type: 'Line Outage', vsiImpact: 0.152, violations: 3, severity: 'severe' },
    { name: 'Gen Bus 10', type: 'Generator Trip', vsiImpact: 0.098, violations: 1, severity: 'moderate' },
    { name: 'Line 5-6', type: 'Line Outage', vsiImpact: 0.045, violations: 0, severity: 'low' },
    { name: 'Line 15-16', type: 'Line Outage', vsiImpact: 0.123, violations: 2, severity: 'moderate' },
    { name: 'Gen Bus 25', type: 'Generator Trip', vsiImpact: 0.178, violations: 4, severity: 'severe' }
  ];
  
  // Historical data
  minVSI = 0.68;
  maxVSI = 0.95;
  avgVSI = 0.82;
  
  // View options
  showPU = true;
  
  constructor(private pmuDataService: PmuDataService) {}
  
  ngOnInit(): void {
    this.subscribeToRealTimeData();
    this.generateBusData();
  }
  
  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeCharts();
    }, 100);
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    this.vsiGaugeChart?.destroy();
    this.voltageProfileChart?.destroy();
    this.pvCurveChart?.destroy();
    this.historicalChart?.destroy();
  }
  
  private subscribeToRealTimeData(): void {
    this.pmuDataService.getPmuDataStream()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.updateVoltageStabilityIndices(data);
      });
  }
  
  private generateBusData(): void {
    // Generate sample bus voltage data
    this.busVoltages = Array.from({length: 20}, (_, i) => {
      const voltage = 0.95 + Math.random() * 0.1;
      const angle = -30 + Math.random() * 60;
      const deviation = (voltage - 1.0) * 100;
      
      return {
        busId: i + 1,
        voltage,
        angle,
        deviation,
        stability: deviation > 5 ? 'critical' : deviation > 3 ? 'marginal' : 'stable'
      };
    });
    
    // Identify critical buses
    this.criticalBuses = this.busVoltages
      .filter(bus => bus.stability !== 'stable')
      .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
      .slice(0, 5);
  }
  
  private updateVoltageStabilityIndices(pmuData: any): void {
    // Calculate VSI based on voltage magnitudes and angles
    const voltages = this.extractVoltageData(pmuData);
    
    if (voltages.length > 0) {
      // Simplified VSI calculation
      const avgVoltage = voltages.reduce((sum, v) => sum + v, 0) / voltages.length;
      this.currentVSI = Math.min(1, Math.max(0, avgVoltage));
      
      // Update other indices with some variation
      this.currentLMPI = 1 - this.currentVSI + (Math.random() - 0.5) * 0.1;
      this.currentFVSI = 1 - this.currentVSI + (Math.random() - 0.5) * 0.05;
      this.vqSensitivity = Math.abs(this.currentVSI - 0.5) + (Math.random() - 0.5) * 0.1;
      
      // Update charts
      this.updateCharts();
    }
  }
  
  private extractVoltageData(pmuData: any): number[] {
    if (!pmuData.phasors || pmuData.phasors.length === 0) return [];
    
    return pmuData.phasors
      .filter((p: any) => (p.type === 0 || p.Type === 0))
      .map((p: any) => {
        const magnitude = p.magnitude ?? p.Magnitude ?? 1.0;
        const nominal = 345000; // Assume 345kV nominal
        return magnitude / nominal;
      });
  }
  
  private initializeCharts(): void {
    this.initializeVSIGauge();
    this.initializeVoltageProfile();
    this.initializePVCurve();
    this.initializeHistoricalChart();
  }
  
  private initializeVSIGauge(): void {
    const ctx = this.vsiGaugeCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    
    this.vsiGaugeChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [this.currentVSI, 1 - this.currentVSI],
          backgroundColor: [
            this.getGaugeColor(this.currentVSI),
            'rgba(255, 255, 255, 0.05)'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        circumference: 180,
        rotation: 270,
        cutout: '75%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    });
  }
  
  private initializeVoltageProfile(): void {
    const ctx = this.voltageProfileCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    
    const labels = this.busVoltages.map(bus => `Bus ${bus.busId}`);
    const voltageData = this.busVoltages.map(bus => bus.voltage);
    
    this.voltageProfileChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Voltage (p.u.)',
          data: voltageData,
          borderColor: '#00d4ff',
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.2
        }, {
          label: 'Upper Limit',
          data: Array(labels.length).fill(1.05),
          borderColor: 'rgba(255, 152, 0, 0.5)',
          borderDash: [5, 5],
          borderWidth: 1,
          pointRadius: 0,
          fill: false
        }, {
          label: 'Lower Limit',
          data: Array(labels.length).fill(0.95),
          borderColor: 'rgba(255, 152, 0, 0.5)',
          borderDash: [5, 5],
          borderWidth: 1,
          pointRadius: 0,
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#999' }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(26, 26, 26, 0.95)',
            titleColor: '#00d4ff',
            bodyColor: '#e0e0e0'
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#666', maxRotation: 45 }
          },
          y: {
            min: 0.85,
            max: 1.15,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#666',
              callback: (value: any) => `${value} p.u.`
            }
          }
        }
      }
    });
  }
  
  private initializePVCurve(): void {
    const ctx = this.pvCurveCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    
    // Generate P-V curve data
    const powerData = [];
    const voltageData = [];
    
    for (let p = 0; p <= 150; p += 5) {
      const power = p / 100 * 1000; // MW
      const voltage = this.calculateVoltageForPower(power);
      powerData.push(power);
      voltageData.push(voltage);
    }
    
    this.pvCurveChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: powerData,
        datasets: [{
          label: 'P-V Curve',
          data: voltageData,
          borderColor: '#00d4ff',
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.4,
          fill: true
        }, {
          label: 'Operating Point',
          data: [{x: this.loadingLevel * 10, y: 0.95}],
          borderColor: '#4caf50',
          backgroundColor: '#4caf50',
          pointRadius: 8,
          pointHoverRadius: 10,
          showLine: false
        }, {
          label: 'Critical Point',
          data: [{x: this.criticalPoint.power, y: this.criticalPoint.voltage}],
          borderColor: '#f44336',
          backgroundColor: '#f44336',
          pointRadius: 8,
          pointHoverRadius: 10,
          showLine: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#999' }
          },
          tooltip: {
            mode: 'nearest',
            intersect: false,
            backgroundColor: 'rgba(26, 26, 26, 0.95)',
            callbacks: {
              label: (context: any) => {
                return `${context.parsed.x} MW, ${context.parsed.y.toFixed(3)} p.u.`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            title: {
              display: true,
              text: 'Power (MW)',
              color: '#999'
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#666' }
          },
          y: {
            min: 0.7,
            max: 1.1,
            title: {
              display: true,
              text: 'Voltage (p.u.)',
              color: '#999'
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#666' }
          }
        }
      }
    });
  }
  
  private initializeHistoricalChart(): void {
    const ctx = this.historicalCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    
    // Generate historical data
    const now = new Date();
    const labels = [];
    const vsiData = [];
    const lmpiData = [];
    const fvsiData = [];
    
    for (let i = 24; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 3600000);
      labels.push(time);
      vsiData.push(0.75 + Math.random() * 0.2);
      lmpiData.push(0.1 + Math.random() * 0.2);
      fvsiData.push(0.15 + Math.random() * 0.15);
    }
    
    this.historicalChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'VSI',
          data: vsiData,
          borderColor: '#00d4ff',
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.2
        }, {
          label: 'LMPI',
          data: lmpiData,
          borderColor: '#ff9800',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.2
        }, {
          label: 'FVSI',
          data: fvsiData,
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
            time: {
              unit: 'hour',
              displayFormats: {
                hour: 'HH:mm'
              }
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#666' }
          },
          y: {
            min: 0,
            max: 1,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#666' }
          }
        }
      }
    });
  }
  
  private updateCharts(): void {
    // Update VSI gauge
    if (this.vsiGaugeChart) {
      this.vsiGaugeChart.data.datasets[0].data = [this.currentVSI, 1 - this.currentVSI];
      this.vsiGaugeChart.data.datasets[0].backgroundColor[0] = this.getGaugeColor(this.currentVSI);
      this.vsiGaugeChart.update('none');
    }
    
    // Update other charts as needed
  }
  
  private calculateVoltageForPower(power: number): number {
    // Simplified P-V curve equation
    const pMax = 1500;
    const vNom = 1.0;
    const k = 0.3;
    
    const ratio = power / pMax;
    return vNom * Math.sqrt(1 - k * ratio * ratio);
  }
  
  // Helper methods
  getStabilityStatus(): string {
    if (this.currentVSI > 0.7) return 'STABLE';
    if (this.currentVSI > 0.3) return 'MARGINAL';
    return 'CRITICAL';
  }
  
  getGaugeColor(value: number): string {
    if (value > 0.7) return '#4caf50';
    if (value > 0.3) return '#ff9800';
    return '#f44336';
  }
  
  getIndexColor(value: number): 'primary' | 'accent' | 'warn' {
    if (value < 0.3) return 'primary';
    if (value < 0.7) return 'accent';
    return 'warn';
  }
  
  getBusStatusIcon(bus: BusVoltage): string {
    if (bus.stability === 'stable') return 'check_circle';
    if (bus.stability === 'marginal') return 'warning';
    return 'error';
  }
  
  getBusStatusColor(bus: BusVoltage): string {
    if (bus.stability === 'stable') return '#4caf50';
    if (bus.stability === 'marginal') return '#ff9800';
    return '#f44336';
  }
  
  getMarginColor(): string {
    if (this.loadingMargin > 30) return '#4caf50';
    if (this.loadingMargin > 15) return '#ff9800';
    return '#f44336';
  }
  
  // Control methods
  toggleVoltageView(): void {
    this.showPU = !this.showPU;
    // Update voltage profile chart
  }
  
  runPVAnalysis(): void {
    // Simulate P-V analysis
    console.log(`Running P-V analysis for Bus ${this.selectedBus} at ${this.loadingLevel}% loading`);
    
    // Update results
    this.criticalPoint = {
      power: 1200 + Math.random() * 100,
      voltage: 0.9 + Math.random() * 0.05
    };
    
    this.loadingMargin = 15 + Math.random() * 20;
    
    // Update chart
    if (this.pvCurveChart) {
      this.pvCurveChart.data.datasets[1].data = [{
        x: this.loadingLevel * 10,
        y: 0.95 - (this.loadingLevel - 100) * 0.002
      }];
      this.pvCurveChart.update();
    }
  }
  
  runContingencyAnalysis(): void {
    console.log('Running N-1 contingency analysis...');
    
    // Simulate analysis results
    this.contingencyResults = this.contingencyResults.map(cont => ({
      ...cont,
      vsiImpact: Math.random() * 0.2,
      violations: Math.floor(Math.random() * 5)
    }));
    
    // Sort by severity
    this.contingencyResults.sort((a, b) => b.vsiImpact - a.vsiImpact);
  }
}
