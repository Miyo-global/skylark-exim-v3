import { expect, test, type Page } from '@playwright/test'
import { MARKET_COUNT } from '../src/config/markets'

/**
 * Homepage hero, experimental (feat/hero-fable-test), "From one drop to the world": it opens on navy, a WebGL drop
 * lands and its ripple opens onto the CG departure clip (cg-depart-1, played once, never looped), and the copy comes in
 * word by word. The hero then holds the screen over a scroll runway: the wake line draws, lifts into the markets globe
 * and one route per market lights up. Save-Data gets no WebGL (the poster fades in); reduced motion gets the still first
 * frame, one screen tall, with all the copy.
 */
const ready = async (page: Page) => {
  await page.waitForFunction(() => document.documentElement.dataset.ready === '1', null, { timeout: 30_000 })
  await page.waitForSelector('#boot', { state: 'detached', timeout: 60_000 })
}
const video = (page: Page) =>
  page.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>('.home-hero video')
    return v && { t: v.currentTime, paused: v.paused, muted: v.muted, loop: v.loop, inline: v.playsInline, src: v.currentSrc }
  })
const visible = (page: Page, sel: string) =>
  page.locator(`.home-hero .hero ${sel}`).first().evaluate((el) => getComputedStyle(el).visibility === 'visible' && +getComputedStyle(el).opacity > 0.9)

for (const [label, vp, tier] of [
  ['desktop', { width: 1440, height: 900 }, '1920'],
  ['phone', { width: 390, height: 844 }, 'm'],
] as const) {
  test(`${label}: the CG clip from the ${tier} file plays once behind the drop, over a scroll runway, no frame sequence`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: vp, isMobile: label === 'phone', hasTouch: label === 'phone' })
    const page = await ctx.newPage()
    const frames: string[] = []
    page.on('request', (r) => /\/media\/(hero-seq_|cg-depart-1-f_)/.test(r.url()) && frames.push(r.url()))
    await page.goto('/')
    await ready(page)
    // the hero holds one screen while its runway scrolls
    const box = await page.evaluate(() => ({ section: document.querySelector('.home-hero')!.getBoundingClientRect().height, hero: document.querySelector('.home-hero .hero')!.getBoundingClientRect().height }))
    expect(Math.abs(box.hero - vp.height)).toBeLessThan(2)
    expect(box.section).toBeGreaterThan(vp.height * 2.5)
    await expect(page.locator('.home-hero canvas.hero__drop')).toHaveCount(1)
    const a = (await video(page))!
    expect(a).toMatchObject({ muted: true, loop: false, inline: true })
    expect(a.src).toMatch(new RegExp(`/media/cg-depart-1_${tier}(\\.av1|\\.hevc)?\\.mp4`))
    // the drop lands, the clip rolls from its first frame and the canvas goes; no scroll needed
    await expect(page.locator('.home-hero canvas.hero__drop')).toBeHidden({ timeout: 8000 })
    expect((await video(page))!.t).toBeGreaterThan(0)
    expect(await page.evaluate(() => scrollY)).toBe(0)
    expect(frames).toEqual([])
    await ctx.close()
  })
}

test('all hero copy comes in on its own, word by word, with no scroll', async ({ page }) => {
  await page.goto('/')
  await ready(page)
  await expect(page.locator('.home-hero .hero__title .hero__word')).toHaveCount(5)
  for (const sel of ['.hero__title', '.hero__title .hero__word:last-child', '.hero__body .hero__word:last-child', '.hero__exports', '.hero__contact', '.hero__fork'])
    await expect.poll(() => visible(page, sel), { message: sel, timeout: 8000 }).toBe(true)
})

