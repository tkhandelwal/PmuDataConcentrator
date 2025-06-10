// src/app/types/three-forcegraph.d.ts
declare module 'three-forcegraph' {
  export interface NodeObject {
    id?: string | number;
    [key: string]: any;
  }

  export interface LinkObject<NodeType = NodeObject> {
    source?: string | number | NodeType;
    target?: string | number | NodeType;
    [key: string]: any;
  }
}
