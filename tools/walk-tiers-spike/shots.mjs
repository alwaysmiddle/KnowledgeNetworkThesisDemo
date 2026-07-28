// Walk-desk driver — GRADUATED: the desk ships as the Studio's Walk·Desk
// instrument behind the Authoring preset, so this drives the real app. Since
// #19 there is ONE stop type: a fork is a GROUP CARD with more than one
// variant, and the choice shows as TABS — only the CHOSEN variant's steps
// render, never parallel lanes. The chain still proves the core claim:
// everything right of the railroad — stack, columns, fringe strip — reads ONE
// resolved linear walk. Steps: picking a variant tab re-projects the route;
// bypassing optionals shrinks it; forking a selection wraps it in a fresh
// tabbed card; a palette drop lands in a between-node slot; the columns drill.
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
const dbl = async (sel) => {
  await page.locator(sel).first().dblclick()
  await page.waitForTimeout(250)
}
const shiftClick = async (sel) => {
  await page.locator(sel).first().click({ modifiers: ['Shift'] })
  await page.waitForTimeout(250)
}
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

const roadNode = (id) => `[data-road-root] [data-rnode][data-node="${id}"]`
const fringeIds = () =>
  page.locator('[data-fringe-count] [data-node]').evaluateAll((els) => els.map((e) => e.getAttribute('data-node')))
const freshSeed = async () => {
  await page.reload()
  await page.waitForTimeout(500)
  await click('[aria-label="studio-preset-authoring"]')
}

await page.goto(`http://localhost:${PORT}/`)
await page.waitForTimeout(700)
await click('[aria-label="studio-preset-authoring"]')

// ── the desk at first paint ─────────────────────────────────────────────────
// seed: [dns, seed-net[ip, tcp], seed-sec⑂{[tls] | [pkc, sym, hash, tls]},
//        http, ws◇, auth] — variant 0 chosen, optionals on the road
if ((await count('[data-palette]')) !== 1) errors.push(`S: the palette should render under the Authoring preset, got ${await count('[data-palette]')}`)
// the fork shows only its CHOSEN variant now (#19): the 1-node handshake, not
// the 4-node crypto tour — so 7 leaves visible (dns, ip, tcp, tls, http, ws, auth)
if ((await count('[data-rnode]')) !== 7) errors.push(`S: 7 leaves with only the chosen variant shown, got ${await count('[data-rnode]')}`)
if ((await count('[data-rstage]')) !== 2) errors.push(`S: two open container cards (seed-net + seed-sec), got ${await count('[data-rstage]')}`)
if ((await count('[data-tab]')) !== 2) errors.push(`S: the fork card shows two variant tabs, got ${await count('[data-tab]')}`)
if ((await count('[data-rquestion]')) !== 1) errors.push(`S: the fork card shows its question line, got ${await count('[data-rquestion]')}`)
if ((await count('[data-rbypass]')) !== 1) errors.push(`S: ws is optional — one bypass rail, got ${await count('[data-rbypass]')}`)
if ((await count('[data-rord]')) !== 7) errors.push(`S: 7 stops wear badges on the default road, got ${await count('[data-rord]')}`)
const firstOrd = await page.locator('[data-rnode] [data-rord]').first().getAttribute('data-rord')
if (firstOrd !== '1') errors.push(`S: the first road visit should wear badge 1, got ${firstOrd}`)
if ((await fringeCount()) !== '7') errors.push(`S: default resolved route is 7 visits, got ${await fringeCount()}`)
// ── #21 · the authoring COMPOSITION ─────────────────────────────────────────
// [palette over document] · map · railroad+route. Every job the old combined
// desk did is now a pane; the desk itself is gone. The reading views (#20) are
// a sidebar click away rather than crowding the default.
for (const [pane, why] of [
  ['palette', 'where stops come from'],
  ['doc', 'what the focused stop teaches'],
  ['nested', 'the territory'],
  ['railroad', 'the writing surface'],
]) {
  if ((await count(`[aria-label="studio-pane-${pane}"][data-slot="on"]`)) !== 1)
    errors.push(`S21: the Authoring preset should place ${pane} — ${why}`)
}
// a STACK: two panes sharing one column, which the flat active list could not say
const stack = '[aria-label="studio-stack-palette-doc"]'
if ((await count(stack)) !== 1) errors.push('S21: palette and document should share one stacked column')
if ((await count(`${stack} > [aria-label="studio-pane-palette"]`)) !== 1) errors.push('S21: the palette is the TOP pane of that column')
if ((await count(`${stack} > [aria-label="studio-pane-doc"]`)) !== 1) errors.push('S21: the document is the BOTTOM pane of that column')
// the column stacks palette OVER doc. Since #28 made the palette a compact
// SEARCH pane (a box + recents), it is content-sized rather than a forced even
// half — so assert the ORDER and that both panes have real height, not a 50/50
// split. (The old even-split check pre-dates #28 and fails identically on main.)
const stackH = await page.locator(`${stack} > section`).evaluateAll((els) =>
  els.map((e) => ({ top: Math.round(e.getBoundingClientRect().top), h: Math.round(e.getBoundingClientRect().height) })),
)
if (stackH.length !== 2 || !stackH.every((s) => s.h > 40) || stackH[0].top >= stackH[1].top)
  errors.push(`S21: the column should stack palette over doc, both with real height, got ${JSON.stringify(stackH)}`)
