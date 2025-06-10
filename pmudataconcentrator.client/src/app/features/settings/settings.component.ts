// src/app/features/settings/settings.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule
  ],
  template: `
    <div class="settings-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>settings</mat-icon>
            System Settings
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <mat-tab-group>
            <!-- General Settings -->
            <mat-tab label="General">
              <div class="settings-section">
                <h3>Display Settings</h3>
                <div class="setting-item">
                  <mat-slide-toggle [(ngModel)]="settings.darkMode">Dark Mode</mat-slide-toggle>
                </div>
                <div class="setting-item">
                  <mat-slide-toggle [(ngModel)]="settings.animations">Enable Animations</mat-slide-toggle>
                </div>
                <div class="setting-item">
                  <mat-form-field>
                    <mat-label>Update Rate (Hz)</mat-label>
                    <input matInput type="number" [(ngModel)]="settings.updateRate">
                  </mat-form-field>
                </div>
              </div>
            </mat-tab>
            
            <!-- Alert Settings -->
            <mat-tab label="Alerts">
              <div class="settings-section">
                <h3>Alert Thresholds</h3>
                <div class="threshold-grid">
                  <mat-form-field>
                    <mat-label>Frequency Min (Hz)</mat-label>
                    <input matInput type="number" [(ngModel)]="thresholds.frequencyMin" step="0.1">
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>Frequency Max (Hz)</mat-label>
                    <input matInput type="number" [(ngModel)]="thresholds.frequencyMax" step="0.1">
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>ROCOF Max (Hz/s)</mat-label>
                    <input matInput type="number" [(ngModel)]="thresholds.rocofMax" step="0.1">
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>Voltage Min (p.u.)</mat-label>
                    <input matInput type="number" [(ngModel)]="thresholds.voltageMin" step="0.01">
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>Voltage Max (p.u.)</mat-label>
                    <input matInput type="number" [(ngModel)]="thresholds.voltageMax" step="0.01">
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>Phase Angle Max (deg)</mat-label>
                    <input matInput type="number" [(ngModel)]="thresholds.phaseAngleMax" step="1">
                  </mat-form-field>
                </div>
              </div>
            </mat-tab>
            
            <!-- Data Settings -->
            <mat-tab label="Data">
              <div class="settings-section">
                <h3>Data Retention</h3>
                <div class="setting-item">
                  <mat-form-field>
                    <mat-label>Raw Data Retention (days)</mat-label>
                    <input matInput type="number" [(ngModel)]="settings.rawDataRetention">
                  </mat-form-field>
                </div>
                <div class="setting-item">
                  <mat-form-field>
                    <mat-label>Aggregated Data Retention (days)</mat-label>
                    <input matInput type="number" [(ngModel)]="settings.aggregatedDataRetention">
                  </mat-form-field>
                </div>
                <div class="setting-item">
                  <mat-slide-toggle [(ngModel)]="settings.autoExport">Auto Export Data</mat-slide-toggle>
                </div>
              </div>
            </mat-tab>
            
            <!-- System Info -->
            <mat-tab label="System Info">
              <div class="settings-section">
                <h3>System Information</h3>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">Version</span>
                    <span class="info-value">1.0.0</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Database Size</span>
                    <span class="info-value">2.4 GB</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Active PMUs</span>
                    <span class="info-value">12 / 12</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Last Backup</span>
                    <span class="info-value">{{ lastBackup | date:'short' }}</span>
                  </div>
                </div>
              </div>
            </mat-tab>
          </mat-tab-group>
          
          <div class="settings-actions">
            <button mat-raised-button color="primary" (click)="saveSettings()">
              <mat-icon>save</mat-icon>
              Save Settings
            </button>
            <button mat-button (click)="resetSettings()">
              <mat-icon>restore</mat-icon>
              Reset to Defaults
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .settings-container {
      height: 100%;
      padding: 20px;
      overflow-y: auto;
    }
    
    .settings-section {
      padding: 20px;
    }
    
    h3 {
      color: #00d4ff;
      margin-bottom: 20px;
    }
    
    .setting-item {
      margin-bottom: 20px;
    }
    
    .threshold-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    
    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 12px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
    }
    
    .info-label {
      color: #999;
    }
    
    .info-value {
      font-weight: 600;
      color: #00d4ff;
    }
    
    .settings-actions {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin-top: 30px;
    }
    
    mat-form-field {
      width: 100%;
    }
  `]
})
export class SettingsComponent implements OnInit {
  settings = {
    darkMode: true,
    animations: true,
    updateRate: 30,
    rawDataRetention: 7,
    aggregatedDataRetention: 90,
    autoExport: false
  };

  thresholds = {
    frequencyMin: 59.5,
    frequencyMax: 60.5,
    rocofMax: 1.0,
    voltageMin: 0.95,
    voltageMax: 1.05,
    phaseAngleMax: 45
  };

  lastBackup = new Date();

  ngOnInit(): void {
    // Load saved settings
  }

  saveSettings(): void {
    console.log('Saving settings...', this.settings, this.thresholds);
    // Save to backend or localStorage
  }

  resetSettings(): void {
    console.log('Resetting to defaults...');
    // Reset to default values
  }
}
