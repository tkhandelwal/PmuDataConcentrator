// src/app/features/monitoring/voltage-monitor/voltage-monitor.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-voltage-monitor',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule
  ],
  template: `
    <div class="voltage-monitor-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>electrical_services</mat-icon>
            Voltage Monitoring
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <div class="voltage-overview">
            <div class="voltage-stat">
              <h3>System Average Voltage</h3>
              <div class="voltage-value">{{ avgVoltage | number:'1.3-3' }} p.u.</div>
            </div>
            
            <div class="voltage-limits">
              <div class="limit-item">
                <span class="limit-label">Upper Limit</span>
                <span class="limit-value">1.05 p.u.</span>
              </div>
              <div class="limit-item">
                <span class="limit-label">Lower Limit</span>
                <span class="limit-value">0.95 p.u.</span>
              </div>
            </div>
          </div>
          
          <div class="bus-voltage-table">
            <h3>Bus Voltages</h3>
            <table mat-table [dataSource]="busVoltages">
              <ng-container matColumnDef="busId">
                <th mat-header-cell *matHeaderCellDef>Bus ID</th>
                <td mat-cell *matCellDef="let bus">{{ bus.busId }}</td>
              </ng-container>
              
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let bus">{{ bus.name }}</td>
              </ng-container>
              
              <ng-container matColumnDef="voltage">
                <th mat-header-cell *matHeaderCellDef>Voltage (p.u.)</th>
                <td mat-cell *matCellDef="let bus">
                  <span [style.color]="getVoltageColor(bus.voltage)">
                    {{ bus.voltage | number:'1.3-3' }}
                  </span>
                </td>
              </ng-container>
              
              <ng-container matColumnDef="angle">
                <th mat-header-cell *matHeaderCellDef>Angle (deg)</th>
                <td mat-cell *matCellDef="let bus">{{ bus.angle | number:'1.1-1' }}</td>
              </ng-container>
              
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let bus">
                  <span class="status-badge" [class]="bus.status">
                    {{ bus.status }}
                  </span>
                </td>
              </ng-container>
              
              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .voltage-monitor-container {
      height: 100%;
      padding: 20px;
      overflow-y: auto;
    }
    
    .voltage-overview {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .voltage-stat {
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    
    .voltage-value {
      font-size: 36px;
      font-weight: 700;
      color: #00d4ff;
      margin-top: 16px;
    }
    
    .voltage-limits {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 16px;
    }
    
    .limit-item {
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .limit-label {
      color: #999;
    }
    
    .limit-value {
      font-size: 20px;
      font-weight: 600;
      color: #00d4ff;
    }
    
    h3 {
      margin: 0 0 16px 0;
      color: #00d4ff;
    }
    
    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
    }
    
    .status-badge.normal {
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
    }
    
    .status-badge.warning {
      background: rgba(255, 152, 0, 0.2);
      color: #ff9800;
    }
    
    .status-badge.alarm {
      background: rgba(244, 67, 54, 0.2);
      color: #f44336;
    }
  `]
})
export class VoltageMonitorComponent implements OnInit {
  avgVoltage = 1.002;
  displayedColumns = ['busId', 'name', 'voltage', 'angle', 'status'];

  busVoltages = [
    { busId: 1, name: 'Bus 1', voltage: 1.023, angle: 0.0, status: 'normal' },
    { busId: 2, name: 'Bus 2', voltage: 0.987, angle: -5.2, status: 'normal' },
    { busId: 3, name: 'Bus 3', voltage: 0.945, angle: -8.7, status: 'warning' },
    { busId: 4, name: 'Bus 4', voltage: 1.067, angle: 2.3, status: 'warning' },
    { busId: 5, name: 'Bus 5', voltage: 0.923, angle: -12.1, status: 'alarm' }
  ];

  ngOnInit(): void {
    // Initialize voltage monitoring
  }

  getVoltageColor(voltage: number): string {
    if (voltage < 0.95 || voltage > 1.05) return '#f44336';
    if (voltage < 0.97 || voltage > 1.03) return '#ff9800';
    return '#4caf50';
  }
}
