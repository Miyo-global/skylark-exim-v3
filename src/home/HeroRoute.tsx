import { useEffect, useRef, type RefObject } from 'react'
import { film } from '../config/content'
import { W } from '../film/segments'
import { GRATICULE, MARKERS, ORIGIN_XY, R } from './Orbit'

/** draws the scene at scroll progress 0..1 of the hero's runway */
export type Scrub = (p: number) => void

/** points along the line; the same count makes the wake and the globe's rim, so one path turns into the other */
const N = 72
/**
 * The wake line in the clip's own frame (0..1), as a cubic Bézier: from the wake astern, along the water beside the
 * hull, out to open sea. Read off cg-depart-1's 16:9 frame and its portrait crop (`m`, upright phones).
 */
const CLIP =
  W === 'm'
    ? { w: 810, h: 1440, x: [-0.04, 0.3, 0.6, 0.96], y: [0.71, 0.66, 0.56, 0.4] }
    : { w: 16, h: 9, x: [0.03, 0.34, 0.6, 0.9], y: [0.95, 0.76, 0.52, 0.36] }
const bez = (t: number, [a, b, c, d]: number[]) => {
  const u = 1 - t
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d
}
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a))
const ease = (t: number) => t * t * (3 - 2 * t)
/** the scroll beats: the line draws, lifts into the rim, the sphere fills in, the routes light one by one */
const DRAW = [0.08, 0.38]
const LIFT = [0.38, 0.6]
const BODY = [0.56, 0.68]
const ROUTES = [0.64, 0.93]

/**
 * The hero's scroll scene (feat/hero-fable-test): the trawler's wake becomes a thin warm line out to sea, the line
 * lifts and closes into the rim of the markets globe (home/Orbit.tsx's sphere, arcs and markets from config/markets.ts),
 * and the export routes light up one by one. One SVG in screen pixels; `scrub` writes it per frame, attributes only.
 */
export function HeroRoute({ scrub }: { scrub: RefObject<Scrub | null> }) {
  const svg = useRef<SVGSVGElement>(null)
  const caption = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = svg.current!
    const lines = [...el.querySelectorAll<SVGPathElement>('.route__line')]
    const globe = el.querySelector<SVGGElement>('.route__globe')!
    const body = el.querySelector<SVGGElement>('.route__body')!
    const origin = el.querySelector<SVGCircleElement>('.route__origin')!
    const arcs = [...el.querySelectorAll<SVGPathElement>('.route__arc')]
    const dots = [...el.querySelectorAll<SVGCircleElement>('.route__dot')]
    const A = new Float32Array(N * 2)
    const B = new Float32Array(N * 2)
    let rise = 0
    let last = -1
    let lastLift = -1

    const measure = () => {
      const [w, h] = [el.clientWidth, el.clientHeight]
      // the clip is drawn object-fit: cover; the same mapping keeps the line on the water at any window shape
      const s = Math.max(w / CLIP.w, h / CLIP.h)
      const [ox, oy] = [(w - CLIP.w * s) / 2, (h - CLIP.h * s) / 2]
      // the globe: over the dark open sea on the right; centred on an upright screen
      const tall = h > w
      const r = tall ? Math.min(w * 0.4, h * 0.26) : Math.min(h * 0.3, w * 0.2)
      const [cx, cy] = tall ? [w / 2, h * 0.44] : [w * 0.7, h * 0.52]
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1)
        A[i * 2] = ox + bez(t, CLIP.x) * CLIP.w * s
        A[i * 2 + 1] = oy + bez(t, CLIP.y) * CLIP.h * s
        // once round the rim, from its lower left
        const a = ((135 + 360 * t) * Math.PI) / 180
        B[i * 2] = cx + r * Math.cos(a)
        B[i * 2 + 1] = cy + r * Math.sin(a)
      }
      rise = h * 0.07
      globe.setAttribute('transform', `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${(r / R).toFixed(4)})`)
      const p = last
      last = lastLift = -1
      if (p >= 0) scrub.current?.(p)
    }

    scrub.current = (p) => {
      if (p === last) return
      last = p
      el.style.visibility = p > 0 ? 'visible' : 'hidden'
      const lift = seg(p, LIFT[0], LIFT[1])
      if (lift !== lastLift) {
        lastLift = lift
        let d = ''
        for (let i = 0; i < N; i++) {
          // the far end, out at sea, lifts first
          const k = ease(clamp01(lift * 1.5 - (1 - i / (N - 1)) * 0.5))
          const x = A[i * 2] + (B[i * 2] - A[i * 2]) * k
          const y = A[i * 2 + 1] + (B[i * 2 + 1] - A[i * 2 + 1]) * k - Math.sin(Math.PI * k) * rise
          d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
        }
        for (const l of lines) l.setAttribute('d', d)
      }
      const off = String(1 - seg(p, DRAW[0], DRAW[1]))
      for (const l of lines) l.style.strokeDashoffset = off
      body.style.opacity = String(seg(p, BODY[0], BODY[1]))
      origin.style.opacity = String(seg(p, 0.6, 0.66))
      const step = (ROUTES[1] - ROUTES[0]) / (arcs.length + 0.6)
      arcs.forEach((arc, j) => {
        const t = seg(p, ROUTES[0] + j * step, ROUTES[0] + (j + 1.6) * step)
        arc.style.strokeDashoffset = String(1 - t)
        // a round cap paints a dot on a zero-length dash
        arc.style.opacity = t > 0 ? '1' : '0'
        dots[j].style.opacity = t >= 1 ? '1' : '0'
      })
      if (caption.current) caption.current.style.opacity = String(seg(p, 0.62, 0.72))
    }
    measure()
    addEventListener('resize', measure)
    return () => {
      removeEventListener('resize', measure)
      scrub.current = null
    }
  }, [scrub])

  return (
    <>
      <svg ref={svg} className="hero__route" aria-hidden="true">
        <g className="route__globe">
          <g className="route__body">
            <circle r={R} className="route__sphere" />
            {GRATICULE.map((d, i) => d && <path key={i} d={d} className="route__grid" />)}
          </g>
          {MARKERS.map((m) => (
            <path key={m.name} d={m.arc} pathLength={1} className="route__arc" />
          ))}
          {MARKERS.map((m) => (
            <circle key={m.name} cx={m.x} cy={m.y} r={1.8} className="route__dot" />
          ))}
          <circle cx={ORIGIN_XY[0]} cy={ORIGIN_XY[1]} r={3} className="route__origin" />
        </g>
        <path pathLength={1} className="route__line route__line--glow" />
        <path pathLength={1} className="route__line" />
      </svg>
      {/* the markets section says the same in the page's own text: this one is part of the picture */}
      <p ref={caption} className="hero__world" aria-hidden="true">
        {film.world[0].title}
      </p>
    </>
  )
}
