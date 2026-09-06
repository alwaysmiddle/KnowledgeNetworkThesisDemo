// browsertest-walkdock.mjs — #246 (DS OB-130/131/133): the walk dock on the map.
//
// A TEST. It opens the Studio in a real browser and checks what the issue asked for,
// in the order a user would meet it:
//   - the dock is on the map's bottom edge as soon as a walk is on the map, closed;
//   - opening it does not move the map (the SVG's box is the same before and after);
//   - the optional stop reads "(optional)" on the strip AND in the dock's open row —
//     the drift OB-133 exists to end;
//   - a seek in the dock moves the map's pins; play on the dock moves the walk and
//     the viewer's strip reads the SAME clock (it shows pause), and pausing from the
//     strip stops the dock — one clock, every surface;
//   - hovering a pin shows the same preview card the strip shows, PREVIEW_GAP above
//     the pin, with no MapTooltip beside it, and it goes when the pointer leaves;
//   - with no walk being played there is no dock.
//
// THE FIXTURE is the opening composition: the desk's seed draft is already published
// on bus.route, so the map starts with a real walk (drive-mappins.mjs relies on the
// same fact). The seed's stops carry no notes, and the preview card shows a note or
// nothing, so the pin-hover half activates a SAVED walk from Trail, whose first stop
// has one.
//
// Spawns vite ITSELF — backgrounded dev servers die on this machine.
// Run from anywhere:  node tools/studio-spike/browsertest-walkdock.mjs
// Exits nonzero on any failed check or any page error.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'

const REPO = 'D:/ShiZhong/MyCode/KnowledgeNetworkThesisDemo'
const PORT = 5234

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
  return cond
}

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1750, height: 950 } })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

await page.goto(`http://localhost:${PORT}/`)
await page.evaluate(() => localStorage.clear())
await page.reload()
await page.waitForTimeout(800)

const map = page.locator('[aria-label="map-view"]')
const viewer = page.locator('[aria-label="walk-viewer"]')
const dock = () => map.locator('[data-walk-dock]')
const svgBox = () => map.locator('svg').first().boundingBox()
/** the readout pill's "cur / N", as numbers */
const readout = async () => {
  const t = await dock().locator('button').filter({ hasText: /\d+ \/ \d+/ }).first().textContent()
  const m = /(\d+) \/ (\d+)/.exec(t || '')
  return m ? { cur: Number(m[1]), n: Number(m[2]) } : null
}
const sameBox = (a, b) => a && b && ['x', 'y', 'width', 'height'].every((k) => Math.abs(a[k] - b[k]) < 0.5)
/** every pin's StepDot face, in pin order: computed background and border — what tells
 *  current from done from ahead. At a coarse level a pin can stand for a RANGE of stops
 *  (data-step "1-3"), so the faces are read as a whole rather than by one stop number. */
const pinFaces = () => map.locator('[data-routestop] foreignObject > *').evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor + '|' + getComputedStyle(el).borderColor).join(' ; '))

process.on('uncaughtException', (e) => { console.log(checks.join('\n')); console.error('\nCRASHED: ' + e.message); vite.kill(); process.exit(1) })

// ── A. the dock is there, closed, the DS's closed height ────────────────────
ok('the map is on screen', (await map.count()) === 1)
ok('THE DOCK MOUNTS with the desk draft on the map', (await dock().count()) === 1)
ok('and it starts closed', (await dock().getAttribute('data-walk-dock')) === 'closed')
const closedBox = await dock().boundingBox()
ok('closed, it is WALK_DOCK_METRICS.closed (63) tall', !!closedBox && Math.abs(closedBox.height - 63) <= 1, `${closedBox?.height}`)
const mapBox = await map.boundingBox()
ok('and sits on the pane\'s bottom edge', !!closedBox && !!mapBox && Math.abs(closedBox.y + closedBox.height - (mapBox.y + mapBox.height)) <= 1)
const r0 = await readout()
ok('the readout reads stop 1 of the walk', !!r0 && r0.cur === 1 && r0.n > 1, JSON.stringify(r0))

