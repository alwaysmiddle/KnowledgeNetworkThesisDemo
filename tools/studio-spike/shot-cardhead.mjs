// Verification for the DS-head merge on the Railroad's open container card (#91).
// The card's head is now the DS VersionedGroup head — mono outline, display-font
// title wrapping to two lines, an always-visible tally, the DescLine, and the DS
// version picker with its drawn tick and caret.
//
// The head STOPPED being a fixed 72px. headRows() predicts its height from the
// text, layoutRoad reserves that, and the render pass draws each row at the same
// number. That prediction is the only thing that can go wrong, and it fails in
// one visible way: an under-reserved head runs into the steps placed beneath it,
// because those steps are board-level siblings positioned from the reserved
// height, not flowed after the head.
//
// So the assertion is exactly that: NO head rectangle may overlap any node or
// card rectangle other than its own. Everything else about the merge is visual
// and rides in the screenshots.
//
// Same server-owning idiom as shot-nested.mjs beside this file — this process
// starts vite, drives it, and kills it, so nothing is left running.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const REPO = 'D:/ShiZhong/MyCode/KnowledgeNetworkThesisDemo'
const OUT = REPO + '/tools/studio-spike/out'
const PORT = 5203
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
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`)
})
const fail = (msg) => {
  errors.push(`ASSERT FAIL: ${msg}`)
  console.log('FAIL:', msg)
}

await page.goto(`http://localhost:${PORT}/`)
await page.waitForTimeout(600)
await page.locator('[aria-label="studio-preset-plan"]').click()
await page.waitForTimeout(500)

if (!(await page.locator('[data-railroad]').isVisible())) fail('railroad not visible under Plan')
await page.screenshot({ path: `${OUT}/cardhead-01-board.png` })
console.log('cardhead-01-board.png taken (the whole road, DS heads throughout)')

// one card, close up — this is the shot to compare against the DS mock
const card = page.locator('[data-rstage="seed-sec"]')
await card.screenshot({ path: `${OUT}/cardhead-02-card.png` })
console.log('cardhead-02-card.png taken (the "Secure the channel" fork alone)')

// ── the reservation assertion ──────────────────────────────────────────────
// The open card is the DS VersionedGroup in bodySlot mode; its head runs from
// the card's top to the bottom of its picker (the DS's role="button" row), and
// the road's floating steps must all land BELOW that — in the slot the component
// left for them, where GroupGeometry.openHeight said it would be.
const overlaps = await page.evaluate(() => {
  const rects = (sel) => [...document.querySelectorAll(sel)].map((el) => ({ el, r: el.getBoundingClientRect() }))
  const cards = [...document.querySelectorAll('[data-rstage]')]
  const boxes = rects('[data-rnode], [data-rstage], [data-rstage-closed]')
  const hit = []
  for (const c of cards) {
    const picker = c.querySelector('[role="button"]')
    if (!picker) { hit.push(`${c.getAttribute('data-rstage')} has no DS picker — is it hosting the component?`); continue }
    const cr = c.getBoundingClientRect(), pr = picker.getBoundingClientRect()
    const head = { left: cr.left, right: cr.right, top: cr.top, bottom: pr.bottom }
    for (const b of boxes) {
      if (b.el === c) continue
      // only the card's OWN steps matter — board-level siblings that sit inside
      // its box (a card contains no other node in the DOM)
      const inside = b.r.left >= cr.left - 1 && b.r.right <= cr.right + 1 && b.r.top >= cr.top - 1 && b.r.bottom <= cr.bottom + 1
      const over =
        head.left < b.r.right - 1 && b.r.left < head.right - 1 &&
        head.top < b.r.bottom - 1 && b.r.top < head.bottom - 1
      if (over && inside) hit.push(`${c.getAttribute('data-rstage')} head overlaps ${b.el.getAttribute('data-rnode') || b.el.getAttribute('data-rstage') || b.el.getAttribute('data-rstage-closed')}`)
    }
  }
  return hit
})
console.log(`head/step overlaps = ${overlaps.length} (expect 0)`)
if (overlaps.length) fail(`the head reservation is wrong:\n  ${overlaps.join('\n  ')}`)

