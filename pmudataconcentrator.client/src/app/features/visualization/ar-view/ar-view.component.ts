// src/app/features/visualization/ar-view/ar-view.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-ar-view',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="ar-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>view_in_ar</mat-icon>
            AR Mode
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="ar-instructions">
            <mat-icon class="ar-icon">view_in_ar</mat-icon>
            <h2>Augmented Reality Mode</h2>
            <p>Use your device camera to view power grid data overlaid on the real world</p>
            <button mat-raised-button color="primary" (click)="enterAR()" [disabled]="!arSupported">
              <mat-icon>camera</mat-icon>
              {{ arSupported ? 'Start AR' : 'AR Not Supported' }}
            </button>
          </div>
          
          <div class="device-requirements" *ngIf="!arSupported">
            <h3>Requirements</h3>
            <ul>
              <li>WebXR-compatible browser</li>
              <li>Device with camera</li>
              <li>HTTPS connection</li>
            </ul>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .ar-container {
      height: 100%;
      padding: 20px;
    }
    
    .ar-instructions {
      text-align: center;
      padding: 60px 20px;
    }
    
    .ar-icon {
      font-size: 80px;
      width: 80px;
      height: 80px;
      color: #00d4ff;
      margin-bottom: 20px;
    }
    
    h2 {
      color: #00d4ff;
      margin-bottom: 16px;
    }
    
    p {
      color: #999;
      margin-bottom: 24px;
    }
    
    .device-requirements {
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
      padding: 20px;
      margin-top: 40px;
    }
    
    .device-requirements h3 {
      color: #ff9800;
      margin-bottom: 16px;
    }
    
    .device-requirements ul {
      list-style: none;
      padding: 0;
    }
    
    .device-requirements li {
      padding: 8px 0;
      color: #999;
    }
    
    .device-requirements li::before {
      content: '• ';
      color: #ff9800;
      font-weight: bold;
      margin-right: 8px;
    }
  `]
})
export class ARViewComponent implements OnInit {
  arSupported = false;

  ngOnInit(): void {
    // Check for WebXR AR support
    if ('xr' in navigator) {
      (navigator as any).xr.isSessionSupported('immersive-ar').then((supported: boolean) => {
        this.arSupported = supported;
      }).catch(() => {
        this.arSupported = false;
      });
    }
  }

  async enterAR(): Promise<void> {
    if (!this.arSupported) return;

    try {
      // Request AR session
      const xr = (navigator as any).xr;
      const session = await xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test', 'dom-overlay'],
        domOverlay: { root: document.body }
      });

      console.log('AR session started:', session);

      // Here you would implement the AR visualization
      // This would involve:
      // 1. Setting up WebGL/Three.js renderer
      // 2. Creating AR content (PMU visualizations)
      // 3. Handling hit tests for placement
      // 4. Updating content based on real-time data

    } catch (error) {
      console.error('Failed to start AR session:', error);
    }
  }
}
