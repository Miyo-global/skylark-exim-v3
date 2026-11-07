import { decodeAll, storyReady } from '../engine/boot'
import { env } from '../engine/env'
import { frame, store, type Path } from '../engine/store'
import { CLIPS, SEQ, type Clip } from './manifest'
import { pauseSeq, prefetchSeq, seqProgress } from './scrub'
import { W, avifReady, clipUrl, codec, codecReady, isSeq, served } from './segments'

/**
 * Warm cache. The intro opens once the active path's first clip is a Blob (openingReady). The rest of that path keeps
 * loading behind it: every other video clip becomes a Blob (the stage's <video>s play from blob: URLs, so a seek never
 * touches the network) and every desktop frame sequence lands in the decode worker's byte store (sequence.ts),
 * nearest the scroll first. progress() and `warm` still mean the whole active path, which the header hairline and the scroll tests wait
 * for. A path switch loads the other path the same way and keeps the chapters both share. Every image goes in too: the
 * stage's posters and stills (scrub.ts sets them all at mount) and the story's own photos, decoded. Only the active
 * path, at the page's own tier, in one codec (it waits for segments.ts to settle the codec). Save-Data and 2g/3g skip
 * it: the scrub's distance prefetch (scrub.ts) streams those.
 *
 * Desktop plays every story clip as a scroll-scrubbed canvas sequence (sequence.ts): coarse first, bounded decoded LRU,
 * one shared rAF. Phones keep the video. The homepage hero stays a looping MP4.
 */
/** clips fetched at once (Terminal's concurrency): 6 desktop, 3 phone */
const PARALLEL = env.mobile ? 3 : 6
/** the clips the cache holds as Blobs: a desktop frame-sequence clip (#hd2) is the stage canvas's, not a video */
const videos = (p: Path) => CLIPS[p].filter((c) => !isSeq(c.id))
const frameSets = (p: Path) => CLIPS[p].filter((c) => isSeq(c.id))
export const enabled = !(env.saveData || env.slow)

const urls = new Map<string, string>()
let path: Path | null = null
let abort: AbortController | null = null
/** the whole active path is in hand. Tests that scroll with the network quiet wait for this. */
let warm = false
/** the first clip of the active path is a Blob, or its fetch was given up after OPEN_TRIES. The intro waits for this. */
let opening = false
/** bytes of the opening clip, received / declared. The intro's percentage is this, not the whole path. */
let openingBytes = { have: 0, total: 1 }
const OPEN_TRIES = 3
/** a desktop opening frame set: the share of it the intro waits for (all of it: the first chapter never waits on the network), and how long at most (ms) */
const OPEN_SHARE = 1
const OPEN_WAIT = 8000
/**
 * a frame set's coarse level: frame 0 and about every 8th frame (sequence.ts loadOrder), so any scroll position in it is
 * within a few frames of one it has. The intro also waits for the next chapter's first set to reach it (#story-direct:
 * chapter 01 is short, a fast scroll reaches 02 about a second after the intro opens), and inside the loading window
 * every set reaches it before any set fills in.
 */
const COARSE = 0.15
/** ms without a new frame after which a frame set is passed over */
const STALL = 10_000
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
/** the run's images, decoded / asked for; each counts as IMG bytes */
let imgs = { done: 0, total: 0 }
const IMG = 150e3
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((f) => f())

// what the cache holds, for tests (navigator.webdriver) and ?debug only
if (navigator.webdriver || new URLSearchParams(location.search).has('debug'))
  Object.defineProperty(globalThis, '__warmCache', {
    get: () => ({ path, ids: [...urls.keys()], progress: progress(), warm, opening, openingProgress: openingProgress() }),
  })

/** blob: URL for a cached clip of the active path, else null */
export const cachedUrl = (id: string) => urls.get(id) ?? null

/** bytes of a clip in the codec and tier this page plays (a frame set: its frames, AVIF or WebP) */
const size = (c: Clip) => (isSeq(c.id) ? SEQ[c.id][avif ? 'avif' : 'webp'] : (c.files[codec][served(W, codec)]?.bytes ?? 0))
let avif = false
void avifReady.then((a) => (avif = a))

