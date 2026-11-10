import { lazy, startTransition, Suspense, useEffect, useRef, useState } from 'react'
import { film } from '../config/content'
import { MarketList } from '../sections/MarketList'
import { calm } from '../three/calm'
import { GLOBE_POSTER } from '../three/globeState'
import * as m from 'motion/react-m'
import { reveal, rise } from '../motion/tokens'

/** the globe box's width (home.css .home-globe) */
const POSTER_SIZES = '(max-width: 819px) min(420px, 100vw), min(720px, 45vw)'
const loadGlobe = () => import('../three/Globe')
const GlobeCanvas = lazy(loadGlobe)
let warmed: Promise<unknown> | null = null
/** the globe's chunk and its decoded texture, once (#274) */
const warmGlobe = () => (warmed ??= loadGlobe().then((g) => g.preloadGlobe('home')).catch(() => void (warmed = null)))

/** the globe starts once the section is within three screens: its chunk (three.js), its earth texture, then the canvas */
const NEAR = '300% 0px'

/**
 * Markets: the region list and the live globe. The globe is lazy (feat/hero-fable-test): nothing of it, not its chunk,
 * not the 4096 px earth texture, is fetched until the section is within three screens; then the texture is
 * decoded off the main thread and the canvas mounts and warms in idle slices (three/Globe.tsx). The poster (the
 * globe's exact first view, itself a lazy image) stands in until the live globe has drawn.
 */
export function Markets() {
  const [mounted, setMounted] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let gone = false
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        void warmGlobe().then(calm).then(() => !gone && startTransition(() => setMounted(true)))
      },
      { rootMargin: NEAR },
    )
    io.observe(box.current!)
    return () => (io.disconnect(), void (gone = true))
  }, [])
  const world = film.world[0]
  return (
    <section id="markets" className="section theme-light home-markets" aria-labelledby="markets-title">
      <m.div className="home-markets__copy" {...reveal}>
        <m.p className="eyebrow mono" variants={rise}>Markets</m.p>
        <m.h2 id="markets-title" className="section__title" variants={rise}>{world.title}</m.h2>
        <MarketList />
      </m.div>
      <div className="home-globe" data-globe ref={box}>
        {/* the live globe's first view: a fallback, shown only if the globe hasn't drawn by the time it's on screen (#274) */}
        <picture>
          <source type="image/avif" srcSet={GLOBE_POSTER('avif')} sizes={POSTER_SIZES} />
          <img className="globe-ph" srcSet={GLOBE_POSTER('webp')} sizes={POSTER_SIZES} src="/textures/globe-home_1280.webp" alt="" width={2560} height={2560} loading="lazy" decoding="async" />
        </picture>
        {mounted && (
          <Suspense fallback={null}>
            <GlobeCanvas worldIndex={-1} />
          </Suspense>
        )}
      </div>
    </section>
  )
}
