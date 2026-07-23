// Walk-desk driver — GRADUATED: the round-7 desk now ships as the Studio's
// Walk·Desk instrument behind the Authoring preset (the ?spike=walk-tiers
// gate is gone), so this drives the real app. The chain still proves the
// core claim: the railroad may fork and rejoin, but everything right of it —
// stack, columns, fringe strip — always reads ONE resolved linear walk. Steps:
// picking a branch re-projects the route; bypassing optionals shrinks it;
// forking a selection through the contextual tools splits the road in place;
// a palette drop lands INSIDE an empty branch lane; the columns still drill.
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
//        http, ws◇, auth] — branch 0 chosen, optionals on the road
if ((await count('[data-desk]')) !== 1) errors.push(`S: the walk desk should render under the Authoring preset, got ${await count('[data-desk]')}`)
// the fork ALWAYS fans its lanes out now (#13 review 2): both the 1-node
// handshake lane and the 4-node crypto tour render at once — so 11 nodes
if ((await count('[data-rnode]')) !== 11) errors.push(`S: 11 visit nodes with both fork lanes shown, got ${await count('[data-rnode]')}`)
if ((await count('[data-fork]')) !== 1) errors.push(`S: one fork diamond, got ${await count('[data-fork]')}`)
if ((await count('[data-brpick]')) !== 2) errors.push(`S: both branch chips show, got ${await count('[data-brpick]')}`)
if ((await count('[data-rbypass]')) !== 1) errors.push(`S: ws is optional — one bypass rail, got ${await count('[data-rbypass]')}`)
if ((await count('[data-rord]')) !== 7) errors.push(`S: 7 stops wear badges on the default road, got ${await count('[data-rord]')}`)
const firstOrd = await page.locator('[data-rnode] [data-rord]').first().getAttribute('data-rord')
if (firstOrd !== '1') errors.push(`S: the first road visit should wear badge 1, got ${firstOrd}`)
if ((await fringeCount()) !== '7') errors.push(`S: default resolved route is 7 visits, got ${await fringeCount()}`)
if ((await count('[data-vbox]')) !== 6) errors.push(`S: columns tier 0 shows 6 resolved boxes, got ${await count('[data-vbox]')}`)
if ((await count('[data-plane]')) !== 1) errors.push(`S: the iso stack starts with one plane, got ${await count('[data-plane]')}`)
await shot('s7-default')

// ── #13 review 2: every fork lane is ALWAYS visible — no hide-until-hover ────
if ((await count(roadNode('cry-public-key-cryptography'))) !== 1)
  errors.push('E13-lanes: the alternative crypto-tour lane must be visible by default')
if ((await count('[data-rnode]')) !== 11) errors.push(`E13-lanes: both fork lanes render at once (11 nodes), got ${await count('[data-rnode]')}`)

// ── picking the other branch re-projects EVERYTHING right of the railroad ───
await click('[data-brpick="seed-sec.1"]')
if ((await fringeCount()) !== '10') errors.push(`S: the crypto tour makes the route 10, got ${await fringeCount()}`)
if ((await count('[data-rord]')) !== 10) errors.push(`S: 10 badges on the crypto road, got ${await count('[data-rord]')}`)
if ((await count('[data-vbox]')) !== 9) errors.push(`S: columns re-resolve to 9 tier-0 boxes, got ${await count('[data-vbox]')}`)
// picking a branch changes the RESOLVED road, not the visible lanes — still 11
if ((await count('[data-rnode]')) !== 11) errors.push(`S: both lanes stay visible after a pick (11 nodes), got ${await count('[data-rnode]')}`)
if ((await count(roadNode('cry-public-key-cryptography'))) !== 1) errors.push('S: the crypto lane is on the chosen road now')
await shot('s7-branchB')

// ── bypassing optionals: the road goes AROUND the dashed node ───────────────
await click('[data-opt-toggle]')
if ((await fringeCount()) !== '9') errors.push(`S: bypassing ws drops the route to 9, got ${await fringeCount()}`)
if ((await count('[data-rord]')) !== 9) errors.push(`S: the bypassed stop loses its badge (9 left), got ${await count('[data-rord]')}`)
if ((await count('[data-vbox]')) !== 8) errors.push(`S: columns drop the bypassed stop (8 boxes), got ${await count('[data-vbox]')}`)
await shot('s7-bypass')
await click('[data-opt-toggle]')
if ((await fringeCount()) !== '10') errors.push(`S: optionals back on the road — 10 again, got ${await fringeCount()}`)