/** 0..1 of the active path's bytes in memory: its clips' Blobs and its frame sets' bytes */
export function progress() {
  if (!path) return 0
  const all = [...videos(path), ...frameSets(path)]
  const total = all.reduce((a, c) => a + size(c), 0)
  const have = all.reduce((a, c) => a + size(c) * (isSeq(c.id) ? seqProgress(c.id) : urls.has(c.id) ? 1 : 0), 0)
  return total ? (have + imgs.done * IMG) / (total + imgs.total * IMG) : 0
}

/** 0..1 of the opening clip. 1 once that clip is cached, or once the intro is allowed to open. */
export function openingProgress() {
  if (!enabled || opening) return 1
  if (!path) return 0
  return Math.min(1, openingBytes.have / Math.max(1, openingBytes.total))
}
export function onCache(f: () => void) {
  listeners.add(f)
  return () => void listeners.delete(f)
}

/** resolves once the active path is in memory (at once where the cache is off) */
export const pathReady = () =>
  new Promise<void>((done) => {
    if (!enabled || warm) return done()
    const off = onCache(() => warm && (off(), done()))
  })

/** resolves once the first clip is in memory (at once where the cache is off). The intro uses this, not pathReady. */
export const openingReady = () =>
  new Promise<void>((done) => {
    if (!enabled || opening) return done()
    const off = onCache(() => opening && (off(), done()))
  })

/** Stream the opening clip and record real bytes. Returns false on a failed response; throws on abort. */
async function fetchOpening(ctl: AbortController, c: Clip) {
  const res = await fetch(clipUrl(c.id), { signal: ctl.signal, priority: 'high' } as RequestInit)
  if (!res.ok) return false
  const declared = Number(res.headers.get('Content-Length')) || size(c) || 1
  openingBytes = { have: 0, total: declared }
  emit()
  const finish = (blob: Blob) => {
    if (ctl.signal.aborted) return false
    urls.set(c.id, URL.createObjectURL(blob))
    openingBytes = { have: openingBytes.total, total: openingBytes.total }
    emit()
    return true
  }
  if (!res.body) return finish(await res.blob())
  const reader = res.body.getReader()
  const chunks: BlobPart[] = []
  let have = 0
  let reported = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    chunks.push(value)
    have += value.byteLength
    openingBytes = { have, total: Math.max(declared, have) }
    if (have - reported >= 16_384) (reported = have), emit()
  }
  return finish(new Blob(chunks, { type: res.headers.get('Content-Type') || 'video/mp4' }))
}

