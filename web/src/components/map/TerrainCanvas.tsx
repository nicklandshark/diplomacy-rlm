"use client";

import { useRef, useEffect, useCallback } from "react";
import type { TerrainConfig } from "@/lib/terrain-config";
import { TERRAIN_DEFAULTS } from "@/lib/terrain-config";
import { generateTerrainMask } from "@/lib/generate-terrain-mask";
import { generateEuropeHeightmap } from "@/lib/generate-europe-heightmap";

const MAP_W = 1835;
const MAP_H = 1360;

interface Props {
  config?: Partial<TerrainConfig>;
  viewBox: { x: number; y: number; w: number; h: number };
  svgContent: string;
  onReady?: () => void;
}

// ---- GLSL source ----

const VERT = `
  attribute vec2 a_pos;
  varying vec2 v_uv;
  void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

const FRAG = `
  precision highp float;
  varying vec2 v_uv;
  uniform float u_time;
  uniform vec2 u_resolution;
  // ViewBox: maps screen UV -> map UV (for pan/zoom sync with SVG)
  uniform vec4 u_viewBox; // x, y, w, h in 0-1 normalized map coords

  uniform float u_scale, u_octaves, u_lacunarity, u_persistence;
  uniform float u_ridgeMix, u_warpStrength;
  uniform float u_seaLevel, u_coastSharp;
  uniform float u_sunAngle, u_sunElev, u_ambient, u_shadowDepth, u_specular;
  uniform float u_saturation, u_warmth, u_snowLine, u_oceanDepth;
  uniform float u_vignette, u_erosion, u_waterAnim;

  // Province classification mask: R=land, G=impassable, B=water
  uniform sampler2D u_mask;

  // European geographic heightmap (grayscale elevation)
  uniform sampler2D u_heightmap;
  uniform float u_heightmapBlend; // 0=procedural, 1=heightmap
  uniform float u_heightmapScale; // amplitude multiplier

  // --- Simplex 2D ---
  vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
  vec2 mod289(vec2 x){return x-floor(x*(1./289.))*289.;}
  vec3 permute(vec3 x){return mod289(((x*34.)+1.)*x);}

  float snoise(vec2 v){
    const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
    vec2 i=floor(v+dot(v,C.yy));
    vec2 x0=v-i+dot(i,C.xx);
    vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
    vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1;
    i=mod289(i);
    vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
    vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
    m=m*m; m=m*m;
    vec3 x=2.*fract(p*C.www)-1.;
    vec3 h=abs(x)-.5;
    vec3 ox=floor(x+.5);
    vec3 a0=x-ox;
    m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
    vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;
    return 130.*dot(m,g);
  }

  float ridgeNoise(vec2 p){float n=snoise(p); n=1.-abs(n); return n*n;}

  float fbm(vec2 p, float rm){
    float v=0., a=.5, f=1., ma=0.;
    int oct=int(u_octaves);
    for(int i=0;i<8;i++){
      if(i>=oct) break;
      float s=snoise(p*f), r=ridgeNoise(p*f);
      v+=a*mix(s,r,rm); ma+=a;
      a*=u_persistence; f*=u_lacunarity;
      p=mat2(.8,.6,-.6,.8)*p;
    }
    return v/ma;
  }

  vec2 warp(vec2 p, float s){
    return p+vec2(snoise(p+vec2(1.7,9.2)),snoise(p+vec2(8.3,2.8)))*s;
  }

  // Detect mask boundary gradient — used to attenuate warp near coastlines
  float maskEdgeFade(vec2 uv){
    float s = 0.004;
    float maskGrad = length(vec2(
      texture2D(u_mask, uv + vec2(s, 0.)).b - texture2D(u_mask, uv - vec2(s, 0.)).b,
      texture2D(u_mask, uv + vec2(0., s)).b - texture2D(u_mask, uv - vec2(0., s)).b
    ));
    return 1.0 - smoothstep(0.0, 0.3, maskGrad * 5.0);
  }

  float erosionDetail(vec2 p){
    float e=.005, c=snoise(p*12.);
    float dx=snoise((p+vec2(e,0.))*12.)-c;
    float dy=snoise((p+vec2(0.,e))*12.)-c;
    return sqrt(dx*dx+dy*dy)*8.;
  }

  // Regional terrain color — blends based on map-space UV for geographic tinting
  vec3 terrainColor(float h, float er, vec2 p, vec2 mapUV){
    vec3 dO=vec3(.02,.04,.10), oc=vec3(.04,.08,.18), ss=vec3(.07,.13,.26);
    vec3 co=vec3(.45,.42,.35), lg=vec3(.22,.32,.15), gr=vec3(.28,.38,.18);
    vec3 fo=vec3(.18,.28,.12), hl=vec3(.38,.34,.24), rk=vec3(.42,.40,.36);
    vec3 sn=vec3(.78,.76,.72);
    float sl=u_seaLevel; vec3 c;
    if(h<sl-.25) c=mix(dO,oc,clamp((h-(sl-.5))/.25,0.,1.));
    else if(h<sl-.03) c=mix(oc,ss,clamp((h-(sl-.25))/.22,0.,1.));
    else if(h<sl+u_coastSharp) c=mix(ss,co,clamp((h-(sl-.03))/(u_coastSharp+.03),0.,1.));
    else if(h<sl+.12) c=mix(co,lg,clamp((h-(sl+u_coastSharp))/(.12-u_coastSharp),0.,1.));
    else if(h<sl+.25){
      float fm=snoise(p*20.)*.5+.5;
      c=mix(lg,mix(gr,fo,fm*.6),clamp((h-(sl+.12))/.13,0.,1.));
    } else if(h<u_snowLine-.1){
      float fm=snoise(p*15.+vec2(3.))*.5+.5;
      c=mix(mix(gr,fo,fm*.5),hl,clamp((h-(sl+.25))/(u_snowLine-.1-sl-.25),0.,1.));
    } else if(h<u_snowLine) c=mix(hl,rk,clamp((h-(u_snowLine-.1))/.1,0.,1.));
    else{
      float sm=clamp((h-u_snowLine)/.15,0.,1.);
      float sn2=snoise(p*30.)*.3+.5;
      sm*=smoothstep(.2,.6,sm+sn2*.3);
      c=mix(rk,sn,sm);
    }
    if(h>sl) c*=1.-er*u_erosion*.3;

    // Regional color tinting based on geographic position
    // Southern (Mediterranean): warmer olive/golden
    float southTint = smoothstep(0.55, 0.85, mapUV.y);
    c = mix(c, c * vec3(1.08, 1.02, 0.88), southTint * 0.4);

    // Northern (Scandinavian): cooler grey-green/blue
    float northTint = smoothstep(0.35, 0.10, mapUV.y);
    c = mix(c, c * vec3(0.90, 0.95, 1.05), northTint * 0.35);

    // Eastern (Russian steppe): golden/brown
    float eastTint = smoothstep(0.60, 0.85, mapUV.x) * smoothstep(0.55, 0.30, mapUV.y);
    c = mix(c, c * vec3(1.06, 1.0, 0.88), eastTint * 0.3);

    return c;
  }

  // Geographic water color — varies by region
  vec3 waterColor(float h, vec2 p, vec2 mapUV, float coastDist){
    float sl=u_seaLevel, d=clamp((sl-h)/(u_oceanDepth*.5),0.,1.);
    vec3 b=mix(vec3(.06,.10,.22),vec3(.01,.02,.05),d*d);

    // Mediterranean: warmer, slightly more teal
    float medBlend = smoothstep(0.65, 0.85, mapUV.y) * smoothstep(0.15, 0.35, mapUV.x) * smoothstep(0.75, 0.55, mapUV.x);
    b = mix(b, vec3(.04, .08, .20) * (1.0 - d * 0.5), medBlend * 0.5);

    // North Sea / Baltic: colder, greyer
    float northBlend = smoothstep(0.40, 0.20, mapUV.y) * smoothstep(0.25, 0.55, mapUV.x);
    b = mix(b, vec3(.04, .06, .12) * (1.0 - d * 0.4), northBlend * 0.4);

    // Atlantic deep: darkest
    float atlBlend = smoothstep(0.25, 0.05, mapUV.x);
    b = mix(b, vec3(.01, .02, .06), atlBlend * 0.5 * d);

    // Coastal glow — lighter water near land
    float coastGlow = smoothstep(0.12, 0.0, coastDist);
    b += vec3(0.015, 0.025, 0.04) * coastGlow * (1.0 - d * 0.5);

    // Animated water — rotated domains break simplex lattice rings
    float an=u_time*.02*u_waterAnim;
    mat2 rot=mat2(.8,.6,-.6,.8);

    // Slow, broad swell — gentle luminance undulation across the ocean
    float swell=snoise(rot*(p*3.5)+vec2(an*.4,an*.25))*.5+.5;
    swell+=snoise(rot*(p*6.2)+vec2(-an*.3,an*.5))*.25;
    b+=vec3(.008,.014,.028)*swell*(1.-d*.6)*u_waterAnim;

    // Fine caustic sparkle
    float c1=snoise(rot*(p*14.)+vec2(an,an*.7))*.5+.5;
    float c2=snoise(rot*(p*21.3)+vec2(-an*.5,an*1.1))*.5+.5;
    float ca=c1*c2;
    b+=vec3(.006,.012,.025)*ca*(1.-d)*u_waterAnim;

    // Micro ripple texture
    vec2 rp=rot*(p*32.7+vec2(an*1.2,0.));
    float w=snoise(rp)*.010*(1.-d);
    b+=vec3(w*.4,w*.6,w);
    return b;
  }

  vec3 adjSat(vec3 c, float s){float g=dot(c,vec3(.299,.587,.114)); return mix(vec3(g),c,s);}

  // Sample height at a point (for normal computation)
  // When heightmapBlend > 0.5, uses heightmap for faster normals
  float sampleH(vec2 p, vec2 uv, float edgeFade){
    vec4 m = texture2D(u_mask, uv);
    float landMask = max(step(0.05, m.r), step(0.5, m.g));
    float impassMask = step(0.5, m.g);

    // Heightmap-based height
    float realH = texture2D(u_heightmap, uv).r * u_heightmapScale;

    float h;
    if(u_heightmapBlend > 0.5){
      // Heightmap-accelerated: skip expensive fbm for normals
      h = mix(realH, realH, 1.0); // placeholder for procedural residual
      // Add some fine noise detail even in heightmap mode
      vec2 wp = warp(p * u_scale * 0.5 + vec2(1.7, 3.2), u_warpStrength * 0.15 * edgeFade * 0.3);
      float detail = snoise(wp * 4.0) * 0.05;
      h = realH + detail * (1.0 - u_heightmapBlend);
    } else {
      vec2 wp=warp(p*u_scale*.5+vec2(1.7,3.2),u_warpStrength*.15*edgeFade);
      wp=warp(wp,u_warpStrength*.08*edgeFade);
      float procH = fbm(wp,u_ridgeMix);
      h = mix(procH, realH, u_heightmapBlend);
    }

    h = h * .65 + landMask * .45 - .1;
    h += impassMask * 0.15;
    return h;
  }

  void main(){
    // Map screen UV to map-space UV using viewBox
    vec2 uv = u_viewBox.xy + v_uv * u_viewBox.zw;
    vec2 p = uv;
    vec2 mapUV = uv; // full-map-space UV for regional color

    // Sample province classification mask
    vec4 mask = texture2D(u_mask, uv);
    float powerIdx = mask.r;
    float impassMask = mask.g;
    float waterMask = mask.b;
    float landMask = max(step(0.05, powerIdx), step(0.5, impassMask));
    float combinedLand = landMask;

    // Compute mask edge fade for warp attenuation near coastlines
    float edgeFade = maskEdgeFade(uv);

    // Domain warp — attenuated near mask boundaries
    vec2 wp=warp(p*u_scale*.5+vec2(1.7,3.2),u_warpStrength*.15*edgeFade);
    vec2 wp2=warp(wp,u_warpStrength*.08*edgeFade);

    // Sample heightmap for geographic elevation
    float realH = texture2D(u_heightmap, uv).r * u_heightmapScale;

    // Procedural height
    float procH = fbm(wp2,u_ridgeMix);

    // Blend procedural noise with geographic heightmap
    float blendedH = mix(procH, realH, u_heightmapBlend);

    float h = blendedH * .65 + combinedLand * .45 - .1;
    h += impassMask * 0.15;

    float er=erosionDetail(wp2);

    // Normal via finite differences
    float eps=.0015;
    float hL=sampleH(p+vec2(-eps,0.), uv+vec2(-eps,0.), edgeFade);
    float hR=sampleH(p+vec2(eps,0.), uv+vec2(eps,0.), edgeFade);
    float hU=sampleH(p+vec2(0.,eps), uv+vec2(0.,eps), edgeFade);
    float hD=sampleH(p+vec2(0.,-eps), uv+vec2(0.,-eps), edgeFade);
    vec3 N=normalize(vec3(hL-hR,hD-hU,eps*5.));

    vec3 L=normalize(vec3(cos(u_sunAngle)*cos(u_sunElev),sin(u_sunAngle)*cos(u_sunElev),sin(u_sunElev)));
    float diff=max(dot(N,L),0.);
    float shd=1.-u_shadowDepth*max(0.,-dot(N,L));
    float lit=u_ambient+(1.-u_ambient)*diff*shd;

    // Coastal distance approximation for water shading
    // Uses mask gradient magnitude as proxy for proximity to land
    float coastProximity = length(vec2(
      texture2D(u_mask, uv + vec2(0.008, 0.)).b - texture2D(u_mask, uv - vec2(0.008, 0.)).b,
      texture2D(u_mask, uv + vec2(0., 0.008)).b - texture2D(u_mask, uv - vec2(0., 0.008)).b
    ));

    vec3 color;
    float sl=u_seaLevel;

    // Mask-authoritative land/water classification.
    // Height alone (h<sl) fails because procedural noise can push
    // land below seaLevel or water above, severely misclassifying provinces.
    bool isWater = combinedLand < 0.5;

    // Clamp height to respect mask so color gradients stay sane
    if(isWater) h = min(h, sl - 0.03);
    else h = max(h, sl + 0.01);

    if(isWater){
      color=waterColor(h,p,mapUV,1.0-coastProximity*3.0);
      vec3 hd=normalize(L+vec3(0.,0.,1.));
      float an=u_time*.03*u_waterAnim;
      mat2 wr=mat2(.8,.6,-.6,.8);
      vec2 wnp=wr*(p*22.+vec2(an*.7,an*.3));
      vec3 wn=N; wn.x+=snoise(wnp)*.015; wn.y+=snoise(wnp+vec2(5.3,1.7))*.015; wn=normalize(wn);
      float sp=pow(max(dot(wn,hd),0.),20.);
      float d=clamp((sl-h)/(u_oceanDepth*.5),0.,1.);
      color+=vec3(.6,.7,.9)*sp*u_specular*.15*(1.-d*.5);
    } else {
      vec3 tc=terrainColor(h,er,p,mapUV)*lit;
      float ao=1.-clamp((h-hL+h-hR+h-hU+h-hD)*-2.,0.,.3);
      tc*=ao;
      // AoH2-style power tinting — decode power from mask R channel
      vec3 pt;
      if(powerIdx>0.85) pt=vec3(0.78,0.70,0.25);       // turkey - golden
      else if(powerIdx>0.75) pt=vec3(0.52,0.56,0.68);   // russia - steel
      else if(powerIdx>0.65) pt=vec3(0.35,0.60,0.30);   // italy - green
      else if(powerIdx>0.55) pt=vec3(0.62,0.55,0.42);   // germany - khaki
      else if(powerIdx>0.45) pt=vec3(0.38,0.48,0.78);   // france - blue
      else if(powerIdx>0.35) pt=vec3(0.58,0.32,0.68);   // england - purple
      else if(powerIdx>0.25) pt=vec3(0.78,0.40,0.35);   // austria - red
      else if(powerIdx>0.15) pt=vec3(0.70,0.65,0.55);   // nopower - tan
      else pt=vec3(0.60,0.58,0.52);                      // neutral - grey
      color=mix(tc, pt*lit*ao, 0.45);
    }

    color.r+=u_warmth*.08; color.b-=u_warmth*.05;
    color=adjSat(color,u_saturation);

    // Vignette in map-space — applied relative to full map center,
    // not screen center. This prevents a visible circle when zoomed in.
    // Attenuate by zoom level: when zoomed in (viewBox smaller), reduce effect.
    float zoomLevel = 1.0 / max(u_viewBox.z, 0.01);
    float vigFade = smoothstep(1.5, 1.0, zoomLevel); // fade out when zoomed > 1.5x
    float vig=1.-u_vignette*vigFade*length((mapUV-.5)*1.2);
    color*=vig;

    color=color/(color+.5)*1.4;
    color=pow(max(color,0.),vec3(1./2.2));

    // Darken land areas — territory fills paint on top.
    if(!isWater){
      color*=0.75;
    }

    gl_FragColor=vec4(color,1.);
  }
