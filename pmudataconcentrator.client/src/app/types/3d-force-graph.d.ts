// src/app/types/3d-force-graph.d.ts
declare module '3d-force-graph' {
  export interface NodeObject {
    id?: string | number;
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    fx?: number;
    fy?: number;
    fz?: number;
    [key: string]: any;
  }

  export interface LinkObject<NodeType = NodeObject> {
    source?: string | number | NodeType;
    target?: string | number | NodeType;
    [key: string]: any;
  }

  export interface ForceGraphInstance {
    // Data methods
    graphData(data: { nodes: NodeObject[]; links: LinkObject[] }): ForceGraphInstance;
    nodeId(fn: string | ((node: NodeObject) => string | number)): ForceGraphInstance;
    linkSource(fn: string | ((link: LinkObject) => string | number | NodeObject)): ForceGraphInstance;
    linkTarget(fn: string | ((link: LinkObject) => string | number | NodeObject)): ForceGraphInstance;

    // Styling methods
    backgroundColor(color: string): ForceGraphInstance;
    nodeThreeObject(fn: (node: NodeObject) => any): ForceGraphInstance;
    nodeThreeObjectExtend(fn: boolean | ((node: NodeObject) => boolean)): ForceGraphInstance;
    nodeLabel(fn: string | ((node: NodeObject) => string)): ForceGraphInstance;
    nodeColor(fn: string | ((node: NodeObject) => string)): ForceGraphInstance;
    nodeOpacity(opacity: number): ForceGraphInstance;
    nodeVisibility(fn: boolean | ((node: NodeObject) => boolean)): ForceGraphInstance;
    nodeRelSize(size: number): ForceGraphInstance;
    nodeVal(fn: number | string | ((node: NodeObject) => number)): ForceGraphInstance;
    nodeResolution(resolution: number): ForceGraphInstance;

    // Link styling
    linkThreeObject(fn: (link: LinkObject) => any): ForceGraphInstance;
    linkThreeObjectExtend(fn: boolean | ((link: LinkObject) => boolean)): ForceGraphInstance;
    linkLabel(fn: string | ((link: LinkObject) => string)): ForceGraphInstance;
    linkColor(fn: string | ((link: LinkObject) => string)): ForceGraphInstance;
    linkOpacity(opacity: number): ForceGraphInstance;
    linkVisibility(fn: boolean | ((link: LinkObject) => boolean)): ForceGraphInstance;
    linkWidth(fn: number | string | ((link: LinkObject) => number)): ForceGraphInstance;
    linkResolution(resolution: number): ForceGraphInstance;
    linkCurvature(fn: number | string | ((link: LinkObject) => number)): ForceGraphInstance;
    linkCurveRotation(fn: number | string | ((link: LinkObject) => number)): ForceGraphInstance;
    linkMaterial(fn: any | ((link: LinkObject) => any)): ForceGraphInstance;
    linkDirectionalArrowLength(length: number | string | ((link: LinkObject) => number)): ForceGraphInstance;
    linkDirectionalArrowColor(fn: string | ((link: LinkObject) => string)): ForceGraphInstance;
    linkDirectionalArrowRelPos(fn: number | string | ((link: LinkObject) => number)): ForceGraphInstance;
    linkDirectionalParticles(fn: number | string | ((link: LinkObject) => number)): ForceGraphInstance;
    linkDirectionalParticleSpeed(fn: number | string | ((link: LinkObject) => number)): ForceGraphInstance;
    linkDirectionalParticleWidth(fn: number | string | ((link: LinkObject) => number)): ForceGraphInstance;
    linkDirectionalParticleColor(fn: string | ((link: LinkObject) => string)): ForceGraphInstance;
    linkDirectionalParticleResolution(resolution: number): ForceGraphInstance;

    // Force engine
    numDimensions(dimensions: 1 | 2 | 3): ForceGraphInstance;
    d3Force(forceName: string, force?: any): any;
    d3ReheatSimulation(): ForceGraphInstance;
    d3AlphaDecay(decay: number): ForceGraphInstance;
    d3VelocityDecay(decay: number): ForceGraphInstance;
    warmupTicks(ticks: number): ForceGraphInstance;
    cooldownTicks(ticks: number): ForceGraphInstance;
    cooldownTime(ms: number): ForceGraphInstance;