// and the stack sits LEFT of the map
const xOf = async (sel) => (await page.locator(sel).first().boundingBox()).x
if ((await xOf(stack)) >= (await xOf('[aria-label="studio-pane-nested"]')))
  errors.push('S21: the palette/document column belongs left of the map')

if ((await count('[data-railroad] [data-road-root]')) !== 1) errors.push('S21: the railroad should be its own pane')
if ((await count('[data-railroad] [data-fringe-count]')) !== 1)
  errors.push('S21: the projected route runs PARALLEL to the road, in the same pane')
if ((await count('[data-vcol]')) !== 0) errors.push('S21: Walk·Columns is not in the default composition')
if ((await count('[data-plane]')) !== 0) errors.push('S21: Walk·Stack is not in the default composition')
await shot('s7-default')

// ── #21 · the route rail can change sides without remounting ────────────────
const railX = async () => (await page.locator('[data-fringe-rail]').boundingBox()).x
const roadX = async () => (await page.locator('[data-road-root]').boundingBox()).x
if ((await railX()) <= (await roadX())) errors.push('S21: the route rail starts on the RIGHT of the road')
await click('[data-rail-side]')
if ((await page.locator('[data-rail-side]').getAttribute('data-rail-side')) !== 'left')
  errors.push('S21: the side toggle should report its new side')
if ((await railX()) >= (await roadX())) errors.push('S21: ...and the rail should now be drawn left of the road')
if ((await fringeCount()) !== '7') errors.push(`S21: flipping the side must not disturb the route, got ${await fringeCount()}`)
await shot('s7-rail-left')
await click('[data-rail-side]')

// ── #21 · the palette and the railroad share ONE draft across panes ──────────
// the whole reason the draft left component state: a palette that inserts into
// a draft the railroad cannot see is useless. Since #28 the palette is a SEARCH
// pane — type to surface a hit, then + appends it to the road (a plain click
// selects on the map, it does not insert).
await page.locator('[data-pal-search]').fill('graph traversal')
await page.waitForTimeout(200)
await click('[data-palette] [data-pal-add="alg-graph-traversal"]')
if ((await count(roadNode('alg-graph-traversal'))) !== 1)
  errors.push('S21: a + in the palette PANE must land on the road in the railroad PANE')
if ((await fringeCount()) !== '8') errors.push(`S21: ...and the route rail beside it sees it too (8), got ${await fringeCount()}`)
await click(`[data-rnode][data-node="alg-graph-traversal"]`)
await click('[data-fly-del]')
if ((await fringeCount()) !== '7') errors.push(`S21: removing it puts the route back to 7, got ${await fringeCount()}`)

