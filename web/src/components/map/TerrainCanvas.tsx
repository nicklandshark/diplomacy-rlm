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
    mat2 rot=mat2(.8,.6,-.6,.8);
    for(int i=0;i<8;i++){
      if(i>=oct) break;
      float s=snoise(p*f), r=ridgeNoise(p*f);
      v+=a*mix(s,r,rm); ma+=a;
      a*=u_persistence; f*=u_lacunarity;
      p=rot*p;
    }
    return v/ma;
  }

  // 3-octave fbm for normal computation — captures the same slope shapes
  // as the full 8-octave version because the finite-difference epsilon (0.0015)
  // is too coarse to resolve octaves 4-8 anyway. ~60% fewer snoise calls.
  float fbm3(vec2 p, float rm){
    float v=0., a=.5, f=1., ma=0.;
    mat2 rot=mat2(.8,.6,-.6,.8);
    for(int i=0;i<3;i++){
      float s=snoise(p*f), r=ridgeNoise(p*f);
      v+=a*mix(s,r,rm); ma+=a;
      a*=u_persistence; f*=u_lacunarity;
      p=rot*p;
    }
    return v/ma;
  }

  vec2 warp(vec2 p, float s){
    return p+vec2(snoise(p+vec2(1.7,9.2)),snoise(p+vec2(8.3,2.8)))*s;
  }

  // Mask gradient — single pass computes both edge fade (warp attenuation)
  // and coast proximity (water shading). Returns vec2(edgeFade, coastDist).
  // Saves 4 texture reads vs separate passes.
  vec2 maskGradient(vec2 uv){
    float s = 0.006;
    float bR = texture2D(u_mask, uv + vec2(s, 0.)).b;
    float bL = texture2D(u_mask, uv - vec2(s, 0.)).b;
    float bU = texture2D(u_mask, uv + vec2(0., s)).b;
    float bD = texture2D(u_mask, uv - vec2(0., s)).b;
    float grad = length(vec2(bR - bL, bU - bD));
    float edgeFade = 1.0 - smoothstep(0.0, 0.3, grad * 5.0);
    float coastDist = 1.0 - grad * 3.0;
    return vec2(edgeFade, coastDist);
  }

  float erosionDetail(vec2 p){
    float e=.005, c=snoise(p*12.);
    float dx=snoise((p+vec2(e,0.))*12.)-c;
    float dy=snoise((p+vec2(0.,e))*12.)-c;
    return sqrt(dx*dx+dy*dy)*8.;
  }

  // Geographic biome terrain color.
  // mapUV: x=0 west(Atlantic), x=1 east(Armenia); y=0 south(Africa), y=1 north(Barents).
  // Uses normalized land elevation so full gradient works at any seaLevel.
  vec3 terrainColor(float h, float er, vec2 p, vec2 mapUV){
    float sl=u_seaLevel;
    // Normalize land height to 0-1 so color bands aren't crushed by high seaLevel
    float landH=clamp((h-sl)/max(1.0-sl,0.25),0.,1.);

    // Noise for texture variety within biomes
    mat2 nr=mat2(.8,.6,-.6,.8);
    float n1=snoise(nr*(p*10.))*.5+.5;
    float n2=snoise(nr*(p*20.+vec2(5.,3.)))*.5+.5;

    // === ELEVATION-BASED PALETTE (vivid greens and browns) ===
    vec3 coast=vec3(.48,.46,.38);
    vec3 lowG=vec3(.28,.42,.20);
    vec3 richG=vec3(.22,.38,.15);
    vec3 forest=vec3(.15,.28,.10);
    vec3 highG=vec3(.38,.35,.24);
    vec3 rock=vec3(.46,.43,.38);
    vec3 snow=vec3(.80,.78,.74);

    vec3 c;
    if(landH<.06) c=mix(coast,lowG,landH/.06);
    else if(landH<.22){
      float t=(landH-.06)/.16;
      c=mix(lowG,mix(richG,forest,n1*.5),t);
    } else if(landH<.50){
      float t=(landH-.22)/.28;
      c=mix(mix(richG,forest,n1*.6+n2*.3),highG,t*t);
    } else if(landH<.72){
      float t=(landH-.50)/.22;
      c=mix(highG,rock,t);
    } else if(landH<u_snowLine){
      float t=clamp((landH-.72)/(u_snowLine-.72),0.,1.);
      float sn2=snoise(p*28.)*.3+.5;
      c=mix(rock,snow,t*smoothstep(.25,.65,t+sn2*.2));
    } else c=snow;

    c*=1.-er*u_erosion*.2;

    // === GEOGRAPHIC BIOME TINTING (strong, map-appropriate) ===
    // Y=0 south, Y=1 north; X=0 west, X=1 east

    // Mediterranean (south): warm golden olive
    float med=smoothstep(.35,.10,mapUV.y);
    c=mix(c,vec3(.42,.38,.22)*(0.7+landH*0.5),med*0.55);

    // Atlantic West (England, France): lush green
    float westLush=smoothstep(.35,.12,mapUV.x)*smoothstep(.25,.55,mapUV.y)*smoothstep(.75,.55,mapUV.y);
    c=mix(c,c*vec3(.82,1.18,.78),westLush*0.5);

    // Scandinavian (far north): dark cool coniferous
    float scandi=smoothstep(.65,.82,mapUV.y)*smoothstep(.18,.45,mapUV.x)*smoothstep(.65,.45,mapUV.x);
    c=mix(c,vec3(.12,.20,.12)*(0.7+landH*0.5),scandi*0.55);

    // Russian steppe (east): golden brown
    float steppe=smoothstep(.55,.82,mapUV.x)*smoothstep(.20,.45,mapUV.y)*smoothstep(.70,.50,mapUV.y);
    c=mix(c,c*vec3(1.15,1.02,.72),steppe*0.55);

    // Central Europe: moderate temperate green
    float central=max(0.,1.-length((mapUV-vec2(.38,.48))*vec2(3.5,4.)));
    c=mix(c,c*vec3(.88,1.10,.85),central*0.3);

    // Micro-texture — high-frequency luminance grain adds perceived detail
    // without extra fbm octaves. Two cheap snoise calls at 45x and 85x scale.
    float micro = snoise(p * 45.) * 0.04 + snoise(p * 85.) * 0.02;
    c *= 1.0 + micro;

    return c;
  }

  // Geographic water color — calm satellite-view ocean.
  // Restrained animation: subtle depth variation dominates, movement is barely perceptible.
  // Three decorrelated rotations prevent simplex lattice artifacts.
  vec3 waterColor(float h, vec2 p, vec2 mapUV, float coastDist){
    float sl=u_seaLevel, d=clamp((sl-h)/(u_oceanDepth*.5),0.,1.);
    // Dark base — shallow dusky blue to abyssal near-black
    vec3 shallow=vec3(.06,.10,.22);
    vec3 deep=vec3(.012,.022,.06);
    vec3 b=mix(shallow,deep,d*d);

    // Mediterranean (south): slightly warmer blue
    float medBlend = smoothstep(0.35, 0.10, mapUV.y) * smoothstep(0.15, 0.35, mapUV.x) * smoothstep(0.75, 0.55, mapUV.x);
    b = mix(b, vec3(.05, .08, .18) * (1.0 - d * 0.4), medBlend * 0.4);

    // North Sea / Baltic: colder steel
    float northBlend = smoothstep(0.60, 0.80, mapUV.y) * smoothstep(0.25, 0.55, mapUV.x);
    b = mix(b, vec3(.04, .05, .10) * (1.0 - d * 0.3), northBlend * 0.35);

    // Atlantic deep
    float atlBlend = smoothstep(0.25, 0.05, mapUV.x);
    b = mix(b, vec3(.008, .016, .04), atlBlend * 0.4 * d);

    // Coastal glow — narrow, subtle lightening near land
    float coastGlow = smoothstep(0.08, 0.0, coastDist);
    b += vec3(.012, .020, .035) * coastGlow * (1.0 - d * 0.5);

    // Decorrelated rotation matrices
    float an=u_time*.03*u_waterAnim;
    mat2 r1=mat2(.80,.60,-.60,.80);  // ~37°
    mat2 r2=mat2(.60,.80,-.80,.60);  // ~53°
    mat2 r3=mat2(.95,.31,-.31,.95);  // ~18°

    // Broad swell — gentle rolling luminance that drifts visibly
    float swell=snoise(r1*(p*3.0)+vec2(an*.35,an*.22))*.5+.5;
    swell+=snoise(r1*(p*5.5)+vec2(-an*.25,an*.4))*.25;
    b+=vec3(.007,.012,.024)*swell*(1.-d*.5)*u_waterAnim;

    // Caustics — abs-fold filaments, visible near coasts, fade in deep water
    float ca1=abs(snoise(r2*(p*14.)+vec2(an*.9,-an*.55)));
    float ca2=abs(snoise(r2*(p*20.)+vec2(-an*.6,an*1.0)));
    float ca=pow(min(ca1,ca2), 0.75);
    b+=vec3(.008,.015,.030)*ca*(1.-d*.7)*u_waterAnim;

    // Micro ripple — animated fine grain
    float w=snoise(r3*(p*28.+vec2(an*.9,-an*.4)))*.008*(1.-d);
    b+=vec3(w*.4,w*.7,w);
    return b;
  }

  vec3 adjSat(vec3 c, float s){float g=dot(c,vec3(.299,.587,.114)); return mix(vec3(g),c,s);}

  // Height sample for normal computation — uses fbm3 (3 octaves) with the same
  // warp pipeline as main(). The finite-difference epsilon is 0.0015 which is too
  // coarse to resolve octaves 4-8, so 3 octaves produce identical lighting slopes.
  float sampleH(vec2 p, vec2 uv, float edgeFade){
    vec4 m = texture2D(u_mask, uv);
    float landMask = max(step(0.05, m.r), step(0.5, m.g));
    float impassMask = step(0.5, m.g);
    float realH = texture2D(u_heightmap, uv).r * u_heightmapScale;

    vec2 wp=warp(p*u_scale*.5+vec2(1.7,3.2),u_warpStrength*.15*edgeFade);
    wp=warp(wp,u_warpStrength*.08*edgeFade);
    float procH = fbm3(wp,u_ridgeMix);
    float h = mix(procH, realH, u_heightmapBlend);

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

    // Mask gradient — edge fade + coast proximity in one pass (4 texture reads)
    vec2 mg = maskGradient(uv);
    float edgeFade = mg.x;
    float coastDist = mg.y;

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
      color=waterColor(h,p,mapUV,coastDist);
      // Specular — visible glints that shimmer with wave motion
      vec3 hd=normalize(L+vec3(0.,0.,1.));
      float an=u_time*.03*u_waterAnim;
      mat2 wr=mat2(.8,.6,-.6,.8);
      vec2 wnp=wr*(p*18.+vec2(an*.8,an*.4));
      vec3 wn=N; wn.x+=snoise(wnp)*.008; wn.y+=snoise(wnp+vec2(5.3,1.7))*.008; wn=normalize(wn);
      float sp=pow(max(dot(wn,hd),0.),40.);
      float d=clamp((sl-h)/(u_oceanDepth*.5),0.,1.);
      color+=vec3(.5,.6,.85)*sp*u_specular*.10*(1.-d*.5);
    } else {
      vec3 tc=terrainColor(h,er,p,mapUV)*lit;
      float ao=1.-clamp((h-hL+h-hR+h-hU+h-hD)*-2.,0.,.3);
      tc*=ao;
      // Subtle power tinting — biome colors dominate, power is a gentle hue shift
      vec3 pt;
      if(powerIdx>0.85) pt=vec3(1.05,0.98,0.75);       // turkey - warm gold shift
      else if(powerIdx>0.75) pt=vec3(0.88,0.90,1.05);   // russia - cool steel shift
      else if(powerIdx>0.65) pt=vec3(0.85,1.08,0.82);   // italy - green boost
      else if(powerIdx>0.55) pt=vec3(1.02,0.98,0.88);   // germany - warm khaki shift
      else if(powerIdx>0.45) pt=vec3(0.88,0.92,1.10);   // france - blue shift
      else if(powerIdx>0.35) pt=vec3(0.98,0.88,1.05);   // england - purple shift
      else if(powerIdx>0.25) pt=vec3(1.08,0.90,0.88);   // austria - red shift
      else if(powerIdx>0.15) pt=vec3(1.0,0.98,0.95);    // nopower - slight warm
      else pt=vec3(0.95,0.95,0.95);                      // neutral - slight desaturate
      color=tc*pt;
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

    // Darken land slightly — territory fills paint on top via SVG overlay.
    // Keep at 0.82 so biome colors remain visible through semi-transparent fills.
    if(!isWater){
      color*=0.82;
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
  const lastDrawRef = useRef(0);
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

      // 30fps cap — painterly terrain doesn't benefit from 60fps
      if (t - lastDrawRef.current < 33) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }
      lastDrawRef.current = t;

      // 1x DPR — terrain is painterly, retina resolution wastes 4x GPU for no visible gain
      const rect = canvas.getBoundingClientRect();
      const dpr = 1;
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
