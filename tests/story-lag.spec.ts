import { expect, test } from '@playwright/test'
import { scrollThrough } from './helpers'

// Frame-set lag (PR #324 audit, item 5): on a 1440×900 desktop at 25 Mbps with the cache off, scrolled through each path
// at 1200 px/s, the canvas frame trails the frame the scroll asks for by ≤ 3 indices at p95, and the picture never
// freezes for more than 250 ms while the scroll is moving through a frame set. Samples during a join crossfade
// (data-xf > 0, where the canvas blends towards the next set's entry frame on purpose) and on a set's first 300 ms are
// left out of the lag (the cut onto a set is held to the previous picture, which story-joins covers).

const MBPS_25 = { offline: false, latency: 20, downloadThroughput: (25 * 1024 * 1024) / 8, uploadThroughput: (5 * 1024 * 1024) / 8 }

for (const path of ['ocean', 'pond'] as const)
  test(`frame sets keep up at 25 Mbps: ${path}`, async ({ browser, baseURL }) => {
    test.setTimeout(400_000)
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
    const page = await ctx.newPage()
    const cdp = await ctx.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
    await cdp.send('Network.emulateNetworkConditions', MBPS_25)
    await page.goto(`${baseURL}/story#${path}`)
    await page.waitForFunction(() => document.documentElement.dataset.ready === '1', null, { timeout: 60_000 })
    await page.waitForTimeout(800)
    await page.evaluate(() => {
      const w = window as unknown as { __lag: { t: number; clip: string; want: number; got: number; xf: number }[]; __scrub: { id: string | null; target: number } }
      w.__lag = []
      const c = document.querySelector<HTMLCanvasElement>('canvas.stage__seq')!
      const step = (t: number) => {
        const s = w.__scrub
        if (s.id && c.dataset.clip === s.id && c.style.opacity === '1')
          w.__lag.push({ t, clip: s.id, want: Math.round(s.target * 24), got: +(c.dataset.frame ?? -1), xf: +(c.dataset.xf ?? 0) })
        requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    })
    await scrollThrough(page, false, 1200)
    const rows = await page.evaluate(() => (window as unknown as { __lag: { t: number; clip: string; want: number; got: number; xf: number }[] }).__lag)
    await ctx.close()

    const lags: number[] = []
    let freeze = 0
    let worst = ''
    let since = 0
    let clipStart = 0
    for (let k = 1; k < rows.length; k++) {
      const r = rows[k]
      const p = rows[k - 1]
      if (r.clip !== p.clip) {
        clipStart = r.t
        since = r.t
        continue
      }
      if (r.xf === 0 && r.t - clipStart > 300) lags.push(Math.abs(r.want - r.got))
      // a freeze: the frame on the canvas stays put while the scroll keeps asking for other frames
      // (in a join crossfade the canvas reports the incoming set's entry frame once the fade passes half: not a freeze)
      if (r.got !== p.got || r.want === r.got || r.xf > 0) since = r.t
      else if (r.t - since > freeze) {
        freeze = r.t - since
        worst = `${r.clip} want ${r.want} got ${r.got}`
      }
    }
    lags.sort((a, b) => a - b)
    const p95 = lags[Math.floor(lags.length * 0.95)] ?? 0
    console.log(`${path}: ${lags.length} samples, lag p50 ${lags[Math.floor(lags.length / 2)]} p95 ${p95} max ${lags.at(-1)}; longest freeze ${freeze.toFixed(0)} ms (${worst})`)
    expect(lags.length).toBeGreaterThan(200)
    expect(p95).toBeLessThanOrEqual(3)
    expect(freeze).toBeLessThanOrEqual(250)
  })
