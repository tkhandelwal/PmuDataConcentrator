// src/app/features/visualization/network-graph-3d/network-graph-3d.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Network3DComponent } from '../../monitoring/network-3d/network-3d.component';

@Component({
  selector: 'app-network-graph-3d',
  standalone: true,
  imports: [CommonModule, Network3DComponent],
  template: `<app-network-3d></app-network-3d>`,
  styles: []
})
export class NetworkGraph3DComponent { }
