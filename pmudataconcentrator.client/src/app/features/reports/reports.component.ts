// src/app/features/reports/reports.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule
  ],
  template: `
    <div class="reports-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>description</mat-icon>
            System Reports
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <div class="report-filters">
            <mat-form-field>
              <mat-label>Report Type</mat-label>
              <mat-select [(value)]="selectedReportType">
                <mat-option value="daily">Daily Summary</mat-option>
                <mat-option value="weekly">Weekly Analysis</mat-option>
                <mat-option value="monthly">Monthly Report</mat-option>
                <mat-option value="event">Event Report</mat-option>
                <mat-option value="compliance">Compliance Report</mat-option>
              </mat-select>
            </mat-form-field>
            
            <mat-form-field>
              <mat-label>Start Date</mat-label>
              <input matInput [matDatepicker]="startPicker" [(ngModel)]="startDate">
              <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
              <mat-datepicker #startPicker></mat-datepicker>
            </mat-form-field>
            
            <mat-form-field>
              <mat-label>End Date</mat-label>
              <input matInput [matDatepicker]="endPicker" [(ngModel)]="endDate">
              <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
              <mat-datepicker #endPicker></mat-datepicker>
            </mat-form-field>
            
            <button mat-raised-button color="primary" (click)="generateReport()">
              <mat-icon>create</mat-icon>
              Generate Report
            </button>
          </div>
          
          <div class="recent-reports">
            <h3>Recent Reports</h3>
            <div class="report-list">
              <mat-card *ngFor="let report of recentReports" class="report-item">
                <mat-card-header>
                  <mat-card-title>{{ report.title }}</mat-card-title>
                  <mat-card-subtitle>{{ report.date | date }}</mat-card-subtitle>
                </mat-card-header>
                <mat-card-actions>
                  <button mat-button (click)="viewReport(report)">
                    <mat-icon>visibility</mat-icon>
                    View
                  </button>
                  <button mat-button (click)="downloadReport(report)">
                    <mat-icon>download</mat-icon>
                    Download
                  </button>
                </mat-card-actions>
              </mat-card>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .reports-container {
      height: 100%;
      padding: 20px;
      overflow-y: auto;
    }
    
    .report-filters {
      display: flex;
      gap: 20px;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 30px;
    }
    
    mat-form-field {
      min-width: 200px;
    }
    
    .recent-reports {
      margin-top: 40px;
    }
    
    h3 {
      color: #00d4ff;
      margin-bottom: 20px;
    }
    
    .report-list {
      display: grid;
      gap: 16px;
    }
    
    .report-item {
      background: rgba(255, 255, 255, 0.02);
    }
  `]
})
export class ReportsComponent implements OnInit {
  selectedReportType = 'daily';
  startDate = new Date();
  endDate = new Date();

  recentReports = [
    { id: 1, title: 'Daily System Summary', date: new Date(), type: 'daily' },
    { id: 2, title: 'Weekly Performance Analysis', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), type: 'weekly' },
    { id: 3, title: 'Event Report - Frequency Deviation', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), type: 'event' }
  ];

  ngOnInit(): void {
    // Initialize reports
  }

  generateReport(): void {
    console.log('Generating report...');
  }

  viewReport(report: any): void {
    console.log('Viewing report:', report);
  }

  downloadReport(report: any): void {
    console.log('Downloading report:', report);
  }
}
