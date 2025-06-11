// src/app/types/3d-force-graph.d.ts
declare module '3d-force-graph' {
  const ForceGraph3D: any;
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

declare module 'three-forcegraph' {
  export type NodeObject = any;
  export type LinkObject = any;
  export type ThreeForceGraphGeneric = any;
}

declare module 'three' {
  export type Renderer = any;
}
