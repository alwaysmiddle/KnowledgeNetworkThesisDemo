// One-shot visual check for the Studio (nested atlas + children pane).
// Spawns vite ITSELF as a child process — backgrounded dev servers die on
// this machine, so the script owns the server lifecycle: spawn, wait for
// readiness, screenshot, kill. createRequire -> playwright-core, msedge,
// headless — same pattern as shots.mjs beside this file.
//
// Run from anywhere:  node tools/studio-spike/shot-visuals.mjs
// Frames land in tools/studio-spike/shots/ (gitignored).
// Exits nonzero if the page threw any error.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const REPO = 'D:/ShiZhong/MyCode/KnowledgeNetworkThesisDemo'
const OUT = REPO + '/tools/studio-spike/shots'
const PORT = 5199
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
    // the banner is ANSI-styled — 'Local:' is split by escape codes
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
await page.getByLabel('studio-preset-cockpit').click()
await page.waitForTimeout(600)

// 1 — atlas at L2 (topics): wrapped labels, no capital dots
await page.getByLabel('nested-level-2').click()
await page.waitForTimeout(900)
await page.screenshot({ path: OUT + '/1-atlas-L2.png' })

// 2 — select the largest topic cell: overlay arrows + the wheel on that topic
// (synthetic click bypasses pointerEvents gating and the dragDist>4 guard,
// since there is no preceding pointerdown)
const picked = await page.evaluate(() => {
  const cells = [...document.querySelectorAll('path[data-terr][data-tier="2"]')]
  let best = null
  for (const c of cells) {
    const b = c.getBBox()
    const area = b.width * b.height
    if (!best || area > best.area) best = { area, id: c.getAttribute('data-terr'), el: c }
  }
  best.el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  return best.id
})
await page.waitForTimeout(1000)
await page.screenshot({ path: OUT + '/2-topic-selected.png' })

// item 7's invariant, structural and corpus-independent: the overlay collapses
// every link between one PAIR of cells into ONE road, so no unordered pair may
// be drawn twice. (A reciprocal pair regressing to two bowed arrows trips this.)
const pairs = await page.evaluate(() => {
  const seen = new Set()
  const dups = []
  for (const g of document.querySelectorAll('[data-seledge]')) {
    const [s, t] = g.getAttribute('data-seledge').split('>')
    const k = s < t ? `${s}|${t}` : `${t}|${s}`
    if (seen.has(k)) dups.push(k)
    seen.add(k)
  }
  return { n: seen.size, dups }
})
if (pairs.n === 0) errors.push('edge collapse: the selection drew no roads at all')
if (pairs.dups.length) errors.push('edge collapse: pair drawn more than once — ' + pairs.dups.join(', '))

// 3 — wheel, everything open: sqrt sectors + label lanes + leaders
await page.getByLabel('children-open-all').click()
await page.waitForTimeout(500)
await page.screenshot({ path: OUT + '/3-wheel-open-all.png' })

// 4 — relations star. Also shot CLOSE UP: the star's type labels are ~8px on a
// 1750px frame, far too small to judge from the full page — crop to the pane.
await page.getByLabel('children-mode-relations').click()
await page.waitForTimeout(400)
await page.screenshot({ path: OUT + '/4-relations-star.png' })
await page.getByLabel('children-panel').screenshot({ path: OUT + '/4a-star-closeup.png' })

// 4b — hover sync (item 4): hovering a relationship ROW must light the matching
// star node (dimming the rest) and spotlight that topic's territory on the map.
// Asserted, not just eyeballed — this is the whole point of the hover bus.
await page.locator('[data-relrow]').first().hover()
await page.waitForTimeout(300)
await page.screenshot({ path: OUT + '/4b-hover-sync.png' })
const litStars = await page.locator('[data-starnode][data-lit="1"]').count()
const litRows = await page.locator('[data-relrow][data-lit="1"]').count()
const spots = await page.locator('[data-spot]').count()
if (litStars !== 1 || spots !== 1 || litRows < 1)
  errors.push(`hover sync: expected 1 lit star + >=1 lit row + 1 map spotlight, got ${litStars} / ${litRows} / ${spots}`)

// item 3: the SAME relrow hover must also light the ROAD to that counterpart on
// the map — not just spotlight its territory. The lit star node names the
// counterpart topic; the lit road must carry that id as one of its endpoints.
const litStarId = await page.locator('[data-starnode][data-lit="1"]').first().getAttribute('data-starnode')
const litRoads = await page.locator('[data-seledge][data-elit="1"]').count()
const litRoadEnds = await page.$$eval('[data-seledge][data-elit="1"]', (gs) => gs.map((g) => g.getAttribute('data-seledge')))
if (litRoads < 1) errors.push('item 3: hovering a relationship lit no road on the map')
else if (!litRoadEnds.some((k) => k.split('>').includes(litStarId)))
  errors.push(`item 3: lit road(s) ${litRoadEnds.join(',')} do not touch the hovered counterpart ${litStarId}`)

// item 2: the map's immediate title chip must name that same spotlit counterpart
const chipId = await page.locator('[data-hoverchip]').getAttribute('data-hoverchip')
if (chipId !== litStarId) errors.push(`item 2: hover chip names ${chipId}, expected the spotlit counterpart ${litStarId}`)

