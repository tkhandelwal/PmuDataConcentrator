import { Component, OnInit, OnDestroy, ViewChild, ElementRef, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';
import { PmuDataService } from '../../../core/services/pmu-data.service';
import { PmuData } from '../../../core/models/pmu-data.model';
import ForceGraph3D from '3d-force-graph';
import * as THREE from 'three';

@Component({
  selector: 'app-network-3d',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="network-3d-container">
      <mat-card class="network-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>account_tree</mat-icon>
            Power Grid Network Topology
          </mat-card-title>
          <div class="controls">
            <mat-button-toggle-group [(value)]="viewMode" (change)="updateViewMode()">
              <mat-button-toggle value="2D">2D</mat-button-toggle>
              <mat-button-toggle value="3D">3D</mat-button-toggle>
              <mat-button-toggle value="VR" *ngIf="vrSupported()">VR</mat-button-toggle>
              <mat-button-toggle value="AR" *ngIf="arSupported()">AR</mat-button-toggle>
            </mat-button-toggle-group>
            
            <mat-slide-toggle [(ngModel)]="showPowerFlow">Power Flow</mat-slide-toggle>
            <mat-slide-toggle [(ngModel)]="showNodeLabels">Labels</mat-slide-toggle>
            <mat-slide-toggle [(ngModel)]="autoRotate">Auto Rotate</mat-slide-toggle>
            
            <button mat-icon-button (click)="resetView()">
              <mat-icon>refresh</mat-icon>
            </button>
            <button mat-icon-button (click)="toggleFullscreen()">
              <mat-icon>{{ isFullscreen() ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
            </button>
          </div>
        </mat-card-header>
        
        <mat-card-content>
          <div #graphContainer class="graph-container" [class.fullscreen]="isFullscreen()">
            <div class="loading" *ngIf="isLoading()">
              <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
              <p>Loading network topology...</p>
            </div>
          </div>
          
          <!-- Node Info Panel -->
          <div class="info-panel" *ngIf="selectedNode()">
            <h3>{{ selectedNode().name }}</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Type:</span>
                <span class="value">{{ selectedNode().type }}</span>
              </div>
              <div class="info-item">
                <span class="label">Voltage:</span>
                <span class="value">{{ selectedNode().voltage | number:'1.1-1' }} kV</span>
              </div>
              <div class="info-item">
                <span class="label">Load:</span>
                <span class="value">{{ selectedNode().load | number:'1.0-0' }} MW</span>
              </div>
              <div class="info-item">
                <span class="label">Generation:</span>
                <span class="value">{{ selectedNode().generation | number:'1.0-0' }} MW</span>
              </div>
            </div>
            <button mat-button (click)="viewNodeDetails()">View Details</button>
          </div>
          
          <!-- Link Info Panel -->
          <div class="link-panel" *ngIf="selectedLink()">
            <h3>Transmission Line</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">From:</span>
                <span class="value">{{ selectedLink().source.name }}</span>
              </div>
              <div class="info-item">
                <span class="label">To:</span>
                <span class="value">{{ selectedLink().target.name }}</span>
              </div>
              <div class="info-item">
                <span class="label">Loading:</span>
                <span class="value" [style.color]="getLoadingColor(selectedLink().loading)">
                  {{ selectedLink().loading }}%
                </span>
              </div>
              <div class="info-item">
                <span class="label">Power Flow:</span>
                <span class="value">{{ selectedLink().powerFlow | number:'1.0-0' }} MW</span>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .network-3d-container {
      height: 100%;
      padding: 20px;
    }

    .network-card {
      height: 100%;
      background: #1a1a1a;
      border: 1px solid #333;
    }

    mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16px;
      border-bottom: 1px solid #333;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 20px;
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .graph-container {
      position: relative;
      width: 100%;
      height: calc(100vh - 300px);
      min-height: 500px;
      background: #0a0a0a;
      border-radius: 8px;
      overflow: hidden;
    }

    .graph-container.fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      height: 100vh;
      z-index: 9999;
    }

    .loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }

    .info-panel, .link-panel {
      position: absolute;
      bottom: 20px;
      left: 20px;
      background: rgba(26, 26, 26, 0.95);
      border: 1px solid #333;
      border-radius: 12px;
      padding: 20px;
      backdrop-filter: blur(10px);
      min-width: 300px;
    }

    .link-panel {
      left: auto;
      right: 20px;
    }

    h3 {
      margin: 0 0 16px 0;
      color: #00d4ff;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
    }

    .label {
      font-size: 12px;
      color: #999;
      text-transform: uppercase;
    }

    .value {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
    }
  `]
})
export class Network3DComponent implements OnInit, OnDestroy {
  @ViewChild('graphContainer', { static: true }) graphContainer!: ElementRef;

  private destroy$ = new Subject<void>();
  private graph: any;

  // UI State
  isLoading = signal(true);
  isFullscreen = signal(false);
  selectedNode = signal<any>(null);
  selectedLink = signal<any>(null);
  vrSupported = signal(false);
  arSupported = signal(false);

  // Display options
  viewMode = '3D';
  showPowerFlow = true;
  showNodeLabels = true;
  autoRotate = false;

  // Graph data
  private graphData = {
    nodes: [] as any[],
    links: [] as any[]
  };

  constructor(private pmuDataService: PmuDataService) {
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

  ngOnInit(): void {
    this.loadNetworkData();
    this.initializeGraph();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.graph) {
      this.graph._destructor();
    }
  }

  private loadNetworkData(): void {
    // Generate network topology based on IEEE 118-bus system
    this.generateIEEE118BusSystem();

    // Subscribe to real-time PMU data
    this.pmuDataService.getPmuDataObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe((pmuData: PmuData[]) => {
        this.updateNodeData(pmuData);
      });
  }

  private generateIEEE118BusSystem(): void {
    // Generate nodes
    const nodeTypes = ['generator', 'substation', 'load', 'switch'];
    const voltages = [765, 500, 345, 230, 138];

    for (let i = 1; i <= 118; i++) {
      this.graphData.nodes.push({
        id: i,
        name: `Bus ${i}`,
        type: nodeTypes[Math.floor(Math.random() * nodeTypes.length)],
        voltage: voltages[Math.floor(Math.random() * voltages.length)],
        load: Math.random() * 200,
        generation: i % 10 === 0 ? Math.random() * 500 : 0,
        group: Math.floor(i / 20) + 1,
        status: 'normal'
      });
    }

    // Generate realistic transmission lines
    const connections = [
      [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8],
      [1, 9], [9, 10], [10, 11], [11, 12], [12, 13],
      [3, 14], [14, 15], [15, 16], [16, 17],
      [5, 18], [18, 19], [19, 20], [20, 21],
      // Add more connections as needed
    ];

    connections.forEach(([source, target], i) => {
      this.graphData.links.push({
        id: i,
        source,
        target,
        loading: Math.random() * 100,
        powerFlow: Math.random() * 500,
        capacity: 1000,
        status: Math.random() > 0.9 ? 'overload' : 'normal'
      });
    });
  }

  private initializeGraph(): void {
    requestAnimationFrame(() => {
      const ForceGraph3D = (window as any).ForceGraph3D;
      if (!ForceGraph3D) {
        console.error('ForceGraph3D not loaded');
        return;
      }
      this.graph = new ForceGraph3D()(this.graphContainer.nativeElement)
        .graphData(this.graphData)
        .backgroundColor('#0a0a0a')
        .nodeThreeObject((node: any) => this.createNodeObject(node))
        .nodeLabel((node: any) => this.showNodeLabels ? node.name : '')
        .linkThreeObject((link: any) => this.showPowerFlow ? this.createPowerFlowObject(link) : null)
        .linkColor((link: any) => this.getLinkColor(link))
        .linkWidth((link: any) => this.getLinkWidth(link))
        .linkDirectionalArrowLength(3.5)
        .linkDirectionalArrowRelPos(1)
        .onNodeClick((node: any) => this.onNodeClick(node))
        .onLinkClick((link: any) => this.onLinkClick(link))
        .d3Force('charge')!.strength(-300)
        .d3Force('link')!.distance(100)
        .numDimensions(3)
        .enableNodeDrag(true)
        .enableNavigationControls(true)
        .showNavInfo(false);

      // Set initial camera position
      this.graph.cameraPosition({ x: 300, y: 300, z: 300 });

      // Setup auto-rotation if enabled
      this.setupAutoRotation();

      this.isLoading.set(false);
    });
  }

  private createNodeObject(node: any): THREE.Object3D {
    const group = new THREE.Group();

    // Different geometries for different node types
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;

    switch (node.type) {
      case 'generator':
        geometry = new THREE.CylinderGeometry(10, 10, 20, 8);
        material = new THREE.MeshLambertMaterial({
          color: '#4caf50',
          emissive: '#4caf50',
          emissiveIntensity: 0.2
        });
        break;
      case 'substation':
        geometry = new THREE.BoxGeometry(15, 15, 15);
        material = new THREE.MeshLambertMaterial({
          color: '#00d4ff',
          emissive: '#00d4ff',
          emissiveIntensity: 0.2
        });
        break;
      case 'load':
        geometry = new THREE.SphereGeometry(10, 12, 8);
        material = new THREE.MeshLambertMaterial({
          color: '#ff9800',
          emissive: '#ff9800',
          emissiveIntensity: 0.2
        });
        break;
      case 'switch':
        geometry = new THREE.OctahedronGeometry(8);
        material = new THREE.MeshLambertMaterial({
          color: '#9c27b0',
          emissive: '#9c27b0',
          emissiveIntensity: 0.2
        });
        break;
      default:
        geometry = new THREE.BoxGeometry(10, 10, 10);
        material = new THREE.MeshLambertMaterial({ color: '#666' });
    }

    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);

    // Add status indicator
    if (node.status === 'alarm') {
      const indicatorGeometry = new THREE.SphereGeometry(5, 8, 6);
      const indicatorMaterial = new THREE.MeshBasicMaterial({
        color: '#f44336',
        transparent: true,
        opacity: 0.8
      });
      const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
      indicator.position.y = 15;

      // Pulsing animation
      const animate = () => {
        indicator.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.2);
        requestAnimationFrame(animate);
      };
      animate();

      group.add(indicator);
    }

    return group;
  }

  private createPowerFlowObject(link: any): THREE.Object3D | null {
    if (!this.showPowerFlow || !link.source || !link.target) return null;

    const group = new THREE.Group();

    // Create animated particles for power flow
    const particleCount = 10;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: this.getLinkColor(link),
      size: 3,
      transparent: true,
      opacity: 0.8
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);
    group.add(particleSystem);

    // Animate particles along the link
    const animate = () => {
      const positions = particles.getAttribute('position').array as Float32Array;
      const time = Date.now() * 0.001;

      for (let i = 0; i < particleCount; i++) {
        const t = ((time + i / particleCount) % 1);
        const sourcePos = link.source.x || 0;
        const targetPos = link.target.x || 0;

        positions[i * 3] = sourcePos + (targetPos - sourcePos) * t;
        positions[i * 3 + 1] = (link.source.y || 0) + ((link.target.y || 0) - (link.source.y || 0)) * t;
        positions[i * 3 + 2] = (link.source.z || 0) + ((link.target.z || 0) - (link.source.z || 0)) * t;
      }

      particles.getAttribute('position').needsUpdate = true;
      requestAnimationFrame(animate);
    };

    animate();

    return group;
  }

  private getLinkColor(link: any): string {
    if (link.status === 'overload' || link.loading > 90) return '#f44336';
    if (link.loading > 80) return '#ff9800';
    return '#00d4ff';
  }

  private getLinkWidth(link: any): number {
    return 1 + (link.loading / 100) * 3;
  }

  private setupAutoRotation(): void {
    if (this.autoRotate) {
      const distance = 400;
      let angle = 0;

      const rotate = () => {
        if (this.autoRotate && this.graph) {
          angle += 0.005;
          this.graph.cameraPosition({
            x: distance * Math.sin(angle),
            y: distance * Math.sin(angle * 0.5),
            z: distance * Math.cos(angle)
          });

          requestAnimationFrame(rotate);
        }
      };

      rotate();
    }
  }

  private updateNodeData(pmuData: any[]): void {
    // Update node states based on PMU data
    pmuData.forEach(pmu => {
      const node = this.graphData.nodes.find(n => n.id === pmu.pmuId);
      if (node) {
        // Update node status based on PMU readings
        if (Math.abs(pmu.frequency - 60.0) > 0.5 || Math.abs(pmu.rocof) > 1.0) {
          node.status = 'alarm';
        } else if (Math.abs(pmu.frequency - 60.0) > 0.2 || Math.abs(pmu.rocof) > 0.5) {
          node.status = 'warning';
        } else {
          node.status = 'normal';
        }

        // Update voltage
        if (pmu.phasors && pmu.phasors.length > 0) {
          const vPhasor = pmu.phasors.find((p: any) => p.type === 0);
          if (vPhasor) {
            node.voltage = vPhasor.magnitude / 1000;
          }
        }
      }
    });

    // Update graph
    if (this.graph) {
      this.graph.graphData(this.graphData);
    }
  }

  // Event handlers
  onNodeClick(node: any): void {
    this.selectedNode.set(node);
    this.selectedLink.set(null);
  }

  onLinkClick(link: any): void {
    this.selectedLink.set(link);
    this.selectedNode.set(null);
  }

  updateViewMode(): void {
    if (this.viewMode === '2D') {
      this.graph.numDimensions(2);
      this.graph.cameraPosition({ x: 0, y: 0, z: 1000 }, { x: 0, y: 0, z: 0 }, 1000);
    } else if (this.viewMode === '3D') {
      this.graph.numDimensions(3);
      this.graph.cameraPosition({ x: 300, y: 300, z: 300 }, { x: 0, y: 0, z: 0 }, 1000);
    } else if (this.viewMode === 'VR') {
      this.enterVRMode();
    } else if (this.viewMode === 'AR') {
      this.enterARMode();
    }
  }

  async enterVRMode(): Promise<void> {
    // Dynamically import VR module
    const { default: ForceGraphVR } = await import('3d-force-graph-vr');

    // Create VR graph
    const vrGraph = ForceGraphVR()(this.graphContainer.nativeElement)
      .graphData(this.graphData)
      .nodeThreeObject((node: any) => this.createNodeObject(node))
      .linkColor((link: any) => this.getLinkColor(link));

    // Enter VR
    if ('xr' in navigator) {
      const xr = (navigator as any).xr;
      const session = await xr.requestSession('immersive-vr');
      console.log('VR session started:', session);
    }
  }

  async enterARMode(): Promise<void> {
    // Dynamically import AR module
    const { default: ForceGraphAR } = await import('3d-force-graph-ar');

    // Create AR graph
    const arGraph = ForceGraphAR()(this.graphContainer.nativeElement)
      .graphData(this.graphData)
      .nodeThreeObject((node: any) => this.createNodeObject(node))
      .arScale(50);

    console.log('AR mode initialized');
  }

  viewNodeDetails(): void {
    const node = this.selectedNode();
    if (node) {
      console.log('View details for node:', node);
    }
  }

  getLoadingColor(loading: number): string {
    if (loading > 90) return '#f44336';
    if (loading > 80) return '#ff9800';
    return '#4caf50';
  }

  resetView(): void {
    this.graph.cameraPosition({ x: 300, y: 300, z: 300 }, { x: 0, y: 0, z: 0 }, 1000);
  }

  toggleFullscreen(): void {
    const container = this.graphContainer.nativeElement;

    if (!document.fullscreenElement) {
      container.requestFullscreen();
      this.isFullscreen.set(true);
    } else {
      document.exitFullscreen();
      this.isFullscreen.set(false);
    }
  }
}