// ── #34 · undo / redo step the tree back and forward ────────────────────────
// the delete just above is the freshest edit. ↶ undo must bring the node back
// (and the rail with it); ↷ redo must take it away again. History is over the
// STOPS tree, so the route rail — a pure projection of it — follows for free.
// The round-trip lands back on the post-delete state, so the checks below are
// undisturbed.
await click('[data-undo]')
await page.waitForTimeout(150)
if ((await count(roadNode('alg-graph-traversal'))) !== 1)
  errors.push(`S34: undo should restore the deleted node, got ${await count(roadNode('alg-graph-traversal'))}`)
if ((await fringeCount()) !== '8') errors.push(`S34: ...and the route rail returns to 8, got ${await fringeCount()}`)
await click('[data-redo]')
await page.waitForTimeout(150)
if ((await count(roadNode('alg-graph-traversal'))) !== 0) errors.push('S34: redo should remove the node again')
if ((await fringeCount()) !== '7') errors.push(`S34: ...and the route rail drops back to 7, got ${await fringeCount()}`)

// ── #21 · the map MOVES the focus, it does not OPEN a pane ──────────────────
// selecting a container used to reveal Connections. With several instruments
// able to move the focus, a pane appearing because you clicked somewhere else
// is a surprise — so the map publishes and stops there.
await click('[data-region="cs"]')
const mapFocus = await page.locator('[data-focus]').getAttribute('data-focus')
if (mapFocus !== 'cs') errors.push(`S21: a map region click should still publish focus, got "${mapFocus}"`)
if ((await count('[aria-label="studio-pane-children"]')) !== 0)
  errors.push('S21: the map must NOT open Connections by itself anymore')

// ── #19: only the CHOSEN variant shows — the other is behind its tab ─────────
if ((await count(roadNode('cry-public-key-cryptography'))) !== 0)
  errors.push('E19-tab: the unchosen crypto-tour variant must be hidden behind its tab')
if ((await count('[data-rnode]')) !== 7) errors.push(`E19-tab: only the chosen variant renders (7 leaves), got ${await count('[data-rnode]')}`)

// ── picking the other variant tab re-projects EVERYTHING right of the road ───
await click('[data-tab="seed-sec.1"]')
if ((await fringeCount()) !== '10') errors.push(`S: the crypto tour makes the route 10, got ${await fringeCount()}`)
if ((await count('[data-rord]')) !== 10) errors.push(`S: 10 badges on the crypto road, got ${await count('[data-rord]')}`)
// picking a tab SWAPS the visible variant: the 1-node handshake gives way to
// the 4-node crypto tour, so 10 leaves now (was 7)
if ((await count('[data-rnode]')) !== 10) errors.push(`S: the chosen variant swaps in (10 leaves), got ${await count('[data-rnode]')}`)
if ((await count(roadNode('cry-public-key-cryptography'))) !== 1) errors.push('S: the crypto variant is on the road now')
await shot('s7-branchB')

// ── bypassing optionals: the road goes AROUND the dashed node ───────────────
await click('[data-opt-toggle]')
if ((await fringeCount()) !== '9') errors.push(`S: bypassing ws drops the route to 9, got ${await fringeCount()}`)
if ((await count('[data-rord]')) !== 9) errors.push(`S: the bypassed stop loses its badge (9 left), got ${await count('[data-rord]')}`)
await shot('s7-bypass')
await click('[data-opt-toggle]')
if ((await fringeCount()) !== '10') errors.push(`S: optionals back on the road — 10 again, got ${await fringeCount()}`)

