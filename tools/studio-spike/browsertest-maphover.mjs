// browsertest-maphover.mjs — OB-127 (#251).
//
// A TEST. It opens the real app in a real browser and asserts what a person sees.
// The name says that, because the file beside it that measures rather than asserts
// is a different thing and should not be guessable only by opening it.
//
// The obligation's done-when is written about what a person sees: "hovering a
// tree row or a connections row HIGHLIGHTS the matching territory on the map and
// draws NO tooltip there". `src/model/maphover.test.ts` proves the rule that
// decides it; this proves the rule is actually wired to the two things it decides.
// Those are different claims, and only the second one catches passing the wrong
// value into a correct function.
//
// WHICH PANE PUBLISHES THE HOVER, AND WHY IT IS NOT THE TREE. The obligation names
// a tree row, and no tree row can do this in this build: `TreePanel` publishes
// FOCUS (`bus.setFocus`) and never a hover. The panes that actually write
// `bus.hover` today are `ConnectionsPane` and the four walk-desk views, which share
// `useHover`'s `bind()` — the thing that stamps `data-lit` on a row. This driver
// hovers the WALK PALETTE rather than the connections pane on purpose: #253
// replaces `ConnectionsPane` whole, and a driver pointed at it would have to be
// re-pointed the same week.
//
// THE SPOTLIGHT IS ASSERTED SEPARATELY FROM THE CARD, over a sweep of rows rather
// than one. A palette row names a corpus node, and a node only draws a spotlight
// when it has an outline at the level currently on screen — a deep concept at L0
// has none. So "no card" is asserted over EVERY row swept (that is the regression
// guard, and it holds whether or not the cell is drawable), while "the highlight
// still happens" is asserted as at-least-one over the sweep. A run where no row at
// all lit the map fails loudly rather than passing on an empty sweep.
//
// A REAL MOUSE, not a synthetic event: React synthesises enter/leave from
// pointerover/pointerout at the root, so a dispatched PointerEvent never reaches an
// onPointerEnter. Same trap `drive-tooltips.mjs` documents beside it.
//
// AND THE MOUSE HAS TO TRAVEL. `mouse.move(x, y)` teleports — one pointermove, and
// the card never appears, which looks exactly like the bug this file is here to
// catch. It is not one: the card is positioned from the PREVIOUS move (see
// `placeTipAtCursor`, and the comment above it explaining why an effect keyed on
// "is anything hovered" was measured and rejected), so a cell entered by the very
// first pointer event this pane ever sees has nowhere to put its card yet. A real
// hand emits a stream of moves and never sees it. Every approach here is therefore
// stepped, and this note is why — the first cut of this driver reported a failure
// that was entirely its own.
//
// Spawns vite ITSELF — backgrounded dev servers die on this machine.
// Run from anywhere:  node tools/studio-spike/browsertest-maphover.mjs
// Exits nonzero on any failed check or any page error.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'

const REPO = 'D:/ShiZhong/MyCode/KnowledgeNetworkThesisDemo'
const PORT = 5223
const ROWS = 12

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
    if (viteOut.includes('localhost:')) { clearTimeout(t); res() }
  }
  vite.stdout.on('data', watch)
  vite.stderr.on('data', watch)
  vite.on('exit', (c) => rej(new Error('vite exited early ' + c + ':\n' + viteOut)))
})

const errors = []
const checks = []
const ok = (name, cond, detail = '') => {
  checks.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '   ' + detail : ''}`)
  if (!cond) errors.push(name + (detail ? ' — ' + detail : ''))
}

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1750, height: 950 } })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

await page.goto(`http://localhost:${PORT}/`)
await page.evaluate(() => localStorage.clear())
await page.reload()
await page.waitForTimeout(700)