    // Interaction
    onNodeClick(fn: (node: NodeObject, event: MouseEvent) => void): ForceGraphInstance;
    onNodeRightClick(fn: (node: NodeObject, event: MouseEvent) => void): ForceGraphInstance;
    onNodeHover(fn: (node: NodeObject | null, previousNode: NodeObject | null) => void): ForceGraphInstance;
    onNodeDrag(fn: (node: NodeObject, translate: { x: number; y: number }) => void): ForceGraphInstance;
    onNodeDragEnd(fn: (node: NodeObject, translate: { x: number; y: number }) => void): ForceGraphInstance;
    onLinkClick(fn: (link: LinkObject, event: MouseEvent) => void): ForceGraphInstance;
    onLinkRightClick(fn: (link: LinkObject, event: MouseEvent) => void): ForceGraphInstance;
    onLinkHover(fn: (link: LinkObject | null, previousLink: LinkObject | null) => void): ForceGraphInstance;
    onBackgroundClick(fn: (event: MouseEvent) => void): ForceGraphInstance;
    onBackgroundRightClick(fn: (event: MouseEvent) => void): ForceGraphInstance;
    enableNodeDrag(enable: boolean): ForceGraphInstance;
    enableNavigationControls(enable: boolean): ForceGraphInstance;
    enablePointerInteraction(enable: boolean): ForceGraphInstance;

    // Camera
    cameraPosition(position: { x?: number; y?: number; z?: number }, lookAt?: { x?: number; y?: number; z?: number }, transitionMs?: number): ForceGraphInstance;
    zoomToFit(durationMs?: number, padding?: number, nodeFilter?: (node: NodeObject) => boolean): ForceGraphInstance;

    // Utility
    pauseAnimation(): ForceGraphInstance;
    resumeAnimation(): ForceGraphInstance;
    refresh(): ForceGraphInstance;

    // Scene access
    scene(): any; // THREE.Scene
    camera(): any; // THREE.Camera
    renderer(): any; // THREE.WebGLRenderer
    controls(): any; // THREE.OrbitControls

    // Additional methods
    showNavInfo(show: boolean): ForceGraphInstance;
    [key: string]: any;
  }

  // This is the factory function that returns a constructor
  export interface ForceGraph3DConstructor {
    (element: HTMLElement): ForceGraphInstance;
  }

  // ForceGraph3D() returns a constructor function
  function ForceGraph3D(): ForceGraph3DConstructor;

  export default ForceGraph3D;
}

declare module '3d-force-graph-vr' {
  import { NodeObject, LinkObject, ForceGraphInstance } from '3d-force-graph';

  export { NodeObject, LinkObject };

  export interface ForceGraphVRInstance extends ForceGraphInstance {
    // VR-specific methods
    [key: string]: any;
  }

  export interface ForceGraphVRConstructor {
    (element: HTMLElement): ForceGraphVRInstance;
  }

  function ForceGraphVR(): ForceGraphVRConstructor;

  export default ForceGraphVR;
}

declare module '3d-force-graph-ar' {
  import { NodeObject, LinkObject, ForceGraphInstance } from '3d-force-graph';

  export { NodeObject, LinkObject };

  export interface ForceGraphARInstance extends ForceGraphInstance {
    // AR-specific methods - explicitly define them
    arScale(scale: number): ForceGraphARInstance;
    arEnabled(): boolean;
    arEnabled(enabled: boolean): ForceGraphARInstance;
    markerSize(): number;
    markerSize(size: number): ForceGraphARInstance;
    glScale(): number;
    glScale(scale: number): ForceGraphARInstance;
    // Add other AR-specific methods as needed
  }

  export interface ForceGraphARConstructor {
    (element: HTMLElement): ForceGraphARInstance;
  }

  function ForceGraphAR(): ForceGraphARConstructor;

  export default ForceGraphAR;
}

// Keep the rest of the module declarations...
declare module 'three-forcegraph' {
  import { Object3D, Material } from 'three';

  export interface NodeObject {
    id?: string | number;
    [key: string]: any;
  }

