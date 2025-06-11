import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    data: { breadcrumb: 'Dashboard' }
  },
  {
    path: 'monitoring',
    data: { breadcrumb: 'Real-time Monitoring' },
    children: [
      {
        path: 'map-view',
        loadComponent: () => import('./features/monitoring/globe-view/globe-view.component').then(m => m.GlobeViewComponent),
        data: { breadcrumb: 'Geographic View' }
      },
      {
        path: 'network-topology',
        loadComponent: () => import('./features/monitoring/network-3d/network-3d.component').then(m => m.Network3DComponent),
        data: { breadcrumb: 'Network Topology' }
      },
      {
        path: 'frequency',
        loadComponent: () => import('./features/monitoring/frequency-monitor/frequency-monitor.component').then(m => m.FrequencyMonitorComponent),
        data: { breadcrumb: 'Frequency Monitor' }
      },
      {
        path: 'voltage',
        loadComponent: () => import('./features/monitoring/voltage-monitor/voltage-monitor.component').then(m => m.VoltageMonitorComponent),
        data: { breadcrumb: 'Voltage Monitor' }
      }
    ]
  },
  {
    path: 'analytics',
    data: { breadcrumb: 'Advanced Analytics' },
    children: [
      {
        path: 'frequency-analysis',
        loadComponent: () => import('./features/analytics/frequency-analysis.component').then(m => m.FrequencyAnalysisComponent),
        data: { breadcrumb: 'Frequency Analysis' }
      },
      {
        path: 'voltage-stability',
        loadComponent: () => import('./features/analytics/voltage-stability.component').then(m => m.VoltageStabilityComponent),
        data: { breadcrumb: 'Voltage Stability' }
      },
      {
        path: 'oscillation-detection',
        loadComponent: () => import('./features/analytics/oscillation-detection.component').then(m => m.OscillationDetectionComponent),
        data: { breadcrumb: 'Oscillation Detection' }
      },
      {
        path: 'modal-analysis',
        loadComponent: () => import('./features/analytics/modal-analysis/modal-analysis.component').then(m => m.ModalAnalysisComponent),
        data: { breadcrumb: 'Modal Analysis' }
      },
      {
        path: 'wams',
        loadComponent: () => import('./features/analytics/wams/wams-overview.component').then(m => m.WAMSOverviewComponent),
        data: { breadcrumb: 'WAMS Overview' }
      }
    ]
  },
  {
    path: 'visualization',
    data: { breadcrumb: '3D Visualization' },
    children: [
      {
        path: 'globe',
        loadComponent: () => import('./features/visualization/globe-3d/globe-3d.component').then(m => m.Globe3DComponent),
        data: { breadcrumb: '3D Globe' }
      },
      {
        path: 'network-3d',
        loadComponent: () => import('./features/visualization/network-graph-3d/network-graph-3d.component').then(m => m.NetworkGraph3DComponent),
        data: { breadcrumb: '3D Network' }
      },
      {
        path: 'vr',
        loadComponent: () => import('./features/visualization/vr-view/vr-view.component').then(m => m.VRViewComponent),
        data: { breadcrumb: 'VR Mode' }
      },
      {
        path: 'ar',
        loadComponent: () => import('./features/visualization/ar-view/ar-view.component').then(m => m.ARViewComponent),
        data: { breadcrumb: 'AR Mode' }
      }
    ]
  },
  {
    path: 'reports',
    loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
    data: { breadcrumb: 'Reports' }
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
    data: { breadcrumb: 'Settings' }
  },
  {
    path: 'alerts',
    loadComponent: () => import('./features/alerts/alerts.component').then(m => m.AlertsComponent),
    data: { breadcrumb: 'Alerts' }
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
