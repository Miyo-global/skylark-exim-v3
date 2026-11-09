import { env } from '../engine/env'
import type { FromWorker, ToWorker } from './decode.worker'

/**
 * Canvas image-sequence engine (#264, the Terminal Industries pattern): one <canvas> per stage, drawImage of the frame
 * nearest the scroll position, cross-fading between sequences.
 *
 * - frames are fetched and decoded in a Web Worker (decode.worker.ts), which keeps each frame's compressed bytes and
 *   decodes on demand, so the main thread only draws and no frame is ever fetched twice
 * - decoded bitmaps are capped (LRU around the frame on screen); dropping one costs a decode, never a request
 * - frames arrive coarse first (every 32nd, then 16th, 8th, 4th, 2nd, all), so any position shows a frame early at low
 *   frame density and sharpens as the gaps fill in
 * - drawing runs on the page's one rAF (engine/ticker.ts, which already drives Lenis and GSAP ScrollTrigger); the canvas
 *   size is read on mount and on resize only, never in the scroll handler
 *
 * The scroll position comes in as (sequence, 0..1); this module reads neither the scroll nor the layout.
 */

/** decoded bitmaps held at once per sequence: 24 × 1920×1080 RGBA ≈ 190 MB of bitmaps on desktop, 10 on a phone */
const LRU = env.mobile ? 10 : 24
/** frames in flight at once (Terminal's concurrency: 6 desktop, 3 phone) */
export const PARALLEL = env.mobile ? 3 : 6
/** Save-Data, 2G and 3G: every second frame only, half the bytes for half the frame density */
const DENSITY = env.saveData || env.slow ? 2 : 1
/** frames either side of the one on screen that count as "something is loaded here" */
const NEAR = 2
/** device pixel ratio the canvas is sized at, capped: a 3× phone would cost 9× the pixels for no visible gain */
export const DPR_CAP = 2
export const dpr = () => Math.min(devicePixelRatio || 1, DPR_CAP)

export interface SequenceSpec {
  /** unique per frame set: the worker keeps one byte store per id */
  id: string
  /** number of frames, indexed 0..frames-1 */
  frames: number
  /** URL of one frame, already versioned (media.ts mediaUrl) */
  url: (i: number) => string
  /** decoded bitmaps held at once (default LRU); the /story stage's 2560 sets hold fewer (#hd2) */
  lru?: number
}

/**
 * Coarse-first order: every 32nd frame, then every 16th, …, then the rest. Each frame appears once. `density` thins the
 * set out: Save-Data and 2G/3G load every second frame and let `nearest` show the neighbour (#264).
 */
export function loadOrder(frames: number, density = DENSITY): number[] {
  const out: number[] = []
  const seen = new Set<number>()
  for (const stride of [32, 16, 8, 4, 2, 1])
    for (let i = 0; i < frames; i += stride)
      if (!seen.has(i) && (i % density === 0 || i === frames - 1)) {
        seen.add(i)
        out.push(i)
      }
  return out
}

let worker: Worker | null = null
const sequences = new Map<string, Sequence>()

// what each sequence holds, for tests (navigator.webdriver) and ?debug only
if (typeof navigator !== 'undefined' && (navigator.webdriver || new URLSearchParams(location.search).has('debug')))
  Object.defineProperty(globalThis, '__sequences', {
    get: () =>
      [...sequences.values()].map((s) => ({ id: s.spec.id, frames: s.spec.frames, progress: +s.progress.toFixed(3), complete: s.complete, bytes: s.loaded })),
  })

