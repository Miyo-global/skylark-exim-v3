// Records the hero (intro, then the scroll scene) on desktop and on a phone: node review-fable/record.mjs [baseURL]
// SHOTS=1 also saves stills (a screenshot disturbs the recording's timing, so the clips are recorded without)
import { chromium, devices } from '@playwright/test'
import { mkdirSync, renameSync } from 'node:fs'

const shots = !!process.env.SHOTS
const base = process.argv[2] ?? 'http://localhost:4196'
const out = new URL('./out/', import.meta.url).pathname
mkdirSync(out, { recursive: true })
const browser = await chromium.launch(process.env.GPU ? { channel: 'chromium', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] } : {})
for (const [name, opts] of [
  ['desktop', { viewport: { width: 1440, height: 900 } }],
  ['phone', { ...devices['Pixel 7'] }],
]) {
  const size = opts.viewport
  const ctx = await browser.newContext({ ...opts, recordVideo: { dir: out, size } })
  const page = await ctx.newPage()
  const t0 = Date.now()
  await page.goto(base)
  await page.waitForSelector('#boot', { state: 'detached', timeout: 60_000 })
  const intro = (Date.now() - t0) / 1000
  for (const [i, ms] of [[0, 500], [1, 500], [2, 600], [3, 1700]]) {
    await page.waitForTimeout(ms)
    if (shots) await page.screenshot({ path: `${out}${name}-intro-${i}.png` })
  }
  // the runway, in about 5 s
  const run = await page.evaluate(() => document.querySelector('.home-hero').offsetHeight - innerHeight)
  const steps = 100
  const s0 = Date.now()
  for (let i = 1; i <= steps; i++) {
    if (name === 'desktop') await page.mouse.wheel(0, run / steps)
    else await page.evaluate((y) => scrollTo(0, y), (run * i) / steps)
    // on the clock: a wheel step takes longer than a scrollTo
    await page.waitForTimeout(Math.max(0, s0 + i * 50 - Date.now()))
    if (shots && [16, 33, 47, 60, 76, 100].includes(i)) await page.screenshot({ path: `${out}${name}-scroll-${String(i).padStart(3, '0')}.png` })
  }
  await page.waitForTimeout(900)
  if (shots) await page.screenshot({ path: `${out}${name}-end.png` })
  const video = page.video()
  await ctx.close()
  renameSync(await video.path(), `${out}${name}-raw.webm`)
  console.log(name, 'intro opened at', intro.toFixed(2), 's')
}
await browser.close()
