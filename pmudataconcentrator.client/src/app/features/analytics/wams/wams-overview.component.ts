// src/app/features/analytics/wams/wams-overview.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-wams-overview',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule
  ],
  template: `
    <div class="wams-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>language</mat-icon>
            Wide Area Monitoring System (WAMS) Overview
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <mat-tab-group>
            <mat-tab label="System Overview">
              <div class="tab-content">
                <div class="metrics-grid">
                  <mat-card class="metric-card">
                    <mat-card-header>
                      <mat-card-title>System Inertia</mat-card-title>
                    </mat-card-header>
                    <mat-card-content>
                      <div class="metric-value">5.2 s</div>
                      <div class="metric-trend">↓ 2.3%</div>
                    </mat-card-content>
                  </mat-card>
                  
                  <mat-card class="metric-card">
                    <mat-card-header>
                      <mat-card-title>Total Generation</mat-card-title>
                    </mat-card-header>
                    <mat-card-content>
                      <div class="metric-value">152.4 GW</div>
                      <div class="metric-trend">↑ 1.2%</div>
                    </mat-card-content>
                  </mat-card>
                  
                  <mat-card class="metric-card">
                    <mat-card-header>
                      <mat-card-title>Total Load</mat-card-title>
                    </mat-card-header>
                    <mat-card-content>
                      <div class="metric-value">148.7 GW</div>
                      <div class="metric-trend">↑ 0.8%</div>
                    </mat-card-content>
                  </mat-card>
                  
                  <mat-card class="metric-card">
                    <mat-card-header>
                      <mat-card-title>System Loss</mat-card-title>
                    </mat-card-header>
                    <mat-card-content>
                      <div class="metric-value">3.7 GW</div>
                      <div class="metric-trend">2.4%</div>
                    </mat-card-content>
                  </mat-card>
                </div>
              </div>
            </mat-tab>
            
            <mat-tab label="Area Control">
              <div class="tab-content">
                <h3>Area Control Error (ACE)</h3>
                <canvas #aceChart></canvas>
              </div>
            </mat-tab>
            
            <mat-tab label="Inter-area Flows">
              <div class="tab-content">
                <h3>Inter-area Power Flows</h3>
                <div class="flow-diagram">
                  <!-- Flow visualization would go here -->
                  <p>Inter-area flow visualization</p>
                </div>
              </div>
            </mat-tab>
            
            <mat-tab label="Contingency Analysis">
              <div class="tab-content">
                <h3>N-1 Contingency Results</h3>
                <div class="contingency-list">
                  <mat-card *ngFor="let cont of contingencies" class="contingency-card">
                    <mat-card-header>
                      <mat-card-title>{{ cont.name }}</mat-card-title>
                      <mat-card-subtitle>{{ cont.type }}</mat-card-subtitle>
                    </mat-card-header>
                    <mat-card-content>
                      <p>Impact: {{ cont.impact }}</p>
                      <p>Violations: {{ cont.violations }}</p>
                    </mat-card-content>
                  </mat-card>
                </div>
              </div>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .wams-container {
      height: 100%;
      padding: 20px;
      overflow-y: auto;
    }
    
    .tab-content {
      padding: 20px;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }
    
    .metric-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .metric-value {
      font-size: 32px;
      font-weight: 700;
      color: #00d4ff;
      margin: 16px 0 8px 0;
    }
    
    .metric-trend {
      font-size: 14px;
      color: #4caf50;
    }
    
    .contingency-list {
      display: grid;
      gap: 16px;
    }
    
    .contingency-card {
      background: rgba(255, 255, 255, 0.02);
    }
    
    h3 {
      color: #00d4ff;
      margin-bottom: 16px;
    }
  `]
})
export class WAMSOverviewComponent implements OnInit {
  contingencies = [
    { name: 'Line 1-2 Outage', type: 'Transmission', impact: 'High', violations: 3 },
    { name: 'Gen Unit 5 Trip', type: 'Generation', impact: 'Medium', violations: 1 },
    { name: 'Bus 45 Fault', type: 'Bus', impact: 'Low', violations: 0 }
  ];

  ngOnInit(): void {
    // Initialize WAMS data
  }
}
