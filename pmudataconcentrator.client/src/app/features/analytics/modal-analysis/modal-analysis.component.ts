// src/app/features/analytics/modal-analysis/modal-analysis.component.ts
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PmuDataService } from '../../../core/services/pmu-data.service';
import { Chart } from 'chart.js';

@Component({
  selector: 'app-modal-analysis',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="modal-analysis-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>psychology</mat-icon>
            Modal Analysis - Small Signal Stability
          </mat-card-title>
          <button mat-button (click)="runAnalysis()" [disabled]="isAnalyzing">
            <mat-icon>play_arrow</mat-icon>
            Run Analysis
            <mat-progress-spinner 
              *ngIf="isAnalyzing"
              mode="indeterminate" 
              diameter="20">
            </mat-progress-spinner>
          </button>
        </mat-card-header>
        
        <mat-card-content>
          <div class="analysis-grid">
            <!-- Eigenvalue Plot -->
            <div class="chart-section">
              <h3>Eigenvalue Distribution</h3>
              <canvas #eigenChart></canvas>
            </div>
            
            <!-- Mode Shape Visualization -->
            <div class="chart-section">
              <h3>Mode Shapes</h3>
              <canvas #modeChart></canvas>
            </div>
            
            <!-- Participation Factors -->
            <div class="table-section">
              <h3>Participation Factors</h3>
              <table mat-table [dataSource]="participationFactors">
                <ng-container matColumnDef="mode">
                  <th mat-header-cell *matHeaderCellDef>Mode</th>
                  <td mat-cell *matCellDef="let element">{{ element.mode }}</td>
                </ng-container>
                
                <ng-container matColumnDef="frequency">
                  <th mat-header-cell *matHeaderCellDef>Frequency (Hz)</th>
                  <td mat-cell *matCellDef="let element">{{ element.frequency | number:'1.3-3' }}</td>
                </ng-container>
                
                <ng-container matColumnDef="damping">
                  <th mat-header-cell *matHeaderCellDef>Damping (%)</th>
                  <td mat-cell *matCellDef="let element">
                    <span [style.color]="getDampingColor(element.damping)">
                      {{ element.damping | number:'1.2-2' }}
                    </span>
                  </td>
                </ng-container>
                
                <ng-container matColumnDef="type">
                  <th mat-header-cell *matHeaderCellDef>Type</th>
                  <td mat-cell *matCellDef="let element">
                    <span class="mode-type" [class]="element.type">{{ element.type }}</span>
                  </td>
                </ng-container>
                
                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>
            </div>
            
            <!-- Critical Modes -->
            <div class="critical-modes">
              <h3>Critical Modes</h3>
              <div class="mode-cards">
                <mat-card *ngFor="let mode of criticalModes" class="mode-card">
                  <mat-card-header>
                    <mat-card-title>Mode {{ mode.id }}</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <p>Frequency: {{ mode.frequency }} Hz</p>
                    <p>Damping: {{ mode.damping }}%</p>
                    <p>Dominant Areas: {{ mode.areas.join(', ') }}</p>
                  </mat-card-content>
                </mat-card>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .modal-analysis-container {
      height: 100%;
      padding: 20px;
      overflow-y: auto;
    }
    
    .analysis-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-top: 20px;
    }
    
    @media (max-width: 1200px) {
      .analysis-grid {
        grid-template-columns: 1fr;
      }
    }
    
    .chart-section, .table-section, .critical-modes {
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
      padding: 20px;
    }
    
    .table-section {
      grid-column: span 2;
    }
    
    .critical-modes {
      grid-column: span 2;
    }
    
    h3 {
      margin: 0 0 16px 0;
      color: #00d4ff;
      font-size: 16px;
    }
    
    canvas {
      max-height: 300px;
    }
    
    .mode-type {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
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
    
    .mode-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 16px;
    }
    
    .mode-card {
      background: rgba(255, 255, 255, 0.02);
    }
  `]
})
export class ModalAnalysisComponent implements OnInit {
  @ViewChild('eigenChart') eigenChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('modeChart') modeChartCanvas!: ElementRef<HTMLCanvasElement>;

  isAnalyzing = false;
  participationFactors: any[] = [];
  criticalModes: any[] = [];
  displayedColumns = ['mode', 'frequency', 'damping', 'type'];

  private eigenChart?: Chart;
  private modeChart?: Chart;

  constructor(private pmuDataService: PmuDataService) { }

  ngOnInit(): void {
    this.generateSampleData();
  }

  ngAfterViewInit(): void {
    this.initializeCharts();
  }

  private initializeCharts(): void {
    // Initialize eigenvalue chart
    const eigenCtx = this.eigenChartCanvas.nativeElement.getContext('2d');
    if (eigenCtx) {
      this.eigenChart = new Chart(eigenCtx, {
        type: 'scatter',
        data: {
          datasets: [{
            label: 'Eigenvalues',
            data: [],
            backgroundColor: '#00d4ff',
            borderColor: '#00d4ff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              title: { display: true, text: 'Real Part' },
              grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            y: {
              title: { display: true, text: 'Imaginary Part' },
              grid: { color: 'rgba(255, 255, 255, 0.1)' }
            }
          }
        }
      });
    }
  }

  private generateSampleData(): void {
    // Generate sample modal analysis data
    this.participationFactors = [
      { mode: 1, frequency: 0.35, damping: 5.2, type: 'inter-area' },
      { mode: 2, frequency: 0.42, damping: 4.8, type: 'inter-area' },
      { mode: 3, frequency: 0.87, damping: 12.3, type: 'local' },
      { mode: 4, frequency: 1.23, damping: 15.6, type: 'local' },
      { mode: 5, frequency: 2.45, damping: 8.9, type: 'control' }
    ];

    this.criticalModes = [
      { id: 1, frequency: 0.35, damping: 5.2, areas: ['Area 1', 'Area 3'] },
      { id: 2, frequency: 0.42, damping: 4.8, areas: ['Area 2', 'Area 4'] }
    ];
  }

  runAnalysis(): void {
    this.isAnalyzing = true;

    // Simulate analysis
    setTimeout(() => {
      this.updateCharts();
      this.isAnalyzing = false;
    }, 2000);
  }

  private updateCharts(): void {
    if (this.eigenChart) {
      // Generate eigenvalue data
      const eigenData = Array.from({ length: 20 }, () => ({
        x: -Math.random() * 2,
        y: Math.random() * 10 - 5
      }));

      this.eigenChart.data.datasets[0].data = eigenData;
      this.eigenChart.update();
    }
  }