function decoder() {
  if (worker) return worker
  worker = new Worker(new URL('./decode.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (e: MessageEvent<FromWorker>) => sequences.get(e.data.seq)?.take(e.data)
  return worker
}

const send = (m: ToWorker) => decoder().postMessage(m)

/** One frame set: which frames are cached, which are decoded, and the nearest decoded frame to any position. */
export class Sequence {
  readonly spec: SequenceSpec
  /** frames whose bytes the worker holds */
  private cached = new Set<number>()
  private bytes = 0
  /** decoded frames, in least-recently-drawn order (Map keeps insertion order: the LRU) */
  private bitmaps = new Map<number, ImageBitmap>()
  private fetching = new Set<number>()
  private decoding = new Set<number>()
  private queue: number[]
  private stopped = false
  /** keep fetching on every frame that arrives, not only when drawn (prefetch) */
  private auto = false
  private at = 0

  /** how many frames this device loads at all (the density thins the set on a slow link) */
  private readonly wanted: number
  private readonly lru: number

  constructor(spec: SequenceSpec) {
    this.spec = spec
    this.queue = loadOrder(spec.frames)
    this.wanted = this.queue.length
    this.lru = spec.lru ?? LRU
    sequences.set(spec.id, this)
  }

  /** frames cached ÷ frames this device loads: what a loading bar shows */
  get progress() {
    return this.wanted ? this.cached.size / this.wanted : 0
  }
  /** bytes fetched so far */
  get loaded() {
    return this.bytes
  }
  /** every frame's bytes are here: the scroll needs the network no more */
  get complete() {
    return this.cached.size >= this.wanted
  }

  /** frame index for a position inside the sequence (0..1) */
  index(at: number) {
    return Math.min(this.spec.frames - 1, Math.max(0, Math.round(at * (this.spec.frames - 1))))
  }

  /**
   * The decoded frame nearest `i`, and how far off it is. Early in the load that is a coarse neighbour; once the gaps
   * are filled it is the frame itself. null until the first frame has decoded.
   */
  nearest(i: number): { bitmap: ImageBitmap; at: number } | null {
    const hit = this.bitmaps.get(i)
    if (hit) {
      this.touch(i, hit)
      return { bitmap: hit, at: i }
    }
    for (let d = 1; d < this.spec.frames; d++)
      for (const j of [i - d, i + d]) {
        const b = this.bitmaps.get(j)
        if (b) {
          this.touch(j, b)
          return { bitmap: b, at: j }
        }
      }
    return null
  }

  /** is a frame within NEAR of `i` already cached? */
  private hasNear(i: number) {
    for (let d = 0; d <= NEAR; d++) if (this.cached.has(i - d) || this.cached.has(i + d)) return true
    return false
  }

  private touch(i: number, b: ImageBitmap) {
    this.bitmaps.delete(i)
    this.bitmaps.set(i, b)
  }

  /**
   * Keep the load moving towards the frame on screen: decode the frames around it that are cached but not decoded,
   * and fetch the rest of the set coarse first. Called once per drawn frame; it only ever starts work.
   */
  pump(i: number, decode = true) {
    if (this.stopped) return
    // the way the scroll is going: decoded first on that side
    const dir = i < this.at ? -1 : 1
    this.at = i
    const free = () => PARALLEL - this.fetching.size - this.decoding.size
    // decode first: a cached frame near the scroll position is one message away from being drawable
    // (a prefetch only fetches: no bitmaps for a set that is not on screen)
    if (decode)
    for (let d = 0; d < this.lru / 2 && free() > 0; d++)
      for (const j of d === 0 ? [i] : [i + dir * d, i - dir * d])
        if (j >= 0 && j < this.spec.frames && this.cached.has(j) && !this.bitmaps.has(j) && !this.decoding.has(j) && free() > 0) {
          this.decoding.add(j)
          send({ k: 'decode', seq: this.spec.id, i: j, url: this.spec.url(j) })
        }
    while (free() > 0 && this.queue.length) {
      // coarse first, straight off the queue, unless nothing near the frame on screen is cached yet: then the queued
      // frame nearest it goes first, so a jump into the middle of a set shows something there rather than filling gaps
      // at the start
      let at = 0
      // at the very start nothing is cached anywhere: the coarse order itself is what brings a frame into view fast
      if (this.cached.size > 0 && !this.hasNear(i))
        for (let k = 1; k < this.queue.length; k++) if (Math.abs(this.queue[k] - i) < Math.abs(this.queue[at] - i)) at = k
      const j = this.queue.splice(at, 1)[0]
      if (this.cached.has(j) || this.fetching.has(j)) continue
      this.fetching.add(j)
      // the frame on screen and its neighbours are decoded straight away; the rest are only cached
      const near = decode && Math.abs(j - i) <= 1
      if (near) this.decoding.add(j)
      send({ k: near ? 'decode' : 'fetch', seq: this.spec.id, i: j, url: this.spec.url(j) })
    }
  }

  /** a message from the worker */
  take(m: FromWorker) {
    this.fetching.delete(m.i)
    this.decoding.delete(m.i)
    if (m.k === 'failed') return
    if (this.auto && !this.stopped) queueMicrotask(() => this.pump(this.at, false))
    if (!this.cached.has(m.i)) {
      this.cached.add(m.i)
      if (m.k === 'fetched') this.bytes += m.bytes
    }
    if (m.k === 'decoded') {
      if (this.stopped) return m.bitmap.close()
      this.bitmaps.set(m.i, m.bitmap)
      this.evict(m.i)
    }
  }

  /** Hold the bitmap cap by closing the decoded frame furthest from the one just drawn. Its bytes stay in the worker. */
  private evict(near: number) {
    while (this.bitmaps.size > this.lru) {
      let worst = -1
      let dist = -1
      for (const i of this.bitmaps.keys())
        if (Math.abs(i - near) > dist) {
          dist = Math.abs(i - near)
          worst = i
        }
      this.bitmaps.get(worst)!.close()
      this.bitmaps.delete(worst)
    }
  }

  /**
   * Fetch the whole set ahead of time, frame 0 first and then coarse first, PARALLEL at a time, each finished frame
   * starting the next (#hd2: the /story stage starts this when a sequence clip's chapter is near).
   */
  prefetch() {
    if (this.auto) return
    this.auto = true
    this.pump(this.at, false)
  }

  /** Stop starting new fetches (in-flight ones finish); prefetch() resumes. The warm cache parks far sets with it. */
  pause() {
    this.auto = false
  }

  /** Close every decoded bitmap (the bytes stay in the worker): a set off screen holds no bitmap memory (#hd2). */
  release() {
    for (const b of this.bitmaps.values()) b.close()
    this.bitmaps.clear()
  }

  destroy() {
    this.stopped = true
    for (const b of this.bitmaps.values()) b.close()
    this.bitmaps.clear()
    this.queue = []
    sequences.delete(this.spec.id)
    send({ k: 'free', seq: this.spec.id })
  }
}

export interface StagePos {
  /** the sequence on screen, and where inside it (0..1) */
  seq: Sequence
  at: number
  /** the sequence being crossed into, and how far the fade has gone (0..1) */
  next?: Sequence
  fade?: number
  /** ignore a decoded neighbour further than this many frames from the one asked for */
  slack?: number
}

/**
 * Draws one stage. Call `draw` from the page's rAF with this frame's position, `resize` on mount and on resize.
 * `draw` returns the frame index it drew, or -1 while nothing has decoded yet; a frame with nothing new to show leaves
 * the canvas exactly as it was, so the stage is never blank once it has painted.
 */
export function createStage(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { alpha: false })!
  let w = 0
  let h = 0
  let shown = -1
  let last = ''
  let owner: Sequence | null = null

  const resize = () => {
    const next = [Math.round(canvas.clientWidth * dpr()), Math.round(canvas.clientHeight * dpr())]
    if (next[0] === w && next[1] === h) return
    ;[w, h] = next
    canvas.width = w
    canvas.height = h
    // a resize resets the context: smoothing back to high, so a frame scaled up to a 2× canvas stays crisp
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    last = ''
  }

  /** cover: scale to fill the canvas, crop the long axis */
  const paint = (b: ImageBitmap, alpha: number) => {
    const s = Math.max(w / b.width, h / b.height)
    ctx.globalAlpha = alpha
    ctx.drawImage(b, (w - b.width * s) / 2, (h - b.height * s) / 2, b.width * s, b.height * s)
    ctx.globalAlpha = 1
  }

  const draw = (pos: StagePos) => {
    if (!w || !h) return shown
    const i = pos.seq.index(pos.at)
    pos.seq.pump(i)
    const fade = pos.next && pos.fade ? Math.min(1, pos.fade) : 0
    const close = (hit: { bitmap: ImageBitmap; at: number } | null, j: number) =>
      hit && (pos.slack === undefined || Math.abs(hit.at - j) <= pos.slack) ? hit : null
    const now = close(pos.seq.nearest(i), i)
    let into: { bitmap: ImageBitmap; at: number } | null = null
    if (pos.next) {
      const j = pos.next.index(0)
      pos.next.pump(j)
      into = fade > 0 ? close(pos.next.nearest(j), j) : null
    }
    // nothing of this set decoded yet: -1, so the stage shows the poster rather than the last set's picture
    if (!now && !into) return owner === pos.seq ? shown : -1
    owner = pos.seq
    const stamp = `${pos.seq.spec.id}:${now?.at ?? -1}:${into?.at ?? -1}:${fade.toFixed(3)}`
    if (stamp === last) return shown
    last = stamp
    if (now) paint(now.bitmap, 1)
    if (into) paint(into.bitmap, now ? fade : 1)
    shown = (fade >= 0.5 ? into?.at : now?.at) ?? now?.at ?? into!.at
    return shown
  }

  return {
    resize,
    draw,
    get frame() {
      return shown
    },
  }
}
