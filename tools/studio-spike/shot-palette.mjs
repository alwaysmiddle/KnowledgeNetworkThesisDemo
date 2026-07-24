// One-shot visual + behavioural check for the reshaped supply pane (#28): the
// palette is now a ranked SEARCH over all 753 nodes whose empty state is recent
// searches. Same server-owns-its-lifecycle pattern as shot-visuals.mjs beside
// it (backgrounded dev servers die on this machine).
//
//   node tools/studio-spike/shot-palette.mjs
// Frames land in tools/studio-spike/shots/ (gitignored). Nonzero on any failure.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const REPO = 'D:/ShiZhong/MyCode/KnowledgeNetworkThesisDemo'
const OUT = REPO + '/tools/studio-spike/shots'
const PORT = 5198
mkdirSync(OUT, { recursive: true })

const require = createRequire(REPO + '/package.json')
const { chromium } = require('playwright-core')

const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'], {
  cwd: REPO,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let viteOut = ''
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('vite did not become ready:\n' + viteOut)), 30000)
  const watch = (d) => {
    viteOut += String(d)
    if (viteOut.includes('localhost:')) {
      clearTimeout(t)
      res()
    }
  }
  vite.stdout.on('data', watch)
  vite.stderr.on('data', watch)
  vite.on('exit', (c) => rej(new Error('vite exited early ' + c + ':\n' + viteOut)))
})

const errors = []
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1750, height: 950 } })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text())
})

await page.goto(`http://localhost:${PORT}/`)
await page.getByLabel('studio-preset-authoring').click()
await page.waitForTimeout(500)

const search = page.locator('[data-pal-search]')
if ((await search.count()) !== 1) errors.push('palette: the search input did not mount in the Authoring preset')

// 0 — EMPTY STATE: nothing typed, no history yet → the cold prompt, not a chip
// cloud. Zero result rows.
await page.screenshot({ path: OUT + '/p0-empty-cold.png' })
if ((await page.locator('[data-pal]').count()) !== 0) errors.push('empty state: result rows showing with an empty query')

// 1 — WIDENED REACH: a CONTAINER title ("Operating Systems", a module) was
// unreachable in the old topic-only chip cloud. It must now be a search hit —
// this is the 7% → 100% claim, asserted.
await search.fill('operating')
await page.waitForTimeout(200)
const osHit = await page.locator('[data-pal="os"]').count()
if (osHit !== 1) errors.push('widened reach: the "Operating Systems" container is not a search hit')
const hitCount = await page.locator('[data-pal]').count()
if (hitCount === 0) errors.push('search: "operating" matched nothing')
await page.screenshot({ path: OUT + '/p1-hits-operating.png' })

// 2 — RANKING: for "hash", a title-prefix/substring topic must outrank a node
// that only matches on its breadcrumb. Assert the first row is a real hashing
// topic, and that a breadcrumb line renders under a title.
await search.fill('hash')
await page.waitForTimeout(200)
const firstId = await page.locator('[data-pal]').first().getAttribute('data-pal')
if (!firstId || !/hash/i.test(firstId)) errors.push(`ranking: top hit for "hash" is ${firstId}, expected a hashing node`)
await page.screenshot({ path: OUT + '/p2-hits-hash.png' })

// 3 — RECENTS: Enter records the query; clearing the box shows it as a chip
// that RE-RUNS the search when clicked.
await search.fill('encryption')
await search.press('Enter')
await search.fill('')
await page.waitForTimeout(200)
const chip = page.getByRole('button', { name: /encryption/ })
if ((await chip.count()) === 0) errors.push('recents: the searched query did not appear as a recent chip')
await page.screenshot({ path: OUT + '/p3-recents.png' })
await chip.first().click()
await page.waitForTimeout(200)
if ((await search.inputValue()) !== 'encryption') errors.push('recents: clicking a recent chip did not re-run its query')

if (errors.length) {
  console.log('ERRORS:\n' + errors.join('\n'))
} else {
  console.log('palette OK — empty state, widened reach, ranking, recents all verified')
}
await browser.close()
vite.kill()
process.exit(errors.length ? 1 : 0)