`;

// ---- Uniform names (must match FRAG) ----
const UNIFORM_NAMES = [
  "u_time", "u_resolution", "u_viewBox",
  "u_scale", "u_octaves", "u_lacunarity", "u_persistence",
  "u_ridgeMix", "u_warpStrength", "u_seaLevel",
  "u_coastSharp", "u_sunAngle", "u_sunElev",
  "u_ambient", "u_shadowDepth", "u_specular", "u_saturation",
  "u_warmth", "u_snowLine", "u_oceanDepth", "u_vignette",
  "u_erosion", "u_waterAnim", "u_mask",
  "u_heightmap", "u_heightmapBlend", "u_heightmapScale",
] as const;

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error("Terrain shader compile:", gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

export default function TerrainCanvas({ config, viewBox, svgContent, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const uniformsRef = useRef<Record<string, WebGLUniformLocation | null>>({});
  const rafRef = useRef<number>(0);
  const configRef = useRef<TerrainConfig>({ ...TERRAIN_DEFAULTS, ...config });
  const maskReadyRef = useRef(false);
  const heightmapReadyRef = useRef(false);

  // Keep config ref fresh
  configRef.current = { ...TERRAIN_DEFAULTS, ...config };

  // ViewBox ref for render loop
  const viewBoxRef = useRef(viewBox);
  viewBoxRef.current = viewBox;

  // Init WebGL once
  const initGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) { console.error("No WebGL"); return; }
    glRef.current = gl;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERT);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("Terrain program link:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // Fullscreen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Cache uniform locations
    const u: Record<string, WebGLUniformLocation | null> = {};
    for (const n of UNIFORM_NAMES) u[n] = gl.getUniformLocation(prog, n);
    uniformsRef.current = u;
  }, []);

  // Generate and upload mask texture from SVG
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const uploadMask = useCallback((gl: WebGLRenderingContext, svg: string) => {
    generateTerrainMask(svg).then((maskCanvas) => {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      // Flip Y: Canvas (0,0)=top-left, WebGL texture (0,0)=bottom-left
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);
      gl.uniform1i(uniformsRef.current.u_mask, 0);
      maskReadyRef.current = true;
    }).catch((err) => {
      console.error("Failed to generate terrain mask:", err);
    });
  }, []);

  // Generate and upload European heightmap as TEXTURE1
  const uploadHeightmap = useCallback((gl: WebGLRenderingContext) => {
    const hmCanvas = generateEuropeHeightmap();
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // Flip Y: Canvas (0,0)=top-left, WebGL texture (0,0)=bottom-left
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, hmCanvas);
    gl.uniform1i(uniformsRef.current.u_heightmap, 1);
    heightmapReadyRef.current = true;
  }, []);

  // Render loop
  const startLoop = useCallback(() => {
    const render = (t: number) => {
      const gl = glRef.current;
      const canvas = canvasRef.current;
      const u = uniformsRef.current;
      if (!gl || !canvas || !maskReadyRef.current || !heightmapReadyRef.current) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      // Resize canvas to match CSS size at device pixel ratio
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }

      const c = configRef.current;
      const vb = viewBoxRef.current;

      gl.uniform1f(u.u_time, t * 0.001);
      gl.uniform2f(u.u_resolution, w, h);
      // ViewBox: normalize to 0-1 range relative to full map.
      // Y is inverted: SVG y goes top-down (0=north) but the texture
      // (with UNPACK_FLIP_Y) has v going bottom-up (0=south, 1=north).
      gl.uniform4f(u.u_viewBox, vb.x / MAP_W, 1.0 - (vb.y + vb.h) / MAP_H, vb.w / MAP_W, vb.h / MAP_H);

      gl.uniform1f(u.u_scale, c.scale);
      gl.uniform1f(u.u_octaves, c.octaves);
      gl.uniform1f(u.u_lacunarity, c.lacunarity);
      gl.uniform1f(u.u_persistence, c.persistence);
      gl.uniform1f(u.u_ridgeMix, c.ridgeMix);
      gl.uniform1f(u.u_warpStrength, c.warpStrength);
      gl.uniform1f(u.u_seaLevel, c.seaLevel);
      gl.uniform1f(u.u_coastSharp, c.coastSharp);
      gl.uniform1f(u.u_sunAngle, c.sunAngle);
      gl.uniform1f(u.u_sunElev, c.sunElev);
      gl.uniform1f(u.u_ambient, c.ambient);
      gl.uniform1f(u.u_shadowDepth, c.shadowDepth);
      gl.uniform1f(u.u_specular, c.specular);
      gl.uniform1f(u.u_saturation, c.saturation);
      gl.uniform1f(u.u_warmth, c.warmth);
      gl.uniform1f(u.u_snowLine, c.snowLine);
      gl.uniform1f(u.u_oceanDepth, c.oceanDepth);
      gl.uniform1f(u.u_vignette, c.vignette);
      gl.uniform1f(u.u_erosion, c.erosion);
      gl.uniform1f(u.u_waterAnim, c.waterAnim);
      gl.uniform1f(u.u_heightmapBlend, c.heightmapBlend);
      gl.uniform1f(u.u_heightmapScale, c.heightmapScale);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    initGL();
    const gl = glRef.current;
    if (gl && svgContent) {
      uploadMask(gl, svgContent);
      uploadHeightmap(gl);
    }
    startLoop();
    // Fire onReady once both textures are uploaded
    const check = setInterval(() => {
      if (maskReadyRef.current && heightmapReadyRef.current) {
        clearInterval(check);
        onReadyRef.current?.();
      }
    }, 50);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(check);
    };
  }, [initGL, startLoop, svgContent, uploadMask, uploadHeightmap]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
