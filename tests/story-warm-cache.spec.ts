import { expect, test, type Page } from '@playwright/test'
import { CLIPS, SEQ } from '../src/film/manifest'
import { scrollThrough } from './helpers'

// #251, #preload: the intro opens on the first clip. The rest of the active path still goes into memory (clips as
// Blobs, the port film's frame sets in the decode worker). Once that finishes, a scroll from top to bottom touches the
// network for no clip or frame. Frame times only mean something with GPU=1.

/** the path's video clips (the port film's frame sequences, #hd2, are the stage canvas's on desktop) */
const videosOf = (path: 'ocean' | 'pond', mobile: boolean) => CLIPS[path].filter((c) => mobile || !(c.id in SEQ)).map((c) => c.id)

const ready = (page: Page) => page.waitForFunction(() => document.documentElement.dataset.ready === '1', null, { timeout: 30_000 })

async function lcp(page: Page) {
  return page.evaluate(
    () =>
      new Promise<number>((done) => {
        new PerformanceObserver((l) => {
          const e = l.getEntries()
          done(Math.round(e[e.length - 1].startTime))
        }).observe({ type: 'largest-contentful-paint', buffered: true })
      }),
  )
}

const DEVICES = {
  desktop: { viewport: { width: 1440, height: 900 }, mobile: false, budgetMB: 25 },
  phone: { viewport: { width: 390, height: 844 }, mobile: true, budgetMB: 12 },
}

for (const [device, d] of Object.entries(DEVICES))
for (const path of ['ocean', 'pond'] as const) {
  test(`${device} /story#${path}: after the path finishes warming, a full scroll fetches no clip or frame`, async ({ browser }) => {
    test.setTimeout(300_000)
    const ctx = await browser.newContext({ viewport: d.viewport, isMobile: d.mobile, hasTouch: d.mobile })
    const page = await ctx.newPage()
    const during: string[] = []
    let phase: 'load' | 'scroll' = 'load'
    page.on('request', (r) => phase === 'scroll' && /\/media\/.+(\.mp4|-f_1920_\d+\.(avif|webp))$/.test(new URL(r.url()).pathname) && during.push(new URL(r.url()).pathname))
    await page.goto(`/story#${path}`)
    await ready(page)
    const l = await lcp(page)
    await page.waitForSelector('#boot', { state: 'detached', timeout: 120_000 })
    await page.waitForFunction(() => (window as unknown as { __warmCache?: { warm: boolean } }).__warmCache?.warm === true, null, { timeout: 180_000 })
    const held = await cache(page)
    const sets = await page.evaluate(() => ((window as unknown as { __sequences?: { id: string; complete: boolean }[] }).__sequences ?? []).filter((q) => q.id.startsWith('stage-hf-port')))
    phase = 'scroll'
    await page.evaluate(() => {
      const w = window as unknown as { __f: number[]; __run: boolean }
      w.__f = []
      w.__run = true
      let last = performance.now()
      const f = (t: number) => (w.__f.push(t - last), (last = t), w.__run && requestAnimationFrame(f))
      requestAnimationFrame(f)
    })
    await scrollThrough(page, d.mobile, 1200)
    const p95 = await page.evaluate(() => {
      const w = window as unknown as { __f: number[]; __run: boolean }
      w.__run = false
      const f = w.__f.slice(5).sort((a, b) => a - b)
      return +f[Math.floor(f.length * 0.95)].toFixed(1)
    })
    console.log(device, path, JSON.stringify({ lcpMs: l, warm: held.warm, held: held.ids.length, sets: sets.length, mediaFromNetworkDuringScroll: during.length, frameP95Ms: p95 }))
    expect(held.warm).toBe(true)
    expect(videosOf(path, d.mobile).filter((id) => !held.ids.includes(id))).toEqual([])
    if (!d.mobile) expect(sets.filter((q) => q.complete).length).toBe(5)
    expect(during).toEqual([])
    if (process.env.GPU) expect(p95).toBeLessThanOrEqual(16.7)
    await ctx.close()
  })
}

type Cache = { path: string; ids: string[]; progress: number; warm: boolean }
async function cache(page: Page) {
  return page.evaluate(() => (window as unknown as { __warmCache: Cache }).__warmCache)
}
const OCEAN_ONLY = ['cg-depart-1', 'cg-depart-2', 'cg-depart-3', 'hf-catch', 'hf-ice', 'hf-return', 'hf-unload-fish', 'hf-unload-crew', 'hf-fish-intake', 'hf-fish-wash', 'hf-fish-cut', 'hf-fish-freeze']
const POND_ONLY = ['hf-ponds', 'hf-sample', 'hf-harvest', 'hf-unload-shrimp', 'hf-intake', 'hf-wash', 'hf-peel', 'hf-lab', 'hf-iqf', 'hf-pack']

test('only the active path is fetched; decoders play from blob: URLs or hold their clip whole; a path switch drops the other path’s clips', async ({ page }) => {
  const clips = new Set<string>()
  page.on('request', (r) => {
    const m = new URL(r.url()).pathname.match(/^\/media\/(.+?)_(?:m|\d+)(?:\.(?:av1|hevc))?\.mp4$/)
    if (m) clips.add(m[1])
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/story#ocean')
  await ready(page)
  await expect.poll(async () => (await cache(page)).progress, { timeout: 20_000 }).toBe(1)
  expect([...clips].filter((c) => POND_ONLY.includes(c))).toEqual([])
  // every decoder plays from the cache or holds its clip whole: a seek never waits on the network
  const waiting = () =>
    page.$$eval('.stage video[src]', (vs) =>
      (vs as HTMLVideoElement[]).filter((v) => {
        if (v.src.startsWith('blob:')) return false
        const b = v.buffered
        return !(b.length === 1 && b.start(0) < 0.05 && b.end(0) > v.duration - 0.05)
      }).length,
    )
  await page.mouse.move(700, 450)
  for (let i = 0; i < 40; i++) await page.mouse.wheel(0, 120)
  await expect.poll(waiting, { timeout: 10_000 }).toBe(0)

  await page.locator('.path-toggle a', { hasText: 'Farmed shrimp' }).click()
  await expect.poll(async () => (await cache(page)).path).toBe('pond')
  await expect.poll(async () => (await cache(page)).progress, { timeout: 20_000 }).toBe(1)
  const ids = (await cache(page)).ids
  expect(ids.filter((id) => OCEAN_ONLY.includes(id))).toEqual([])
  // every clip held belongs to the farmed path (shared chapters cached on the wild path stay cached across the switch)
  const pond = new Set(CLIPS.pond.map((c) => c.id))
  expect(ids.filter((id) => !pond.has(id))).toEqual([])
})

test('Save-Data keeps the distance prefetch only: nothing is fetched ahead in idle time', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g' } }))
  const page = await ctx.newPage()
  const clips = new Set<string>()
  page.on('request', (r) => /\/media\/.+\.mp4/.test(r.url()) && clips.add(new URL(r.url()).pathname))
  await page.goto('/story#ocean')
  await ready(page)
  await page.waitForTimeout(6000)
  expect(clips.size).toBeLessThanOrEqual(3)
  await expect(page.locator('.cache-bar')).not.toHaveClass(/is-done/)
  await ctx.close()
})