// ── selecting draws a boxed group + a pinned toolbar (#17); forking uses it ──
await click('[data-rnode][data-node="web-http-rest"]')
if ((await count('[data-fly]')) !== 1) errors.push(`S: selecting a node pins the action toolbar, got ${await count('[data-fly]')}`)
if ((await count('[data-selbox]')) !== 1) errors.push(`S: selecting a node draws one selection box, got ${await count('[data-selbox]')}`)
await shiftClick('[data-rnode][data-node="web-sockets-apis"]') // shift adds to the selection (Windows-style)
if ((await count('[data-selbox]')) !== 1) errors.push(`S: a multi-select is still ONE box around the run, got ${await count('[data-selbox]')}`)
await shot('s7-selection')
await click('[data-fly-fork]')
if ((await count('[data-fork]')) !== 2) errors.push(`S: forking the selection makes a 2nd diamond, got ${await count('[data-fork]')}`)
if ((await count('[data-fly]')) !== 0) errors.push(`S: the toolbar retires once the selection clears, got ${await count('[data-fly]')}`)
if ((await count('[data-selbox]')) !== 0) errors.push(`S: the selection box clears with the selection, got ${await count('[data-selbox]')}`)
if ((await fringeCount()) !== '10') errors.push(`S: the selection became the main branch — route unchanged (10), got ${await fringeCount()}`)

// ── #13/#4 the new lane opens with a NODE SLOT to bind, not an empty label ───
// (the new fork's alt lane is always visible now — no reveal needed)
if ((await count('[data-brdrop]')) !== 0) errors.push(`S: the new lane is not an empty drop zone anymore, got ${await count('[data-brdrop]')}`)
if ((await count('[data-runset]')) !== 1) errors.push(`S: the new lane opens one unset node slot, got ${await count('[data-runset]')}`)
// bind a corpus node through the slot's picker (fork-0, branch 1, step 0)
await page.selectOption('[data-rpicknode="b.3.1.0"]', 'auto-continuous-integration')
await page.waitForTimeout(200)
if ((await count('[data-runset]')) !== 0) errors.push(`S: binding a node clears the unset slot, got ${await count('[data-runset]')}`)
if ((await count(roadNode('auto-continuous-integration'))) !== 1) errors.push('S: the bound node appears in the lane')
if ((await fringeCount()) !== '10') errors.push(`S: the alternative isn't chosen yet — route still 10, got ${await fringeCount()}`)
await click('[data-brpick="fork-0.1"]')
if ((await fringeCount()) !== '9') errors.push(`S: taking the alternative swaps http+ws for ci (9), got ${await fringeCount()}`)
if ((await count('[data-vbox]')) !== 8) errors.push(`S: columns follow the swap (8 boxes), got ${await count('[data-vbox]')}`)
await shot('s7-forked')

// ── contextual group still works on the road ────────────────────────────────
await click('[data-rnode][data-node="stk-dns-naming"]')
await click('[data-fly-group]')
if ((await count('[data-rstage]')) !== 2) errors.push(`S: grouping should open a 2nd stage container, got ${await count('[data-rstage]')}`)
if ((await fringeCount()) !== '9') errors.push(`S: grouping adds no visits — route stays 9, got ${await fringeCount()}`)

// ── the columns still drill the resolved road, and the iso stack follows ────
await click('[data-vpick="seed-net"]')
if ((await count('[data-vcol]')) !== 2) errors.push(`S: drilling seed-net opens a 2nd column, got ${await count('[data-vcol]')}`)
if ((await count('[data-vedge]')) !== 1) errors.push(`S: one open column = one begat-edge, got ${await count('[data-vedge]')}`)
if ((await count('[data-plane]')) !== 2) errors.push(`S: the iso stack grows a 2nd plane with the column, got ${await count('[data-plane]')}`)

