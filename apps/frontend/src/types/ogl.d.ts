declare module 'ogl' {
  export class Renderer {
    constructor(options?: {
      canvas?: HTMLCanvasElement;
      width?: number;
      height?: number;
      dpr?: number;
      alpha?: boolean;
      depth?: boolean;
      stencil?: boolean;
      antialias?: boolean;
      premultipliedAlpha?: boolean;
      preserveDrawingBuffer?: boolean;
      powerPreference?: string;
      autoClear?: boolean;
      webgl?: number;
    });
    gl: WebGLRenderingContext & { canvas: HTMLCanvasElement };
    dpr: number;
    alpha: boolean;
    color: boolean;
    depth: boolean;
    stencil: boolean;
    premultipliedAlpha: boolean;
    autoClear: boolean;
    width: number;
    height: number;
    setSize(width: number, height: number): void;
    setViewport(width: number, height: number): void;
    render(options: { scene: Mesh | Transform; camera?: Camera; target?: RenderTarget; update?: boolean; sort?: boolean; frustumCull?: boolean; clear?: boolean }): void;
  }

  export class Program {
    constructor(
      gl: WebGLRenderingContext,
      options: {
        vertex: string;
        fragment: string;
        uniforms?: Record<string, { value: unknown }>;
        transparent?: boolean;
        cullFace?: number | false;
        frontFace?: number;
        depthTest?: boolean;
        depthWrite?: boolean;
        depthFunc?: number;
      }
    );
    uniforms: Record<string, { value: unknown }>;
    gl: WebGLRenderingContext;
    id: number;
  }

  export class Mesh {
    constructor(
      gl: WebGLRenderingContext,
      options: {
        geometry: Geometry | Triangle;
        program: Program;
        mode?: number;
        frustumCulled?: boolean;
        renderOrder?: number;
      }
    );
    geometry: Geometry;
    program: Program;
    mode: number;
    id: number;
    visible: boolean;
    renderOrder: number;
    frustumCulled: boolean;
    draw(options?: { camera?: Camera }): void;
  }

  export class Triangle {
    constructor(gl: WebGLRenderingContext);
  }

  export class Geometry {
    constructor(gl: WebGLRenderingContext, attributes?: Record<string, unknown>);
  }

  export class Transform {
    constructor();
    children: Transform[];
    parent: Transform | null;
    visible: boolean;
    position: Vec3;
    quaternion: Quat;
    scale: Vec3;
    rotation: Euler;
    up: Vec3;
    matrix: Mat4;
    worldMatrix: Mat4;
    matrixAutoUpdate: boolean;
    worldMatrixNeedsUpdate: boolean;
    setParent(parent: Transform | null, notifyParent?: boolean): void;
    addChild(child: Transform, notifyChild?: boolean): void;
    removeChild(child: Transform, notifyChild?: boolean): void;
    updateMatrixWorld(force?: boolean): void;
    updateMatrix(): void;
    traverse(callback: (node: Transform) => void): void;
    decompose(): void;
    lookAt(target: Vec3 | number[], invert?: boolean): void;
  }

  export class Camera extends Transform {
    constructor(gl: WebGLRenderingContext, options?: { near?: number; far?: number; fov?: number; aspect?: number; left?: number; right?: number; bottom?: number; top?: number; zoom?: number });
    near: number;
    far: number;
    fov: number;
    aspect: number;
    projectionMatrix: Mat4;
    viewMatrix: Mat4;
    projectionViewMatrix: Mat4;
    worldPosition: Vec3;
    perspective(options?: { near?: number; far?: number; fov?: number; aspect?: number }): this;
    orthographic(options?: { near?: number; far?: number; left?: number; right?: number; bottom?: number; top?: number; zoom?: number }): this;
    updateMatrixWorld(): void;
    lookAt(target: Vec3 | number[]): void;
    project(v: Vec3): this;
    unproject(v: Vec3): this;
    updateFrustum(): void;
    frustumIntersectsMesh(node: Mesh): boolean;
    frustumIntersectsSphere(center: Vec3, radius: number): boolean;
  }

  export class RenderTarget {
    constructor(gl: WebGLRenderingContext, options?: { width?: number; height?: number; target?: number; color?: number; depth?: boolean; stencil?: boolean; depthTexture?: boolean; wrapS?: number; wrapT?: number; minFilter?: number; magFilter?: number; type?: number; format?: number; internalFormat?: number; unpackAlignment?: number; premultiplyAlpha?: boolean });
  }

  export class Vec3 {
    constructor(x?: number, y?: number, z?: number);
    x: number;
    y: number;
    z: number;
    set(x: number, y?: number, z?: number): this;
    copy(v: Vec3): this;
    add(va: Vec3, vb?: Vec3): this;
    sub(va: Vec3, vb?: Vec3): this;
    multiply(v: Vec3 | number): this;
    divide(v: Vec3 | number): this;
    inverse(v?: Vec3): this;
    len(): number;
    distance(v: Vec3): number;
    squaredLen(): number;
    squaredDistance(v: Vec3): number;
    negate(v?: Vec3): this;
    cross(va: Vec3, vb?: Vec3): this;
    scale(v: number): this;
    normalize(): this;
    dot(v: Vec3): number;
    equals(v: Vec3): boolean;
    applyMatrix4(mat4: Mat4): this;
    scaleRotateMatrix4(mat4: Mat4): this;
    applyQuaternion(q: Quat): this;
    angle(v: Vec3): number;
    lerp(v: Vec3, t: number): this;
    clone(): Vec3;
    fromArray(a: number[], o?: number): this;
    toArray(a?: number[], o?: number): number[];
    transformDirection(mat4: Mat4): this;
  }

  export class Mat4 {
    constructor(
      m00?: number, m01?: number, m02?: number, m03?: number,
      m10?: number, m11?: number, m12?: number, m13?: number,
      m20?: number, m21?: number, m22?: number, m23?: number,
      m30?: number, m31?: number, m32?: number, m33?: number
    );
  }

  export class Quat {
    constructor(x?: number, y?: number, z?: number, w?: number);
    x: number;
    y: number;
    z: number;
    w: number;
  }

  export class Euler {
    constructor(x?: number, y?: number, z?: number, order?: string);
    x: number;
    y: number;
    z: number;
    order: string;
  }
}
