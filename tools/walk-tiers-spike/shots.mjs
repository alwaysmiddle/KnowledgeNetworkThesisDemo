// Walk-tiers spike driver, round 6. C is now a side-by-side comparison —
// the nested-box editor (left, toolbar controls) and the nested-node flow
// chart (right, contextual controls) rendering ONE shared AuthorState. The
// chain must prove: an edit on either side appears on both; the flow's
// group/aside happen through the floating toolbar at the click site; flow
// expand/collapse is view-local (the nest and the projection never move);
// visits wear walk-order badges. E is unchanged: stack + vertical columns
// on one TierPathState, driven from both ends.
// HTML5 dnd is driven by dispatching dragstart/dragover/drop with a shared
// DataTransfer; dispatchEvent targets the element directly, so a drop on a
// container works even when its center is covered by a child node.
// Spawns vite ITSELF (backgrounded dev servers die on this machine): spawn,
// wait ready, drive, kill — same pattern as tools/studio-spike/shot-visuals.mjs.
//
// Run from anywhere:  node tools/walk-tiers-spike/shots.mjs
// Frames land in tools/walk-tiers-spike/out/ (gitignored).
// Exits nonzero on any page error or failed assertion.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const REPO = 'D:/ShiZhong/MyCode/KnowledgeNetworkThesisDemo'
const OUT = REPO + '/tools/walk-tiers-spike/out'
const PORT = 5201
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

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` })
const click = async (sel) => {
  await page.locator(sel).first().click()
  await page.waitForTimeout(250)
}
const tab = (id) => click(`[data-galtab="${id}"]`)
const count = (sel) => page.locator(sel).count()
const fringeCount = () => page.locator('[data-fringe-count]').getAttribute('data-fringe-count')

/** HTML5 dnd via dispatched events sharing one DataTransfer */
const dnd = async (srcSel, tgtSel, yFrac = 0.5) => {
  const dt = await page.evaluateHandle(() => new DataTransfer())
  await page.dispatchEvent(srcSel, 'dragstart', { dataTransfer: dt })
  const box = await page.locator(tgtSel).first().boundingBox()
  if (!box) throw new Error('dnd target not found: ' + tgtSel)
  const pos = { clientX: box.x + box.width / 2, clientY: box.y + box.height * yFrac }
  await page.dispatchEvent(tgtSel, 'dragover', { dataTransfer: dt, ...pos })
  await page.dispatchEvent(tgtSel, 'drop', { dataTransfer: dt, ...pos })
  await page.waitForTimeout(200)
}

await page.goto(`http://localhost:${PORT}/?spike=walk-tiers`)
await page.waitForTimeout(700)

// ── C · boxes vs nodes, ONE shared draft (default tab) ──────────────────────
// seed: [dns, seed-net[ip, tcp, seed-sec[pkc, tls]], http]
if ((await count('[data-blk]')) !== 8) errors.push(`C: nest should show 8 blocks (6 visits + 2 headers), got ${await count('[data-blk]')}`)
if ((await count('[data-fnode]')) !== 6) errors.push(`C: flow should show 6 visit nodes, got ${await count('[data-fnode]')}`)
if ((await count('[data-fstage]')) !== 2) errors.push(`C: flow should show 2 open compound nodes, got ${await count('[data-fstage]')}`)
if ((await count('[data-farrow]')) !== 5) errors.push(`C: 3+3+2 siblings need 2+2+1 arrows, got ${await count('[data-farrow]')}`)
if ((await count('[data-ford]')) !== 6) errors.push(`C: every visit wears an order badge (6), got ${await count('[data-ford]')}`)
const firstOrd = await page.locator('[data-fnode] [data-ford]').first().getAttribute('data-ford')
if (firstOrd !== '1') errors.push(`C: the first visit in document order should wear badge 1, got ${firstOrd}`)
if ((await fringeCount()) !== '6') errors.push(`C: seeded fringe should be 6 visits, got ${await fringeCount()}`)
await shot('c6-default')

