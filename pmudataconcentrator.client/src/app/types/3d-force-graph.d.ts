// src/app/types/3d-force-graph.d.ts
declare module '3d-force-graph' {
  export default function ForceGraph3D(): any;
}

declare module '3d-force-graph-vr' {
  export default function ForceGraphVR(): any;
}

declare module '3d-force-graph-ar' {
  export default function ForceGraphAR(): any;
}

declare module 'three-forcegraph' {
  export interface NodeObject {
    id?: string | number;
    [key: string]: any;
  }

  export interface LinkObject {
    source?: string | number | NodeObject;
    target?: string | number | NodeObject;
    [key: string]: any;
  }

  // Add the missing export
  export class ThreeForceGraphGeneric { }
}

declare module 'three' {
  // Add the missing Renderer type
  export type Renderer = WebGLRenderer;
}
