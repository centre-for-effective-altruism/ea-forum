export type BannerLineColors = { lead: string; deep: string; tint: string };

type DrawArgs = {
  container: HTMLElement;
  text: HTMLElement;
  colors: BannerLineColors;
};

type Rgb = [number, number, number];

type LinesState = {
  width: number;
  height: number;
  rects: Float32Array;
  rectCount: number;
  deep: Rgb;
  lead: Rgb;
  tint: Rgb;
};

export type BannerLinesRenderer = {
  /**
   * With `animate`, the lines and colours move from their previous state to
   * the new one rather than snapping.
   */
  draw: (args: DrawArgs, options?: { animate?: boolean }) => void;
  dispose: () => void;
};

const MAX_DPR = 2;
const MAX_TEXT_RECTS = 32;
const TRANSITION_MS = 200;

const vertexShaderSource = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const textDistanceLoop = (name: "From" | "To") => `
  float soft${name} = 1e9;
  float hard${name} = 1e9;
  for (int i = 0; i < MAX_TEXT_RECTS; i++) {
    if (i >= u${name}RectCount) {
      break;
    }
    float distance = rectDistance(u${name}Rects[i], p);
    hard${name} = min(hard${name}, distance);
    soft${name} = i == 0 ? distance : softMin(soft${name}, distance, TEXT_SOFTNESS);
  }
`;

const fragmentShaderSource = `
precision highp float;

const int MAX_TEXT_RECTS = ${MAX_TEXT_RECTS};
const float GAP = 26.0;
const float PITCH = 20.0;
const float LINE_WIDTH_MID = 2.0;
const float LINE_WIDTH_EDGE = 4.0;
const float FADE_IN_LINES = 1.5;
const float PEAK_OPACITY = 0.95;
const float MERGE_SOFTNESS = 80.0;
const float TEXT_SOFTNESS = 18.0;
const vec2 RING_OFFSET = vec2(-320.0, 150.0);
const float RING_RADIUS = 60.0;
const float COLOR_REACH = 750.0;
const float TINT_TO_LEAD = 0.3;
const float FADE_START = 300.0;
const float FADE_END = 1000.0;
const float FADE_MIN = 0.3;
const float MASK_IN = 18.0;
const float MASK_OUT = 34.0;

uniform vec2 uSize;
uniform float uDpr;
uniform vec4 uFromRects[MAX_TEXT_RECTS];
uniform int uFromRectCount;
uniform vec4 uToRects[MAX_TEXT_RECTS];
uniform int uToRectCount;
uniform float uProgress;
uniform vec3 uDeep;
uniform vec3 uLead;
uniform vec3 uTint;

float softMin(float a, float b, float k) {
  float m = min(a, b);
  return m - k * log(exp(-(a - m) / k) + exp(-(b - m) / k));
}

float rectDistance(vec4 rect, vec2 p) {
  return length(max(max(rect.xy - p, p - rect.zw), 0.0));
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;

  ${textDistanceLoop("To")}
  float softTextDistance = softTo;
  float hardTextDistance = hardTo;
  if (uProgress < 1.0) {
    ${textDistanceLoop("From")}
    softTextDistance = mix(softFrom, softTo, uProgress);
    // The new text is already on screen, so it's masked from the start
    hardTextDistance = min(mix(hardFrom, hardTo, uProgress), hardTo);
  }

  float textDistance = max(0.0, softTextDistance);
  float ringDistance = max(0.0, length(p - (uSize + RING_OFFSET)) - RING_RADIUS);
  float field =
    max(0.0, softMin(textDistance - GAP, ringDistance, MERGE_SOFTNESS)) + GAP;

  float alpha = 0.0;
  if (field > GAP) {
    float lineIndex = (field - GAP) / PITCH;
    float edge = abs(p.y - uSize.y / 2.0) / (uSize.y / 2.0);
    float lineWidth =
      LINE_WIDTH_MID + (LINE_WIDTH_EDGE - LINE_WIDTH_MID) * edge * edge;
    float distanceFromLine =
      abs(lineIndex - floor(lineIndex + 0.5)) * PITCH * uDpr;
    float line =
      clamp(lineWidth / 2.0 * uDpr - distanceFromLine + 0.5, 0.0, 1.0);
    float fade =
      1.0 - (1.0 - FADE_MIN) * smoothstep(FADE_START, FADE_END, textDistance - GAP);
    alpha = line *
      smoothstep(0.0, FADE_IN_LINES, lineIndex) *
      fade *
      PEAK_OPACITY *
      smoothstep(MASK_IN, MASK_OUT, hardTextDistance);
  }

  float colorPosition = clamp((textDistance - GAP) / COLOR_REACH, 0.0, 1.0);
  vec3 color = colorPosition < TINT_TO_LEAD
    ? mix(uTint, uLead, smoothstep(0.0, TINT_TO_LEAD, colorPosition))
    : mix(uLead, uDeep, 0.55 * smoothstep(TINT_TO_LEAD, 1.0, colorPosition));
  gl_FragColor = vec4(mix(uDeep, color, alpha), 1.0);
}
`;

