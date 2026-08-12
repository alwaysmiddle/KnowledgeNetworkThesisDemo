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
const overlaps = await page.evaluate(() => {
  const rects = (sel) => [...document.querySelectorAll(sel)].map((el) => ({ el, r: el.getBoundingClientRect() }))
  const heads = rects('[data-rhead]')
  const boxes = rects('[data-rnode], [data-rstage], [data-rstage-closed]')
  const hit = []
  for (const h of heads) {
    for (const b of boxes) {
      if (b.el.contains(h.el) || h.el.contains(b.el)) continue // its own card, or its own controls
      const over =
        h.r.left < b.r.right - 1 && b.r.left < h.r.right - 1 &&
        h.r.top < b.r.bottom - 1 && b.r.top < h.r.bottom - 1
      if (over) hit.push(`${h.el.getAttribute('data-rhead')} head overlaps ${b.el.getAttribute('data-rnode') || b.el.getAttribute('data-rstage') || b.el.getAttribute('data-rstage-closed')}`)
    }
  }
  return hit
})
console.log(`head/step overlaps = ${overlaps.length} (expect 0)`)
if (overlaps.length) fail(`the head estimate under-reserved:\n  ${overlaps.join('\n  ')}`)

// ── the picker still drops its menu, now from the whole row ────────────────
await page.locator('[data-varrow="seed-sec"]').click()
await page.waitForTimeout(250)
if (!(await page.locator('[data-vmenu="seed-sec"]').isVisible())) fail('clicking the picker row did not open the version menu')
const expanded = await page.locator('[data-vcombo="seed-sec"]').getAttribute('aria-expanded')
if (expanded !== 'true') fail(`expected aria-expanded=true on the open picker, got ${expanded}`)
await page.screenshot({ path: `${OUT}/cardhead-03-picker-open.png` })
console.log('cardhead-03-picker-open.png taken (fork picker open, caret rotated)')

await page.keyboard.press('Escape')
await page.locator('[data-railroad]').click({ position: { x: 8, y: 200 } })
await page.waitForTimeout(200)

// ── the tally reads off the active version ─────────────────────────────────
const tally = await page.locator('[data-rtally="seed-net"]').innerText()
console.log('seed-net tally =', JSON.stringify(tally), '(expect "2 steps")')
if (!/^2 steps$/.test(tally.trim())) fail(`expected "2 steps" on the seed-net card, got ${JSON.stringify(tally)}`)

// ── hover shows the description placeholder in the reserved row ────────────
await page.locator('[data-rstage="seed-net"]').hover({ position: { x: 60, y: 12 } })
await page.waitForTimeout(250)
await page.screenshot({ path: `${OUT}/cardhead-04-hover.png` })
console.log('cardhead-04-hover.png taken (DescLine placeholder + controls on hover)')

await browser.close()
vite.kill()
if (errors.length) {
  console.log('ERRORS:\n' + errors.join('\n'))
  process.exit(1)
}
console.log('DONE — all assertions passed')
