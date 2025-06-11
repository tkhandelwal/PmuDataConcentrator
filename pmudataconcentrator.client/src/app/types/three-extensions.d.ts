// src/app/types/three-extensions.d.ts
declare module 'three' {
  // Re-export everything from the main three module
  export * from 'three/src/Three';

  // Add any missing exports that the type definitions might not include
  export type Renderer = WebGLRenderer;

  // Ensure these are exported (they should be, but this makes it explicit)
  export {
    WebGLRenderer,
    WebGLRendererParameters,
    Camera,
    Scene,
    Light,
    Object3D,
    Material,
    Mesh,
    Group,
    Vector3,
    Vector2,
    Texture,
    BufferGeometry,
    BufferAttribute,
    BoxGeometry,
    SphereGeometry,
    CylinderGeometry,
    OctahedronGeometry,
    MeshLambertMaterial,
    MeshBasicMaterial,
    PointsMaterial,
    Points,
    Clock,
    WebGLRenderTarget,
    ShaderMaterial,
    Controls,
    MOUSE,
    TOUCH
  };
}

// Extend the window object
declare global {
  interface Window {
    THREE: typeof import('three');
    ForceGraph3D: any;
    ForceGraphVR: any;
    ForceGraphAR: any;
    L: any;
    pmuMapComponent: any;
  }
}
