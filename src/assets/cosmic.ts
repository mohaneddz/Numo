/**
 * cosmicShader.ts
 *
 * Self-contained WebGL2 cosmic background renderer.
 * Procedural, animated, no textures, no external dependencies.
 *
 * Usage:
 *   import { CosmicShader } from './cosmicShader';
 *   const shader = new CosmicShader(canvasElement);
 *   shader.start();
 *   // later:
 *   shader.stop();
 *   shader.destroy();
 */

// ─── GLSL Sources ─────────────────────────────────────────────────────────────

const VERT_SRC = /* glsl */ `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAG_SRC = /* glsl */ `#version 300 es
precision highp float;

uniform float u_time;

in  vec2 v_uv;
out vec4 fragColor;

// ════════════════════════════════════════════════════════
// UTILITY: Hash / Noise primitives
// ════════════════════════════════════════════════════════

// High-quality 2D → 1D hash — no visible tiling pattern
float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

// Smooth value noise (bilinear over hash grid)
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f); // smoothstep

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Fractional Brownian Motion — 5 octaves (60fps target on mid hardware)
// Domain rotated each octave to break axis-aligned banding
float fbm(vec2 p) {
  float value     = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  mat2  rot       = mat2(0.8, -0.6, 0.6, 0.8);

  for (int i = 0; i < 3; i++) {
    value     += amplitude * vnoise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
    p          = rot * p;
  }
  return value;
}

// ════════════════════════════════════════════════════════
// SECTION 1: Background Gradient
//   Deep navy at edges → subtle cobalt lift at lower-centre
// ════════════════════════════════════════════════════════

vec3 backgroundGradient(vec2 uv) {
  vec3 deepSpace  = vec3(0.01, 0.02, 0.07);
  vec3 centerGlow = vec3(0.04, 0.07, 0.22);

  // Subtle shift in the background center
  vec2 origin = vec2(0.5 + 0.05 * sin(u_time * 0.4), 0.62 + 0.03 * cos(u_time * 0.3));
  float d = length((uv - origin) * vec2(1.0, 0.7));
  float t = smoothstep(0.0, 0.9, 1.0 - d);

  return mix(deepSpace, centerGlow, t * 0.7);
}

// ════════════════════════════════════════════════════════
// SECTION 2: Nebula Layer  (Moving clouds)
// ════════════════════════════════════════════════════════

vec3 nebulaLayer(vec2 uv) {
  float tSlow = u_time * 0.12; // Base drift

  // Cloud A — violet/purple sweep across upper half
  vec2  pA     = uv * vec2(2.0, 1.5) + vec2(tSlow * 0.8, tSlow * 0.3);
  vec2  warpA  = vec2(vnoise(pA + tSlow), vnoise(pA - tSlow));
  float cloudA = fbm(pA + warpA * 1.5);
  cloudA       = smoothstep(0.35, 0.75, cloudA);

  float maskA = smoothstep(0.0, 0.6, 1.0 - uv.y)
              * smoothstep(0.0, 0.4,  uv.x)
              * smoothstep(0.0, 0.4,  1.0 - uv.x);
  cloudA *= maskA;

  vec3 colA = mix(vec3(0.08, 0.04, 0.18), vec3(0.25, 0.06, 0.45), cloudA);

  // Cloud B — deep cyan wisps on lower flanks
  vec2  pB     = uv * vec2(1.5, 2.0) + vec2(-tSlow * 1.4, tSlow * 0.4) + vec2(3.7, 1.2);
  vec2  warpB  = vec2(vnoise(pB - tSlow), vnoise(pB + tSlow));
  float cloudB = fbm(pB + warpB * 1.2);
  cloudB       = smoothstep(0.40, 0.70, cloudB);

  float maskB = smoothstep(0.3, 0.9, uv.y)
              * (1.0 - smoothstep(0.0, 1.0, abs(uv.x - 0.5) * 0.7));
  cloudB *= maskB * 0.6;

  vec3 colB = mix(vec3(0.0, 0.06, 0.18), vec3(0.0, 0.35, 0.55), cloudB);

  return (colA * cloudA * 0.55) + (colB * cloudB * 0.5);
}

