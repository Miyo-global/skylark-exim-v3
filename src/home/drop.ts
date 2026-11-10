import { onTick } from '../engine/ticker'

/**
 * The hero's opening (feat/hero-fable-test): one glowing drop falls through near-black navy, lands, and the ripple
 * opens a hole onto the CG clip under the canvas. One fragment shader on raw WebGL (no three.js in the hero's chunk):
 * the canvas is navy with a transparent, growing disc, so the clip needs no texture upload.
 */
const FALL = 0.65 // s, drop in the air
const SPREAD = 1.5 // s, ripple from the landing to past the far corner

const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'
const FRAG = `precision mediump float;
uniform vec2 uRes;uniform vec2 uHit;uniform float uT;uniform float uTop;uniform float uMax;
const vec3 NAVY=vec3(.027,.122,.149);
const vec3 GLOW=vec3(.62,.83,1.);
void main(){
  float m=min(uRes.x,uRes.y);
  vec2 q=(gl_FragCoord.xy-uHit)/m;
  float d=length(q);
  float light=0.;
  float hole=1.;
  if(uT<${FALL.toFixed(2)}){
    float f=uT/${FALL.toFixed(2)};
    vec2 p=q-vec2(0.,uTop*(1.-f*f));
    p.y*=p.y>0.?.3:1.;
    float dd=length(p);
    light=smoothstep(.014,.006,dd)+exp(-dd*dd/.0016)*.45;
  }else{
    float t=(uT-${FALL.toFixed(2)})/${SPREAD.toFixed(2)};
    float e=1.-pow(1.-min(t,1.),3.);
    float R=uMax*e+.003*sin(atan(q.y,q.x)*3.+t*6.)*(1.-t);
    hole=smoothstep(R-.03,R+.01,d);
    float fade=1.-smoothstep(.35,1.,t);
    float rings=exp(-pow((d-R)/.007,2.))*.55;
    for(int k=1;k<4;k++){float Rk=R-.11*float(k);rings+=step(0.,Rk)*exp(-pow((d-Rk)/.005,2.))*.22/float(k);}
    light=rings*fade+exp(-d*d/.008)*exp(-t*10.)*.8;
  }
  gl_FragColor=vec4(NAVY*hole+GLOW*light,clamp(hole+light*.6,0.,1.));
}`

export interface Drop {
  /** runs the fall and the ripple once; `onHit` when the drop lands, `onDone` when the canvas has gone */
  play: (onHit: () => void, onDone: () => void) => void
  dispose: () => void
}

/**
 * Compiles the shader and draws the first, all-navy frame; null where WebGL is not to be had (the poster fades in
 * instead). The link is not waited on in one task: with KHR_parallel_shader_compile the driver compiles off the main
 * thread and this polls for it (on a throttled phone the blocking link was one 350 ms task).
 */
export async function initDrop(canvas: HTMLCanvasElement, mobile: boolean): Promise<Drop | null> {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' })
  if (!gl) return null
  const prog = gl.createProgram()
  for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]] as const) {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    gl.attachShader(prog, s)
  }
  gl.bindAttribLocation(prog, 0, 'p')
  gl.linkProgram(prog)
  const par = gl.getExtension('KHR_parallel_shader_compile')
  if (par) while (!gl.getProgramParameter(prog, par.COMPLETION_STATUS_KHR)) await new Promise((r) => setTimeout(r, 40))
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  gl.useProgram(prog)
  // one triangle that covers the viewport
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  const u = (n: string) => gl.getUniformLocation(prog, n)
  const [uRes, uHit, uT, uTop, uMax] = ['uRes', 'uHit', 'uT', 'uTop', 'uMax'].map(u)

  const draw = (t: number) => {
    // a full-screen shader: 1× on phones, 1.5× at most elsewhere
    const k = Math.min(devicePixelRatio || 1, mobile ? 1 : 1.5)
    const [w, h] = [Math.round(canvas.clientWidth * k), Math.round(canvas.clientHeight * k)]
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
    }
    // the drop lands a little below the middle (gl's y runs up)
    const [hx, hy] = [w * 0.5, h * 0.44]
    const m = Math.min(w, h)
    gl.uniform2f(uRes, w, h)
    gl.uniform2f(uHit, hx, hy)
    gl.uniform1f(uT, t)
    // it starts in view, under the header: the first frame after the intro already shows it
    gl.uniform1f(uTop, (h * 0.86 - hy) / m)
    gl.uniform1f(uMax, Math.hypot(Math.max(hx, w - hx), Math.max(hy, h - hy)) / m + 0.05)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
  draw(0)

  let off = () => {}
  const dispose = () => {
    off()
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    // hidden, not removed: React owns the node
    canvas.style.display = 'none'
  }
  return {
    dispose,
    play(onHit, onDone) {
      let t0 = -1
      let hit = false
      off = onTick((time) => {
        if (t0 < 0) t0 = time
        const t = time - t0
        draw(t)
        if (!hit && t >= FALL) {
          hit = true
          onHit()
        }
        if (t >= FALL + SPREAD) {
          dispose()
          onDone()
        }
      })
    },
  }
}
