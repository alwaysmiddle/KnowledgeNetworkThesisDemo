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
const page = await browser.newPage({ viewport: { width: 1240, height: 640 }, deviceScaleFactor: 2 })
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

await browser.close()
vite.kill()
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1) }
console.log('DONE')