// ── selecting draws a boxed group + a pinned toolbar (#17). Since #19 there is
//    no fork button: a fork grows from a group by adding a variant on its card ─
await click('[data-rnode][data-node="web-http-rest"]')
if ((await count('[data-fly]')) !== 1) errors.push(`S: selecting a node pins the action toolbar, got ${await count('[data-fly]')}`)
if ((await count('[data-selbox]')) !== 1) errors.push(`S: selecting a node draws one selection box, got ${await count('[data-selbox]')}`)
await shiftClick('[data-rnode][data-node="web-sockets-apis"]') // shift adds to the selection (Windows-style)
if ((await count('[data-selbox]')) !== 1) errors.push(`S: a multi-select is still ONE box around the run, got ${await count('[data-selbox]')}`)
await shot('s7-selection')
const cardsBeforeWrap = await count('[data-rstage]')
await click('[data-fly-group]') // wrap the run into a plain group (key draft-0)
if ((await count('[data-rstage]')) !== cardsBeforeWrap + 1) errors.push(`S: grouping the selection makes a new card, got ${await count('[data-rstage]')} (was ${cardsBeforeWrap})`)
if ((await count('[data-fly]')) !== 0) errors.push(`S: the toolbar retires once the selection clears, got ${await count('[data-fly]')}`)
if ((await count('[data-selbox]')) !== 0) errors.push(`S: the selection box clears with the selection, got ${await count('[data-selbox]')}`)
if ((await fringeCount()) !== '10') errors.push(`S: grouping keeps both leaves on the road (10), got ${await fringeCount()}`)

// ── #19 a group becomes a fork by GROWING a variant on its card (⑂), then the
//    alt variant is a TAB whose slot shows once chosen ─────────────────────────
await click('[data-add-variant="draft-0"]') // the card's ⑂ — no toolbar fork button
if ((await count('[data-rstage]')) !== cardsBeforeWrap + 1) errors.push(`S: adding a variant grows the same card, not a new one, got ${await count('[data-rstage]')}`)
if ((await fringeCount()) !== '10') errors.push(`S: the chosen variant is unchanged — route still 10, got ${await fringeCount()}`)
if ((await count('[data-runset]')) !== 0) errors.push(`S: the alt variant's slot is hidden behind its tab, got ${await count('[data-runset]')}`)
await click('[data-tab="draft-0.1"]') // choose the alternative variant
if ((await count('[data-runset]')) !== 1) errors.push(`S: choosing the alt tab reveals one unset slot, got ${await count('[data-runset]')}`)
if ((await fringeCount()) !== '8') errors.push(`S: the empty alt drops http+ws from the route (8), got ${await fringeCount()}`)
// bind a corpus node through the revealed slot's picker
await page.locator('[data-runset] select').first().selectOption('auto-continuous-integration')
await page.waitForTimeout(200)
if ((await count('[data-runset]')) !== 0) errors.push(`S: binding a node clears the unset slot, got ${await count('[data-runset]')}`)
if ((await count(roadNode('auto-continuous-integration'))) !== 1) errors.push('S: the bound node appears in the chosen variant')
if ((await fringeCount()) !== '9') errors.push(`S: the alt now carries ci in place of http+ws (9), got ${await fringeCount()}`)
await shot('s7-forked')

// ── contextual group still works on the road ────────────────────────────────
await click('[data-rnode][data-node="stk-dns-naming"]')
const cardsBeforeGroup = await count('[data-rstage]')
await click('[data-fly-group]')
if ((await count('[data-rstage]')) !== cardsBeforeGroup + 1) errors.push(`S: grouping opens a new container card, got ${await count('[data-rstage]')} (was ${cardsBeforeGroup})`)
if ((await fringeCount()) !== '9') errors.push(`S: grouping adds no visits — route stays 9, got ${await fringeCount()}`)

