// Verification for the Walk Editor Toolbox (#54): the floating tray of four
// authoring actions that mounts on the railroad under the Plan preset
// (src/instruments/walkdesk/WalkToolbox.tsx, mounted in RailroadView.tsx).
//
// Same idiom as shots.mjs beside this file — own the vite lifecycle (backgrounded
// dev servers die on this machine), msedge headless, collect pageerror/console
// errors, exit nonzero on any. What this driver provokes:
//   1. MOUNT — switch to the Plan preset; the railroad pane appears and the
//      toolbox (a FloatingPanel, role=dialog aria-label="Toolbox") rides on it
//      with exactly four buttons carrying their alt-tag titles.
//   2. ADD A NODE — clicking "add a node" inserts one fresh slot on the road
//      (a [data-node] under [data-road-root]); the leaf count goes up by one.
//   3. NEW WALK — clicking "new walk" resets the draft to a single empty slot;
//      the road drops to exactly one [data-node]. Undoable (not asserted here).
// The panel's own behaviours — drag / resize / auto-hide / persist — are #76's,
// verified by tools/floating-panel-spike/drive.mjs; this driver only proves the
// tray is wired, reachable, and its always-on ops mutate the draft.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const REPO = 'D:/ShiZhong/MyCode/KnowledgeNetworkThesisDemo'
const OUT = REPO + '/tools/studio-spike/out'
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

// ── 1. Plan preset → railroad + toolbox mount ──────────────────────────────
await page.locator('[aria-label="studio-preset-plan"]').click()
await page.waitForTimeout(500)

const railroad = page.locator('[data-railroad]')
if (!(await railroad.isVisible())) fail('railroad pane not visible under the Plan preset')

// the toolbox rides ON the road; wake it (auto-hide fades on idle) by moving the
// pointer over the road before we look, so it is opaque and interactive.
const roadBox = await page.locator('[data-road-root]').boundingBox()
if (roadBox) await page.mouse.move(roadBox.x + roadBox.width / 2, roadBox.y + roadBox.height / 2)
await page.waitForTimeout(150)

const toolbox = page.locator('[role="dialog"][aria-label="Toolbox"]')
if (!(await toolbox.isVisible())) fail('toolbox panel not visible on the road')

const buttons = toolbox.locator('button')
const btnCount = await buttons.count()
console.log('toolbox buttons =', btnCount, '(expect 4)')
if (btnCount !== 4) fail(`expected 4 toolbox buttons, got ${btnCount}`)

const titles = await buttons.evaluateAll((els) => els.map((e) => e.getAttribute('title') || ''))
console.log('toolbox button titles =', JSON.stringify(titles))
for (const need of ['new walk', 'add a node', 'group', 'optional']) {
  if (!titles.some((t) => t.includes(need))) fail(`no toolbox button whose title mentions "${need}"`)
}
await page.screenshot({ path: `${OUT}/toolbox-plan.png` })
console.log('toolbox-plan.png taken')

// ── 2. add a node → one more slot on the road ──────────────────────────────
const roadLeaves = () => page.locator('[data-road-root] [data-node]').count()
const before = await roadLeaves()
// title-based click (glyph-only buttons carry meaning in the title)
await toolbox.getByTitle(/add a node/).click()
await page.waitForTimeout(250)
const afterAdd = await roadLeaves()
console.log('road [data-node]: before =', before, '· after add-node =', afterAdd, '(expect +1)')
if (afterAdd !== before + 1) fail(`expected leaf count ${before + 1} after add-node, got ${afterAdd}`)

// ── 3. new walk → draft resets to a single empty slot ──────────────────────
await toolbox.getByTitle(/new walk/).click()
await page.waitForTimeout(250)
const afterNew = await roadLeaves()
console.log('road [data-node] after new-walk =', afterNew, '(expect 1 — one empty slot)')
if (afterNew !== 1) fail(`expected exactly 1 leaf after new-walk, got ${afterNew}`)

await browser.close()
vite.kill()
if (errors.length) {
  console.log('ERRORS:\n' + errors.join('\n'))
  process.exit(1)
}
console.log('DONE — all assertions passed')
