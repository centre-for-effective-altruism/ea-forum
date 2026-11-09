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

type PointerSample = { x: number; y: number; time: number };

type Pluck = {
  x: number;
  y: number;
  line: number;
  start: number;
  amplitude: number;
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

const GAP = 26;
const PITCH = 20;
const TEXT_SOFTNESS = 18;
const MERGE_SOFTNESS = 80;
const RING_OFFSET_X = -320;
const RING_OFFSET_Y = 150;
const RING_RADIUS = 60;

const MAX_PLUCKS = 48;
const PLUCK_AMPLITUDE = 4;
const PLUCK_FREQUENCY = 2;
const PLUCK_DECAY_SECONDS = 1.2;
const PLUCK_SPEED = 160;
const PLUCK_WAVELENGTH = 110;
const PLUCK_SPREAD = 40;
const PLUCK_MIN_STRENGTH = 0.4;
const PLUCK_FULL_STRENGTH_SPEED = 2000;
const PLUCK_BRIGHTNESS_BOOST = 0.25;
const PLUCK_CUTOFF_AMPLITUDE = 0.05;

const glslFloat = (value: number) =>
  Number.isInteger(value) ? value.toFixed(1) : String(value);

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

const pluckUniforms = (maxPlucks: number) =>
  maxPlucks
    ? `
const int MAX_PLUCKS = ${maxPlucks};
const float TWO_PI = 6.28318530718;
uniform vec4 uPlucks[MAX_PLUCKS];
uniform float uPluckAmplitudes[MAX_PLUCKS];
uniform int uPluckCount;
`
    : "";

/**
 * Each pluck is (x, y, line, age). Its amplitude has already been decayed by
 * age; here it spreads out along the line as a ripple. Only pixels on the
 * plucked line move, and the extra brightness follows the ripple's envelope
 * rather than each oscillation so that it never flickers.
 */
const pluckDisplacement = (maxPlucks: number) =>
  maxPlucks
    ? `
    float displacement = 0.0;
    for (int i = 0; i < MAX_PLUCKS; i++) {
      if (i >= uPluckCount) {
        break;
      }
      vec4 pluck = uPlucks[i];
      if (pluck.z != lineNumber) {
        continue;
      }
      float r = length(p - pluck.xy);
      float front = ${glslFloat(PLUCK_SPREAD)} + ${glslFloat(PLUCK_SPEED)} * pluck.w;
      float amplitude =
        uPluckAmplitudes[i] * exp(-(r * r) / (2.0 * front * front));
      displacement += amplitude * cos(TWO_PI * (
        ${glslFloat(PLUCK_FREQUENCY)} * pluck.w - r / ${glslFloat(PLUCK_WAVELENGTH)}
      ));
      boost += amplitude / ${glslFloat(PLUCK_AMPLITUDE)};
    }
    displacement = clamp(
      displacement,
      -${glslFloat(PLUCK_AMPLITUDE)},
      ${glslFloat(PLUCK_AMPLITUDE)}
    );
    lineIndex += displacement / PITCH;
    boost = ${glslFloat(PLUCK_BRIGHTNESS_BOOST)} * min(1.0, boost);
`
    : "";

const fragmentShaderSource = (maxPlucks: number) => `
precision highp float;

const int MAX_TEXT_RECTS = ${MAX_TEXT_RECTS};
const float GAP = ${glslFloat(GAP)};
const float PITCH = ${glslFloat(PITCH)};
const float LINE_WIDTH_MID = 2.0;
const float LINE_WIDTH_EDGE = 4.0;
const float FADE_IN_LINES = 1.5;
const float PEAK_OPACITY = 0.95;
const float MERGE_SOFTNESS = ${glslFloat(MERGE_SOFTNESS)};
const float TEXT_SOFTNESS = ${glslFloat(TEXT_SOFTNESS)};
const vec2 RING_OFFSET = vec2(${glslFloat(RING_OFFSET_X)}, ${glslFloat(RING_OFFSET_Y)});
const float RING_RADIUS = ${glslFloat(RING_RADIUS)};
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
${pluckUniforms(maxPlucks)}

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
    float lineNumber = floor(lineIndex + 0.5);
    float fade =
      1.0 - (1.0 - FADE_MIN) * smoothstep(FADE_START, FADE_END, textDistance - GAP);
    float envelope =
      smoothstep(0.0, FADE_IN_LINES, lineIndex) *
      fade *
      PEAK_OPACITY *
      smoothstep(MASK_IN, MASK_OUT, hardTextDistance);
    float edge = abs(p.y - uSize.y / 2.0) / (uSize.y / 2.0);
    float lineWidth =
      LINE_WIDTH_MID + (LINE_WIDTH_EDGE - LINE_WIDTH_MID) * edge * edge;
    float boost = 0.0;
    ${pluckDisplacement(maxPlucks)}
    float distanceFromLine = abs(lineIndex - lineNumber) * PITCH * uDpr;
    float line = clamp(
      lineWidth / 2.0 * uDpr * (1.0 + boost) - distanceFromLine + 0.5,
      0.0,
      1.0
    );
    alpha = line * min(1.0, envelope * (1.0 + boost));
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

const clamp = (x: number, min: number, max: number) =>
  Math.max(min, Math.min(max, x));

/** Matches the CSS `cubic-bezier(0.65, 0, 0.35, 1)` used by the banner text */
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const softMin = (a: number, b: number, k: number) => {
  const m = Math.min(a, b);
  return m - k * Math.log(Math.exp(-(a - m) / k) + Math.exp(-(b - m) / k));
};

/** The same field the shader draws lines along, at a single point */
const getFieldAt = (
  { width, height, rects, rectCount }: LinesState,
  x: number,
  y: number,
) => {
  let softTextDistance = 1e9;
  for (let i = 0; i < rectCount; i++) {
    const [x0, y0, x1, y1] = rects.subarray(i * 4, i * 4 + 4);
    const distance = Math.hypot(
      Math.max(x0 - x, 0, x - x1),
      Math.max(y0 - y, 0, y - y1),
    );
    softTextDistance =
      i === 0 ? distance : softMin(softTextDistance, distance, TEXT_SOFTNESS);
  }
  const textDistance = Math.max(0, softTextDistance);
  const ringDistance = Math.max(
    0,
    Math.hypot(x - (width + RING_OFFSET_X), y - (height + RING_OFFSET_Y)) -
      RING_RADIUS,
  );
  return (
    Math.max(0, softMin(textDistance - GAP, ringDistance, MERGE_SOFTNESS)) + GAP
  );
};

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

/**
 * Plucking needs a cursor to sweep, and is turned off for reduced motion and
 * on GPUs that can't fit the extra uniforms.
 */
const getMaxPlucks = (gl: WebGLRenderingContext) => {
  const requiredUniformVectors = MAX_TEXT_RECTS * 2 + MAX_PLUCKS * 2 + 16;
  const canPluck =
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !prefersReducedMotion() &&
    gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) >= requiredUniformVectors;
  return canPluck ? MAX_PLUCKS : 0;
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

const createProgram = (gl: WebGLRenderingContext, maxPlucks: number) => {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource(maxPlucks),
  );
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
    plucks: gl.getUniformLocation(program, "uPlucks"),
    pluckAmplitudes: gl.getUniformLocation(program, "uPluckAmplitudes"),
    pluckCount: gl.getUniformLocation(program, "uPluckCount"),
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
  const maxPlucks = getMaxPlucks(gl);
  let uniforms = createProgram(gl, maxPlucks);
  let from: LinesState | null = null;
  let to: LinesState | null = null;
  let transitionStart = -Infinity;
  let frame = 0;
  let plucks: Pluck[] = [];
  let lastPointer: PointerSample | null = null;
  const pluckData = new Float32Array(MAX_PLUCKS * 4);
  const pluckAmplitudes = new Float32Array(MAX_PLUCKS);

  const updatePluckUniforms = (now: number) => {
    plucks = plucks.filter(({ start, amplitude }) => {
      const age = (now - start) / 1000;
      return (
        amplitude * Math.exp(-age / PLUCK_DECAY_SECONDS) > PLUCK_CUTOFF_AMPLITUDE
      );
    });
    if (!uniforms || !maxPlucks) {
      return;
    }
    plucks.forEach(({ x, y, line, start, amplitude }, i) => {
      const age = (now - start) / 1000;
      pluckData.set([x, y, line, age], i * 4);
      pluckAmplitudes[i] = amplitude * Math.exp(-age / PLUCK_DECAY_SECONDS);
    });
    gl.uniform4fv(uniforms.plucks, pluckData);
    gl.uniform1fv(uniforms.pluckAmplitudes, pluckAmplitudes);
    gl.uniform1i(uniforms.pluckCount, plucks.length);
  };

  const renderFrame = (now: number, progress: number) => {
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
    updatePluckUniforms(now);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const render = () => {
    const now = performance.now();
    const progress = Math.min(1, (now - transitionStart) / TRANSITION_MS);
    renderFrame(now, progress);
    frame = progress < 1 || plucks.length ? requestAnimationFrame(render) : 0;
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

  const pluckBetween = (a: PointerSample, b: PointerSample) => {
    if (!to) {
      return;
    }
    const lineA = (Math.max(getFieldAt(to, a.x, a.y), GAP) - GAP) / PITCH;
    const lineB = (Math.max(getFieldAt(to, b.x, b.y), GAP) - GAP) / PITCH;
    const first = Math.max(1, Math.ceil(Math.min(lineA, lineB)));
    const last = Math.floor(Math.max(lineA, lineB));
    if (first > last) {
      return;
    }
    const speed =
      (Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, b.time - a.time)) * 1000;
    const amplitude =
      PLUCK_AMPLITUDE *
      clamp(
        PLUCK_MIN_STRENGTH + speed / PLUCK_FULL_STRENGTH_SPEED,
        PLUCK_MIN_STRENGTH,
        1,
      );
    const start = performance.now();
    for (let line = first; line <= last; line++) {
      const t = (line - lineA) / (lineB - lineA || 1);
      plucks.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        line,
        start,
        amplitude,
      });
    }
    plucks = plucks.slice(-MAX_PLUCKS);
    if (!frame) {
      frame = requestAnimationFrame(render);
    }
  };

  const container = canvas.parentElement;
  const onPointerMove = (event: PointerEvent) => {
    if (!container || event.pointerType === "touch") {
      return;
    }
    const bounds = container.getBoundingClientRect();
    const sample = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      time: event.timeStamp,
    };
    if (lastPointer) {
      pluckBetween(lastPointer, sample);
    }
    lastPointer = sample;
  };
  const onPointerLeave = () => {
    lastPointer = null;
  };
  if (maxPlucks && container) {
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerleave", onPointerLeave);
  }

  const onContextLost = (event: Event) => event.preventDefault();
  const onContextRestored = () => {
    uniforms = createProgram(gl, maxPlucks);
    render();
  };
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);

  return {
    draw,
    dispose: () => {
      cancelAnimationFrame(frame);
      container?.removeEventListener("pointermove", onPointerMove);
      container?.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
    },
  };
};