// 4c — THE GENERATED LENS. `implements` is the corpus's fourth relation type
// and it never had a lens pane — not because LensPane couldn't render one (its
// config is Record<EdgeType, …>, so TS forced an `implements` entry years ago)
// but because a lens needed four hand-edits in four parallel structures inside
// StudioView, and nobody made them. The registry now generates one per edge
// type, so this pane exists for free. Toggle it on over the focused topic, check
// it renders, toggle it back off so the cockpit is intact for the frames below.
await page.getByLabel('studio-inst-lens-implements').click()
await page.waitForTimeout(600)
await page.screenshot({ path: OUT + '/4c-generated-lens.png' })
const lensPane = page.locator('[aria-label="studio-pane-lens-implements"][data-slot="on"]')
if ((await lensPane.count()) !== 1) errors.push('generated lens: the lens-implements pane did not mount')
else if (!(await lensPane.innerText()).trim()) errors.push('generated lens: the pane mounted but rendered nothing')
await page.getByLabel('studio-inst-lens-implements').click()
await page.waitForTimeout(300)

// 5 — atlas at L4 (concepts): deep-tier wrap + honest label drops
await page.getByLabel('nested-level-4').click()
await page.waitForTimeout(1000)
await page.screenshot({ path: OUT + '/5-atlas-L4.png' })

// 5a — item 10: the 26px parent watermark lying across the active names must
// step aside for the cell the cursor is in. Hover with a REAL mouse move so
// pointerenter fires (a synthetic click would not), aiming at a point verified
// to actually land on a tier-4 cell — a bbox centre can fall outside a convex
// polygon. Frame 5 above is the same view un-faded, so the two compare.
const cell = await page.evaluate(() => {
  const cells = [...document.querySelectorAll('path[data-terr][data-tier="4"]')]
  cells.sort((a, b) => {
    const ba = a.getBoundingClientRect()
    const bb = b.getBoundingClientRect()
    return bb.width * bb.height - ba.width * ba.height
  })
  for (const c of cells) {
    const b = c.getBoundingClientRect()
    const x = b.x + b.width / 2
    const y = b.y + b.height / 2
    const hit = document.elementFromPoint(x, y)
    if (hit && hit.getAttribute('data-tier') === '4') return { x, y, id: hit.getAttribute('data-terr') }
  }
  return null
})
if (!cell) {
  errors.push('item 10: no L4 cell whose centre actually lands inside itself')
} else {
  await page.mouse.move(cell.x, cell.y)
  await page.waitForTimeout(400)
  await page.screenshot({ path: OUT + '/5a-watermark-fade.png' })
  const faded = await page.evaluate(
    () => [...document.querySelectorAll('[data-ghostlabel]')].map((e) => Number(e.getAttribute('opacity'))).filter((o) => o < 0.05).length,
  )
  if (faded !== 1) errors.push(`item 10: expected exactly 1 faded watermark under the cursor, got ${faded}`)

  // item 2 (direct map hover): the title chip names the cell under the cursor —
  // an immediate read, not the ~half-second native <title> tooltip
  const chipDirect = await page.locator('[data-hoverchip]').getAttribute('data-hoverchip')
  if (chipDirect !== cell.id) errors.push(`item 2: map hover chip names ${chipDirect}, expected the hovered cell ${cell.id}`)
}

// 5b — a DOMAIN selection at L0. This is the ROLLED-UP grain: topic edges are
// lifted to region↔region roads, so it exercises the other half of the bundle
// code (mixed-type bundles draw slate, two-way bundles lose their arrowheads).
await page.getByLabel('nested-level-0').click()
await page.waitForTimeout(900)
const domain = await page.evaluate(() => {
  const cells = [...document.querySelectorAll('path[data-region][data-rtier="0"]')]
  let best = null
  for (const c of cells) {
    const b = c.getBBox()
    const area = b.width * b.height
    if (!best || area > best.area) best = { area, id: c.getAttribute('data-region'), el: c }
  }
  best.el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  return best.id
})
await page.waitForTimeout(900)
await page.screenshot({ path: OUT + '/5b-domain-rollup.png' })
const rollupDups = await page.evaluate(() => {
  const seen = new Set()
  const dups = []
  for (const g of document.querySelectorAll('[data-seledge]')) {
    const [s, t] = g.getAttribute('data-seledge').split('>')
    const k = s < t ? `${s}|${t}` : `${t}|${s}`
    if (seen.has(k)) dups.push(k)
    seen.add(k)
  }
  return dups
})
if (rollupDups.length) errors.push('rollup collapse: pair drawn more than once — ' + rollupDups.join(', '))

// 6 — Teaching preset: since the flat Map was deleted (2026-07-14) this preset
// inherits the nested atlas in its place — check it still lays out sanely
await page.getByLabel('studio-preset-teaching').click()
await page.waitForTimeout(900)
await page.screenshot({ path: OUT + '/6-teaching.png' })

console.log('picked topic:', picked)
if (errors.length) {
  console.log('ERRORS:\n' + errors.join('\n'))
} else {
  console.log('no page errors')
}
await browser.close()
vite.kill()
process.exit(errors.length ? 1 : 0)
