import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-pmu-status-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatTooltipModule, MatProgressBarModule],
  template: `
    <mat-card class="pmu-card" [class.selected]="isSelected" [class.alarm]="isAlarm()" [class.warning]="isWarning()">
      <div class="pmu-header">
        <div class="pmu-title">
          <span class="pmu-id">PMU {{ pmuData.pmuId }}</span>
          <mat-icon class="status-icon" [style.color]="getStatusColor()">
            {{ getStatusIcon() }}
          </mat-icon>
        </div>
        <span class="pmu-location">{{ pmuData.stationName }}</span>
      </div>
      
      <div class="pmu-metrics">
        <div class="metric">
          <span class="metric-label">Frequency</span>
          <span class="metric-value" [class.deviation]="hasFrequencyDeviation()">
            {{ pmuData.frequency | number:'1.3-3' }} Hz
          </span>
        </div>
        
        <div class="metric">
          <span class="metric-label">ROCOF</span>
          <span class="metric-value" [class.deviation]="hasRocofDeviation()">
            {{ pmuData.rocof | number:'1.3-3' }} Hz/s
          </span>
        </div>
        
        <div class="metric">
          <span class="metric-label">Voltage</span>
          <span class="metric-value">
            {{ getVoltage() | number:'1.1-1' }} kV
          </span>
        </div>
      </div>
      
      <div class="pmu-footer">
        <mat-progress-bar 
          mode="determinate" 
          [value]="getHealthScore()"
          [color]="getHealthColor()">
        </mat-progress-bar>
        <span class="quality-text">Quality: {{ pmuData.quality === 0 ? 'Good' : 'Poor' }}</span>
      </div>
    </mat-card>
  `,
  styles: [`
    .pmu-card {
      background: rgba(26, 26, 26, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
      height: 100%;
    }

    .pmu-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      border-color: rgba(0, 212, 255, 0.3);
    }

    .pmu-card.selected {
      border-color: #00d4ff;
      box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
    }

    .pmu-card.warning {
      border-color: rgba(255, 152, 0, 0.5);
      background: rgba(255, 152, 0, 0.05);
    }

    .pmu-card.alarm {
      border-color: rgba(244, 67, 54, 0.5);
      background: rgba(244, 67, 54, 0.05);
      animation: alarm-pulse 2s infinite;
    }

    @keyframes alarm-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }

    .pmu-header {
      margin-bottom: 16px;
    }

    .pmu-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .pmu-id {
      font-size: 16px;
      font-weight: 600;
      color: #00d4ff;
    }

    .status-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .pmu-location {
      font-size: 12px;
      color: #999;
    }

    .pmu-metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }

    .metric {
      text-align: center;
    }

    .metric-label {
      display: block;
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .metric-value {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      font-variant-numeric: tabular-nums;
    }

    .metric-value.deviation {
      color: #ff9800;
    }

    .pmu-footer {
      position: relative;
    }

    .quality-text {
      position: absolute;
      right: 0;
      top: -16px;
      font-size: 10px;
      color: #666;
    }

    ::ng-deep .mat-progress-bar {
      height: 4px;
      border-radius: 2px;
    }
  `]
})
export class PmuStatusCardComponent {
  @Input() pmuData: any;
  @Input() isSelected: boolean = false;

  getStatusIcon(): string {
    if (this.isAlarm()) return 'error';
    if (this.isWarning()) return 'warning';
    return 'check_circle';
  }

  getStatusColor(): string {
    if (this.isAlarm()) return '#f44336';
    if (this.isWarning()) return '#ff9800';
    return '#4caf50';
  }

  isAlarm(): boolean {
    return Math.abs(this.pmuData.frequency - 60.0) > 0.5 || Math.abs(this.pmuData.rocof) > 1.0;
  }

  isWarning(): boolean {
    return Math.abs(this.pmuData.frequency - 60.0) > 0.2 || Math.abs(this.pmuData.rocof) > 0.5;
  }

  hasFrequencyDeviation(): boolean {
    return Math.abs(this.pmuData.frequency - 60.0) > 0.1;
  }

  hasRocofDeviation(): boolean {
    return Math.abs(this.pmuData.rocof) > 0.5;
  }

  getVoltage(): number {
    const voltagePhasor = this.pmuData.phasors?.find((p: any) => p.type === 0);
    return voltagePhasor ? voltagePhasor.magnitude / 1000 : 0;
  }

  getHealthScore(): number {
    let score = 100;
    
    // Deduct for frequency deviation
    const freqDev = Math.abs(this.pmuData.frequency - 60.0);
    score -= Math.min(freqDev * 50, 30);
    
    // Deduct for ROCOF
    const rocofDev = Math.abs(this.pmuData.rocof);
    score -= Math.min(rocofDev * 20, 30);
    
    // Deduct for quality
    if (this.pmuData.quality !== 0) score -= 20;
    
    return Math.max(0, Math.min(100, score));
  }

  getHealthColor(): 'primary' | 'accent' | 'warn' {
    const score = this.getHealthScore();
    if (score > 80) return 'primary';
    if (score > 60) return 'accent';
    return 'warn';
  }
}
