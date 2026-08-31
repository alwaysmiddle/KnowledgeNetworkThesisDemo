// probe-maplag.mjs — NOT a guard, a MEASUREMENT (#238). Answers "why does the map
// feel laggy" with numbers instead of a code read: what each kind of pointer input
// actually costs, at each zoom level, and how big the thing being re-rendered is.
//
// Scenarios, over comparable pointer paths so the only variable is what the map
// does with the move:
//   idle       — no input at all, same wall time. The floor.
//   over water — moves across a stretch of the pane with no cell under it, so
//                nothing is hovered and no tooltip mounts. The case a gate on the
//                per-move state update REMOVES entirely.
//   over cells — moves along a line that crosses several live cells, tooltip up
//                nearly the whole way. The case a gate CANNOT help, and therefore
//                the one that decides whether gating is enough on its own.
//   pan        — moves with the button down.
//   zoom       — a wheel step, i.e. a 260ms rAF flight that changes `view.s`,
//                which is the only gesture that moves every stroke-width.
//
// Cost is read from CDP Performance metrics rather than wall time, because wall
// time on a dev build in a headless browser is noise. Frame timing is NOT reported
// at all: a headless browser paces rAF at a flat 16.7ms regardless of load, so it
// proves nothing. TaskDuration is the number to read — it is the work, and on a
// real machine the work is what turns into dropped frames.
//
// TWO FIDELITY TRAPS, both of which produced confident wrong numbers in earlier
// cuts of this file, and both of which are now designed out:
//
//  1. THE CAMERA CARRIES BETWEEN SCENARIOS. A pan scenario at L0 leaves the map
//     somewhere else, so the L2 sweep that follows can run entirely over water and
//     report "hovering is free" — it was measuring nothing. Every level therefore
//     starts from a RELOAD and zooms in without panning.
//  2. SUB-PIXEL STEPS ARE NOT EVENTS. Dividing a narrow cell into 61 parts gives
//     steps the browser coalesces away; the scenario then reports a small number
//     because almost no pointermove happened. Steps are a fixed pixel size, and
//     every scenario reports the pointermove count it actually generated, so a
//     silently-empty run is visible in the output instead of looking like a win.
//
// It ends with ONE assertion, and it is a RATIO rather than a wall-clock number:
// moving the cursor with nothing to report must cost a small fraction of moving it
// with the tooltip up. Everything above it is a reading, to be looked at by a
// person; only that ratio is allowed to fail the run.
//
// Spawns vite ITSELF — backgrounded dev servers die on this machine.
// Run:  node tools/studio-spike/probe-maplag.mjs   (exits nonzero if the ratio goes)
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'

const REPO = 'D:/ShiZhong/MyCode/KnowledgeNetworkThesisDemo'
const PORT = 5219
const LEVELS = [0, 2, 4]
const STEPS = 60
const STEP_PX = 6
// Every scenario runs REPS times and reports the MEDIAN, because a single run of
// one of these is worth about +/-20%: an untouched pan scenario moved 614 -> 519ms
// between two runs of code that could not affect it. One number per scenario is
// not enough to tell a real change from that.
const REPS = 5

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

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1750, height: 950 } })
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
const cdp = await page.context().newCDPSession(page)
await cdp.send('Performance.enable')

const metrics = async () => {
  const { metrics: m } = await cdp.send('Performance.getMetrics')
  return Object.fromEntries(m.map((x) => [x.name, x.value]))
}

const box = () =>
  page.evaluate(() => {
    const r = document.querySelector('svg[data-nested]').getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })

const level = () => page.evaluate(() => +document.querySelector('svg[data-nested]').getAttribute('data-level'))

const size = () =>
  page.evaluate(() => {
    const svg = document.querySelector('svg[data-nested]')
    const all = svg.querySelectorAll('*')
    return {
      level: +svg.getAttribute('data-level'),
      els: all.length,
      paths: svg.querySelectorAll('path').length,
      texts: svg.querySelectorAll('text').length,
      // elements whose inline style declares a transition, and the subset a change
      // to `view.s` restarts wholesale, because FADE includes stroke-width
      transitioned: [...all].filter((e) => e.style && e.style.transition).length,
      strokeWidth: [...all].filter((e) => e.style && e.style.transition.includes('stroke-width')).length,
    }
  })

