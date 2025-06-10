import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { filter } from 'rxjs/operators';
import { NavigationStore } from './core/stores/navigation.store';
import { PmuDataService } from './core/services/pmu-data.service';
import { HubConnectionState } from '@microsoft/signalr';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    MatSidenavModule,
    RouterLinkActive,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatExpansionModule,
    MatTooltipModule,
    MatBadgeModule,
    MatMenuModule
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <!-- Side Navigation -->
      <mat-sidenav 
        #drawer 
        class="sidenav"
        [attr.role]="isHandset() ? 'dialog' : 'navigation'"
        [mode]="isHandset() ? 'over' : 'side'"
        [opened]="!isHandset() && sidenavOpen()"
        [fixedInViewport]="false">
        
        <mat-toolbar class="sidenav-header">
          <div class="logo-section">
            <mat-icon class="logo-icon">electric_bolt</mat-icon>
            <span class="logo-text">PMU DC</span>
          </div>
          <button mat-icon-button (click)="toggleExpertMode()" 
                  [matTooltip]="expertMode() ? 'Switch to Basic Mode' : 'Switch to Expert Mode'">
            <mat-icon>{{ expertMode() ? 'engineering' : 'person' }}</mat-icon>
          </button>
        </mat-toolbar>

        <mat-nav-list>
          <!-- Dashboard -->
          <a mat-list-item routerLink="/dashboard" routerLinkActive="active">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>Dashboard</span>
          </a>

          <!-- Real-time Monitoring -->
          <mat-expansion-panel [expanded]="isExpanded('monitoring')">
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon>monitor</mat-icon>
                Real-time Monitoring
              </mat-panel-title>
            </mat-expansion-panel-header>
            
            <a mat-list-item routerLink="/monitoring/map-view" routerLinkActive="active">
              <mat-icon matListItemIcon>public</mat-icon>
              <span matListItemTitle>Geographic View</span>
            </a>
            
            <a mat-list-item routerLink="/monitoring/network-topology" routerLinkActive="active">
              <mat-icon matListItemIcon>hub</mat-icon>
              <span matListItemTitle>Network Topology</span>
            </a>
            
            <a mat-list-item routerLink="/monitoring/frequency" routerLinkActive="active">
              <mat-icon matListItemIcon>show_chart</mat-icon>
              <span matListItemTitle>Frequency Monitor</span>
            </a>
            
            <a mat-list-item routerLink="/monitoring/voltage" routerLinkActive="active">
              <mat-icon matListItemIcon>electrical_services</mat-icon>
              <span matListItemTitle>Voltage Monitor</span>
            </a>
          </mat-expansion-panel>

          <!-- Analytics -->
          <mat-expansion-panel [expanded]="isExpanded('analytics')" *ngIf="expertMode()">
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon>analytics</mat-icon>
                Advanced Analytics
              </mat-panel-title>
            </mat-expansion-panel-header>
            
            <a mat-list-item routerLink="/analytics/frequency-analysis" routerLinkActive="active">
              <mat-icon matListItemIcon>equalizer</mat-icon>
              <span matListItemTitle>Frequency Analysis</span>
            </a>
            
            <a mat-list-item routerLink="/analytics/voltage-stability" routerLinkActive="active">
              <mat-icon matListItemIcon>trending_down</mat-icon>
              <span matListItemTitle>Voltage Stability</span>
            </a>
            
            <a mat-list-item routerLink="/analytics/oscillation-detection" routerLinkActive="active">
              <mat-icon matListItemIcon>waves</mat-icon>
              <span matListItemTitle>Oscillation Detection</span>
            </a>
            
            <a mat-list-item routerLink="/analytics/modal-analysis" routerLinkActive="active">
              <mat-icon matListItemIcon>blur_on</mat-icon>
              <span matListItemTitle>Modal Analysis</span>
            </a>
            
            <a mat-list-item routerLink="/analytics/wams" routerLinkActive="active">
              <mat-icon matListItemIcon>language</mat-icon>
              <span matListItemTitle>WAMS Overview</span>
            </a>
          </mat-expansion-panel>

          <!-- Visualization -->
          <mat-expansion-panel [expanded]="isExpanded('visualization')">
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon>3d_rotation</mat-icon>
                3D Visualization
              </mat-panel-title>
            </mat-expansion-panel-header>
            
            <a mat-list-item routerLink="/visualization/globe" routerLinkActive="active">
              <mat-icon matListItemIcon>public</mat-icon>
              <span matListItemTitle>3D Globe View</span>
            </a>
            
            <a mat-list-item routerLink="/visualization/network-3d" routerLinkActive="active">
              <mat-icon matListItemIcon>account_tree</mat-icon>
              <span matListItemTitle>3D Network</span>
            </a>
            
            <a mat-list-item routerLink="/visualization/vr" routerLinkActive="active" *ngIf="vrSupported()">
              <mat-icon matListItemIcon>view_in_ar</mat-icon>
              <span matListItemTitle>VR Mode</span>
            </a>
            
            <a mat-list-item routerLink="/visualization/ar" routerLinkActive="active" *ngIf="arSupported()">
              <mat-icon matListItemIcon>view_in_ar</mat-icon>
              <span matListItemTitle>AR Mode</span>
            </a>
          </mat-expansion-panel>

          <!-- Reports & History -->
          <a mat-list-item routerLink="/reports" routerLinkActive="active">
            <mat-icon matListItemIcon>description</mat-icon>
            <span matListItemTitle>Reports</span>
          </a>

          <!-- Settings -->
          <a mat-list-item routerLink="/settings" routerLinkActive="active">
            <mat-icon matListItemIcon>settings</mat-icon>
            <span matListItemTitle>Settings</span>
          </a>
        </mat-nav-list>

        <!-- Connection Status -->
        <div class="connection-status" [class.connected]="isConnected()">
          <mat-icon>{{ isConnected() ? 'wifi' : 'wifi_off' }}</mat-icon>
          <span>{{ connectionStatus() }}</span>
        </div>
      </mat-sidenav>

      <!-- Main Content -->
      <mat-sidenav-content>
        <!-- Top Toolbar -->
        <mat-toolbar color="primary" class="top-toolbar">
          <button mat-icon-button (click)="drawer.toggle()" *ngIf="isHandset()">
            <mat-icon>menu</mat-icon>
          </button>
          
          <div class="toolbar-title">
            <span class="title">PMU Data Concentrator</span>
            <nav class="breadcrumb" *ngIf="!isHandset()">
              @for (crumb of breadcrumbs(); track crumb.url) {
                @if (!$last) {
                  <a [routerLink]="crumb.url">{{ crumb.label }}</a>
                  <mat-icon>chevron_right</mat-icon>
                } @else {
                  <span class="current">{{ crumb.label }}</span>
                }
              }
            </nav>
          </div>

          <span class="spacer"></span>

          <!-- Toolbar Actions -->
          <div class="toolbar-actions">
            <button mat-icon-button 
                    [matBadge]="unreadAlerts()" 
                    matBadgeColor="warn" 
                    [matBadgeHidden]="unreadAlerts() === 0"
                    (click)="openAlerts()">
              <mat-icon>notifications</mat-icon>
            </button>
            
            <button mat-icon-button (click)="toggleTheme()">
              <mat-icon>{{ isDarkTheme() ? 'light_mode' : 'dark_mode' }}</mat-icon>
            </button>
            
            <button mat-icon-button [matMenuTriggerFor]="userMenu">
              <mat-icon>account_circle</mat-icon>
            </button>
          </div>
        </mat-toolbar>

        <!-- Main Content Area -->
        <main class="main-content">
          <router-outlet></router-outlet>
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>

    <!-- User Menu -->
    <mat-menu #userMenu="matMenu">
      <button mat-menu-item>
        <mat-icon>person</mat-icon>
        <span>Profile</span>
      </button>
      <button mat-menu-item (click)="toggleExpertMode()">
        <mat-icon>{{ expertMode() ? 'person' : 'engineering' }}</mat-icon>
        <span>{{ expertMode() ? 'Basic Mode' : 'Expert Mode' }}</span>
      </button>
      <mat-divider></mat-divider>
      <button mat-menu-item (click)="logout()">
        <mat-icon>exit_to_app</mat-icon>
        <span>Logout</span>
      </button>
    </mat-menu>
  `,
  styles: [`
    .sidenav-container {
      height: 100%;
    }

    .sidenav {
      width: 260px;
      background: #1a1a1a;
      border-right: 1px solid #333;
    }

    .sidenav-header {
      background: #0f0f0f;
      border-bottom: 1px solid #333;
      padding: 0 16px;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .logo-icon {
      font-size: 32px;
      color: #00d4ff;
    }

    .logo-text {
      font-size: 18px;
      font-weight: 600;
      color: #00d4ff;
    }

    mat-nav-list {
      padding-top: 0;
    }

    mat-list-item {
      color: #e0e0e0;
    }

    mat-list-item.active {
      background: rgba(0, 212, 255, 0.1);
      border-left: 3px solid #00d4ff;
    }

    mat-list-item:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    mat-expansion-panel {
      background: transparent;
      box-shadow: none;
    }

    mat-expansion-panel-header {
      padding-left: 16px;
      color: #e0e0e0;
    }

    ::ng-deep .mat-expansion-panel-body {
      padding: 0 !important;
    }

    mat-panel-title {
      display: flex;
      align-items: center;
      gap: 24px;
      color: #e0e0e0;
    }

    .connection-status {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.05);
      color: #999;
      font-size: 12px;
    }

    .connection-status.connected {
      color: #4caf50;
    }

    .top-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #1a1a1a;
      border-bottom: 1px solid #333;
    }

    .toolbar-title {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .title {
      font-size: 20px;
      font-weight: 500;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #999;
    }

    .breadcrumb a {
      color: #999;
      text-decoration: none;
    }

    .breadcrumb a:hover {
      color: #00d4ff;
    }

    .breadcrumb mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .breadcrumb .current {
      color: #e0e0e0;
    }

    .spacer {
      flex: 1;
    }

    .toolbar-actions {
      display: flex;
      gap: 8px;
    }

    .main-content {
      height: calc(100vh - 64px);
      overflow-y: auto;
      background: #0a0a0a;
    }

    @media (max-width: 768px) {
      .sidenav {
        width: 100%;
        max-width: 320px;
      }

      .breadcrumb {
        display: none;
      }
    }
  `]
})
export class AppComponent implements OnInit {
  private navigationStore = inject(NavigationStore);
  private breakpointObserver = inject(BreakpointObserver);
  private pmuDataService = inject(PmuDataService);
  private router = inject(Router);

  // Navigation state
  sidenavOpen = this.navigationStore.sidenavOpen;
  expertMode = this.navigationStore.expertMode;
  breadcrumbs = this.navigationStore.breadcrumbs;
  expandedPanels = signal<Set<string>>(new Set(['monitoring']));

  // Connection state
  isConnected = signal(false);
  connectionStatus = signal('Connecting...');

  // UI state
  isDarkTheme = signal(true);
  unreadAlerts = signal(3);
  vrSupported = signal(false);
  arSupported = signal(false);

  isHandset = computed(() => {
    const result = this.breakpointObserver.isMatched(Breakpoints.Handset);
    return result;
  });

  ngOnInit(): void {
    // Initialize navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.navigationStore.updateBreadcrumbs(this.router);
    });

    // Monitor connection
    this.pmuDataService.getConnectionState().subscribe(state => {
      this.isConnected.set(state === HubConnectionState.Connected);
      this.connectionStatus.set(state === HubConnectionState.Connected ? 'Connected' : 'Disconnected');
    });

    // Check XR support
    if ('xr' in navigator) {
      (navigator as any).xr.isSessionSupported('immersive-vr').then((supported: boolean) => {
        this.vrSupported.set(supported);
      });
      (navigator as any).xr.isSessionSupported('immersive-ar').then((supported: boolean) => {
        this.arSupported.set(supported);
      });
    }
  }

  toggleExpertMode(): void {
    this.navigationStore.toggleExpertMode();
  }

  isExpanded(panel: string): boolean {
    return this.expandedPanels().has(panel);
  }

  toggleTheme(): void {
    this.isDarkTheme.update(dark => !dark);
    document.body.classList.toggle('light-theme');
  }

  openAlerts(): void {
    this.router.navigate(['/alerts']);
  }

  logout(): void {
    // Implement logout
    console.log('Logout');
  }
}
