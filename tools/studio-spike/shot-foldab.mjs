// Shoots the #91 fold A/B page (foldab/) and reports each fold's real box.
//
// The gate on #91 is whether the DS's folded drawing can replace the road's, and
// that has two halves: does it still READ as a container (the screenshot), and
// can layoutRoad reserve it (the numbers). This driver produces both, and it owns
// its own vite so nothing is left running.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const REPO = 'D:/ShiZhong/MyCode/KnowledgeNetworkThesisDemo'
const OUT = REPO + '/tools/studio-spike/out'
const PORT = 5204
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
    if (viteOut.includes('localhost:')) { clearTimeout(t); res() }
  }
  vite.stdout.on('data', watch)
  vite.stderr.on('data', watch)
  vite.on('exit', (c) => rej(new Error('vite exited early ' + c + ':\n' + viteOut)))
})

const errors = []
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1480, height: 900 }, deviceScaleFactor: 2 })
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })

await page.goto(`http://localhost:${PORT}/tools/studio-spike/foldab/index.html`)
await page.waitForTimeout(900)

await page.screenshot({ path: `${OUT}/foldab-01-all.png`, fullPage: true })
console.log('foldab-01-all.png taken (three folds, same content, on the road well)')

for (const name of ['road', 'ds-natural', 'ds-pillwidth', 'ds-narrow']) {
  await page.locator(`[data-case="${name}"]`).screenshot({ path: `${OUT}/foldab-02-${name}.png` })
  console.log(`foldab-02-${name}.png taken`)
}

// the numbers layoutRoad would have to reserve for each drawing
const boxes = await page.evaluate(() => {
  const out = {}
  for (const name of ['road', 'ds-natural', 'ds-pillwidth', 'ds-narrow']) {
    const well = document.querySelector(`[data-case="${name}"]`)
    // the fold is the middle child of the well (leaf, arrow, FOLD, arrow, leaf)
    const fold = well.children[2]
    const r = fold.getBoundingClientRect()
    out[name] = { w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }
  }
  return out
})
console.log('fold boxes (what layoutRoad would reserve):', JSON.stringify(boxes))
console.log('  road pill is 150x34 + a 6px peek margin — the baseline every leaf shares')

