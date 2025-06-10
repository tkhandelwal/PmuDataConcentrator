// pmudataconcentrator.client/src/app/features/analytics/wide-area-monitoring.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-wide-area-monitoring',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>
          <mat-icon>public</mat-icon>
          Wide Area Monitoring
        </mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p>Wide area monitoring system view will be displayed here.</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    mat-card {
      height: 100%;
    }
  `]
})
export class WideAreaMonitoringComponent {}