// ── #20 · each reading instrument drills ON ITS OWN ─────────────────────────
// they are not in the Authoring preset since #21 — toggle them on first
await click('[aria-label="studio-inst-walkcolumns"]')
await click('[aria-label="studio-inst-walkstack"]')
if ((await count('[data-walkcolumns]')) !== 1) errors.push('S20: Walk·Columns should be pickable from the sidebar')
if ((await count('[data-walkstack]')) !== 1) errors.push('S20: Walk·Stack should be pickable from the sidebar')
// unwired, both read the AUTHORED plan: tier 0 is machine / serve / speak / auth
if ((await count('[data-vbox]')) !== 4) errors.push(`S20: columns read the authored plan — 4 tier-0 boxes, got ${await count('[data-vbox]')}`)
if ((await count('[data-plane]')) !== 1) errors.push(`S20: the iso stack starts with one plane, got ${await count('[data-plane]')}`)

// Inside the desk these two shared one controlled stops/path/pick triple and
// could not disagree. Split and unwired, each owns its drill path — so this
// asserts the DIVERGENCE deliberately. When #14 puts one path on the bus these
// four lines become "the stack follows the columns" again.
await click('[data-vpick="serve"]')
if ((await count('[data-vcol]')) !== 2) errors.push(`S20: drilling serve opens a 2nd column, got ${await count('[data-vcol]')}`)
if ((await count('[data-vedge]')) !== 1) errors.push(`S20: one open column = one begat-edge, got ${await count('[data-vedge]')}`)
if ((await count('[data-plane]')) !== 1) errors.push(`S20: the stack is unwired — it must NOT follow the columns yet, got ${await count('[data-plane]')} planes`)

await click('[data-pick-stack="serve"]')
if ((await count('[data-plane]')) !== 2) errors.push(`S20: the stack drills on its own, got ${await count('[data-plane]')}`)
if ((await count('[data-vcol]')) !== 2) errors.push(`S20: the columns keep their own path, got ${await count('[data-vcol]')}`)
await click('[data-plane="0"] button:not([data-pick-stack])')
if ((await count('[data-plane]')) !== 1) errors.push(`S20: a visit dot folds the stack back, got ${await count('[data-plane]')}`)
if ((await count('[data-vcol]')) !== 2) errors.push(`S20: ...and the columns are unaffected, got ${await count('[data-vcol]')}`)
await shot('s7-desk-final')

// ── hover publishes on the BUS hover channel — every bound element with the
// same id lights (railroad node, fringe chip, column box, stack dot) ────────
await page.locator('[data-road-root] [data-node="stk-ip-routing"]').first().hover()
await page.waitForTimeout(250)
const lit = await count('[data-lit="1"]')
if (lit < 2) errors.push(`S: hovering stk-ip-routing should light every bound element sharing the id, got ${lit}`)

// ── the palette is a SEARCH pane (#28): empty shows recents (no hits), a query
//    surfaces hits, a longer query narrows them ────────────────────────────────
await page.locator('[data-pal-search]').fill('')
await page.waitForTimeout(200)
if ((await count('[data-pal]')) !== 0) errors.push(`S: an empty query shows recents, not hits, got ${await count('[data-pal]')}`)
await page.locator('[data-pal-search]').fill('crypto')
await page.waitForTimeout(200)
const palCrypto = await count('[data-pal]')
await page.locator('[data-pal-search]').fill('cryptographic hashing')
await page.waitForTimeout(200)
const palNarrow = await count('[data-pal]')
if (!(palCrypto > 0 && palNarrow > 0 && palNarrow <= palCrypto))
  errors.push(`S: a longer query should narrow the hits (${palCrypto} -> ${palNarrow})`)
await page.locator('[data-pal-search]').fill('')

// ── #17 marquee: drag a rubber-band on the empty board to box-select a run ───
await freshSeed()
const boardBox = await page.locator('[data-road-root] > div').first().boundingBox()
await page.mouse.move(boardBox.x + 3, boardBox.y + 3) // start in the empty top-left margin
await page.mouse.down()
await page.mouse.move(boardBox.x + boardBox.width / 2 + 6, boardBox.y + 140, { steps: 8 })
await page.mouse.up()
await page.waitForTimeout(150)
if ((await count('[data-selbox]')) !== 1) errors.push(`E17-marquee: a rubber-band drag should box-select a run (one box), got ${await count('[data-selbox]')}`)
if ((await count('[data-fly]')) !== 1) errors.push(`E17-marquee: the toolbar appears after a marquee select, got ${await count('[data-fly]')}`)
await shot('e17-marquee')

