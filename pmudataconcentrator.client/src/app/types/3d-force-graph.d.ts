// src/app/types/3d-force-graph.d.ts
declare module '3d-force-graph' {
  export interface ForceGraph3DInstance {
    (element: HTMLElement): ForceGraph3DInstance;
    graphData(data: any): ForceGraph3DInstance;
    nodeThreeObject(fn: (node: any) => any): ForceGraph3DInstance;
    linkThreeObject(fn: (link: any) => any): ForceGraph3DInstance;
    backgroundColor(color: string): ForceGraph3DInstance;
    nodeLabel(fn: (node: any) => string): ForceGraph3DInstance;
    linkColor(fn: (link: any) => string): ForceGraph3DInstance;
    linkWidth(fn: (link: any) => number): ForceGraph3DInstance;
    linkDirectionalArrowLength(length: number): ForceGraph3DInstance;
    linkDirectionalArrowRelPos(pos: number): ForceGraph3DInstance;
    onNodeClick(fn: (node: any) => void): ForceGraph3DInstance;
    onLinkClick(fn: (link: any) => void): ForceGraph3DInstance;
    d3Force(name: string): any;
    numDimensions(num: number): ForceGraph3DInstance;
    enableNodeDrag(enable: boolean): ForceGraph3DInstance;
    enableNavigationControls(enable: boolean): ForceGraph3DInstance;
    showNavInfo(show: boolean): ForceGraph3DInstance;
    cameraPosition(pos: any, lookAt?: any, duration?: number): ForceGraph3DInstance;
    _destructor(): void;
  }

  const ForceGraph3D: ForceGraph3DInstance;
  export default ForceGraph3D;
}

declare module '3d-force-graph-vr' {
  const ForceGraphVR: any;
  export default ForceGraphVR;
}

declare module '3d-force-graph-ar' {
  const ForceGraphAR: any;
  export default ForceGraphAR;
}
