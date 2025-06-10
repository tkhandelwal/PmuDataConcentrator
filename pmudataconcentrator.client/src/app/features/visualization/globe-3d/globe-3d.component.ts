// src/app/features/visualization/globe-3d/globe-3d.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GlobeViewComponent } from '../../monitoring/globe-view/globe-view.component';

@Component({
  selector: 'app-globe-3d',
  standalone: true,
  imports: [CommonModule, GlobeViewComponent],
  template: `<app-globe-view></app-globe-view>`,
  styles: []
})
export class Globe3DComponent { }