// ── ...and drives too: a dot click collapses, the diamond re-opens ──────────
await click('[data-plane="0"] button:not([data-pick-stack])')
if ((await count('[data-plane]')) !== 1) errors.push(`S: picking a visit dot on plane 0 folds the drill back, got ${await count('[data-plane]')}`)
if ((await count('[data-vcol]')) !== 1) errors.push(`S: the columns follow the stack's fold, got ${await count('[data-vcol]')}`)
await click('[data-pick-stack="seed-net"]')
if ((await count('[data-plane]')) !== 2) errors.push(`S: the stack diamond re-opens the drill, got ${await count('[data-plane]')}`)
if ((await count('[data-vcol]')) !== 2) errors.push(`S: the columns follow the stack's pick, got ${await count('[data-vcol]')}`)
await shot('s7-desk-final')

// ── hover publishes on the BUS hover channel — every bound element with the
// same id lights (railroad node, fringe chip, column box, stack dot) ────────
await page.locator('[data-road-root] [data-node="stk-ip-routing"]').first().hover()
await page.waitForTimeout(250)
const lit = await count('[data-lit="1"]')
if (lit < 2) errors.push(`S: hovering stk-ip-routing should light every bound element sharing the id, got ${lit}`)

// ── the palette search narrows the pick list ────────────────────────────────
const palAll = await count('[data-pal]')
await page.locator('[data-pal-search]').fill('tls')
await page.waitForTimeout(200)
const palTls = await count('[data-pal]')
if (!(palTls > 0 && palTls < palAll)) errors.push(`S: search 'tls' should narrow the palette (${palAll} -> ${palTls})`)

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

// ── #13 review 3: hovering a fork's + PREVIEWS the lane it would add ─────────
await freshSeed()
if ((await count('[data-add-preview]')) !== 0) errors.push(`E13r3-preview: no preview until the + is hovered, got ${await count('[data-add-preview]')}`)
await page.locator('[data-add-branch="seed-sec"]').first().hover()
await page.waitForTimeout(150)
if ((await count('[data-add-preview]')) !== 1) errors.push(`E13r3-preview: hovering the + should preview one new lane, got ${await count('[data-add-preview]')}`)
await shot('e13r3-add-preview')
await page.mouse.move(5, 5) // leave the + → preview retires
await page.waitForTimeout(150)
if ((await count('[data-add-preview]')) !== 0) errors.push(`E13r3-preview: the preview clears when the + is left, got ${await count('[data-add-preview]')}`)

// ══ #13 editor fixes — each verified on a FRESH seed (reload resets the desk) ══

// ── A · forgiving slots: a drop in the dead gap between nodes lands IN PLACE,
//        not falling through to append-at-end ─────────────────────────────────
await freshSeed()
if ((await count('[data-rslot]')) === 0) errors.push('E13-A: expected between-node drop slots, got 0')
if ((await fringeCount()) !== '7') errors.push(`E13-A: fresh seed route is 7, got ${await fringeCount()}`)
await dnd('[data-pal="auto-continuous-integration"]', '[data-rslot="b.1"]')
if ((await count('[data-rnode]')) !== 12) errors.push(`E13-A: the slot drop should add a node (11 → 12), got ${await count('[data-rnode]')}`)
if ((await fringeCount()) !== '8') errors.push(`E13-A: the route grows to 8, got ${await fringeCount()}`)
const idsA = await fringeIds()
if (idsA[1] !== 'auto-continuous-integration') errors.push(`E13-A: the drop must land at slot b.1 (2nd in route), got ${idsA[1]}`)
if (idsA[idsA.length - 1] !== 'app-authentication-authorization')
  errors.push(`E13-A: it must NOT append to end — last should stay auth, got ${idsA[idsA.length - 1]}`)
await shot('e13-slot-drop')

// ── B · an edit inside an unchosen (ghost) lane visibly lands. The lane is
//        always shown; a ghost node reads dimmed, un-dims on select, deletes ──
await freshSeed()
const ghost = roadNode('cry-public-key-cryptography') // in the unchosen crypto-tour lane
if ((await count(ghost)) !== 1) errors.push('E13-B: the ghost lane is visible by default (no reveal)')
const opBefore = await page.locator(ghost).first().evaluate((el) => getComputedStyle(el).opacity)
if (!(Number(opBefore) < 0.75)) errors.push(`E13-B: an unchosen-lane node should read dimmed, opacity ${opBefore}`)
await click(ghost)
const opAfter = await page.locator(ghost).first().evaluate((el) => getComputedStyle(el).opacity)
if (Number(opAfter) < 0.95) errors.push(`E13-B: selecting a ghost node should un-dim it, opacity ${opAfter}`)
await shot('e13-ghost-selected')
await click('[data-fly-del]') // a leaf → deletes directly, no menu
if ((await count(ghost)) !== 0) errors.push('E13-B: deleting inside the ghost lane should remove the node')
if ((await count('[data-rnode]')) !== 10) errors.push(`E13-B: 11 → delete one ghost node → 10, got ${await count('[data-rnode]')}`)

