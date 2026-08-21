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
await page.getByLabel('studio-preset-explore').click()
await page.waitForTimeout(600)

/** the map camera's transform, for asserting flights happened / came home */
const getCam = () => page.$eval('[data-nested] > g', (g) => g.getAttribute('transform'))

// 0 — SelfNotes: NOTHING selected yet, so hovering a map cell PREVIEWS its
// connections in the pane (chip + re-read), and clears when the cursor leaves
const dcell = await page.evaluate(() => {
  const cells = [...document.querySelectorAll('path[data-region][data-rtier="0"]')]
  for (const c of cells) {
    const b = c.getBoundingClientRect()
    const x = b.x + b.width / 2
    const y = b.y + b.height / 2
    if (document.elementFromPoint(x, y) === c) return { x, y, id: c.getAttribute('data-region') }
  }
  return null
})
if (!dcell) {
  errors.push('preview: no domain cell whose centre lands inside itself')
} else {
  // SelfNotes audit: the header is HEIGHT-STABLE — the breadcrumb is one fixed
  // line and the chip slot is always reserved, so previewing must not move the
  // graph below it by a pixel.
  const pgY0 = (await page.locator('[data-panegraph]').boundingBox()).y
  await page.mouse.move(dcell.x, dcell.y)
  await page.waitForTimeout(300)
  const prev = await page.locator('[data-childpreview]').getAttribute('data-childpreview')
  if (prev !== dcell.id) errors.push(`preview: hovering ${dcell.id} previews ${prev}`)
  const pgY1 = (await page.locator('[data-panegraph]').boundingBox()).y
  await page.screenshot({ path: OUT + '/0-hover-preview.png' })
  const mapBox = await page.locator('[data-nested]').boundingBox()
  await page.mouse.move(mapBox.x + 4, mapBox.y + 4) // map corner = water
  await page.waitForTimeout(300)
  if ((await page.locator('[data-childpreview]').count()) !== 0) errors.push('preview: chip did not clear when the cursor left')
  const pgY2 = (await page.locator('[data-panegraph]').boundingBox()).y
  if (Math.abs(pgY1 - pgY0) > 1 || Math.abs(pgY2 - pgY0) > 1)
    errors.push(`header stability: the graph moved while previewing (${pgY0} → ${pgY1} → ${pgY2})`)
}

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

// the selection's neighbourhood: every counterpart cell the roads reach gets a
// lighter tint of its own — one data-selconn per counterpart, none for the
// selected cell itself
const conn = await page.$$eval('[data-selconn]', (gs) => gs.map((g) => g.getAttribute('data-selconn')))
if (conn.length === 0) errors.push('neighbourhood: selection tinted no connected cells')
if (conn.includes(picked)) errors.push('neighbourhood: the selected cell tinted itself as a counterpart')
if (new Set(conn).size !== conn.length) errors.push('neighbourhood: a counterpart tinted twice')

// 3 — wheel, everything open: sqrt sectors + label lanes + leaders
await page.getByLabel('connections-open-all').click()
await page.waitForTimeout(500)
await page.screenshot({ path: OUT + '/3-wheel-open-all.png' })

// 3b — SelfNotes: "internal view stopped working at depth 2" — opened rings
// spill past the viewBox and the legibility floor used to forbid zooming out
// to them. The floor is content-aware now: wheel-out must be able to FIT the
// whole drawn picture (bbox inside the visible region), while a picture that
// already fits keeps the legibility floor.
{
  const wheel = page.locator('[data-panegraph]')
  const wbx = await wheel.boundingBox()
  await page.mouse.move(wbx.x + wbx.width / 2, wbx.y + wbx.height / 2)
  await page.mouse.wheel(0, 9000) // slam into the floor
  await page.waitForTimeout(250)
  const zFloor = parseFloat(await wheel.getAttribute('data-cvz'))
  const needZ = await wheel.evaluate((svg) => {
    const bb = svg.querySelector('[data-cvg]').getBBox()
    const vb = svg.viewBox.baseVal
    const need = Math.max(
      Math.abs(bb.y) / (vb.height / 2),
      Math.abs(bb.y + bb.height) / (vb.height / 2),
      Math.abs(bb.x) / (vb.width / 2),
      Math.abs(bb.x + bb.width) / (vb.width / 2),
    )
    return 1 / need
  })
  if (zFloor > needZ + 0.03)
    errors.push(`wheel floor: opened rings need z=${needZ.toFixed(2)} to fit but the floor stops at ${zFloor}`)
  await page.getByLabel('connections-pane').screenshot({ path: OUT + '/3b-wheel-fit-floor.png' })
  await wheel.dblclick({ position: { x: 8, y: 8 } }) // water — back to home framing
  await page.waitForTimeout(200)
}

