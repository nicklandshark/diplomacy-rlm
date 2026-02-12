"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { getStrictWebGLContext, type Vec3 } from "./types";

interface GlassPaneProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  distortion?: number;
  gloss?: number;
  edgeTint?: Vec3;
}

const DEFAULT_EDGE_TINT: Vec3 = [0.67, 0.73, 0.82];

const VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;

  varying vec2 v_uv;
  uniform float u_distortion;
  uniform float u_gloss;
  uniform vec3 u_edgeTint;

  void main() {
    vec2 uv = v_uv;
    vec2 center = uv - 0.5;
    float radius2 = dot(center, center);
    float magnify = 1.0 + u_distortion * (0.82 * radius2 + 0.26 * radius2 * radius2);
    uv = 0.5 + center * magnify;

    float edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    float rim = 1.0 - smoothstep(0.0, 0.27, edgeDist);
    float edgeMagnify = smoothstep(0.08, 0.34, radius2) * u_distortion;

    float topSheen = exp(-pow((uv.y - 0.22) * 10.0, 2.0)) * (0.65 + 0.35 * u_gloss + edgeMagnify * 0.22);
    float streakWave = sin(uv.x * 6.28318) * 0.012;
    float streak = exp(-pow((uv.y - (0.23 + streakWave)) * 34.0, 2.0)) * (u_gloss + edgeMagnify * 0.25);
    float body = max(0.0, 1.0 - abs(uv.y - 0.5) * 1.5) * (0.18 + edgeMagnify * 0.16);

    vec3 baseTint = u_edgeTint * (0.1 + rim * (0.24 + edgeMagnify * 0.2));
    vec3 highlight = vec3(0.95) * (topSheen * 0.18 + streak * 0.15 + body * 0.09);
    vec3 color = baseTint + highlight;
    float alpha = clamp(0.1 + rim * 0.28 + topSheen * 0.17 + streak * 0.16 + body * 0.1 + edgeMagnify * 0.12, 0.0, 0.62);

    gl_FragColor = vec4(color, alpha);
  }
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
  if (!vertexShader || !fragmentShader) {
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

export function GlassPane({
  children,
  className = "",
  style,
  distortion = 0.18,
  gloss = 0.28,
  edgeTint = DEFAULT_EDGE_TINT,
}: GlassPaneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [layerState, setLayerState] = useState<"booting" | "ready" | "unsupported">("booting");
  const edgeTintR = edgeTint[0];
  const edgeTintG = edgeTint[1];
  const edgeTintB = edgeTint[2];

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const gl = getStrictWebGLContext(canvas);
    if (!gl) {
      setLayerState("unsupported");
      return;
    }

    const program = createProgram(gl);
    if (!program) {
      setLayerState("unsupported");
      return;
    }

    const positionLocation = gl.getAttribLocation(program, "a_position");
    if (positionLocation < 0) {
      gl.deleteProgram(program);
      setLayerState("unsupported");
      return;
    }

    const uDistortion = gl.getUniformLocation(program, "u_distortion");
    const uGloss = gl.getUniformLocation(program, "u_gloss");
    const uEdgeTint = gl.getUniformLocation(program, "u_edgeTint");

    const buffer = gl.createBuffer();
    if (!buffer) {
      gl.deleteProgram(program);
      setLayerState("unsupported");
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        -1, 1,
        1, -1,
        1, 1,
      ]),
      gl.STATIC_DRAW,
    );

    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const draw = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (width <= 0 || height <= 0) return;

      const dpr = window.devicePixelRatio || 1;
      const pixelWidth = Math.max(1, Math.round(width * dpr));
      const pixelHeight = Math.max(1, Math.round(height * dpr));

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      gl.viewport(0, 0, pixelWidth, pixelHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (uDistortion) gl.uniform1f(uDistortion, distortion);
      if (uGloss) gl.uniform1f(uGloss, gloss);
      if (uEdgeTint) gl.uniform3f(uEdgeTint, edgeTintR, edgeTintG, edgeTintB);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    draw();
    setLayerState("ready");

    const onWindowResize = () => draw();
    window.addEventListener("resize", onWindowResize);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => draw());
      observer.observe(host);
    }

    return () => {
      window.removeEventListener("resize", onWindowResize);
      observer?.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [distortion, gloss, edgeTintR, edgeTintG, edgeTintB]);

  return (
    <div ref={hostRef} className={`relative ${className}`.trim()} style={style}>
      {children}
      {layerState !== "unsupported" ? (
        <canvas
          ref={canvasRef}
          aria-hidden
          className="absolute inset-0 h-full w-full pointer-events-none"
          style={{ opacity: layerState === "ready" ? 1 : 0 }}
        />
      ) : null}
    </div>
  );
}