// ── #19: ⑂ in a container header adds a variant — a plain group becomes a fork ─
await freshSeed()
// seed-net is a plain group (one variant): no tabs until ⑂ is pressed
if ((await count('[data-tab^="seed-net"]')) !== 0) errors.push(`E19-add: a plain group shows no tabs, got ${await count('[data-tab^="seed-net"]')}`)
await click('[data-add-variant="seed-net"]')
if ((await count('[data-tab="seed-net.0"]')) !== 1 || (await count('[data-tab="seed-net.1"]')) !== 1)
  errors.push('E19-add: ⑂ turns the plain group into a two-variant fork (two tabs)')
if ((await count('[data-rquestion="seed-net"]')) !== 1) errors.push('E19-add: the new fork grows a question line')
await shot('e19-add-variant')

// ══ #13 editor fixes — each verified on a FRESH seed (reload resets the desk) ══

// ── A · forgiving slots: a drop in the dead gap between nodes lands IN PLACE,
//        not falling through to append-at-end ─────────────────────────────────
await freshSeed()
if ((await count('[data-rslot]')) === 0) errors.push('E13-A: expected between-node drop slots, got 0')
if ((await fringeCount()) !== '7') errors.push(`E13-A: fresh seed route is 7, got ${await fringeCount()}`)
// #28: surface the palette hit by searching, then drag it onto the slot
await page.locator('[data-pal-search]').fill('continuous integration')
await page.waitForTimeout(200)
await dnd('[data-pal="auto-continuous-integration"]', '[data-rslot="b.1"]')
if ((await count('[data-rnode]')) !== 8) errors.push(`E13-A: the slot drop should add a leaf (7 → 8), got ${await count('[data-rnode]')}`)
if ((await fringeCount()) !== '8') errors.push(`E13-A: the route grows to 8, got ${await fringeCount()}`)
const idsA = await fringeIds()
if (idsA[1] !== 'auto-continuous-integration') errors.push(`E13-A: the drop must land at slot b.1 (2nd in route), got ${idsA[1]}`)
if (idsA[idsA.length - 1] !== 'app-authentication-authorization')
  errors.push(`E13-A: it must NOT append to end — last should stay auth, got ${idsA[idsA.length - 1]}`)
await shot('e13-slot-drop')

// ── B · #19: the unchosen variant is HIDDEN behind its tab; picking the tab
//        reveals it, and an edit inside the chosen variant lands ──────────────
await freshSeed()
const crypto = roadNode('cry-public-key-cryptography') // in the unchosen crypto-tour variant
if ((await count(crypto)) !== 0) errors.push('E19-B: the unchosen variant is hidden until its tab is picked')
await click('[data-tab="seed-sec.1"]') // choose the crypto tour
if ((await count(crypto)) !== 1) errors.push('E19-B: picking the tab reveals the variant')
if ((await fringeCount()) !== '10') errors.push(`E19-B: the crypto variant makes the route 10, got ${await fringeCount()}`)
await click(crypto) // select the now-visible node…
await shot('e19-variant-selected')
await click('[data-fly-del]') // …a leaf → deletes directly, no menu
if ((await count(crypto)) !== 0) errors.push('E19-B: deleting inside the chosen variant removes the node')
if ((await fringeCount()) !== '9') errors.push(`E19-B: 10 → delete one node in the variant → 9, got ${await fringeCount()}`)

