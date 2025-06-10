import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-system-health',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatIconModule],
  template: `
    <div class="health-container">
      <div class="health-score">
        <div class="score-circle" [class.good]="healthScore > 80" [class.warning]="healthScore <= 80 && healthScore > 60" [class.critical]="healthScore <= 60">
          <svg viewBox="0 0 36 36" class="circular-chart">
            <path class="circle-bg"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path class="circle"
              [attr.stroke-dasharray]="healthScore + ', 100'"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <text x="18" y="20.35" class="percentage">{{ healthScore }}%</text>
          </svg>
        </div>
        <div class="score-label">System Health</div>
      </div>

      <div class="health-metrics">
        <div class="health-metric">
          <mat-icon [style.color]="getFrequencyColor()">{{ getFrequencyIcon() }}</mat-icon>
          <span>Frequency</span>
        </div>
        <div class="health-metric">
          <mat-icon [style.color]="getRocofColor()">{{ getRocofIcon() }}</mat-icon>
          <span>Stability</span>
        </div>
        <div class="health-metric">
          <mat-icon [style.color]="getQualityColor()">{{ getQualityIcon() }}</mat-icon>
          <span>Data Quality</span>
        </div>
        <div class="health-metric">
          <mat-icon [style.color]="getConnectivityColor()">{{ getConnectivityIcon() }}</mat-icon>
          <span>Connectivity</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .health-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      padding: 16px;
    }

    .health-score {
      text-align: center;
    }

    .score-circle {
      width: 120px;
      height: 120px;
      margin: 0 auto 12px;
    }

    .circular-chart {
      display: block;
      margin: 0 auto;
      max-width: 100%;
      max-height: 100%;
    }

    .circle-bg {
      fill: none;
      stroke: #333;
      stroke-width: 2.8;
    }

    .circle {
      fill: none;
      stroke-width: 2.8;
      stroke-linecap: round;
      animation: progress 1s ease-out forwards;
      transition: stroke 0.3s ease;
    }

    .score-circle.good .circle { stroke: #4caf50; }
    .score-circle.warning .circle { stroke: #ff9800; }
    .score-circle.critical .circle { stroke: #f44336; }

    @keyframes progress {
      0% { stroke-dasharray: 0 100; }
    }

    .percentage {
      fill: #fff;
      font-size: 0.5em;
      text-anchor: middle;
      font-weight: 600;
    }

    .score-label {
      font-size: 14px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .health-metrics {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      width: 100%;
    }

    .health-metric {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 12px;
      color: #999;
    }

    .health-metric mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
  `]
})
export class SystemHealthComponent {
  @Input() frequency: number = 60.0;
  @Input() rocof: number = 0.0;
  @Input() pmuCount: number = 0;
  @Input() dataQuality: number = 100;

  get healthScore(): number {
    let score = 100;
    
    // Frequency deviation (40% weight)
    const freqDev = Math.abs(this.frequency - 60.0);
    score -= Math.min(freqDev * 80, 40);
    
    // ROCOF (30% weight)
    const rocofDev = Math.abs(this.rocof);
    score -= Math.min(rocofDev * 30, 30);
    
    // Data quality (20% weight)
    score -= (100 - this.dataQuality) * 0.2;
    
    // PMU availability (10% weight)
    if (this.pmuCount < 12) {
      score -= (12 - this.pmuCount) * 0.83;
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  getFrequencyIcon(): string {
    const dev = Math.abs(this.frequency - 60.0);
    if (dev < 0.1) return 'check_circle';
    if (dev < 0.5) return 'warning';
    return 'error';
  }

  getFrequencyColor(): string {
    const dev = Math.abs(this.frequency - 60.0);
    if (dev < 0.1) return '#4caf50';
    if (dev < 0.5) return '#ff9800';
    return '#f44336';
  }

  getRocofIcon(): string {
    const dev = Math.abs(this.rocof);
    if (dev < 0.5) return 'check_circle';
    if (dev < 1.0) return 'warning';
    return 'error';
  }

  getRocofColor(): string {
    const dev = Math.abs(this.rocof);
    if (dev < 0.5) return '#4caf50';
    if (dev < 1.0) return '#ff9800';
    return '#f44336';
  }

  getQualityIcon(): string {
    if (this.dataQuality > 95) return 'check_circle';
    if (this.dataQuality > 80) return 'warning';
    return 'error';
  }

  getQualityColor(): string {
    if (this.dataQuality > 95) return '#4caf50';
    if (this.dataQuality > 80) return '#ff9800';
    return '#f44336';
  }

  getConnectivityIcon(): string {
    if (this.pmuCount === 12) return 'check_circle';
    if (this.pmuCount > 8) return 'warning';
    return 'error';
  }

  getConnectivityColor(): string {
    if (this.pmuCount === 12) return '#4caf50';
    if (this.pmuCount > 8) return '#ff9800';
    return '#f44336';
  }
}