// 4 — relations star. Also shot CLOSE UP: the star's type labels are ~8px on a
// 1750px frame, far too small to judge from the full page — crop to the pane.
await page.getByLabel('connections-mode-relations').click()
await page.waitForTimeout(400)
await page.screenshot({ path: OUT + '/4-relations-star.png' })
await page.getByLabel('connections-pane').screenshot({ path: OUT + '/4a-star-closeup.png' })

// SelfNotes audit: the list window is HALF its old height — a fixed ~24% of
// the pane, scrolling inside — so the graph reading above it gets the room.
{
  const paneBox = await page.getByLabel('connections-pane').boundingBox()
  const listBox = await page.locator('[aria-label="connections-relationships"]').boundingBox()
  const frac = listBox.height / paneBox.height
  if (frac < 0.2 || frac > 0.28) errors.push(`list window: ${(frac * 100).toFixed(1)}% of the pane, expected ~24%`)
}

// 4a2 — SelfNotes: the star canvas pans and zooms. Wheel-in grows type with the
// picture; wheel-out CLAMPS at the legibility floor (12-unit labels ≥ ~8 CSS px,
// and never past ×1); double-click on water resets.
{
  const star = page.locator('[data-relstar]')
  const sb = await star.boundingBox()
  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2)
  await page.mouse.wheel(0, -600)
  await page.waitForTimeout(250)
  const zIn = parseFloat(await star.getAttribute('data-cvz'))
  if (!(zIn > 1)) errors.push(`canvas zoom: wheel-in left z at ${zIn}`)
  await page.getByLabel('connections-pane').screenshot({ path: OUT + '/4a2-star-zoomed.png' })
  await page.mouse.wheel(0, 8000)
  await page.waitForTimeout(250)
  const zf1 = parseFloat(await star.getAttribute('data-cvz'))
  await page.mouse.wheel(0, 3000)
  await page.waitForTimeout(250)
  const zf2 = parseFloat(await star.getAttribute('data-cvz'))
  if (Math.abs(zf1 - zf2) > 1e-6) errors.push(`canvas zoom floor: kept sliding (${zf1} → ${zf2})`)
  if (!(zf1 <= 1 && zf1 >= 0.3)) errors.push(`canvas zoom floor: ${zf1} is not a plausible legibility floor`)
  // pan: drag on water moves the picture
  const t0 = await star.evaluate((s) => s.querySelector('[data-cvg]').getAttribute('transform'))
  await page.mouse.move(sb.x + 30, sb.y + 30)
  await page.mouse.down()
  await page.mouse.move(sb.x + 110, sb.y + 80, { steps: 5 })
  await page.mouse.up()
  await page.waitForTimeout(150)
  const t1 = await star.evaluate((s) => s.querySelector('[data-cvg]').getAttribute('transform'))
  if (t0 === t1) errors.push('canvas pan: dragging the star moved nothing')
  // double-click on water = home
  await star.dblclick({ position: { x: 12, y: 12 } })
  await page.waitForTimeout(150)
  const zHome = await star.getAttribute('data-cvz')
  if (zHome !== '1.00') errors.push(`canvas reset: double-click left z at ${zHome}`)
}

// 4b — hover sync (item 4): hovering a relationship ROW must light the matching
// star node (dimming the rest) and spotlight that topic's territory on the map.
// Asserted, not just eyeballed — this is the whole point of the hover bus.
const camBefore = await getCam()
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

// SelfNotes audit: a mere hover must NOT move the camera and declares no look
// — highlighting (asserted above) is all a hover does now. The flight gesture
// moved to the click below.
await page.waitForTimeout(600) // longer than any flight would take
if ((await page.locator('[data-nested][data-peek]').count()) !== 0) errors.push('look: a mere hover declared a peek')
if ((await getCam()) !== camBefore) errors.push('look: hovering a relationship row moved the camera')

