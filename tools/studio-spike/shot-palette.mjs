// One-shot visual + behavioural check for the reshaped supply pane (#28): the
// palette is a ranked SEARCH over all 753 nodes whose empty state is recent
// searches, and putting a stop on the road is always an EXPLICIT gesture — a
// plain click never inserts; the row's + appends and clears; recents record the
// clean resolved TITLE, not the typed keystrokes. Same server-owns-its-lifecycle
// pattern as shot-visuals.mjs beside it (backgrounded dev servers die here).
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
const road = page.locator('[data-railroad]')
if ((await search.count()) !== 1) errors.push('palette: the search input did not mount in the Authoring preset')

// 0 — EMPTY STATE: nothing typed, no history yet → the cold prompt, zero result
// rows. The pane should also be SHORT now (it sizes to its content, handing the
// slack to the document below) — eyeball p0 against the old half-column void.
await page.screenshot({ path: OUT + '/p0-empty-cold.png' })
if ((await page.locator('[data-pal]').count()) !== 0) errors.push('empty state: result rows showing with an empty query')

// 1 — WIDENED REACH: a CONTAINER title ("Operating Systems", a module) was
// unreachable in the old topic-only chip cloud. It must now be a search hit —
// the 7% → 100% claim, asserted.
await search.fill('operating')
await page.waitForTimeout(200)
if ((await page.locator('[data-pal="os"]').count()) !== 1) errors.push('widened reach: the "Operating Systems" container is not a search hit')
if ((await page.locator('[data-pal]').count()) === 0) errors.push('search: "operating" matched nothing')
await page.screenshot({ path: OUT + '/p1-hits-operating.png' })

// 2 — CLICK DOES NOT INSERT: clicking the row BODY is inspection, not authoring.
// The road must not gain the stop, and the box must not clear.
if ((await road.getByText('Operating Systems').count()) !== 0) errors.push('precondition: "Operating Systems" already on the road before any insert')
await page.locator('[data-pal="os"]').click()
await page.waitForTimeout(150)
if ((await road.getByText('Operating Systems').count()) !== 0) errors.push('click-inserts: a plain row click added a stop (it must not)')
if ((await search.inputValue()) !== 'operating') errors.push('click-inserts: a plain row click cleared the search box (it must not)')

// 3 — + APPENDS AND CLEARS: the explicit add lands the stop on the road, then
// collapses the list (box cleared, zero rows).
await page.locator('[data-pal-add="os"]').click()
await page.waitForTimeout(200)
if ((await road.getByText('Operating Systems').count()) === 0) errors.push('+ append: the stop did not land on the road')
if ((await search.inputValue()) !== '') errors.push('+ append: the search box did not clear after appending')
if ((await page.locator('[data-pal]').count()) !== 0) errors.push('+ append: the result list did not collapse after appending')

// 4 — RECENTS RECORD THE RESOLVED TITLE, not the keystrokes. The append above
// resolved to "Operating Systems", so that clean title is the first recent chip.
if ((await page.locator('[data-pal-recent="Operating Systems"]').count()) === 0)
  errors.push('recents: the appended node\'s title did not appear as a recent chip')
await page.screenshot({ path: OUT + '/p2-recents-title.png' })

// 5 — ENTER RECORDS THE TOP HIT'S TITLE, even from a sloppy query. Type a typo'd
// fragment, note the resolved top hit, Enter, and assert THAT title is the chip
// (not the raw fragment), and that clicking it re-runs a search.
await search.fill('encrypt')
await page.waitForTimeout(200)
const topTitle = await page.locator('[data-pal]').first().evaluate((el) => el.querySelector('span:nth-child(2) > span')?.textContent || '')
await search.press('Enter')
await search.fill('')
await page.waitForTimeout(200)
if (!topTitle) errors.push('ranking: "encrypt" fragment matched nothing to resolve')
if (topTitle && (await page.locator(`[data-pal-recent="${topTitle}"]`).count()) === 0)
  errors.push(`recents: Enter did not record the resolved title "${topTitle}" (it saved the raw fragment instead)`)
if ((await page.locator('[data-pal-recent="encrypt"]').count()) !== 0)
  errors.push('recents: the raw typed fragment "encrypt" was saved as a recent (it must not be)')
await page.screenshot({ path: OUT + '/p3-recents-refined.png' })
await page.locator(`[data-pal-recent="${topTitle}"]`).first().click()
await page.waitForTimeout(200)
if (topTitle && (await search.inputValue()) !== topTitle) errors.push('recents: clicking a recent chip did not re-run its query')

if (errors.length) {
  console.log('ERRORS:\n' + errors.join('\n'))
} else {
  console.log('palette OK — empty/short, widened reach, click-no-insert, +-append-and-clear, title recents all verified')
}
await browser.close()
vite.kill()
process.exit(errors.length ? 1 : 0)
