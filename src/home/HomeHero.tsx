import gsap from 'gsap'
import { Fragment, useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { exportsLine, start } from '../config/content'
import { HERO_CLIP } from '../config/hero'
import { env } from '../engine/env'
import { frame, useApp } from '../engine/store'
import { onTick } from '../engine/ticker'
import { HERO_POSTER, clipUrl, mediaUrl } from '../film/segments'
import { HeroRoute, type Scrub } from './HeroRoute'
import type { Drop } from './drop'
import '../ui/hero.css'
import './hero-fable.css'

const heroSrc = clipUrl(HERO_CLIP)

let dropIn = () => {}
/**
 * The drop's shader is compiled and its first, navy frame drawn (at once where there is no drop: reduced motion, the
 * low tier). The homepage's intro waits for it, so the drop falls the moment the intro has opened: no blank beat. The
 * clip is not waited for: its first frame is the poster, and it rolls when the drop lands, or when it can.
 */
export const dropReady = new Promise<void>((r) => (dropIn = r))
/** the intro never waits longer than this for the shader */
const DROP_CAP_MS = 1500

/**
 * No WebGL drop here: the poster fades in from the navy instead. Save-Data, 2G/3G, and phones with 2 GB or less.
 * ponytail: deviceMemory is Chromium-only, so a weak iPhone still gets the shader (one triangle, 1× pixels); add a
 * frame-time probe if one turns up slow.
 */
const LOW = env.saveData || env.slow || (env.coarse && ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 2)

/** the hero's first frame, the LCP image: the same <picture> and preloads the static hero uses (config/hero.ts) */
const Poster = () => (
  <picture>
    {HERO_POSTER.map((p) => (
      <source key={p.type + p.media} type={p.type} media={p.media} srcSet={p.srcSet} sizes="100vw" />
    ))}
    <img className="hero__poster" src={mediaUrl(`${HERO_CLIP}_1280.webp`)} alt="" fetchPriority="high" decoding="async" />
  </picture>
)
const PATHS = ['ocean', 'pond'] as const
/** each word its own inline-block (ui/hero.css .hero__word), so the copy can come in word by word */
const words = (s: string) =>
  s.split(' ').map((w, i) => (
    <Fragment key={i}>
      <span className="hero__word">{w}</span>{' '}
    </Fragment>
  ))
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

/**
 * Homepage hero, experimental (feat/hero-fable-test), "From one drop to the world":
 * 1. near-black navy; one glowing drop falls and its ripple opens onto the CG departure clip (home/drop.ts, WebGL,
 *    fetched and compiled after the first paint, during the intro; the navy veil simply fades where there is no WebGL);
 * 2. the headline and the sub-line come in word by word (GSAP);
 * 3. on scroll the hero holds the screen: the wake becomes a warm line out to sea, lifts into the markets globe, and
 *    the export routes light one by one (home/HeroRoute.tsx).
 * Reduced motion gets the still first frame with all the copy, one screen tall, and none of the above.
 */
export function HomeHero({ sectionRef }: { sectionRef: RefObject<HTMLElement | null> }) {
  const revealed = useApp((s) => s.revealed)
  const root = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const veil = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const dusk = useRef<HTMLDivElement>(null)
  const media = useRef<HTMLDivElement>(null)
  const copy = useRef<HTMLDivElement>(null)
  const scrub = useRef<Scrub | null>(null)
  const drop = useRef<Promise<Drop | null> | null>(null)
  const lead = start.title.replace(/ world\.$/, '')

  // the copy waits out of sight for the drop (the static copy it replaces has left with the intro, ui/Loader.tsx)
  useLayoutEffect(() => {
    if (env.reduced) return
    const ctx = gsap.context(() => {
      gsap.set('.hero__word', { opacity: 0, yPercent: 55 })
      gsap.set('.hero__eyebrow, .hero__band, .hero__cue', { opacity: 0 })
      // the rust hairline beside the copy comes in with it, not before (ui/hero.css)
      gsap.set('.hero__copy', { '--hero-rule': 0 })
    }, root)
    return () => ctx.revert()
  }, [])

  // WebGL after the first paint: this effect runs in the app's chunk, itself requested once the first screen is on
  // screen (engine/first-screen.ts); the shader's chunk and its compile then take an idle slice during the intro
  useEffect(() => {
    if (env.reduced || LOW || !canvas.current) return dropIn()
    const cap = setTimeout(dropIn, DROP_CAP_MS)
    const el = canvas.current
    let gone = false
    const job = new Promise<Drop | null>((done) => {
      const go = () =>
        void import('./drop')
          .then((m) => (gone ? null : m.initDrop(el, env.mobile)))
          .catch(() => null)
          .then((d) => (clearTimeout(cap), dropIn(), done(d)))
      if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 600 })
      else setTimeout(go, 100)
    })
    drop.current = job
    return () => {
      gone = true
      void job.then((d) => d?.dispose())
    }
  }, [])

  useEffect(() => {
    if (!revealed) return
    root.current!.style.visibility = 'visible'
    root.current!.style.opacity = '1'
    if (env.reduced) return
    let dead = false
    let tl: gsap.core.Timeline | null = null
    const copyIn = (delay: number) => {
      if (dead) return
      const q = gsap.utils.selector(root)
      tl = gsap
        .timeline({ delay })
        .to(q('.hero__eyebrow'), { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0)
        .to(q('.hero__copy'), { '--hero-rule': 1, duration: 0.5, ease: 'power2.out' }, 0)
        .to(q('.hero__title .hero__word'), { opacity: 1, yPercent: 0, duration: 0.75, ease: 'power3.out', stagger: 0.08 }, 0.05)
        .to(q('.hero__body .hero__word'), { opacity: 1, yPercent: 0, duration: 0.5, ease: 'power3.out', stagger: 0.018 }, 0.35)
        .to(q('.hero__band, .hero__cue'), { opacity: 1, duration: 0.5, stagger: 0.1, clearProps: 'opacity' }, 0.75)
    }
    // the clip has waited on its first frame (no autoplay): it rolls as the water opens, with no seek back
    const roll = () => {
      const v = video.current
      if (!v) return
      v.dataset.rolled = '1'
      void v.play().catch(() => {})
    }
    const plain = () => {
      veil.current?.classList.add('is-out')
      if (canvas.current) canvas.current.style.display = 'none'
      roll()
      copyIn(0.3)
    }
    if (!drop.current) plain()
    else
      void drop.current.then((d) => {
        if (dead) return
        if (!d) return plain()
        d.play(() => (roll(), copyIn(0.15)), () => {})
        // the canvas is drawing the same navy: the veil can go
        if (veil.current) veil.current.style.display = 'none'
      })
    return () => {
      dead = true
      tl?.kill()
    }
  }, [revealed])

  // off screen the clip rests; it plays once (nothing loops, STYLE.md) and holds its last frame
  useEffect(() => {
    const v = video.current
    if (!v) return
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) v.pause()
      else if (v.dataset.rolled && !v.ended) void v.play().catch(() => {})
    })
    io.observe(sectionRef.current!)
    return () => io.disconnect()
  }, [sectionRef])

  // scroll: the copy leaves in the first stretch, then the runway (the section less one screen) drives the route scene
  useEffect(() => {
    const el = root.current
    if (!el || env.reduced) return
    let run = 0
    let vh = innerHeight
    const measure = () => {
      vh = innerHeight
      run = (sectionRef.current?.offsetHeight ?? vh) - vh
    }
    measure()
    addEventListener('resize', measure)
    let last = -1
    const off = onTick(() => {
      const y = frame.scroll
      if (y === last) return
      last = y
      el.style.setProperty('--hero-beat', clamp01(y / (vh * 0.72)).toFixed(4))
      const p = run > 8 ? clamp01(y / run) : 0
      const out = clamp01((p - 0.02) / 0.12)
      if (copy.current) {
        copy.current.style.opacity = String(1 - out)
        copy.current.style.visibility = out >= 1 ? 'hidden' : ''
      }
      if (dusk.current) dusk.current.style.opacity = String(clamp01((p - 0.34) / 0.24))
      // the boat is gone by the time the globe stands: a clean card
      if (media.current) media.current.style.transform = `scale(${(1 + 0.06 * clamp01(p / 0.6)).toFixed(4)})`
      scrub.current?.(p)
    })
    return () => {
      off()
      removeEventListener('resize', measure)
    }
  }, [sectionRef])

  return (
    <section ref={sectionRef} className="home-hero">
      <div className="hero" ref={root}>
        <div className="hero__media" ref={media}>
          <Poster />
          {!env.reduced && (
            <video
              ref={video}
              className="hero__poster"
              src={heroSrc}
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              aria-hidden="true"
              tabIndex={-1}
            />
          )}
        </div>
        {!env.reduced && (
          <>
            <div className="hero__dusk" ref={dusk} />
            <HeroRoute scrub={scrub} />
            <div className="hero__veil" ref={veil} />
            {!LOW && <canvas className="hero__drop" ref={canvas} aria-hidden="true" />}
          </>
        )}
        <div className="hero__copy" ref={copy}>
          <p className="hero__eyebrow mono">{start.eyebrow}</p>
          <h1 className="hero__title">
            {words(lead)}
            <span className="hero__word">
              <em>world</em>.
            </span>
          </h1>
          <div className="hero__rest">
            <p className="hero__body">{words(start.body)}</p>
            <div className="hero__band">
              <div className="hero__exports">
                <h2 className="hero__exports-title mono">{exportsLine.title}</h2>
                <ul>
                  {exportsLine.items.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
              <div className="hero__actions">
                <a className="hero__contact" href="/quote">
                  Contact us
                </a>
                <div className="hero__fork" role="group" aria-label={start.choose}>
                  <span className="hero__fork-label mono">{start.choose}</span>
                  {PATHS.map((p) => (
                    <a key={p} className="hero__fork-btn" href={`/story#${p}`} data-path={p}>
                      {start[p].sub}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="hero__cue">
          Scroll to explore <span aria-hidden="true">↓</span>
        </p>
      </div>
    </section>
  )
}
