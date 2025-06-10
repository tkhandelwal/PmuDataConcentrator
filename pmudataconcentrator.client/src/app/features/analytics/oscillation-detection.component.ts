// pmudataconcentrator.client/src/app/features/analytics/oscillation-detection.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-oscillation-detection',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>
          <mat-icon>waves</mat-icon>
          Oscillation Detection
        </mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p>Oscillation detection analysis will be displayed here.</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    mat-card {
      height: 100%;
    }
  `]
})
export class OscillationDetectionComponent {}
