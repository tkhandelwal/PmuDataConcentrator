// src/app/features/alerts/alerts.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule
  ],
  template: `
    <div class="alerts-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>notifications</mat-icon>
            System Alerts
          </mat-card-title>
          <button mat-button (click)="clearAll()">
            <mat-icon>clear_all</mat-icon>
            Clear All
          </button>
        </mat-card-header>
        
        <mat-card-content>
          <div class="alert-filters">
            <mat-chip-set>
              <mat-chip [selected]="filter === 'all'" (click)="setFilter('all')">All</mat-chip>
              <mat-chip [selected]="filter === 'critical'" (click)="setFilter('critical')">Critical</mat-chip>
              <mat-chip [selected]="filter === 'warning'" (click)="setFilter('warning')">Warning</mat-chip>
              <mat-chip [selected]="filter === 'info'" (click)="setFilter('info')">Info</mat-chip>
            </mat-chip-set>
          </div>
          
          <div class="alerts-list">
            <div *ngFor="let alert of filteredAlerts" 
                 class="alert-item" 
                 [class.critical]="alert.severity === 'critical'"
                 [class.warning]="alert.severity === 'warning'">
              <mat-icon class="alert-icon">{{ getAlertIcon(alert.severity) }}</mat-icon>
              <div class="alert-content">
                <div class="alert-title">{{ alert.title }}</div>
                <div class="alert-message">{{ alert.message }}</div>
                <div class="alert-meta">
                  <span>{{ alert.timestamp | date:'short' }}</span>
                  <span>{{ alert.source }}</span>
                </div>
              </div>
              <button mat-icon-button (click)="dismissAlert(alert)">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .alerts-container {
      height: 100%;
      padding: 20px;
      overflow-y: auto;
    }
    
    mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .alert-filters {
      margin-bottom: 20px;
    }
    
    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .alert-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      transition: all 0.3s ease;
    }
    
    .alert-item:hover {
      background: rgba(255, 255, 255, 0.04);
    }
    
    .alert-item.critical {
      border-color: rgba(244, 67, 54, 0.3);
      background: rgba(244, 67, 54, 0.05);
    }
    
    .alert-item.warning {
      border-color: rgba(255, 152, 0, 0.3);
      background: rgba(255, 152, 0, 0.05);
    }
    
    .alert-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }
    
    .alert-content {
      flex: 1;
    }
    
    .alert-title {
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .alert-message {
      color: #999;
      font-size: 14px;
      margin-bottom: 8px;
    }
    
    .alert-meta {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #666;
    }
  `]
})
export class AlertsComponent implements OnInit {
  filter = 'all';

  alerts = [
    {
      id: 1,
      severity: 'critical',
      title: 'Frequency Deviation',
      message: 'System frequency dropped below 59.5 Hz',
      timestamp: new Date(),
      source: 'PMU 5'
    },
    {
      id: 2,
      severity: 'warning',
      title: 'High ROCOF Detected',
      message: 'Rate of change exceeded 0.8 Hz/s',
      timestamp: new Date(Date.now() - 300000),
      source: 'PMU 3'
    },
    {
      id: 3,
      severity: 'info',
      title: 'PMU Connection Restored',
      message: 'PMU 7 is back online',
      timestamp: new Date(Date.now() - 600000),
      source: 'System'
    }
  ];

  get filteredAlerts() {
    if (this.filter === 'all') return this.alerts;
    return this.alerts.filter(a => a.severity === this.filter);
  }

  ngOnInit(): void {
    // Load alerts
  }

  setFilter(filter: string): void {
    this.filter = filter;
  }

  getAlertIcon(severity: string): string {
    switch (severity) {
      case 'critical': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  }

  dismissAlert(alert: any): void {
    this.alerts = this.alerts.filter(a => a.id !== alert.id);
  }

  clearAll(): void {
    this.alerts = [];
  }
}