const hexToRgb = (hex: string): Rgb => [
  parseInt(hex.slice(1, 3), 16) / 255,
  parseInt(hex.slice(3, 5), 16) / 255,
  parseInt(hex.slice(5, 7), 16) / 255,
];

const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** Matches the CSS `cubic-bezier(0.65, 0, 0.35, 1)` used by the banner text */
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const getTextRects = (text: HTMLElement, container: HTMLElement) => {
  const rects = new Float32Array(MAX_TEXT_RECTS * 4);
  const bounds = container.getBoundingClientRect();
  const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
  let count = 0;
  while (walker.nextNode()) {
    const range = document.createRange();
    range.selectNodeContents(walker.currentNode);
    for (const rect of range.getClientRects()) {
      if (rect.width > 1 && count < MAX_TEXT_RECTS) {
        rects.set(
          [
            rect.left - bounds.left + 2,
            rect.top - bounds.top + 3,
            rect.right - bounds.left - 2,
            rect.bottom - bounds.top - 3,
          ],
          count * 4,
        );
        count++;
      }
    }
  }
  return { rects, count };
};

const measureLinesState = ({ container, text, colors }: DrawArgs): LinesState => {
  const { rects, count } = getTextRects(text, container);
  return {
    width: container.clientWidth,
    height: container.clientHeight,
    rects,
    rectCount: count,
    deep: hexToRgb(colors.deep),
    lead: hexToRgb(colors.lead),
    tint: hexToRgb(colors.tint),
  };
};

const compileShader = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Banner lines shader error:", gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
};

const createProgram = (gl: WebGLRenderingContext) => {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();
  if (!vertexShader || !fragmentShader || !program) {
    return null;
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Banner lines program error:", gl.getProgramInfoLog(program));
    return null;
  }
  gl.useProgram(program);

  const fullScreenTriangle = new Float32Array([-1, -1, 3, -1, -1, 3]);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, fullScreenTriangle, gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  return {
    size: gl.getUniformLocation(program, "uSize"),
    dpr: gl.getUniformLocation(program, "uDpr"),
    fromRects: gl.getUniformLocation(program, "uFromRects"),
    fromRectCount: gl.getUniformLocation(program, "uFromRectCount"),
    toRects: gl.getUniformLocation(program, "uToRects"),
    toRectCount: gl.getUniformLocation(program, "uToRectCount"),
    progress: gl.getUniformLocation(program, "uProgress"),
    deep: gl.getUniformLocation(program, "uDeep"),
    lead: gl.getUniformLocation(program, "uLead"),
    tint: gl.getUniformLocation(program, "uTint"),
  };
};

/**
 * Returns null if WebGL isn't available, in which case the banner just shows
 * its background colour without lines.
 */
export const createBannerLinesRenderer = (
  canvas: HTMLCanvasElement,
): BannerLinesRenderer | null => {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: "low-power",
  });
  if (!gl) {
    return null;
  }
  let uniforms = createProgram(gl);
  let from: LinesState | null = null;
  let to: LinesState | null = null;
  let transitionStart = -Infinity;
  let frame = 0;

  const renderFrame = (progress: number) => {
    if (!uniforms || !from || !to || gl.isContextLost() || !to.width || !to.height) {
      return;
    }
    const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    const pixelWidth = Math.round(to.width * dpr);
    const pixelHeight = Math.round(to.height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const eased = easeInOut(progress);
    gl.viewport(0, 0, pixelWidth, pixelHeight);
    gl.uniform2f(uniforms.size, to.width, to.height);
    gl.uniform1f(uniforms.dpr, dpr);
    gl.uniform4fv(uniforms.fromRects, from.rects);
    gl.uniform1i(uniforms.fromRectCount, from.rectCount);
    gl.uniform4fv(uniforms.toRects, to.rects);
    gl.uniform1i(uniforms.toRectCount, to.rectCount);
    gl.uniform1f(uniforms.progress, eased);
    gl.uniform3fv(uniforms.deep, mixRgb(from.deep, to.deep, eased));
    gl.uniform3fv(uniforms.lead, mixRgb(from.lead, to.lead, eased));
    gl.uniform3fv(uniforms.tint, mixRgb(from.tint, to.tint, eased));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const render = () => {
    const progress = Math.min(
      1,
      (performance.now() - transitionStart) / TRANSITION_MS,
    );
    renderFrame(progress);
    frame = progress < 1 ? requestAnimationFrame(render) : 0;
  };

  const draw = (args: DrawArgs, { animate = false } = {}) => {
    const next = measureLinesState(args);
    const isTransitioning = performance.now() - transitionStart < TRANSITION_MS;
    if (animate && to && !prefersReducedMotion()) {
      from = to;
      transitionStart = performance.now();
    } else if (!isTransitioning) {
      from = next;
    }
    to = next;
    cancelAnimationFrame(frame);
    render();
  };

  const onContextLost = (event: Event) => event.preventDefault();
  const onContextRestored = () => {
    uniforms = createProgram(gl);
    render();
  };
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);

  return {
    draw,
    dispose: () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
    },
  };
};