// ── calibration for the road's foldSize() ──────────────────────────────────
// What layoutRoad has to predict, over a spread of title lengths at the road's
// own width. `lines` is what the title's clamp actually resolved to, read off
// the rendered box rather than assumed, so the fit is against reality.
const cal = await page.evaluate(() => {
  return [...document.querySelectorAll('[data-cal]')].map((el) => {
    const shell = el.firstElementChild
    const face = shell.querySelector('[data-grab]')
    const title = el.querySelector('span[title]')
    const cs = title ? getComputedStyle(title) : null
    const lh = cs ? parseFloat(cs.lineHeight) : 0
    return {
      title: el.getAttribute('data-cal-title'),
      chars: el.getAttribute('data-cal-title').length,
      h: Math.round(el.getBoundingClientRect().height * 100) / 100,
      faceH: face ? Math.round(face.getBoundingClientRect().height * 100) / 100 : null,
      titleH: title ? Math.round(title.getBoundingClientRect().height * 100) / 100 : null,
      lineH: Math.round(lh * 100) / 100,
      lines: title && lh ? Math.round(title.getBoundingClientRect().height / lh) : null,
      // the room the title's WRAPPER gets in the row (its floor is 96) — what
      // FOLD_TITLE_W has to name; and the face + shell widths, which the DS's own
      // content-box regime (data-ds-host) puts at 190 / 196
      titleW: title ? Math.round(title.parentElement.getBoundingClientRect().width * 100) / 100 : null,
      faceW: face ? Math.round(face.getBoundingClientRect().width * 100) / 100 : null,
      shellW: Math.round(shell.getBoundingClientRect().width * 100) / 100,
      predH: Number(el.getAttribute('data-pred-h')), predW: Number(el.getAttribute('data-pred-w')),
    }
  })
})
// the OPEN head's rows, from the DS component itself — what headRows() predicts
// for the road-drawn GroupHead. Row 1 is the head row (index/title/tally), row 2
// the DescLine block, row 3 the picker; y is each row's top from the face's top.
const openCal = await page.evaluate(() => {
  return [...document.querySelectorAll('[data-cal-open]')].map((el) => {
    const shell = el.firstElementChild
    const face = shell.querySelector('[data-grab]')
    const fb = face.getBoundingClientRect()
    const rows = [...face.children].filter((c) => c.tagName === 'DIV')
    const r = (x) => { const b = x.getBoundingClientRect(); return { y: Math.round((b.y - fb.y) * 100) / 100, h: Math.round(b.height * 100) / 100 } }
    const title = face.querySelector('span[title]')
    const desc = face.querySelector('[data-grab] > div:nth-child(2) span')
    const picker = face.querySelector('[role="button"]')
    const sb = shell.getBoundingClientRect()
    return {
      k: el.getAttribute('data-cal-open'), faceW: Math.round(fb.width * 100) / 100, faceH: Math.round(fb.height * 100) / 100,
      shellH: Math.round(sb.height * 100) / 100,
      rows: rows.map(r), titleH: title ? Math.round(title.getBoundingClientRect().height * 100) / 100 : null,
      descTextH: desc ? Math.round(desc.getBoundingClientRect().height * 100) / 100 : null,
      pickerH: picker ? Math.round(picker.getBoundingClientRect().height * 100) / 100 : null,
      predH: Number(el.getAttribute('data-pred-h')), predBodyTop: Number(el.getAttribute('data-pred-bodytop')),
      measured: el.getAttribute('data-pred-measured'), slot: el.getAttribute('data-slot'),
    }
  })
})
console.log('\nGroupGeometry.openHeight vs the DS group OPEN with bodySlot @ width ' + (openCal[0] && openCal[0].faceW) + ' (text ' + (openCal[0] && openCal[0].measured === 'true' ? 'measured' : 'ESTIMATED') + '):')
let geomBad = 0
for (const c of openCal) {
  const slotTop = c.slot ? Number(c.slot.split(',')[1]) : null
  // the slot's CONTENT begins under its own 6px padding — bodyTop names that line
  const dH = Math.round((c.predH - c.shellH) * 100) / 100
  const dTop = slotTop === null ? null : Math.round((c.predBodyTop - (slotTop + 6)) * 100) / 100
  const ok = Math.abs(dH) <= 0.5 && (dTop === null || Math.abs(dTop) <= 1)
  if (!ok) geomBad++
  console.log(`  ${c.k.padEnd(9)} shell=${c.shellH} predicted=${c.predH} (${dH >= 0 ? '+' : ''}${dH})  slot=[${c.slot}] bodyTop=${c.predBodyTop} (${dTop === null ? '—' : (dTop >= 0 ? '+' : '') + dTop})  rows=${JSON.stringify(c.rows.slice(0, 3))} ${ok ? 'ok' : 'DRIFT'}`)
}

console.log('\nfoldSize() calibration @ width 150, narrow, folded:')
for (const c of cal) {
  const dH = Math.round((c.predH - c.h) * 100) / 100
  const ok = Math.abs(dH) <= 0.5 && c.predW === c.shellW
  if (!ok) geomBad++
  console.log(`  ${String(c.chars).padStart(3)}ch  lines=${c.lines}  titleH=${c.titleH}  faceH=${c.faceH}  TOTAL=${c.h}  foldedSize=${c.predW}x${c.predH} (${dH >= 0 ? '+' : ''}${dH})  titleW=${c.titleW} face=${c.faceW} shell=${c.shellW} ${ok ? 'ok' : 'DRIFT'}   "${c.title}"`)
}
const byLines = new Map()
for (const c of cal) if (!byLines.has(c.lines)) byLines.set(c.lines, c.h)
console.log('  height by title lines:', JSON.stringify([...byLines.entries()].sort((a, b) => a[0] - b[0])))

await browser.close()
vite.kill()
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1) }
if (geomBad) { console.log(`GEOMETRY DRIFT: ${geomBad} case(s) where GroupGeometry disagrees with the rendered card`); process.exit(1) }
console.log('DONE — GroupGeometry agrees with the rendered card in every case')