/** the pane's own horizontal midline, sampled: which stretches sit over a live
 *  cell and which over water. Both are needed as SEPARATE scenarios — the whole
 *  question is what each one costs. */
const midlineRuns = () =>
  page.evaluate(() => {
    const svg = document.querySelector('svg[data-nested]')
    const b = svg.getBoundingClientRect()
    const y = b.y + b.height / 2
    const hits = []
    for (let x = b.x + 8; x < b.x + b.width - 8; x += 4) {
      const el = document.elementFromPoint(x, y)
      const live = !!el && (el.hasAttribute('data-terr') || el.hasAttribute('data-region')) && getComputedStyle(el).pointerEvents !== 'none'
      hits.push({ x, live })
    }
    // longest contiguous run of each kind
    const longest = (want) => {
      let best = null
      let run = null
      for (const h of hits) {
        if (h.live === want) run = run ? { a: run.a, b: h.x } : { a: h.x, b: h.x }
        else run = null
        if (run && (!best || run.b - run.a > best.b - best.a)) best = { ...run }
      }
      return best && best.b - best.a >= 40 ? { ...best, y } : null
    }
    return { cells: longest(true), water: longest(false) }
  })

const tipUp = () => page.evaluate(() => !!document.querySelector('[data-maptip]'))

/** a bouncing shuttle of fixed-size steps inside [a, b] at height y — fixed size
 *  because sub-pixel steps get coalesced into no event at all (trap 2 above) */
const shuttle = (run, down) => async () => {
  const span = Math.max(STEP_PX * 2, run.b - run.a)
  if (down) await page.mouse.down()
  await page.evaluate(() => {
    window.__pm = 0
    if (!window.__pmOn) {
      document.querySelector('svg[data-nested]').addEventListener('pointermove', () => window.__pm++, true)
      window.__pmOn = 1
    }
  })
  let up = 0
  for (let i = 0; i <= STEPS; i++) {
    const raw = (i * STEP_PX) % (2 * span)
    await page.mouse.move(run.a + (raw < span ? raw : 2 * span - raw), run.y)
    if (i % 10 === 0 && (await tipUp())) up++
  }
  if (down) await page.mouse.up()
  return { tips: `${up}/7`, moves: await page.evaluate(() => window.__pm) }
}

const median = (xs) => {
  const v = [...xs].sort((a, b) => a - b)
  return v[v.length >> 1]
}

const rows = []
const run = async (lvl, name, body, park) => {
  const takes = []
  let last = {}
  for (let k = 0; k < REPS; k++) {
    if (park) await page.mouse.move(park.x, park.y)
    await page.waitForTimeout(300)
    const a = await metrics()
    last = (await body()) ?? {}
    const z = await metrics()
    takes.push({
      task: +((z.TaskDuration - a.TaskDuration) * 1000).toFixed(0),
      script: +((z.ScriptDuration - a.ScriptDuration) * 1000).toFixed(0),
      recalcs: z.RecalcStyleCount - a.RecalcStyleCount,
      layouts: z.LayoutCount - a.LayoutCount,
    })
  }
  const tasks = takes.map((t) => t.task)
  rows.push({
    level: lvl,
    name,
    task: median(tasks),
    lo: Math.min(...tasks),
    hi: Math.max(...tasks),
    script: median(takes.map((t) => t.script)),
    recalcs: median(takes.map((t) => t.recalcs)),
    layouts: median(takes.map((t) => t.layouts)),
    moves: last.moves ?? '',
    tips: last.tips ?? '',
  })
}

