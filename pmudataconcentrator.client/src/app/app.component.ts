import { Component } from '@angular/core';
import { DashboardComponent } from './features/dashboard/dashboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DashboardComponent],  // Removed RouterOutlet
  template: `
    <app-dashboard></app-dashboard>
  `,
  styles: []
})
export class AppComponent {
  title = 'pmu-data-concentrator';
}
