export type BannerLineColors = { lead: string; deep: string; tint: string };

type DrawArgs = {
  container: HTMLElement;
  text: HTMLElement;
  colors: BannerLineColors;
};

export type BannerLinesRenderer = {
  draw: (args: DrawArgs) => void;
  dispose: () => void;
};

const MAX_DPR = 2;
const MAX_TEXT_RECTS = 32;

const vertexShaderSource = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
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
uniform vec4 uTextRects[MAX_TEXT_RECTS];
uniform int uTextRectCount;
uniform vec3 uDeep;
uniform vec3 uLead;
uniform vec3 uTint;

float softMin(float a, float b, float k) {
  float m = min(a, b);
  return m - k * log(exp(-(a - m) / k) + exp(-(b - m) / k));
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;

  float softTextDistance = 1e9;
  float hardTextDistance = 1e9;
  for (int i = 0; i < MAX_TEXT_RECTS; i++) {
    if (i >= uTextRectCount) {
      break;
    }
    vec4 rect = uTextRects[i];
    float distance = length(max(max(rect.xy - p, p - rect.zw), 0.0));
    hardTextDistance = min(hardTextDistance, distance);
    softTextDistance = i == 0
      ? distance
      : softMin(softTextDistance, distance, TEXT_SOFTNESS);
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

const hexToRgb = (hex: string) => [
  parseInt(hex.slice(1, 3), 16) / 255,
  parseInt(hex.slice(3, 5), 16) / 255,
  parseInt(hex.slice(5, 7), 16) / 255,
];

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
    textRects: gl.getUniformLocation(program, "uTextRects"),
    textRectCount: gl.getUniformLocation(program, "uTextRectCount"),
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
  let lastDrawArgs: DrawArgs | null = null;

  const draw = (args: DrawArgs) => {
    lastDrawArgs = args;
    const { container, text, colors } = args;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!uniforms || gl.isContextLost() || !width || !height) {
      return;
    }
    const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const { rects, count } = getTextRects(text, container);
    gl.viewport(0, 0, pixelWidth, pixelHeight);
    gl.uniform2f(uniforms.size, width, height);
    gl.uniform1f(uniforms.dpr, dpr);
    gl.uniform4fv(uniforms.textRects, rects);
    gl.uniform1i(uniforms.textRectCount, count);
    gl.uniform3fv(uniforms.deep, hexToRgb(colors.deep));
    gl.uniform3fv(uniforms.lead, hexToRgb(colors.lead));
    gl.uniform3fv(uniforms.tint, hexToRgb(colors.tint));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const onContextLost = (event: Event) => event.preventDefault();
  const onContextRestored = () => {
    uniforms = createProgram(gl);
    if (lastDrawArgs) {
      draw(lastDrawArgs);
    }
  };
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);

  return {
    draw,
    dispose: () => {
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
    },
  };
};