// ── C · #33: ⎍ Ungroup keeps the children on the road (first-class, no menu) ──
await freshSeed()
if ((await count('[data-rstage]')) !== 2) errors.push(`E13-C: fresh seed has two open cards (seed-net + seed-sec), got ${await count('[data-rstage]')}`)
await click('[data-rgrab="seed-sec"]') // the FORK — ungroup must refuse it (no silent route discard)
if (!(await page.locator('[data-fly-ungroup]').isDisabled())) errors.push('E13-C: ungroup is disabled on a fork — resolve routes via the tab ✕ first')
await click('[data-rgrab="seed-net"]') // now the plain group
await click('[data-fly-ungroup]') // remove the group node, keep its steps — no popover
if ((await count('[data-rstage="seed-net"]')) !== 0) errors.push(`E13-C: ungroup dissolves the seed-net container, got ${await count('[data-rstage="seed-net"]')}`)
if ((await count('[data-rnode]')) !== 7) errors.push(`E13-C: ungroup KEEPS the children (still 7 leaves), got ${await count('[data-rnode]')}`)
if ((await fringeCount()) !== '7') errors.push(`E13-C: ungroup changes no visits — route stays 7, got ${await fringeCount()}`)
if ((await count(roadNode('stk-ip-routing'))) !== 1) errors.push('E13-C: the kept child should sit on the road')
await shot('e13-promote')

// ── C2 · #33: ✕ Delete on a group takes everything inside, directly ──────────
await freshSeed()
await click('[data-rgrab="seed-net"]')
await click('[data-fly-del]') // a group → deletes it and its contents, no popover
if ((await count('[data-rnode]')) !== 5) errors.push(`E13-C2: delete takes the container's 2 children (7 → 5), got ${await count('[data-rnode]')}`)
if ((await fringeCount()) !== '5') errors.push(`E13-C2: the route loses the container's 2 visits (5), got ${await fringeCount()}`)

// ── D · #33: the ✕ on a variant tab drops that route. The chosen "handshake"
//        carries a step, so it ASKS first; confirming drops to one variant and
//        leaves a plain GROUP (the crypto survivor), NOT a dissolved inline run ─
await freshSeed()
if ((await count('[data-tab="seed-sec.0"]')) !== 1) errors.push('E19-D: the fork shows a per-route tab')
await click('[data-tab-del="seed-sec.0"]') // ✕ the chosen handshake route — it has a step
if ((await count('[data-varconfirm]')) !== 1) errors.push('E19-D: dropping a non-empty route should ask first')
await click('[data-varconfirm-yes]') // confirm; crypto is the survivor
if ((await count('[data-varconfirm]')) !== 0) errors.push('E19-D: confirming closes the prompt')
if ((await count('[data-tab]')) !== 0) errors.push(`E19-D: dropping to one variant leaves a plain group (no tabs), got ${await count('[data-tab]')}`)
if ((await count('[data-rstage="seed-sec"]')) !== 1) errors.push('E19-D: the container STAYS a group — not dissolved into an inline run')
if ((await fringeCount()) !== '10') errors.push(`E19-D: the surviving crypto variant becomes the road (10), got ${await fringeCount()}`)
if ((await count(roadNode('cry-public-key-cryptography'))) !== 1) errors.push('E19-D: the survivor is now on the road')
await shot('e13-drop-lane')

// ── D2 · #33: DRAG a variant tab out of the fork → extractVariant lifts that
//        route onto the road as its OWN group; the fork keeps the rest (down to
//        one → a plain group). This is relocation — the thing ungroup used to
//        fake by silently discarding the other routes ─────────────────────────
await freshSeed()
if ((await count('[data-tab="seed-sec.1"]')) !== 1) errors.push('E19-D2: the fork shows the crypto-tour tab to drag out')
await dnd('[data-tab="seed-sec.1"]', roadNode('web-http-rest')) // drag the crypto tour onto the road
if ((await count('[data-tab]')) !== 0) errors.push(`E19-D2: extracting a route leaves the fork a plain group (no tabs), got ${await count('[data-tab]')}`)
if ((await count('[data-rstage="seed-sec"]')) !== 1) errors.push('E19-D2: the emptied-to-one fork STAYS as seed-sec (not dissolved)')
if ((await count('[data-rstage]')) !== 3) errors.push(`E19-D2: the lifted route becomes a NEW group card (2 → 3 open cards), got ${await count('[data-rstage]')}`)
if ((await count(roadNode('cry-public-key-cryptography'))) !== 1) errors.push('E19-D2: the extracted crypto route now rides the road')
if ((await fringeCount()) !== '11') errors.push(`E19-D2: fork keeps handshake (1), lifted crypto group adds 4 → 7 becomes 11, got ${await fringeCount()}`)
await shot('e19-tab-extract')