const sizes = []
for (const target of LEVELS) {
  // TRAP 1: every level starts from a clean camera, never from wherever the last
  // level's pan left it
  await page.goto(`http://localhost:${PORT}/`)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForTimeout(700)
  // give the map the whole desk — the opening preset leaves it a quarter of the
  // window, which is not the geometry anyone reports lag against
  for (const inst of ['unfoldgraph', 'document', 'walkviewer']) {
    await page.getByLabel(`studio-inst-${inst}`).click()
    await page.waitForTimeout(150)
  }
  await page.waitForTimeout(800)

  while ((await level()) < target) {
    const b = await box()
    const before = await level()
    await page.mouse.move(b.x + b.w * 0.5, b.y + b.h * 0.5)
    await page.mouse.wheel(0, -60)
    await page.waitForTimeout(700)
    if ((await level()) === before) break
  }

  const s = await size()
  sizes.push(s)
  const { cells, water } = await midlineRuns()

  await run(s.level, 'idle (no input)', () => page.waitForTimeout(1200))
  if (water) await run(s.level, 'moves over WATER (no tooltip)', shuttle(water, false), { x: water.a, y: water.y })
  if (cells) await run(s.level, 'moves over CELLS (tooltip up)', shuttle(cells, false), { x: cells.a, y: cells.y })
  const panRun = cells ?? water
  if (panRun) await run(s.level, 'pan (button down)', shuttle(panRun, true), { x: panRun.a, y: panRun.y })
  if (s.level < 4)
    await run(s.level, 'ZOOM one level (wheel)', async () => {
      const b = await box()
      await page.mouse.move(b.x + b.w * 0.5, b.y + b.h * 0.5)
      await page.mouse.wheel(0, -60)
      await page.waitForTimeout(700)
    })
}

console.log('\n=== WHAT IS ON SCREEN AT EACH LEVEL ===')
console.log('level   els  paths  texts  transitioned  of which stroke-width')
for (const s of sizes)
  console.log(
    String(s.level).padStart(5),
    String(s.els).padStart(5),
    String(s.paths).padStart(6),
    String(s.texts).padStart(6),
    String(s.transitioned).padStart(13),
    String(s.strokeWidth).padStart(22),
  )

console.log('\n=== COST (deltas over each scenario; TaskDuration is the number) ===')
console.log(`median of ${REPS} runs, with the spread, per scenario`)
console.log('lvl  scenario                      task (min-max)      script  recalcs  layouts   moves  tip')
for (const r of rows)
  console.log(
    String(r.level).padStart(3),
    ' ' + r.name.padEnd(30),
    String(r.task + 'ms').padStart(6),
    `(${r.lo}-${r.hi})`.padStart(12),
    String(r.script + 'ms').padStart(8),
    String(r.recalcs).padStart(8),
    String(r.layouts).padStart(8),
    String(r.moves).padStart(7),
    String(r.tips).padStart(5),
  )
console.log('\n`moves` is the pointermove count the SVG actually received — a scenario')
console.log('with far fewer than 61 measured less input, not less cost.')

// ── the one thing here that is an ASSERTION and not a reading ───────────────
// A RATIO, never a wall-clock threshold. Absolute times on this harness swing
// about +/-20% run to run and are meaningless on another machine, but the SHAPE of
// the result is stable and is the whole point of #238's first fix: moving the
// cursor with nothing to report must cost a small fraction of moving it with the
// tooltip up, because in the first case there is nothing to render.
//
// Before the gate the two were the same number (253ms vs 255ms at L0, 356 vs 407
// at L2) — that equality IS the bug, stated as a check. After it they are 13 vs
// 280 and 15 vs 412. The bar is set at a quarter, which no run of either version
// has come close to straddling.
const LIMIT = 0.25
const failures = []
for (const lvl of LEVELS) {
  const water = rows.find((r) => r.level === lvl && r.name.includes('WATER'))
  const cells = rows.find((r) => r.level === lvl && r.name.includes('CELLS'))
  if (!water || !cells || !cells.task) continue
  const ratio = water.task / cells.task
  const ok = ratio < LIMIT
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  L${lvl} idle-hover ratio ${ratio.toFixed(3)} (${water.task}ms over water / ${cells.task}ms over cells), limit ${LIMIT}`,
  )
  if (!ok) failures.push(`L${lvl} ratio ${ratio.toFixed(3)}`)
}
if (errors.length) console.log('\nERRORS:\n' + errors.join('\n'))

await browser.close()
vite.kill()
if (failures.length || errors.length) {
  console.log('\nFAILED: ' + [...failures, ...errors].join('; '))
  process.exit(1)
}
process.exit(0)