// ── B. opening does not move the map; the optional suffix is on both surfaces ─
ok('the strip shows the seed\'s optional stop as "(optional)"', (await viewer.getByText('(optional)').count()) >= 1)
const before = await svgBox()
await map.getByLabel('show every stop').click()
await page.waitForTimeout(450)
ok('the chevron opens the dock', (await dock().getAttribute('data-walk-dock')) === 'open')
const openBox = await dock().boundingBox()
ok('open, it is WALK_DOCK_METRICS.open (113) tall', !!openBox && Math.abs(openBox.height - 113) <= 1, `${openBox?.height}`)
ok('THE MAP DID NOT MOVE: the SVG\'s box is identical before and after', sameBox(before, await svgBox()), JSON.stringify({ before, after: await svgBox() }))
ok('the open row shows the optional stop as "(optional)" too', (await dock().getByText('(optional)').count()) >= 1)
await map.getByLabel('hide the stops').click()
await page.waitForTimeout(450)
ok('and closes again', (await dock().getAttribute('data-walk-dock')) === 'closed')
ok('still without moving the map', sameBox(before, await svgBox()))

// ── C. a seek in the dock moves the pins ────────────────────────────────────
const facesBefore = await pinFaces()
await dock().focus()
await page.keyboard.press('ArrowRight')
await page.waitForTimeout(250)
const r1 = await readout()
ok('→ on the dock seeks one stop', !!r1 && r1.cur === 2, JSON.stringify(r1))
// End, not one more →: at L0 the seed's seven stops fold into two range pins ("1-3",
// "4-7"), and a cursor moving inside one range changes no pin's face. The last stop
// is in the other pin whatever the folding.
await page.keyboard.press('End')
await page.waitForTimeout(250)
ok('End seeks to the last stop', (await readout())?.cur === r1.n)
const facesAfter = await pinFaces()
ok('and the map\'s pins change face (the current stop moved to another pin)', facesBefore !== facesAfter, `${facesBefore} -> ${facesAfter}`)
await page.keyboard.press('Home')
await page.waitForTimeout(250)
ok('Home seeks back to the first', (await readout())?.cur === 1)

// ── D. one clock for every surface ──────────────────────────────────────────
await map.getByLabel('play the walk').click()
await page.waitForTimeout(2400)
const rPlay = await readout()
ok('PLAY on the dock walks the walk (900ms a stop: at least two stops in 2.4s)', !!rPlay && rPlay.cur >= 3, JSON.stringify(rPlay))
ok('and the VIEWER\'S STRIP reads the same clock — its transport shows pause', (await viewer.getByLabel('pause the walk').count()) === 1)
await viewer.getByLabel('pause the walk').click()
await page.waitForTimeout(150)
const rPaused = await readout()
await page.waitForTimeout(1200)
ok('PAUSE on the strip stops the dock', (await readout())?.cur === rPaused?.cur, `${rPaused?.cur} then ${(await readout())?.cur}`)
ok('and the dock\'s transport shows play again', (await map.getByLabel('play the walk').count()) === 1)

// ── D2. #247 (OB-132): THE WALK ON THE MAP MOVES — the band, the pop, the travelling head ─
// Down to L2, where the seven stops draw as separate pins rather than two ranges. THE
// CHECKS ARE ON THE MECHANISM, never on a pixel count a different band would satisfy by
// accident (the OB-129 lesson): each pin's opacity and scale are read off its own
// attributes, each arrow's split off its own strokes, and the pop is a RATIO of one pin's
// scale at two positions rather than a size.
// down two levels THE WAY THE WALK IS FOLLOWED — a double-click on a pin's own cell, the
// map's dive gesture (the drivers do the same), so the camera stays on the walk
for (let dive = 0; dive < 2; dive++) {
  const b = await map.locator('[data-routestop]').first().boundingBox()
  await page.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2)
  await page.waitForTimeout(800)
}
ok('two dives on a pin reach L2', (await page.$eval('[data-nested]', (el) => el.getAttribute('data-level'))) === '2')
// the dive's double-click also SELECTED the cell it landed on, and a selection recedes the
// whole walk to --bark-300 (OB-117) — Escape clears it, so the paints read below are the band's
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
ok('and Escape clears the selection the dive made, so the walk is at full weight', (await map.locator('[data-routearrows]').getAttribute('data-receded')) === '0')
/** every drawn pin, in walk order: its index, its band opacity and its drawn scale */
const pinInfo = () => map.locator('[data-routestop]').evaluateAll((els) => els.map((el) => ({
  k: Number(el.getAttribute('data-pin')),
  opacity: Number(el.getAttribute('opacity')),
  scale: Number((/scale\(([-\d.e]+)\)/.exec(el.getAttribute('transform') || '') || [])[1]),
})).sort((a, b) => a.k - b.k))
/** every drawn arrow: its index, its painted shafts' strokes in order, whether any is a
 *  dash-split stroke, and its head's fill */