// ── C · container delete ASKS: promote keeps the children on the road ────────
await freshSeed()
if ((await count('[data-rstage]')) !== 1) errors.push(`E13-C: fresh seed has one open stage, got ${await count('[data-rstage]')}`)
await click('[data-rgrab="seed-net"]')
await click('[data-fly-del]') // a container → opens the decision menu, does not cascade
if ((await count('[data-del-menu]')) !== 1) errors.push('E13-C: a container delete should open the choice menu, not cascade')
if ((await count('[data-del-promote]')) !== 1) errors.push('E13-C: the menu offers promote')
await click('[data-del-promote]')
if ((await count('[data-rstage]')) !== 0) errors.push(`E13-C: promote dissolves the stage container, got ${await count('[data-rstage]')}`)
if ((await count('[data-rnode]')) !== 11) errors.push(`E13-C: promote KEEPS the children (still 11 nodes), got ${await count('[data-rnode]')}`)
if ((await fringeCount()) !== '7') errors.push(`E13-C: promote changes no visits — route stays 7, got ${await fringeCount()}`)
if ((await count(roadNode('stk-ip-routing'))) !== 1) errors.push('E13-C: the promoted child should sit on the road')
await shot('e13-promote')

// ── C2 · the menu's other arm: delete-all still cascades ─────────────────────
await freshSeed()
await click('[data-rgrab="seed-net"]')
await click('[data-fly-del]')
await click('[data-del-all]')
if ((await count('[data-rnode]')) !== 9) errors.push(`E13-C2: delete-all takes the stage's 2 children (11 → 9), got ${await count('[data-rnode]')}`)
if ((await fringeCount()) !== '5') errors.push(`E13-C2: the route loses the stage's 2 visits (5), got ${await fringeCount()}`)

// ── D · a FORK delete offers "drop this lane"; dropping to one lane dissolves
//        the fork into the survivor ──────────────────────────────────────────
await freshSeed()
await click('[data-fork="seed-sec"]') // select the fork diamond
await click('[data-fly-del]')
if ((await count('[data-del-lane]')) !== 1) errors.push('E13-D: a fork delete should offer drop-this-lane')
await click('[data-del-lane]') // drops the chosen lane (tls); crypto lane is the last survivor
if ((await count('[data-fork]')) !== 0) errors.push(`E13-D: dropping to one lane dissolves the fork, got ${await count('[data-fork]')} diamonds`)
if ((await fringeCount()) !== '10') errors.push(`E13-D: the surviving crypto lane becomes the road (10), got ${await fringeCount()}`)
if ((await count(roadNode('cry-public-key-cryptography'))) !== 1) errors.push('E13-D: the survivor lane is now inline on the road')
await shot('e13-drop-lane')

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
if ((await count('[data-rstage]')) !== 0) errors.push(`E5: the open container is gone once closed, got ${await count('[data-rstage]')}`)
if ((await count('[data-rnode]')) !== 9) errors.push(`E5: closing hides the stage's 2 children (11 → 9), got ${await count('[data-rnode]')}`)
if ((await fringeCount()) !== '7') errors.push(`E5: collapsing is a VIEW state — the route stays 7, got ${await fringeCount()}`)
await shot('e5-card-closed')
await dbl('[data-rstage-closed="seed-net"]')
if ((await count('[data-rstage]')) !== 1) errors.push('E5: double-clicking the closed pill should re-open the card')
if ((await count('[data-rnode]')) !== 11) errors.push(`E5: re-opening brings the children back (11), got ${await count('[data-rnode]')}`)

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
if ((await count('[data-rstage]')) !== 1) errors.push('E5: renaming must not fold the card shut')
await shot('e5-card-open')

await browser.close()
vite.kill()

if (errors.length) {
  console.error('walk-tiers spike FAILED:')
  for (const e of errors) console.error('  x ' + e)
  process.exit(1)
}
console.log('walk-tiers spike ok — frames in tools/walk-tiers-spike/out/')