// CLICK = LOOK: the map flies to the counterpart's territory at its tier and
// keeps it highlighted; the SELECTION must not change. And the highlight must
// survive the cursor leaving — a look holds until superseded.
const panel = page.locator('[aria-label="connections-pane"]')
const focusBefore = await panel.getAttribute('data-focus')
await page.locator('[data-relrow]').first().click()
await page.waitForTimeout(1000) // the look flight is 750ms (LOOK_FLY_MS)
const peekAttr = await page.locator('[data-nested]').getAttribute('data-peek')
if (peekAttr !== litStarId) errors.push(`look: map declares ${peekAttr}, expected ${litStarId}`)
if ((await panel.getAttribute('data-focus')) !== focusBefore) errors.push('look: the click changed the selection')
if ((await getCam()) === camBefore) errors.push('look: the camera never moved toward the counterpart')
await page.screenshot({ path: OUT + '/4b2-look-flight.png' })
const mapBox2 = await page.locator('[data-nested]').boundingBox()
await page.mouse.move(mapBox2.x + 4, mapBox2.y + 4) // cursor leaves the rows
await page.waitForTimeout(400)
const spotAfter = await page.locator('[data-spot]').getAttribute('data-spot')
if (spotAfter !== litStarId) errors.push(`look: highlight did not persist off-hover (spot=${spotAfter})`)

// SelfNotes: back/forward. DOUBLE-clicking a relationship row re-roots there
// (the single click is the look above); ◀ walks back to where you stood, ▶
// re-walks forward. data-focus is the pane's own declaration of where it stands.
await page.locator('[data-relrow]').first().dblclick()
await page.waitForTimeout(400)
const hopped = await panel.getAttribute('data-focus')
if (hopped === picked) errors.push('nav: clicking a relationship row did not move the focus')
await page.getByLabel('connections-nav-back').click()
await page.waitForTimeout(300)
if ((await panel.getAttribute('data-focus')) !== picked) errors.push('nav: back did not return to the previous focus')
await page.getByLabel('connections-nav-forward').click()
await page.waitForTimeout(300)
if ((await panel.getAttribute('data-focus')) !== hopped) errors.push('nav: forward did not re-walk the hop')
await page.getByLabel('connections-nav-back').click()
await page.waitForTimeout(300)
if ((await panel.getAttribute('data-focus')) !== picked) errors.push('nav: second back did not land on the picked topic')

// 4c — THE GENERATED LENS. `implements` is the corpus's fourth relation type
// and it never had a lens pane — not because LensPane couldn't render one (its
// config is Record<EdgeType, …>, so TS forced an `implements` entry years ago)
// but because a lens needed four hand-edits in four parallel structures inside
// StudioView, and nobody made them. The registry now generates one per edge
// type, so this pane exists for free. Toggle it on over the focused topic, check
// it renders, toggle it back off so the cockpit is intact for the frames below.
await page.getByLabel('studio-inst-lens-implemented_with').click()
await page.waitForTimeout(600)
await page.screenshot({ path: OUT + '/4c-generated-lens.png' })
const lensPane = page.locator('[aria-label="studio-pane-lens-implemented_with"][data-slot="on"]')
if ((await lensPane.count()) !== 1) errors.push('generated lens: the lens-implemented_with pane did not mount')
else if (!(await lensPane.innerText()).trim()) errors.push('generated lens: the pane mounted but rendered nothing')
await page.getByLabel('studio-inst-lens-implemented_with').click()
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

// SelfNotes: region names WRAP inside their territories now. At L0 the active
// domain names must not collide (they used to run two cells over and pile up),
// and the corpus's multi-word names mean at least one must have split lines.
{
  const boxes = await page.$$eval('[data-regionlabel]', (ts) =>
    ts
      .filter((t) => Number(t.getAttribute('opacity')) > 0.3) // active-level names only
      .map((t) => {
        const b = t.getBoundingClientRect()
        return { id: t.getAttribute('data-regionlabel'), x: b.x, y: b.y, w: b.width, h: b.height, lines: t.querySelectorAll('tspan').length }
      }),
  )
  if (boxes.length < 2) errors.push(`region labels: expected the L0 domain names, found ${boxes.length}`)
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]
      const b = boxes[j]
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h)
        errors.push(`region labels: ${a.id} and ${b.id} overlap at L0`)
    }
  if (!boxes.some((b) => b.lines > 1)) errors.push('region labels: nothing wrapped at L0 despite multi-word domain names')
}