// ════════════════════════════════════════════════════════
// SECTION 2.5: Aurora Layer (Top moving lights)
// ════════════════════════════════════════════════════════

vec3 auroraLayer(vec2 uv) {
  float t = u_time * 0.25;
  vec2 p = uv * vec2(1.0, 3.0);
  
  // Wavy vertical bands at the top
  float noise = fbm(p + vec2(t, -t * 0.4));
  float aurora = smoothstep(0.4, 0.8, noise);
  
  // Mask to keep it at the top
  float mask = smoothstep(0.4, 0.0, uv.y);
  mask *= smoothstep(0.0, 0.5, uv.x) * smoothstep(1.0, 0.5, uv.x);
  
  vec3 color = mix(vec3(0.0, 0.1, 0.3), vec3(0.4, 0.1, 0.5), noise);
  return color * aurora * mask * 0.7;
}

// ════════════════════════════════════════════════════════
// SECTION 3: Star Field
// ════════════════════════════════════════════════════════

float starField(vec2 uv) {
  const float GRID = 160.0;
  vec2  drift = u_time * vec2(-0.035, 0.015); 
  vec2  p     = uv * GRID + drift;
  vec2  cell  = floor(p);
  vec2  local = fract(p);

  float h = hash(cell);
  if (h > 0.045) return 0.0; // ~95.5% of cells: no star

  vec2  centre = vec2(hash(cell + 7.3), hash(cell + 13.7));
  float dist   = length(local - centre);
  float star   = smoothstep(0.08, 0.0, dist);

  // Twinkle for ~30% of visible stars
  float twinkle = 1.0;
  if (h < 0.02) {
    float phase = hash(cell + 99.1) * 6.2831;
    float rate  = 2.0 + hash(cell + 55.5) * 4.5;
    twinkle     = 0.3 + 0.7 * sin(u_time * rate + phase);
  }

  return star * twinkle;
}

// ════════════════════════════════════════════════════════
// SECTION 4: Horizon Bloom
// ════════════════════════════════════════════════════════

vec3 horizonBloom(vec2 uv) {
  vec2  origin = vec2(0.5, 1.05);
  vec2  delta  = (uv - origin) * vec2(0.6, 1.0); // horizontal stretch
  float dist   = length(delta);
  
  // Subtle pulse in the bloom
  float pulse = 1.0 + 0.08 * sin(u_time * 0.8);
  float bloom  = pow(max(0.0, 1.0 - dist * 1.55 * pulse), 3.5);

  vec3 inner = vec3(0.15, 0.58, 1.00); 
  vec3 outer = vec3(0.02, 0.07, 0.25); 

  return mix(outer, inner, bloom) * bloom * 0.6;
}

// ════════════════════════════════════════════════════════
// SECTION 5: Vignette
// ════════════════════════════════════════════════════════

float vignette(vec2 uv) {
  vec2 c = uv - 0.5;
  return smoothstep(0.85, 0.25, length(c * vec2(1.2, 1.0)));
}

// ════════════════════════════════════════════════════════
// MAIN — composite all layers
// ════════════════════════════════════════════════════════