// -- every stop sits on ONE axis --------------------------------------------
// The road is a vertical spine: the arrows are drawn on the column axis, so a stop
// centred anywhere else puts a visible jog in it. This caught the open card being
// anchored to its own COLUMN instead of the axis -- the card then slid sideways by
// half its widest step, so two cards of the same width stood 16.5px apart. Steps
// inside a card ride the same axis, so they are measured with everything else.
const axes = await page.evaluate(() => {
  const road = document.querySelector('[data-rstage]')?.offsetParent
  const at = (el) => {
    const r = el.getBoundingClientRect()
    return {
      name: el.getAttribute('data-rstage') || el.getAttribute('data-rstage-closed') || el.getAttribute('data-rnode'),
      c: r.left + r.width / 2,
    }
  }
  return [...(road?.querySelectorAll('[data-rnode], [data-rstage], [data-rstage-closed]') || [])].map(
    (el, i) => ({ ...at(el), name: at(el).name === 'true' ? `node#${i}` : at(el).name }),
  )
})
const spread = axes.length ? Math.max(...axes.map((a) => a.c)) - Math.min(...axes.map((a) => a.c)) : -1
console.log(`stops on the axis = ${axes.length}, centre spread = ${spread.toFixed(2)}px (expect 0)`)
if (axes.length < 6) fail(`only ${axes.length} stops found — the axis check is not looking at the road`)
if (spread > 0.5) fail(`the road has more than one axis: ${axes.map((a) => `${a.name}@${a.c.toFixed(1)}`).join(', ')}`)

// ── the picker still drops its menu, now from the whole row ────────────────
// the DS menu portals to the body and paints over every card. The picker's
// centre is the version NAME, which opens its rename field (as in the DS); the
// menu opens from the rest of the row — click by the caret at its right end.
const pickerBox = await page.locator('[data-rstage="seed-sec"] [role="button"]').boundingBox()
await page.locator('[data-rstage="seed-sec"] [role="button"]').click({ position: { x: pickerBox.width - 10, y: pickerBox.height / 2 } })
await page.waitForTimeout(250)
if (!(await page.locator('[role="listbox"]').isVisible())) fail('clicking the picker row did not open the version menu')
const menuRows = await page.locator('[role="listbox"] [role="option"]').count()
if (menuRows !== 2) fail(`expected the two versions of seed-sec in the menu, got ${menuRows}`)
await page.screenshot({ path: `${OUT}/cardhead-03-picker-open.png` })
console.log('cardhead-03-picker-open.png taken (fork picker open, caret rotated)')

await page.keyboard.press('Escape')
await page.locator('[data-railroad]').click({ position: { x: 8, y: 200 } })
await page.waitForTimeout(200)

// ── the tally reads off the active version ─────────────────────────────────
const tally = await page.locator('[data-rstage="seed-net"] span[title$="inside this version"]').innerText()
// "nodes", not "steps": the DS counts nodes and the road adopted the word (#100)
console.log('seed-net tally =', JSON.stringify(tally), '(expect "2 nodes")')
if (!/^2 nodes$/.test(tally.trim())) fail(`expected "2 nodes" on the seed-net card, got ${JSON.stringify(tally)}`)

// ── hover shows the description placeholder in the reserved row ────────────
await page.locator('[data-rstage="seed-net"]').hover({ position: { x: 60, y: 12 } })
await page.waitForTimeout(250)
await page.screenshot({ path: `${OUT}/cardhead-04-hover.png` })
console.log('cardhead-04-hover.png taken (DescLine placeholder + controls on hover)')

// ── the CLOSED card — the folded drawing, in context (#91) ─────────────────
// The open card's head is settled; the closed card is the open question. A road
// stop that is a folded CONTAINER has to read as "several stops, put away" and
// not as one leaf pill, and the only place that can be judged is here, among
// the leaves it sits between. These shots are the evidence on #91 for whether
// the DS's own folded drawing can replace this one.
await page.locator('[data-rstage="seed-sec"]').hover({ position: { x: 60, y: 12 } })
await page.waitForTimeout(150)
await page.locator('[data-rstage="seed-sec"] [aria-label="minimize"]').click()
await page.waitForTimeout(400)
const shut = page.locator('[data-rstage-closed="seed-sec"]')
if (!(await shut.isVisible())) fail('minimise did not produce a closed pill for seed-sec')
await page.screenshot({ path: `${OUT}/cardhead-05-closed-board.png` })
console.log('cardhead-05-closed-board.png taken (seed-sec folded, among the leaf stops)')

// the fold and its two peek plates, cropped — the plates are siblings of the
// pill, not children, so the clip is taken off the board with a margin
const pillBox = await shut.boundingBox()
await page.screenshot({
  path: `${OUT}/cardhead-06-closed-crop.png`,
  clip: { x: pillBox.x - 42, y: pillBox.y - 34, width: pillBox.width + 84, height: pillBox.height + 68 },
})
console.log('cardhead-06-closed-crop.png taken (the fold close up — the hosted DS card)')