// ONE draft: a drop into the NEST appears in the FLOW
await dnd('[data-pal="web-sockets-apis"]', '[data-ndrop="seed-sec"]')
if ((await count('[data-blk]')) !== 9) errors.push(`C: nest drop should make 9 blocks, got ${await count('[data-blk]')}`)
if ((await count('[data-fnode]')) !== 7) errors.push(`C: the nest drop must appear in the flow (7 nodes), got ${await count('[data-fnode]')}`)
if ((await count('[data-farrow]')) !== 6) errors.push(`C: seed-sec grew to 3 kids — 6 arrows total, got ${await count('[data-farrow]')}`)
if ((await fringeCount()) !== '7') errors.push(`C: fringe should be 7 after the nest drop, got ${await fringeCount()}`)

// ...and a drop into a FLOW compound node appears in the NEST
await dnd('[data-pal="auto-continuous-integration"]', '[data-fdrop="seed-net"]')
if ((await count('[data-fnode]')) !== 8) errors.push(`C: flow drop should make 8 nodes, got ${await count('[data-fnode]')}`)
if ((await count('[data-blk]')) !== 10) errors.push(`C: the flow drop must appear in the nest (10 blocks), got ${await count('[data-blk]')}`)
if ((await count('[data-farrow]')) !== 7) errors.push(`C: seed-net grew to 4 kids — 7 arrows total, got ${await count('[data-farrow]')}`)
if ((await fringeCount()) !== '8') errors.push(`C: fringe should be 8 after the flow drop, got ${await fringeCount()}`)

// CONTEXTUAL group: click a node — the floating tools appear AT the click
await click('[data-flow-root] [data-fnode][data-node="stk-dns-naming"]')
if ((await count('[data-fly]')) !== 1) errors.push(`C: clicking a flow node should float the tools beside it, got ${await count('[data-fly]')}`)
// select the stage by its GRIP — the header's middle is the retitle input,
// which rightly eats clicks
await click('[data-fgrab="seed-net"]')
await click('[data-fly-group]')
if ((await count('[data-fstage]')) !== 3) errors.push(`C: contextual group should make a 3rd open compound node, got ${await count('[data-fstage]')}`)
if ((await count('[data-retitle]')) !== 3) errors.push(`C: the grouped stage must appear in the nest too (3 retitles), got ${await count('[data-retitle]')}`)
if ((await count('[data-ndrop="draft-0"] [data-blk]')) !== 10)
  errors.push(`C: the new stage must contain dns AND the whole seed-net subtree (10 blocks incl own header), got ${await count('[data-ndrop="draft-0"] [data-blk]')}`)
if ((await count('[data-blk]')) !== 11) errors.push(`C: after grouping expect 11 nest blocks, got ${await count('[data-blk]')}`)
if ((await count('[data-fly]')) !== 0) errors.push(`C: the floating tools should retire once the selection clears, got ${await count('[data-fly]')}`)
if ((await fringeCount()) !== '8') errors.push(`C: grouping adds no visits — fringe stays 8, got ${await fringeCount()}`)
await shot('c6-group')

// flow collapse is VIEW-LOCAL: the compound folds to a pill; the nest and
// the projection never move
await click('[data-flow-toggle="seed-sec"]')
if ((await count('[data-fstage-closed]')) !== 1) errors.push(`C: seed-sec should fold to a closed pill, got ${await count('[data-fstage-closed]')}`)
if ((await count('[data-fnode]')) !== 5) errors.push(`C: folding seed-sec hides its 3 visits (5 nodes), got ${await count('[data-fnode]')}`)
if ((await count('[data-blk]')) !== 11) errors.push(`C: a flow fold must NOT touch the nest (11 blocks), got ${await count('[data-blk]')}`)
if ((await fringeCount()) !== '8') errors.push(`C: a flow fold must not change the projected route, got ${await fringeCount()}`)
await click('[data-flow-toggle="seed-sec"]')
if ((await count('[data-fnode]')) !== 8) errors.push(`C: re-opening seed-sec should restore 8 nodes, got ${await count('[data-fnode]')}`)

