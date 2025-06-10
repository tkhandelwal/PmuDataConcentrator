// src/app/features/visualization/vr-view/vr-view.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-vr-view',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="vr-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>view_in_ar</mat-icon>
            VR Mode
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="vr-instructions">
            <mat-icon class="vr-icon">view_in_ar</mat-icon>
            <h2>Virtual Reality Mode</h2>
            <p>Connect your VR headset to experience the power grid in immersive 3D</p>
            <button mat-raised-button color="primary" (click)="enterVR()">
              <mat-icon>play_arrow</mat-icon>
              Enter VR
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .vr-container {
      height: 100%;
      padding: 20px;
    }
    
    .vr-instructions {
      text-align: center;
      padding: 60px 20px;
    }
    
    .vr-icon {
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
  `]
})
export class VRViewComponent {
  enterVR(): void {
    console.log('Entering VR mode...');
    // VR implementation would go here
  }
}