const has = (sel) => page.evaluate((s) => !!document.querySelector(s), sel)
const tipUp = () => has('[data-maptip]')
const spotUp = () => has('svg[data-nested] [data-spot]')
/** park the pointer in the app's top-left chrome, off both panes */
const park = async () => { await page.mouse.move(5, 5); await page.waitForTimeout(120) }
/** cross INTO the pane rather than teleport onto it — see the note at the top */
const glideTo = async (p) => { await page.mouse.move(p.x, p.y, { steps: 12 }); await page.waitForTimeout(250) }

// ── put the map and the walk palette on the same desk ───────────────────────
await page.getByLabel('studio-preset-plan').click()
await page.waitForTimeout(500)
for (const [inst, sel] of [['map', 'svg[data-nested]'], ['walkpalette', '[data-palette]']]) {
  if (!(await has(sel))) {
    await page.getByLabel(`studio-inst-${inst}`).click()
    await page.waitForTimeout(400)
  }
}
ok('the map is on the desk', await has('svg[data-nested]'))
ok('the walk palette is on the desk', await has('[data-palette]'))

// ── 1. the baseline: our OWN cursor over a cell still raises the card ────────
// Without this the run cannot tell "the rule works" from "the tooltip is broken
// everywhere", which would pass check 2 for the wrong reason.
const cellPoint = await page.evaluate(() => {
  const svg = document.querySelector('svg[data-nested]')
  const b = svg.getBoundingClientRect()
  const y = b.y + b.height / 2
  for (let x = b.x + 8; x < b.x + b.width - 8; x += 4) {
    const el = document.elementFromPoint(x, y)
    if (el && (el.hasAttribute('data-terr') || el.hasAttribute('data-region')) && getComputedStyle(el).pointerEvents !== 'none') {
      return { x, y }
    }
  }
  return null
})
ok('found a live cell under the map midline', !!cellPoint, JSON.stringify(cellPoint))

await park()
ok('parked off the map, no card is up', !(await tipUp()))

if (cellPoint) {
  await glideTo(cellPoint)
  ok('our own cursor over a cell DOES raise the card', await tipUp())
  await park()
  ok('leaving the map takes the card away again', !(await tipUp()))
}

// ── 2. THE RULE: a hover published by another pane lights, and draws no card ──
// The palette lists nothing until it is asked something — with an empty box it
// shows the recents panel, which has no rows to hover. So the sweep starts by
// searching for a letter common enough to return a spread of nodes from several
// domains, which is also what makes the outline-at-this-level split below happen
// naturally rather than being contrived.
await page.locator('[data-palette] input').fill('a')
await page.waitForTimeout(400)
const rows = page.locator('[data-palette] [data-pal]')
const rowCount = Math.min(await rows.count(), ROWS)
ok('the palette has hoverable rows', rowCount > 0, `${rowCount} swept`)

let litSome = 0
let cardOnSome = []
for (let i = 0; i < rowCount; i++) {
  await park()
  await rows.nth(i).hover()
  await page.waitForTimeout(180)
  if (await spotUp()) litSome++
  if (await tipUp()) cardOnSome.push(i)
}

ok('a published hover draws NO card on the map', cardOnSome.length === 0,
  cardOnSome.length ? `rows ${cardOnSome.join(', ')} raised one` : `${rowCount} rows, none did`)
ok('a published hover DOES light the territory', litSome > 0,
  `${litSome}/${rowCount} rows lit a cell (the rest name nodes with no outline at this level)`)

// ── 3. the two do not poison each other ─────────────────────────────────────
// A published hover left `spotId` set; our own cursor going back over the map must
// still get its card. This is the ordering the deleted layout effect used to sit in.
if (cellPoint && rowCount > 0) {
  await rows.nth(0).hover()
  await page.waitForTimeout(180)
  await glideTo(cellPoint)
  ok('after a published hover, our own cursor still gets its card', await tipUp())
}

await page.evaluate(() => localStorage.clear())
await browser.close()
vite.kill()

console.log(checks.join('\n'))
if (errors.length) {
  console.error('\n' + errors.length + ' failure(s):\n' + errors.join('\n'))
  process.exit(1)
}
console.log('all checks passed')