// ── the reservation, which is the whole risk of hosting the component ──────
// Since #91 the closed card IS the DS VersionedGroup, folded. layoutRoad still
// places it before it renders, so foldSize() has to predict its height — and an
// under-reservation is the one failure that matters, because the steps below a
// fold are board-level siblings positioned from the reserved number, not flowed
// after it. Reserved must be >= rendered, and close enough that the slack is not
// a visible gap.
const reservation = await page.evaluate(() => {
  const card = document.querySelector('[data-rstage-closed="seed-sec"]')
  if (!card) return null
  const group = card.firstElementChild
  return {
    reserved: Math.round(parseFloat(card.style.height) * 100) / 100,
    rendered: group ? Math.round(group.getBoundingClientRect().height * 100) / 100 : null,
    width: Math.round(card.getBoundingClientRect().width),
    hostsComponent: !!(group && group.querySelector('[data-grab]')),
  }
})
console.log('closed-card reservation =', JSON.stringify(reservation))
if (!reservation || !reservation.hostsComponent) fail('the closed card is not hosting the DS VersionedGroup')
else if (reservation.rendered > reservation.reserved) fail(`foldSize() UNDER-reserved: reserved ${reservation.reserved}px, the folded card rendered ${reservation.rendered}px — the steps below it will be overlapped`)
else if (reservation.reserved - reservation.rendered > 2) fail(`foldSize() over-reserved by ${(reservation.reserved - reservation.rendered).toFixed(2)}px — a visible gap under the fold`)

// The fold's own plate — the DS's single well-tinted silhouette, which replaced
// the road's two peek plates when the component was hosted (#91).
//
// The road's plates carried `pointer-events: none` because they were BOARD-LEVEL
// SIBLINGS of the pill: an event landing on one would never bubble to the card,
// so the peeking corner really could swallow the double-click. The DS's plate is
// a CHILD of the card, so bubbling covers it and the guard is unnecessary — do
// not assert pointer-events here, assert the thing the guard was protecting.
const plate = await page.evaluate(() => {
  const card = document.querySelector('[data-rstage-closed="seed-sec"]')
  const shell = card && card.firstElementChild
  if (!shell) return null
  const hidden = [...shell.children].filter((el) => el.getAttribute('aria-hidden') === 'true')
  return { count: hidden.length }
})
console.log('fold plate =', JSON.stringify(plate), '(expect count 1)')
if (!plate || plate.count !== 1) fail(`expected the DS's single well-tinted plate behind the fold, got ${plate && plate.count}`)

// the peeking corner still reopens the card — the real guarantee, tested where
// it actually bites: the bottom-right strip, which is plate and not face
const shutBox = await shut.boundingBox()
await page.mouse.dblclick(shutBox.x + shutBox.width - 3, shutBox.y + shutBox.height - 3)
await page.waitForTimeout(400)
if (!(await page.locator('[data-rstage="seed-sec"]').isVisible())) fail('double-clicking the plate corner did not reopen the card — the peek is swallowing the gesture')
else console.log('the plate corner reopens the card (bubbling covers it — it is a child, not a sibling)')
// the DS's controls recede until the head is hovered (pointer-events off) and the
// reopened card is a NEW shell — leave and re-enter it, or no pointerenter fires
await page.mouse.move(5, 5)
await page.waitForTimeout(100)
await page.locator('[data-rstage="seed-sec"]').hover({ position: { x: 60, y: 12 } })
await page.waitForTimeout(150)
await page.locator('[data-rstage="seed-sec"] [aria-label="minimize"]').click()
await page.waitForTimeout(400)

// the tally is what now carries the plural reading the two peek plates used to
// (#100): a fold must say how much is inside it
const shutTally = await page.locator('[data-rstage-closed="seed-sec"]').innerText()
console.log('closed card text =', JSON.stringify(shutTally))
if (!/\d+\s+nodes?/.test(shutTally)) fail(`the fold does not state its own contents — expected an "N nodes" tally, got ${JSON.stringify(shutTally)}`)

// double-click the pill reopens it — the gesture the plates must not block
await shut.dblclick()
await page.waitForTimeout(400)
if (!(await page.locator('[data-rstage="seed-sec"]').isVisible())) fail('double-clicking the closed pill did not reopen the card')
console.log('closed pill reopens on double-click')

await browser.close()
vite.kill()
if (errors.length) {
  console.log('ERRORS:\n' + errors.join('\n'))
  process.exit(1)
}
console.log('DONE — all assertions passed')
