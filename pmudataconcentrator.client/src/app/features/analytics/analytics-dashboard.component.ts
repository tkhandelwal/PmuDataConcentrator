import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FrequencyAnalysisComponent } from './frequency-analysis.component';
import { VoltageStabilityComponent } from './voltage-stability.component';
import { OscillationDetectionComponent } from './oscillation-detection.component';
import { WideAreaMonitoringComponent } from './wide-area-monitoring.component';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    FrequencyAnalysisComponent,
    VoltageStabilityComponent,
    OscillationDetectionComponent,
    WideAreaMonitoringComponent
  ],
  template: `
    <div class="analytics-container">
      <mat-card class="analytics-card">
        <mat-card-header>
          <mat-card-title class="gradient-text">
            <mat-icon>analytics</mat-icon>
            Advanced PMU Analytics
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <mat-tab-group animationDuration="0ms" [selectedIndex]="selectedTab()">
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon>speed</mat-icon>
                Frequency Analysis
              </ng-template>
              <app-frequency-analysis></app-frequency-analysis>
            </mat-tab>
            
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon>electrical_services</mat-icon>
                Voltage Stability
              </ng-template>
              <app-voltage-stability></app-voltage-stability>
            </mat-tab>
            
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon>waves</mat-icon>
                Oscillation Detection
              </ng-template>
              <app-oscillation-detection></app-oscillation-detection>
            </mat-tab>
            
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon>public</mat-icon>
                Wide Area Monitoring
              </ng-template>
              <app-wide-area-monitoring></app-wide-area-monitoring>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .analytics-container {
      padding: 20px;
      height: 100%;
    }

    .analytics-card {
      height: 100%;
      background: linear-gradient(145deg, #1a1a1a 0%, #0f0f0f 100%);
      border: 1px solid #2a2a2a;
      border-radius: 16px;
    }

    mat-card-header {
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 24px;
      font-weight: 600;
    }

    ::ng-deep .mat-tab-group {
      height: calc(100% - 80px);
    }

    ::ng-deep .mat-tab-body-wrapper {
      height: 100%;
      padding-top: 20px;
    }

    ::ng-deep .mat-tab-label {
      color: #999;
      font-weight: 500;
    }

    ::ng-deep .mat-tab-label-active {
      color: #00d4ff;
    }

    ::ng-deep .mat-ink-bar {
      background-color: #00d4ff;
      height: 3px;
    }

    ::ng-deep .mat-tab-label mat-icon {
      margin-right: 8px;
    }
  `]
})
export class AnalyticsDashboardComponent implements OnInit {
  selectedTab = signal(0);

  ngOnInit(): void {
    // Initialize analytics
  }
}