test('scroll: the wake line draws, lifts into the globe, and a route lights for every market', async ({ page }) => {
  await page.goto('/')
  await ready(page)
  const run = await page.evaluate(() => document.querySelector<HTMLElement>('.home-hero')!.offsetHeight - innerHeight)
  const at = async (p: number) => {
    await page.evaluate((y) => scrollTo(0, y), run * p)
    await page.waitForTimeout(700)
    return page.evaluate(() => {
      const off = (el: Element) => parseFloat(getComputedStyle(el).strokeDashoffset)
      return {
        route: getComputedStyle(document.querySelector('.hero__route')!).visibility,
        line: off(document.querySelector('.route__line:not(.route__line--glow)')!),
        arcs: [...document.querySelectorAll('.route__arc')].map(off),
        dots: [...document.querySelectorAll('.route__dot')].filter((d) => getComputedStyle(d).opacity === '1').length,
        copy: getComputedStyle(document.querySelector('.home-hero .hero__copy')!).visibility,
        top: Math.round(document.querySelector('.home-hero .hero')!.getBoundingClientRect().top),
      }
    })
  }
  const start = await at(0)
  expect(start.route).toBe('hidden')
  const mid = await at(0.3)
  expect(mid).toMatchObject({ route: 'visible', copy: 'hidden', top: 0 })
  expect(mid.line).toBeGreaterThan(0)
  expect(mid.line).toBeLessThan(1)
  expect(mid.arcs.every((o) => o === 1)).toBe(true)
  const end = await at(1)
  expect(end.top).toBe(0)
  expect(end.line).toBe(0)
  expect(end.arcs).toHaveLength(MARKET_COUNT)
  expect(end.arcs.every((o) => o === 0)).toBe(true)
  expect(end.dots).toBe(MARKET_COUNT)
  // and back: nothing is left drawn at the top
  expect((await at(0)).route).toBe('hidden')
})

test('the clip rests once the hero is fully off screen', async ({ page }) => {
  await page.goto('/')
  await ready(page)
  const h = await page.evaluate(() => document.querySelector<HTMLElement>('.home-hero')!.offsetHeight)
  await page.evaluate((y) => scrollTo(0, y), h + 400)
  await expect.poll(async () => (await video(page))!.paused).toBe(true)
})

test.describe('Save-Data', () => {
  test('no WebGL: the poster fades in from the navy and the copy still comes in', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g' } }))
    await page.goto('/')
    await ready(page)
    await expect(page.locator('.home-hero canvas')).toHaveCount(0)
    await expect(page.locator('.home-hero .hero__veil')).toHaveClass(/is-out/)
    await expect.poll(() => visible(page, '.hero__title .hero__word:last-child'), { timeout: 8000 }).toBe(true)
  })
})

test('the static headline (LCP) paints before any script and React takes over in the same place', async ({ page }) => {
  await page.route(/\/assets\/.*\.js$/, (r) => r.abort())
  await page.goto('/')
  const h1 = page.locator('#hero-static h1')
  expect(await h1.evaluate((el) => +getComputedStyle(el).opacity)).toBe(1)
  await expect(page.locator('#hero-static .hero__fork')).toBeVisible()
  const before = (await h1.boundingBox())!
  await page.unroute(/\/assets\/.*\.js$/)
  await page.goto('/')
  await ready(page)
  const after = (await page.locator('.home-hero .hero__title').boundingBox())!
  for (const k of ['x', 'y', 'width', 'height'] as const) expect(Math.abs(after[k] - before[k])).toBeLessThan(1.5)
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })
  test('a still first frame, no video, all copy visible', async ({ page }) => {
    await page.goto('/')
    await ready(page)
    await expect(page.locator('.home-hero video')).toHaveCount(0)
    await expect(page.locator('.home-hero .hero__poster')).toBeVisible()
    const h = await page.locator('.home-hero').evaluate((el) => el.getBoundingClientRect().height)
    expect(Math.abs(h - (await page.evaluate(() => innerHeight)))).toBeLessThan(2)
    for (const sel of ['.hero__title', '.hero__body', '.hero__contact', '.hero__fork']) expect(await visible(page, sel)).toBe(true)
    await expect(page.locator('#hero-static')).toHaveCount(0)
  })
})