  export interface LinkObject<NodeType = NodeObject> {
    source?: string | number | NodeType;
    target?: string | number | NodeType;
    [key: string]: any;
  }

  export class ThreeForceGraphGeneric<ChainableInstance, NodeType = NodeObject, LinkType = LinkObject<NodeType>> {
    constructor(...args: any[]);
    [key: string]: any;
  }

  export class ThreeForceGraph<NodeType = NodeObject, LinkType = LinkObject<NodeType>>
    extends ThreeForceGraphGeneric<ThreeForceGraph<NodeType, LinkType>, NodeType, LinkType> {
    constructor(element?: HTMLElement);
  }
}

declare module 'globe.gl' {
  export interface GlobeInstance {
    globeImageUrl(url: string): GlobeInstance;
    bumpImageUrl(url: string): GlobeInstance;
    backgroundImageUrl(url: string): GlobeInstance;
    showAtmosphere(show: boolean): GlobeInstance;
    atmosphereColor(color: string): GlobeInstance;
    atmosphereAltitude(altitude: number): GlobeInstance;
    enablePointerInteraction(enable: boolean): GlobeInstance;
    pointOfView(coords: { lat?: number; lng?: number; altitude?: number }, transitionMs?: number): GlobeInstance;

    // Data layers
    pointsData(data: any[]): GlobeInstance;
    pointLat(accessor: string | ((d: any) => number)): GlobeInstance;
    pointLng(accessor: string | ((d: any) => number)): GlobeInstance;
    pointColor(accessor: string | ((d: any) => string)): GlobeInstance;
    pointAltitude(accessor: number | string | ((d: any) => number)): GlobeInstance;
    pointRadius(accessor: number | string | ((d: any) => number)): GlobeInstance;
    pointLabel(accessor: string | ((d: any) => string)): GlobeInstance;
    onPointClick(fn: (point: any, event: MouseEvent) => void): GlobeInstance;
    onPointHover(fn: (point: any | null, prevPoint: any | null) => void): GlobeInstance;

    // Arcs
    arcsData(data: any[]): GlobeInstance;
    arcStartLat(accessor: string | ((d: any) => number)): GlobeInstance;
    arcStartLng(accessor: string | ((d: any) => number)): GlobeInstance;
    arcEndLat(accessor: string | ((d: any) => number)): GlobeInstance;
    arcEndLng(accessor: string | ((d: any) => number)): GlobeInstance;
    arcColor(accessor: string | ((d: any) => string)): GlobeInstance;
    arcStroke(accessor: number | string | ((d: any) => number)): GlobeInstance;
    arcDashLength(length: number): GlobeInstance;
    arcDashGap(gap: number): GlobeInstance;
    arcDashAnimateTime(time: number | ((d: any) => number)): GlobeInstance;
    arcLabel(accessor: string | ((d: any) => string)): GlobeInstance;
    onArcClick(fn: (arc: any, event: MouseEvent) => void): GlobeInstance;

    // Hex bins
    hexBinPointsData(data: any[]): GlobeInstance;
    hexBinPointLat(accessor: string | ((d: any) => number)): GlobeInstance;
    hexBinPointLng(accessor: string | ((d: any) => number)): GlobeInstance;
    hexBinPointWeight(accessor: string | ((d: any) => number)): GlobeInstance;
    hexAltitude(accessor: number | ((d: any) => number)): GlobeInstance;
    hexBinResolution(resolution: number): GlobeInstance;
    hexTopColor(accessor: string | ((d: any) => string)): GlobeInstance;
    hexSideColor(accessor: string | ((d: any) => string)): GlobeInstance;
    hexBinMerge(merge: boolean): GlobeInstance;
    hexTransitionDuration(duration: number): GlobeInstance;

    // Utility
    _destructor(): void;
    [key: string]: any;
  }

  // Globe is a factory function, not a constructor
  function Globe(container?: HTMLElement): GlobeInstance;

  export default Globe;
}

declare module 'three-globe' {
  import { Object3D } from 'three';

  export default class ThreeGlobe extends Object3D {
    constructor(...args: any[]);
    [key: string]: any;
  }
}
