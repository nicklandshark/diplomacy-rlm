"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { getMaterialPreset, getStrictWebGLContext, type MaterialPresetKey } from "./types";

export interface MaterialSurfaceProps {
  children: ReactNode;
  material?: MaterialPresetKey;
  normalMap?: string;
  className?: string;
  style?: CSSProperties;
}

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
  uniform sampler2D u_normalMap;
  uniform vec3 u_tint;
  uniform vec3 u_lightDirection;
  uniform float u_ambient;
  uniform float u_diffuse;
  uniform float u_specular;
  uniform float u_shininess;
  uniform float u_roughness;
  uniform float u_normalStrength;

  void main() {
    vec3 sampledNormal = texture2D(u_normalMap, v_uv).xyz * 2.0 - 1.0;
    sampledNormal.xy *= u_normalStrength;
    vec3 normal = normalize(sampledNormal);

    vec3 lightDir = normalize(u_lightDirection);
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 halfDir = normalize(lightDir + viewDir);

    float lambert = max(dot(normal, lightDir), 0.0);
    float diffuse = lambert * u_diffuse;
    float gloss = clamp(1.0 - u_roughness, 0.06, 1.0);
    float specular = pow(max(dot(normal, halfDir), 0.0), u_shininess) * u_specular * gloss;

    vec3 color = (u_tint * (u_ambient + diffuse)) + vec3(specular);
    gl_FragColor = vec4(color, 0.34);
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

export function MaterialSurface({
  children,
  material = "steel",
  normalMap,
  className = "",
  style,
}: MaterialSurfaceProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [layerState, setLayerState] = useState<"booting" | "ready" | "unsupported">("booting");

  const preset = useMemo(() => getMaterialPreset(material), [material]);
  const normalMapUrl = normalMap ?? preset.normalMap;

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas || !normalMapUrl) return;

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

    const uNormalMap = gl.getUniformLocation(program, "u_normalMap");
    const uTint = gl.getUniformLocation(program, "u_tint");
    const uLightDirection = gl.getUniformLocation(program, "u_lightDirection");
    const uAmbient = gl.getUniformLocation(program, "u_ambient");
    const uDiffuse = gl.getUniformLocation(program, "u_diffuse");
    const uSpecular = gl.getUniformLocation(program, "u_specular");
    const uShininess = gl.getUniformLocation(program, "u_shininess");
    const uRoughness = gl.getUniformLocation(program, "u_roughness");
    const uNormalStrength = gl.getUniformLocation(program, "u_normalStrength");

    const buffer = gl.createBuffer();
    const texture = gl.createTexture();
    if (!buffer || !texture) {
      if (buffer) gl.deleteBuffer(buffer);
      if (texture) gl.deleteTexture(texture);
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

    let textureReady = false;
    let destroyed = false;

    const draw = () => {
      if (destroyed || !textureReady) return;

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

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      if (uNormalMap) gl.uniform1i(uNormalMap, 0);
      if (uTint) gl.uniform3f(uTint, preset.tint[0], preset.tint[1], preset.tint[2]);
      if (uLightDirection) {
        gl.uniform3f(uLightDirection, preset.lightDirection[0], preset.lightDirection[1], preset.lightDirection[2]);
      }
      if (uAmbient) gl.uniform1f(uAmbient, preset.ambient);
      if (uDiffuse) gl.uniform1f(uDiffuse, preset.diffuse);
      if (uSpecular) gl.uniform1f(uSpecular, preset.specular);
      if (uShininess) gl.uniform1f(uShininess, preset.shininess);
      if (uRoughness) gl.uniform1f(uRoughness, preset.roughness);
      if (uNormalStrength) gl.uniform1f(uNormalStrength, preset.normalStrength);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const onWindowResize = () => draw();
    window.addEventListener("resize", onWindowResize);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => draw());
      observer.observe(host);
    }

    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (destroyed) return;

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      textureReady = true;
      draw();
      setLayerState("ready");
    };
    image.onerror = () => {
      if (destroyed) return;
      setLayerState("unsupported");
    };
    image.src = normalMapUrl;

    return () => {
      destroyed = true;
      window.removeEventListener("resize", onWindowResize);
      observer?.disconnect();
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [normalMapUrl, preset]);

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
