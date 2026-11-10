// Longest main-thread task while the hero's runway scrolls, at 1× and 4× CPU: node review-fable/jank.mjs [baseURL]
import { chromium, devices } from '@playwright/test'
const base = process.argv[2] ?? 'http://localhost:4196'
const browser = await chromium.launch()
for (const [name, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['phone', devices['Pixel 7']]]) {
  for (const rate of [1, 4]) {
    const ctx = await browser.newContext(opts)
    const page = await ctx.newPage()
    const cdp = await ctx.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate })
    await page.goto(base)
    await page.waitForSelector('#boot', { state: 'detached', timeout: 60_000 })
    await page.waitForTimeout(5000)
    await page.evaluate(() => {
      window.__long = []
      new PerformanceObserver((l) => window.__long.push(...l.getEntries().map((e) => Math.round(e.duration)))).observe({ type: 'longtask' })
      window.__frames = []
      let last = performance.now()
      const f = (t) => (window.__frames.push(t - last), (last = t), requestAnimationFrame(f))
      requestAnimationFrame(f)
    })
    const run = await page.evaluate(() => document.querySelector('.home-hero').offsetHeight - innerHeight)
    for (let i = 1; i <= 120; i++) {
      if (name === 'desktop') await page.mouse.wheel(0, run / 120)
      else await page.evaluate((y) => scrollTo(0, y), (run * i) / 120)
      await page.waitForTimeout(40)
    }
    await page.waitForTimeout(500)
    const r = await page.evaluate(() => ({ long: window.__long, worst: Math.round(Math.max(...window.__frames)), over50: window.__frames.filter((d) => d > 50).length, frames: window.__frames.length }))
    console.log(name, `${rate}x CPU`, 'long tasks (ms):', r.long.join(' ') || 'none', '· worst frame', r.worst, 'ms ·', r.over50, 'of', r.frames, 'frames over 50 ms')
    await ctx.close()
  }
}
await browser.close()