// ── E · the whole group CARD is live, and Aside is gone (review 5) ──────────
// no ⊞/⊟ buttons: double-click anywhere on the card closes it, the collapsed
// pill re-opens it. The title is the case that matters — it used to be a live
// text field, a dead zone the gesture fell into; renaming now waits behind ✎.
await freshSeed()
if ((await count('[data-road-toggle]')) !== 0) errors.push('E5: the ⊞/⊟ toggle buttons should be gone')
if ((await count('[data-fly-aside]')) !== 0) errors.push('E5: the Aside action should be cut')
if ((await count('[data-raside]')) + (await count('[data-vaside]')) !== 0) errors.push('E5: no aside lane should render anywhere')
if ((await count('[data-rretitle="seed-net"]')) !== 0) errors.push('E5: the title should not be an always-live text field')

// the former dead zone: double-clicking the TITLE now closes the card
await dbl('[data-rtitle="seed-net"]')
if ((await count('[data-rstage-closed="seed-net"]')) !== 1) errors.push('E5: double-clicking the title should close the card')
if ((await count('[data-rstage="seed-net"]')) !== 0) errors.push(`E5: the open seed-net container is gone once closed, got ${await count('[data-rstage="seed-net"]')}`)
if ((await count('[data-rnode]')) !== 5) errors.push(`E5: closing hides seed-net's 2 children (7 → 5), got ${await count('[data-rnode]')}`)
if ((await fringeCount()) !== '7') errors.push(`E5: collapsing is a VIEW state — the route stays 7, got ${await fringeCount()}`)
await shot('e5-card-closed')
await dbl('[data-rstage-closed="seed-net"]')
if ((await count('[data-rstage="seed-net"]')) !== 1) errors.push('E5: double-clicking the closed pill should re-open the card')
if ((await count('[data-rnode]')) !== 7) errors.push(`E5: re-opening brings the children back (7), got ${await count('[data-rnode]')}`)

// clicking the green backdrop selects the card — no inert region left. Aim at
// the left gutter: the card's centre is covered by its own child nodes, which
// are board-level siblings drawn over it, so playwright won't click through.
await page.locator('[data-rstage="seed-net"]').click({ position: { x: 4, y: 45 } })
await page.waitForTimeout(250)
if ((await count('[data-seltools]')) !== 1) errors.push('E5: clicking the card backdrop should select the group')

// renaming is a MODE: ✎ opens the field, ✓ commits and closes it
await click('[data-rtitle-edit="seed-net"]')
if ((await count('[data-rretitle="seed-net"]')) !== 1) errors.push('E5: ✎ should open the title field')
await page.fill('[data-rretitle="seed-net"]', 'Reach the box')
await click('[data-rtitle-edit="seed-net"]')
if ((await count('[data-rretitle="seed-net"]')) !== 0) errors.push('E5: ✓ should close the title field')
const renamed = await page.locator('[data-rtitle="seed-net"]').innerText()
if (renamed !== 'Reach the box') errors.push(`E5: the rename should stick, got "${renamed}"`)
if ((await count('[data-rstage="seed-net"]')) !== 1) errors.push('E5: renaming must not fold the card shut')
await shot('e5-card-open')

await browser.close()
vite.kill()

if (errors.length) {
  console.error('walk-tiers spike FAILED:')
  for (const e of errors) console.error('  x ' + e)
  process.exit(1)
}
console.log('walk-tiers spike ok — frames in tools/walk-tiers-spike/out/')