async function run(p: Path) {
  warm = false
  opening = false
  openingBytes = { have: 0, total: 1 }
  abort?.abort()
  const ctl = (abort = new AbortController())
  await Promise.all([codecReady, avifReady])
  if (ctl.signal.aborted) return
  const clips = videos(p)
  const keep = new Set(clips.map((c) => c.id))
  // the other path's clips go; the chapters both paths share stay cached
  for (const [id, u] of urls) if (!keep.has(id)) (URL.revokeObjectURL(u), urls.delete(id))
  path = p
  const n = (imgs = { done: 0, total: 0 })
  emit()
  const decode = (list: HTMLImageElement[]) => ((n.total += list.length), emit(), decodeAll(list, () => (n.done++, emit())))
  // a frame on: React has the path's stage, and scrub.ts has set its posters' sources
  await new Promise((r) => requestAnimationFrame(r))
  if (ctl.signal.aborted) return
  const pics = Promise.all([
    decode([...document.querySelectorAll<HTMLImageElement>('.stage img[src]')]),
    storyReady.then(() => decode([...document.querySelectorAll<HTMLImageElement>('#main img')])),
  ])
  // the first chapter's clip, byte by byte, before anything else on this path. Three tries, then the intro opens anyway.
  // A desktop path opens on a frame set, frame 0 first.
  const first = clips[0]
  const opener = CLIPS[p][0]
  if (opener && isSeq(opener.id)) {
    prefetchSeq(opener.id)
    const second = CLIPS[p].find((c) => c.chapter === opener.chapter + 1 && isSeq(c.id))
    if (second) prefetchSeq(second.id)
    const share = () => Math.min(1, seqProgress(opener.id) / OPEN_SHARE) * 0.9 + (second ? Math.min(1, seqProgress(second.id) / COARSE) : 1) * 0.1
    const total = size(opener) * OPEN_SHARE
    for (const t0 = performance.now(); share() < 1 && !ctl.signal.aborted && performance.now() - t0 < OPEN_WAIT; ) {
      openingBytes = { have: total * share(), total }
      emit()
      await sleep(50)
    }
    if (ctl.signal.aborted) return
    opening = true
    emit()
  } else if (!first || urls.has(first.id)) {
    opening = true
    emit()
  } else {
    let ok = false
    for (let attempt = 0; attempt < OPEN_TRIES && !ok && !ctl.signal.aborted; attempt++)
      ok = await fetchOpening(ctl, first).catch(() => false)
    if (ctl.signal.aborted) return
    opening = true
    emit()
  }
  const queue = clips.filter((c) => !urls.has(c.id))
  const fetchOne = async (c: Clip) => {
    const res = await fetch(clipUrl(c.id), { signal: ctl.signal })
    if (!res.ok) return
    const blob = await res.blob()
    if (ctl.signal.aborted) return
    urls.set(c.id, URL.createObjectURL(blob))
    emit()
  }
  // Frame sets nearest the scroll first (#story-direct). The chapter on screen and the next two in the direction of travel
  // load together, each coarse first (every 32nd, 16th, 8th… frame, sequence.ts), so a fast scroll lands on a coarse frame
  // of every chapter it reaches instead of a poster; everything else is parked (in-flight frames finish). Re-picked every
  // 50 ms. With that window complete, the nearest remaining set loads. A set stuck for STALL (a failed frame) is passed
  // over: the frames it does have still draw.
  const sets = (async () => {
    const list = frameSets(p)
    const stalled = new Set<string>()
    const last = new Map<string, { at: number; since: number }>()
    const ahead = (c: Clip) => (c.chapter - Math.max(0, frame.index)) * (frame.dir < 0 ? -1 : 1)
    // ahead of the scroll before behind it, nearest first, story order inside a chapter
    const rank = (c: Clip) => (ahead(c) >= 0 ? ahead(c) * 2 : -ahead(c) * 2 + 1) * 100 + c.seg
    while (!ctl.signal.aborted) {
      const open = list.filter((c) => seqProgress(c.id) < 1 && !stalled.has(c.id))
      if (!open.length) break
      const win = open.filter((c) => ahead(c) >= 0 && ahead(c) <= 2)
      // breadth first: every set in the window to its coarse level (the chapter on screen keeps loading throughout),
      // then the window fills in
      const thin = win.filter((c) => seqProgress(c.id) < COARSE)
      const go = thin.length ? win.filter((c) => ahead(c) === 0 || thin.includes(c)) : win.length ? win : [open.sort((a, b) => rank(a) - rank(b))[0]]
      const now = performance.now()
      for (const c of open) {
        if (!go.includes(c)) {
          pauseSeq(c.id)
          last.delete(c.id)
          continue
        }
        prefetchSeq(c.id)
        const at = seqProgress(c.id)
        const l = last.get(c.id)
        if (!l || l.at !== at) last.set(c.id, { at, since: now })
        else if (now - l.since > STALL) stalled.add(c.id)
      }
      await sleep(50)
    }
  })()
  await Promise.all([
    pics,
    sets,
    ...Array.from({ length: PARALLEL }, async () => {
      while (queue.length && !ctl.signal.aborted) await fetchOne(queue.shift()!).catch(() => {})
    }),
  ])
  emit()
  if (!ctl.signal.aborted) {
    warm = true
    emit()
  }
}

/** Starts at mount, before the intro opens, and follows path switches. */
export function startWarmCache() {
  if (!enabled) return () => {}
  void run(store.getState().path)
  return store.subscribe((s) => {
    if (path && s.path !== path) void run(s.path)
  })
}