const arrowInfo = () => map.locator('[data-routearrow]').evaluateAll((els) => els.map((el) => {
  const strokes = [...el.querySelectorAll('line, path[fill="none"]')].filter((s) => !(s.getAttribute('stroke') || '').includes('surface-raised'))
  const heads = [...el.querySelectorAll('path[fill]')].filter((p) => { const f = p.getAttribute('fill') || ''; return f !== 'none' && !f.includes('surface-raised') })
  return { i: Number(el.getAttribute('data-routearrow')), paints: strokes.map((s) => s.getAttribute('stroke')), split: strokes.some((s) => s.hasAttribute('stroke-dasharray')), head: heads.length ? heads[heads.length - 1].getAttribute('fill') : null, opacity: Number(el.getAttribute('opacity')) }
}).sort((a, b) => a.i - b.i))
const ACORN = 'var(--accent-walk)'
const QUIET = 'var(--bark-400)'

// the whole walk inside the band first, to learn how many pins this level draws
await dock().focus()
await page.keyboard.press('End')
await page.keyboard.press('ArrowLeft')
await page.keyboard.press('ArrowLeft')
await page.waitForTimeout(300)
const total = (await pinInfo()).length
ok('at L2 the draft draws more pins than the band shows at its first stop (so hiding is testable)', total > 3, `${total} pins`)

await page.keyboard.press('Home')
await page.waitForTimeout(300)
let pins = await pinInfo()
ok('AT THE FIRST STOP ONLY THE PINS WITHIN `lead` (2) OF IT ARE DRAWN — a pin outside the band draws nothing', pins.length === 3 && Math.max(...pins.map((p) => p.k)) === 2, JSON.stringify(pins))
ok('the current pin is at full opacity; the two ahead fade over the lead', pins[0].opacity === 1 && pins[1].opacity < 1 && pins[1].opacity > pins[2].opacity && pins[2].opacity > 0, JSON.stringify(pins.map((p) => p.opacity)))
const baseScale = pins[2].scale // two ahead: no arrival, no trail — the pin at rest
ok('THE POP: the current pin is 1 + grow (1.36×) the resting pin', Math.abs(pins[0].scale / baseScale - 1.36) < 0.01, `${(pins[0].scale / baseScale).toFixed(3)}`)
let arrows = await arrowInfo()
ok('nothing is walked yet: every drawn arrow is one quiet stroke with a quiet head, unsplit', arrows.length === 2 && arrows.every((a) => a.paints.length === 1 && a.paints[0] === QUIET && a.head === QUIET && !a.split), JSON.stringify(arrows))

await page.keyboard.press('End')
await page.waitForTimeout(300)
pins = await pinInfo()
arrows = await arrowInfo()
ok('at the last stop the pins behind it fade over the trail (5) and shrink; the one before it is not at full', pins.length >= 3 && pins[pins.length - 1].opacity === 1 && pins[pins.length - 2].opacity < 1 && pins[pins.length - 2].scale < pins[pins.length - 1].scale, JSON.stringify(pins))
ok('every drawn arrow is walked: one acorn stroke, acorn head, unsplit', arrows.length > 0 && arrows.every((a) => a.paints.length === 1 && a.paints[0] === ACORN && a.head === ACORN && !a.split), JSON.stringify(arrows))
const lastScaleAtEnd = pins[pins.length - 1].scale
await page.keyboard.press('ArrowLeft')
await page.waitForTimeout(300)
arrows = await arrowInfo()
ok('one stop back, the arrow INTO the last stop is quiet again while the one before it stays acorn', arrows.length >= 2 && arrows[arrows.length - 1].paints[0] === QUIET && arrows[arrows.length - 2].paints[0] === ACORN, JSON.stringify(arrows.map((a) => a.paints)))
await page.keyboard.press('ArrowLeft')
await page.waitForTimeout(300)
pins = await pinInfo()
ok('and two stops back the last pin has settled to rest — the same pin, 1.36× smaller than when it was current', Math.abs(lastScaleAtEnd / pins[pins.length - 1].scale - 1.36) < 0.01, `${(lastScaleAtEnd / pins[pins.length - 1].scale).toFixed(3)}`)

