// Walk-tiers spike driver, round 7 — ONE combined desk: palette | railroad |
// columns on a single shared draft. The chain must prove the round's core
// claim: the railroad may fork and rejoin, but everything right of it —
// columns, fringe strip — always reads ONE resolved linear walk. Steps:
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

await page.goto(`http://localhost:${PORT}/?spike=walk-tiers`)
await page.waitForTimeout(700)

// ── the desk at first paint ─────────────────────────────────────────────────
// seed: [dns, seed-net[ip, tcp], seed-sec⑂{[tls] | [pkc, sym, hash, tls]},
//        http, ws◇, auth] — branch 0 chosen, optionals on the road
if ((await count('[data-cand="S"]')) !== 1) errors.push(`S: the combined desk should render, got ${await count('[data-cand="S"]')}`)
if ((await count('[data-rnode]')) !== 11) errors.push(`S: 11 visit nodes across road+lanes, got ${await count('[data-rnode]')}`)
if ((await count('[data-fork]')) !== 1) errors.push(`S: one fork diamond, got ${await count('[data-fork]')}`)
if ((await count('[data-brpick]')) !== 2) errors.push(`S: two branch chips, got ${await count('[data-brpick]')}`)
if ((await count('[data-rail]')) !== 6) errors.push(`S: 2 branches × (fan-out+connector+fan-in) = 6 rails, got ${await count('[data-rail]')}`)
if ((await count('[data-rbypass]')) !== 1) errors.push(`S: ws is optional — one bypass rail, got ${await count('[data-rbypass]')}`)
if ((await count('[data-rarrow]')) !== 9) errors.push(`S: 5+1+0+3 sibling arrows = 9, got ${await count('[data-rarrow]')}`)
if ((await count('[data-rord]')) !== 7) errors.push(`S: 7 stops wear badges on the default road, got ${await count('[data-rord]')}`)
const firstOrd = await page.locator('[data-rnode] [data-rord]').first().getAttribute('data-rord')
if (firstOrd !== '1') errors.push(`S: the first road visit should wear badge 1, got ${firstOrd}`)
if ((await fringeCount()) !== '7') errors.push(`S: default resolved route is 7 visits, got ${await fringeCount()}`)
if ((await count('[data-vbox]')) !== 6) errors.push(`S: columns tier 0 shows 6 resolved boxes, got ${await count('[data-vbox]')}`)
await shot('s7-default')

// ── picking the other branch re-projects EVERYTHING right of the railroad ───
await click('[data-brpick="seed-sec.1"]')
if ((await fringeCount()) !== '10') errors.push(`S: the crypto tour makes the route 10, got ${await fringeCount()}`)
if ((await count('[data-rord]')) !== 10) errors.push(`S: 10 badges on the crypto road, got ${await count('[data-rord]')}`)
if ((await count('[data-vbox]')) !== 9) errors.push(`S: columns re-resolve to 9 tier-0 boxes, got ${await count('[data-vbox]')}`)
if ((await count('[data-rnode]')) !== 11) errors.push(`S: picking a branch must not edit the draft (11 nodes), got ${await count('[data-rnode]')}`)
await shot('s7-branchB')

// ── bypassing optionals: the road goes AROUND the dashed node ───────────────
await click('[data-opt-toggle]')
if ((await fringeCount()) !== '9') errors.push(`S: bypassing ws drops the route to 9, got ${await fringeCount()}`)
if ((await count('[data-rord]')) !== 9) errors.push(`S: the bypassed stop loses its badge (9 left), got ${await count('[data-rord]')}`)
if ((await count('[data-vbox]')) !== 8) errors.push(`S: columns drop the bypassed stop (8 boxes), got ${await count('[data-vbox]')}`)
await shot('s7-bypass')
await click('[data-opt-toggle]')
if ((await fringeCount()) !== '10') errors.push(`S: optionals back on the road — 10 again, got ${await fringeCount()}`)

// ── forking a selection through the contextual tools ────────────────────────
await click('[data-rnode][data-node="web-http-rest"]')
if ((await count('[data-fly]')) !== 1) errors.push(`S: clicking a road node should float the tools beside it, got ${await count('[data-fly]')}`)
await click('[data-rnode][data-node="web-sockets-apis"]')
await click('[data-fly-fork]')
if ((await count('[data-fork]')) !== 2) errors.push(`S: forking the selection makes a 2nd diamond, got ${await count('[data-fork]')}`)
if ((await count('[data-brdrop]')) !== 1) errors.push(`S: the new fork opens one EMPTY lane, got ${await count('[data-brdrop]')}`)
if ((await count('[data-fly]')) !== 0) errors.push(`S: the floating tools retire once the selection clears, got ${await count('[data-fly]')}`)
if ((await fringeCount()) !== '10') errors.push(`S: the selection became the main branch — route unchanged (10), got ${await fringeCount()}`)

// ── a palette drop lands INSIDE the empty branch lane ───────────────────────
await dnd('[data-pal="auto-continuous-integration"]', '[data-brdrop="fork-0.1"]')
if ((await count('[data-rnode]')) !== 12) errors.push(`S: the drop should land in the lane (12 nodes), got ${await count('[data-rnode]')}`)
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

// ── the columns still drill the resolved road ───────────────────────────────
await click('[data-vpick="seed-net"]')
if ((await count('[data-vcol]')) !== 2) errors.push(`S: drilling seed-net opens a 2nd column, got ${await count('[data-vcol]')}`)
if ((await count('[data-vedge]')) !== 1) errors.push(`S: one open column = one begat-edge, got ${await count('[data-vedge]')}`)
await shot('s7-desk-final')

// ── hover lights the doc pane from the road — no private tooltips ───────────
await page.locator('[data-road-root] [data-node="stk-ip-routing"]').first().hover()
await page.waitForTimeout(250)
const doc = await page.locator('[data-doc]').getAttribute('data-doc')
if (doc !== 'stk-ip-routing') errors.push(`S: hovering stk-ip-routing shows doc pane "${doc}"`)

// ── the palette search narrows the pick list ────────────────────────────────
const palAll = await count('[data-pal]')
await page.locator('[data-pal-search]').fill('tls')
await page.waitForTimeout(200)
const palTls = await count('[data-pal]')
if (!(palTls > 0 && palTls < palAll)) errors.push(`S: search 'tls' should narrow the palette (${palAll} -> ${palTls})`)

await browser.close()
vite.kill()

if (errors.length) {
  console.error('walk-tiers spike FAILED:')
  for (const e of errors) console.error('  x ' + e)
  process.exit(1)
}
console.log('walk-tiers spike ok — frames in tools/walk-tiers-spike/out/')
