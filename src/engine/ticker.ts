import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { frame as motionFrame } from 'motion/react'
import { env } from './env'
import { frame } from './store'

gsap.registerPlugin(ScrollTrigger)

type TickFn = (time: number) => void
let subs: { fn: TickFn; order: number }[] = []
let lenis: Lenis | null = null
let started = false
let ticking = false

/**
 * The clock alone, without smooth scrolling: pages with no film (the homepage globe) still get onTick callbacks.
 * One requestAnimationFrame for the page (#235): Motion's frame loop drives GSAP's root timeline, Lenis and every onTick
 * callback, in that order, so Lenis, ScrollTrigger and Motion never tick on separate loops.
 */
export function startClock() {
  if (ticking) return
  ticking = true
  gsap.ticker.remove(gsap.updateRoot)
  // GSAP's clock starts at its own origin: carry its current time on, so tweens already running don't jump
  const t0 = performance.now() / 1000 - gsap.ticker.time
  motionFrame.update(({ timestamp }) => {
    const time = timestamp / 1000 - t0
    gsap.updateRoot(time)
    tick(time)
  }, true)
}

/** One clock for everything (TRD §1): the shared frame loop drives Lenis, ScrollTrigger and every per-frame callback. */
export function startEngine() {
  if (started) return
  started = true
  // Touch and reduced motion keep native scrolling.
  if (!env.coarse && !env.reduced) {
    // lerp 0.08 / wheel 0.8 (was 0.1 / 1): 10 notches through the plant at 1440×900, 6 runs each, put the picture more
    // than 2 frames off the scroll target on 3.8% of frames (was 5.6%), the largest step per frame at ~20 px (was ~25);
    // it settles ~250 ms later and a notch travels 80 px instead of 100
    lenis = new Lenis({ autoRaf: false, lerp: 0.08, wheelMultiplier: 0.8, smoothWheel: true, syncTouch: false })
    lenis.on('scroll', ScrollTrigger.update)
  }
  if (env.coarse) ScrollTrigger.config({ ignoreMobileResize: true })
  ScrollTrigger.normalizeScroll(false)
  startClock()
}

function tick(time: number) {
  lenis?.raf(time * 1000)
  const y = lenis ? lenis.scroll : window.scrollY
  if (y !== frame.scroll) frame.dir = y > frame.scroll ? 1 : -1
  frame.scroll = y
  for (const s of subs) s.fn(time)
}

/**
 * Register a per-frame callback. Write only to refs, style.transform/opacity, video.currentTime or three uniforms.
 * Lower `order` runs first (the film controller uses -10 so everyone else reads this frame's chapter progress).
 */
export function onTick(fn: TickFn, order = 0) {
  subs = [...subs, { fn, order }].sort((a, b) => a.order - b.order)
  return () => void (subs = subs.filter((s) => s.fn !== fn))
}

const SCROLL_KEYS = new Set([' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End'])
const swallowKey = (e: KeyboardEvent) => {
  if (SCROLL_KEYS.has(e.key)) e.preventDefault()
}
const swallow = (e: Event) => e.preventDefault()

export function lockScroll() {
  lenis?.stop()
  document.documentElement.classList.add('is-locked')
  addEventListener('keydown', swallowKey, { capture: true })
  addEventListener('wheel', swallow, { passive: false })
  addEventListener('touchmove', swallow, { passive: false })
}

export function unlockScroll() {
  document.documentElement.classList.remove('is-locked')
  removeEventListener('keydown', swallowKey, { capture: true })
  removeEventListener('wheel', swallow)
  removeEventListener('touchmove', swallow)
  lenis?.start()
}

/**
 * Re-measure the page for Lenis. It clamps a wheel to the height it last measured, and the lazy page content lands
 * after it is created: without this the first wheel after the content mounts moves nothing (#264).
 */
export const resizeScroll = () => lenis?.resize()

export function scrollToY(y: number, immediate = false) {
  // Lenis clamps to the page height it last measured (a debounced ResizeObserver): a jump right after the story mounts,
  // with the intro already seen this session, would land at 0. Measure first.
  lenis?.resize()
  if (lenis) lenis.scrollTo(y, { immediate, duration: 1.4, force: true })
  else window.scrollTo({ top: y, behavior: immediate || env.reduced ? 'instant' : 'smooth' })
}