// 5c — SelfNotes A (the bug): a DOMAIN selection used to leave the external
// view blank while the map drew its rolled-up roads. Now it is the REGION
// STAR: counterpart areas ringed at their map bearings, list rows to match,
// and a summary ⇄ detailed grain toggle on the canvas.
{
  const rs = await page.locator('[data-regionstar]').count()
  if (rs !== 1) errors.push('region star: domain selection in relations mode did not render one')
  const sumNodes = await page.locator('[data-regionnode]').count()
  if (sumNodes < 1) errors.push('region star: no counterpart areas ringed')
  const sumRows = await page.locator('[data-regionrow]').count()
  if (sumRows !== sumNodes) errors.push(`region star: ${sumRows} list rows vs ${sumNodes} ringed areas`)
  await page.getByLabel('connections-pane').screenshot({ path: OUT + '/5c-region-star.png' })
  await page.getByLabel('ext-grain-detailed').click()
  await page.waitForTimeout(300)
  const detNodes = await page.locator('[data-regionnode]').count()
  // every summary area bundles ≥1 outside topic, so detailed can only widen
  if (detNodes < sumNodes) errors.push(`region star: detailed (${detNodes}) narrower than summary (${sumNodes})`)
  await page.getByLabel('connections-pane').screenshot({ path: OUT + '/5d-region-star-detailed.png' })
  await page.getByLabel('ext-grain-summary').click()
  await page.waitForTimeout(200)
}

// 5e — SelfNotes: Esc DESELECTS for real now (focus cleared with the overlay),
// and ◀ back restores exactly the node you deselected.
{
  const panel = page.locator('[aria-label="connections-pane"]')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  if ((await page.locator('[aria-label="connections-pane"][data-focus]').count()) !== 0)
    errors.push('deselect: Esc left the focus standing')
  await page.getByLabel('connections-nav-back').click()
  await page.waitForTimeout(300)
  if ((await panel.getAttribute('data-focus')) !== domain)
    errors.push('deselect: back did not restore the deselected domain')
}

// 5f — issue #6 (2026-07-17): a selection BELOW the topic grain draws NO roads
// (the map-side twin of the pane's retired "via" lift — borrowing the owning
// topic's arrows made every relation-less child look connected), and
// de-selecting RESTS the pane on the node you were exploring instead of
// yanking it to the whole-map root reading.
{
  await page.getByLabel('nested-level-3').click()
  await page.waitForTimeout(900)
  const deepId = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('path[data-terr][data-tier="3"]')]
    let best = null
    for (const c of cells) {
      const b = c.getBBox()
      const area = b.width * b.height
      if (!best || area > best.area) best = { area, id: c.getAttribute('data-terr'), el: c }
    }
    best.el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return best.id
  })
  await page.waitForTimeout(600)
  if ((await page.locator('[data-seledge]').count()) !== 0) errors.push('deep-sel: a below-topic selection drew borrowed roads')
  if ((await page.locator('[data-selconn]').count()) !== 0) errors.push('deep-sel: a below-topic selection tinted a neighbourhood')
  if ((await page.locator('[data-seloutline]').count()) !== 1) errors.push('deep-sel: the selected cell lost its own outline')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  const tip = await page.$$eval('[data-crumb]', (bs) => bs.map((b) => b.getAttribute('data-crumb')).pop())
  if (tip !== deepId) errors.push(`deselect: pane rested on ${tip}, expected ${deepId}`)
  await page.getByLabel('nested-level-2').click() // leave the map roughly where 5e did
  await page.waitForTimeout(600)
}

// 6 — Teaching preset: since the flat Map was deleted (2026-07-14) this preset
// inherits the nested atlas in its place — check it still lays out sanely
await page.getByLabel('studio-preset-present').click()
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