// CONTEXTUAL aside: pick two visits in the flow, ≀ from the floating tools
await click('[data-flow-root] [data-fnode][data-node="stk-ip-routing"]')
await click('[data-flow-root] [data-fnode][data-node="stk-tcp-udp"]')
await click('[data-fly-aside]')
if ((await count('[data-faside]')) !== 1) errors.push(`C: expected 1 flow aside box, got ${await count('[data-faside]')}`)
if ((await count('[data-aside-lane]')) !== 1) errors.push(`C: the aside must appear in the nest too, got ${await count('[data-aside-lane]')}`)
if ((await count('[data-fnode]')) !== 6) errors.push(`C: aside removes its 2 visits from the flow (6 nodes), got ${await count('[data-fnode]')}`)
if ((await count('[data-blk]')) !== 9) errors.push(`C: aside removes its 2 visits from the nest (9 blocks), got ${await count('[data-blk]')}`)
if ((await fringeCount()) !== '6') errors.push(`C: aside visits leave the route — fringe 6, got ${await fringeCount()}`)
await shot('c6-aside')

// hover lights the doc pane from either editor — no private tooltips
await page.locator('[data-cand="C"] [data-node="stk-ip-routing"]').first().hover()
await page.waitForTimeout(250)
const doc = await page.locator('[data-doc]').getAttribute('data-doc')
if (doc !== 'stk-ip-routing') errors.push(`C: hovering stk-ip-routing shows doc pane "${doc}"`)

// the palette search narrows the pick list
const palAll = await count('[data-pal]')
await page.locator('[data-pal-search]').fill('tls')
await page.waitForTimeout(200)
const palTls = await count('[data-pal]')
if (!(palTls > 0 && palTls < palAll)) errors.push(`C: search 'tls' should narrow the palette (${palAll} -> ${palTls})`)
await page.locator('[data-pal-search]').fill('')

// ── E · stack + vertical columns, 'serve' pre-picked (unchanged round 5) ────
await tab('E')
if ((await count('[data-plane]')) !== 2) errors.push(`E: expected 2 planes at start, got ${await count('[data-plane]')}`)
if ((await count('[data-vcol]')) !== 2) errors.push(`E: expected 2 columns at start, got ${await count('[data-vcol]')}`)
if ((await count('[data-vedge]')) !== 1) errors.push(`E: one open column = one begat-edge, got ${await count('[data-vedge]')}`)
if ((await count('[data-varrow]')) !== 6) errors.push(`E: 4+4 boxes need 3+3 down arrows, got ${await count('[data-varrow]')}`)
if ((await count('[data-vaside]')) !== 1) errors.push(`E: serve's aside should hang below its column, got ${await count('[data-vaside]')}`)
await shot('e6-default')

// picking in the COLUMNS drives the STACK — one TierPathState
await click('[data-vpick="secure"]')
if ((await count('[data-plane]')) !== 3) errors.push(`E: column pick should grow the stack to 3 planes, got ${await count('[data-plane]')}`)
await click('[data-vpick="primitives"]')
if ((await count('[data-plane]')) !== 4) errors.push(`E: drill to primitives should show 4 planes, got ${await count('[data-plane]')}`)
if ((await count('[data-vcol]')) !== 4) errors.push(`E: drill to primitives should show 4 columns, got ${await count('[data-vcol]')}`)
if ((await count('[data-vedge]')) !== 3) errors.push(`E: three open columns = three begat-edges, got ${await count('[data-vedge]')}`)
await shot('e6-deep')
const fringeDeep = await fringeCount()

// picking in the STACK drives the COLUMNS — the tier-0 swap truncates all
await click('[data-pick-stack="machine"]')
if ((await count('[data-plane]')) !== 2) errors.push(`E: picking 'machine' at tier 0 should swap to 2 planes, got ${await count('[data-plane]')}`)
if ((await count('[data-vcol]')) !== 2) errors.push(`E: the swap should leave 2 columns, got ${await count('[data-vcol]')}`)
if ((await fringeCount()) === fringeDeep) errors.push('E: the tier-0 swap did not change the projected route')
await shot('e6-swap')

await browser.close()
vite.kill()

if (errors.length) {
  console.error('walk-tiers spike FAILED:')
  for (const e of errors) console.error('  x ' + e)
  process.exit(1)
}
console.log('walk-tiers spike ok — frames in tools/walk-tiers-spike/out/')