// PLAYING: the animation IS the position. Sample the drawing while the clock runs.
await page.keyboard.press('Home')
await page.waitForTimeout(200)
await map.getByLabel('play the walk').click()
const fps = await page.evaluate(() => new Promise((res) => {
  let n = 0
  const t0 = performance.now()
  const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else res(n) }
  requestAnimationFrame(f)
}))
ok('the map keeps at least 30 frames a second while the walk plays', fps >= 30, `${fps} fps`)
const samples = []
const tStart = Date.now()
while (Date.now() - tStart < 1400) {
  samples.push({ pins: await pinInfo(), arrows: await arrowInfo() })
  await page.waitForTimeout(30)
}
await map.getByLabel('pause the walk').click()
await page.waitForTimeout(150)
const scalesOf1 = samples.map((s) => s.pins.find((p) => p.k === 1)?.scale).filter((v) => v !== undefined)
const distinct = new Set(scalesOf1.map((v) => v.toFixed(4))).size
ok('pin 2 POPS as the walk arrives — its scale passes through many values, not a jump', distinct >= 6, `${distinct} distinct scales over ${samples.length} samples`)
ok('and reaches the full pop, 1.36× rest', Math.abs(Math.max(...scalesOf1) / baseScale - 1.36) < 0.02, `${(Math.max(...scalesOf1) / baseScale).toFixed(3)}`)
const splitSeen = samples.filter((s) => s.arrows.some((a) => a.split))
ok('while travelling, an arrow is SPLIT — an acorn stroke and a quiet stroke on one path, the head at the seam', splitSeen.length > 0, `${splitSeen.length} of ${samples.length} samples`)
ok('and the split arrow\'s head is acorn (it has been reached)', splitSeen.every((s) => s.arrows.filter((a) => a.split).every((a) => a.head === ACORN)))
ok('a pin outside the band comes INTO it as the walk advances', samples.some((s) => s.pins.some((p) => p.k === 3)), `pins seen: ${[...new Set(samples.flatMap((s) => s.pins.map((p) => p.k)))].join(',')}`)

// ── E. a saved walk: the pin's own hover ────────────────────────────────────
// give the map the room: the pin has to be inside the pane to be hovered
for (const inst of ['unfoldgraph', 'document']) {
  await page.getByLabel(`studio-inst-${inst}`).click()
  await page.waitForTimeout(150)
}
await page.getByLabel('studio-inst-trail').click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: /From transistor to running program/ }).click()
await page.waitForTimeout(600)
ok('a SAVED walk keeps the dock (the played prefix is the walk)', (await dock().count()) === 1)
const pin = map.locator('[data-routestop]').first()
const pinBox = await pin.boundingBox()
const mapBox2 = await map.boundingBox()
ok('its first pin is in the pane', !!pinBox && !!mapBox2 && pinBox.y > mapBox2.y && pinBox.y + pinBox.height < mapBox2.y + mapBox2.height, JSON.stringify(pinBox))
await pin.hover()
await page.waitForTimeout(250)
// the card by its own hook, not by its text: the dock's transport row shows the
// current stop's note too (`name · note`), so the note's text is on screen twice
const card = page.locator('[data-stoppreview]')
ok('HOVERING THE PIN shows the stop\'s preview card', (await card.count()) === 1, `${await card.count()} cards; note in dock row: ${await dock().getByText('Before any hardware').count()}`)
const cardBox = await card.first().boundingBox()
ok('the card floats PREVIEW_GAP (12) above the pin', !!cardBox && !!pinBox && Math.abs(pinBox.y - (cardBox.y + cardBox.height) - 12) <= 2, `card bottom ${cardBox && cardBox.y + cardBox.height}, pin top ${pinBox?.y}`)
ok('centred on it', !!cardBox && !!pinBox && Math.abs(cardBox.x + cardBox.width / 2 - (pinBox.x + pinBox.width / 2)) <= 2)
ok('and no MapTooltip beside it — one card at a time', (await page.locator('[data-maptip]').count()) === 0)
await page.mouse.move(mapBox2.x + 4, mapBox2.y + 4)
await page.waitForTimeout(250)
ok('the card goes when the pointer leaves the pin', (await card.count()) === 0)

// ── F. the walk changes under the dock ──────────────────────────────────────
// "stop this walk" nulls bus.activeWalk; the viewer then publishes the desk draft
// again and the map draws it, so the dock follows the walk being played: it stays,
// and its readout is the draft's again (seven stops, the cursor where the clock left
// it). The "no walk at all, no dock" case (an empty route, a bus.teach curriculum)
// has no control on screen to reach it and is the unit test on `routeIsWalk`.
const rSaved = await readout()
await page.getByTitle('stop this walk').click()
await page.waitForTimeout(400)
const rBack = await readout()
ok('stopping the saved walk hands the dock the draft back', !!rSaved && !!rBack && rSaved.n !== rBack.n && rBack.n === r0.n, `${JSON.stringify(rSaved)} -> ${JSON.stringify(rBack)}`)

await browser.close()
vite.kill()

console.log(checks.join('\n'))
if (errors.length) {
  console.error('\nFAILED:\n' + errors.map((e) => '  ' + e).join('\n'))
  process.exit(1)
}
console.log(`\nall ${checks.length} checks passed`)