void main() {
  vec2 uv = v_uv;

  // 1. Base gradient
  vec3 col = backgroundGradient(uv);

  // 2. Nebula clouds & Top aurora (additive)
  col += nebulaLayer(uv);
  col += auroraLayer(uv); // New top moving lights

  // 3. Stars — suppress near bloom zone (additive)
  float starVal = starField(uv) * smoothstep(0.0, 0.12, uv.y);
  col += starVal * vec3(0.75, 0.88, 1.0);

  // 4. Horizon bloom (additive)
  col += horizonBloom(uv);

  // 5. Vignette (multiply)
  col *= vignette(uv);

  col = clamp(col, 0.0, 1.0);
  fragColor = vec4(col, 1.0);
}
`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CosmicShaderOptions {
  /** Cap device pixel ratio (default: 2). Lower = better perf on HiDPI. */
  maxDpr?: number;
}

// ─── CosmicShader ─────────────────────────────────────────────────────────────

export class CosmicShader {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;

  private uTime: WebGLUniformLocation | null = null;
  private rafId: number | null = null;
  private offset = 0;
  private lastTs: number | null = null;
  private resizeObserver: ResizeObserver;
  private readonly maxDpr: number;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    options: CosmicShaderOptions = {},
  ) {
    this.maxDpr = options.maxDpr ?? 2;

    const gl = canvas.getContext('webgl2');
    if (!gl) throw new Error('CosmicShader: WebGL2 is not supported in this environment.');
    this.gl = gl;

    this.program     = this.buildProgram();
    this.vao         = this.buildQuad();
    this.uTime       = this.requireUniform('u_time');

    // Keep canvas pixel size in sync with its CSS size automatically
    this.resizeObserver = new ResizeObserver(() => this.syncSize());
    this.resizeObserver.observe(canvas);
    this.syncSize();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Begin (or resume) the render loop. */
  start(): void {
    if (this.rafId !== null) return;
    this.lastTs = null;
    this.rafId  = requestAnimationFrame(this.loop);
  }

  /** Pause the render loop without resetting time. */
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /** Reset animation time to zero. */
  resetTime(): void {
    this.offset = 0;
    this.lastTs = null;
  }

  /** Free all WebGL resources and disconnect the ResizeObserver. */
  destroy(): void {
    this.stop();
    this.resizeObserver.disconnect();
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteProgram(this.program);
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  /** Arrow function preserves `this` when passed to rAF. */
  private readonly loop = (ts: number): void => {
    this.rafId = requestAnimationFrame(this.loop);

    if (this.lastTs === null) this.lastTs = ts;
    this.offset += (ts - this.lastTs) / 1000; // accumulate seconds
    this.lastTs  = ts;

    this.render();
  };

  private render(): void {
    const { gl } = this;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniform1f(this.uTime, this.offset);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /** Resize the backing buffer to match the canvas CSS size × DPR. */
  private syncSize(): void {
    const { canvas, gl, maxDpr } = this;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const w   = Math.round(canvas.clientWidth  * dpr);
    const h   = Math.round(canvas.clientHeight * dpr);

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width  = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  private buildProgram(): WebGLProgram {
    const { gl } = this;
    const vert   = this.compileShader(VERT_SRC, gl.VERTEX_SHADER);
    const frag   = this.compileShader(FRAG_SRC, gl.FRAGMENT_SHADER);

    const prog = gl.createProgram();
    if (!prog) throw new Error('CosmicShader: failed to create WebGLProgram.');

    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);

    // Shaders are baked into the program; safe to release immediately
    gl.deleteShader(vert);
    gl.deleteShader(frag);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(prog);
      gl.deleteProgram(prog);
      throw new Error(`CosmicShader: program link failed.\n${log}`);
    }

    return prog;
  }

  private compileShader(src: string, type: GLenum): WebGLShader {
    const { gl } = this;
    const shader  = gl.createShader(type);
    if (!shader) throw new Error('CosmicShader: failed to allocate shader object.');

    gl.shaderSource(shader, src);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`CosmicShader: shader compile error.\n${log}`);
    }

    return shader;
  }

  private buildQuad(): WebGLVertexArrayObject {
    const { gl } = this;

    const vao = gl.createVertexArray();
    if (!vao) throw new Error('CosmicShader: failed to create VAO.');
    gl.bindVertexArray(vao);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    // Two triangles → full clip-space quad
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1,  1, -1, -1,  1,   1, -1,  1,  1, -1,  1]),
      gl.STATIC_DRAW,
    );

    const loc = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    return vao;
  }

  private requireUniform(name: string): WebGLUniformLocation {
    const loc = this.gl.getUniformLocation(this.program, name);
    if (!loc) console.warn(`CosmicShader: uniform '${name}' not found in program (might be optimized out).`);
    return loc as WebGLUniformLocation;
  }
}