// browsertest-presenter.mjs — #267 (DS OB-135..138): presenter mode, parts 1–4, on the real app.
//
// A TEST. It works the mode's rules as the DS filed them, in a real browser with a REAL second
// window: the palette's Present is a preview (chip "Preview stop N", no clock, ■ disabled, nothing
// projected); the toolbar ▶ starts the lecture (the chrome goes, the clock starts at 00:00, the
// projector window opens and shows the live slide); the roll's neighbour advances the record and
// the projector follows; the strip's tick only ROAMS (chip "Roaming stop N", the record unchanged),
// the finder's ↵ roams too, the hold ring makes the roamed stop active; ■ → confirm ends the
// lecture (chrome back, chip "Lecture ended", projector dark); the ▶ then reads "resume" and
// resumes; the palette's Present after an end returns to the preview.
//
// The projector is a second page in the same browser context, caught off the `page` event the
// ▶ click raises — headless Edge opens it like any popup, so what the room would see is asserted
// off its DOM rather than printed as an environment truth.
//
// Spawns vite ITSELF — backgrounded dev servers die on this machine.
// Run from anywhere:  node tools/studio-spike/browsertest-presenter.mjs
// Exits nonzero on any failed check or any page error.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'

const REPO = 'D:/ShiZhong/MyCode/KnowledgeNetworkThesisDemo'
const PORT = 5240

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
const context = await browser.newContext({ viewport: { width: 1750, height: 950 } })
const page = await context.newPage()
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

try {
  await page.goto(`http://localhost:${PORT}/`)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForTimeout(800)

  const playBtn = () => page.locator('[data-toolbar-hook="present"]')
  const chip = () => page.locator('[data-presenter-chip]')
  const chipText = async () => (await chip().innerText()).replace(/\s+/g, ' ').trim()
  const strip = () => page.locator('[data-presenter-strip]')
  // picking a preset closes the palette (OB-106); reopen it from the toolbar before the next pick
  const openPalette = async () => {
    if ((await page.locator('[aria-label="studio-sidebar"]').count()) === 0) {
      await page.locator('[data-toolbar-hook="palette-toggle"]').click()
      await page.waitForTimeout(500)
    }
  }

  // ── the palette's Present is a PREVIEW ──────────────────────────────────────
  await page.getByLabel('studio-preset-present').click()
  await page.waitForTimeout(700)
  ok('the Present preset opens the presenter as a preview, framed beside the chrome', (await page.locator('[aria-label="studio-presenter"]').count()) === 1 && (await page.locator('[aria-label="studio-header"]').count()) === 1)
  ok('the chip reads "Preview stop N"', /^Preview stop \d+$/.test(await chipText()), await chipText())
  ok('no clock is drawn anywhere on the screen', (await page.locator('[data-presenter-clock]').count()) === 0)
  ok('■ is disabled in the preview', await page.locator('[aria-label="end lecture"]').isDisabled())
  ok('the roll\'s live card reads "Not on the projector"', (await page.locator('[data-filmroll-label]').filter({ hasText: /Not on the projector/i }).count()) === 1)
  ok('the toolbar ▶ is pressable during the preview and reads "present"', !(await playBtn().isDisabled()) && (await playBtn().getAttribute('title')) === 'present')

  // ── ▶ turns the preview into the lecture, and projects ──────────────────────
  const [projector] = await Promise.all([
    context.waitForEvent('page', { timeout: 8000 }).catch(() => null),
    playBtn().click(),
  ])
  // THE PRESENTER'S WINDOW COMES BACK TO THE FRONT. Opening the projector focuses it, and a
  // background window gets no animation frames from Chromium — the hold ring's clock and the
  // walk's own clock both run on them. A professor's window is the one they are working in;
  // this puts the test's window in the same position (and the finding is in the receipt).
  await page.bringToFront()
  await page.waitForTimeout(900)
  ok('▶ opened a second window — the projector', !!projector, projector ? projector.url() : 'no page event')
  ok('a live lecture hides the app chrome: no header, no toolbar, no palette', (await page.locator('[aria-label="studio-header"]').count()) === 0 && (await page.locator('[aria-label="studio-sidebar"]').count()) === 0)
  ok('the chip reads "Presenting stop N"', /^Presenting stop \d+$/.test(await chipText()), await chipText())
  ok('the clock starts at 00:0x of 50:00', /00:0\d\s*of 50:00/.test((await page.locator('[data-presenter-clock]').innerText()).replace(/\s+/g, ' ')), (await page.locator('[data-presenter-clock]').innerText()).replace(/\s+/g, ' '))
  ok('the roll\'s live card reads "On the projector now" with a running time', (await page.locator('[data-filmroll-label]').filter({ hasText: /On the projector now/i }).count()) === 1 && (await page.locator('[data-filmroll-elapsed]').count()) === 1)
  ok('the toolbar is gone, so the ▶ is not on screen', (await playBtn().count()) === 0)
  const liveTitle = async () => (await page.locator('[data-filmroll-card="live"] [data-slide-title]').innerText()).trim()
  const t1 = await liveTitle()
  if (projector) {
    projector.on('pageerror', (e) => errors.push('projector pageerror: ' + e.message))
    await projector.waitForSelector('[data-projector="live"]', { timeout: 8000 }).catch(() => null)
    ok('the projector shows the live slide — the same title the roll\'s live card shows', (await projector.locator('[data-slide-title]').count()) === 1 && (await projector.locator('[data-slide-title]').innerText()).trim() === t1, `roll "${t1}"`)
  }

  // ── the roll's next card advances the record; the projector follows ──────────
  await page.locator('[data-filmroll-card="neighbour"]').last().click()
  await page.waitForTimeout(600)
  const t2 = await liveTitle()
  ok('clicking the next card moves the record to the next stop', t2 !== t1 && /^Presenting stop \d+$/.test(await chipText()), `${t1} → ${t2} · ${await chipText()}`)
  if (projector) {
    await projector.waitForTimeout(300)
    ok('and the projector follows', (await projector.locator('[data-slide-title]').innerText()).trim() === t2)
  }
  const activeAfterStep = (await chipText()).match(/\d+/)[0]

  // ── a tick on the strip only ROAMS ───────────────────────────────────────────
  await page.locator('[data-presenter-tick="0"]').click()
  await page.waitForTimeout(400)
  ok('a click on a tick roams: the chip reads "Roaming stop 1"', (await chipText()) === 'Roaming stop 1', await chipText())
  ok('and the active node is unchanged: the pill still counts it', (await page.locator('[data-presenter-pill]').innerText()).startsWith(activeAfterStep + ' /'), await page.locator('[data-presenter-pill]').innerText())
  ok('the strip grew for the roaming labels (81, not 64)', Math.round((await strip().boundingBox()).height) === 81, String((await strip().boundingBox()).height))
  if (projector) {
    await projector.waitForTimeout(300)
    ok('the projector shows the ROAMED stop — the room follows where the professor looks', (await projector.locator('[data-slide-title]').innerText()).trim() !== t2)
  }
  await page.keyboard.press('Backspace')
  await page.waitForTimeout(300)
  ok('Backspace ends the roam', /^Presenting stop/.test(await chipText()), await chipText())

  // ── the finder: J opens, typing a number selects, ↵ roams there ───────────────
  await page.keyboard.press('j')
  await page.waitForTimeout(400)
  ok('J opens the finder under the magnifier', (await page.locator('[data-stop-finder]').count()) === 1)
  await page.keyboard.type('3')
  await page.waitForTimeout(200)
  ok('typing "3" selects stop 3', (await page.locator('[data-stop-finder-row="2"][aria-selected="true"]').count()) === 1)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  ok('↵ roams there and closes the finder: chip "Roaming stop 3", active unchanged', (await chipText()) === 'Roaming stop 3' && (await page.locator('[data-stop-finder]').count()) === 0, await chipText())

  // ── the hold ring is the one gesture that makes a roamed stop active ─────────
  const ring = page.locator('[data-hold-ring]')
  ok('the roaming stop carries the hold ring', (await ring.count()) === 1)
  const rb = await ring.boundingBox()
  await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(900)
  await page.mouse.up()
  await page.waitForTimeout(300)
  ok('holding the ring makes stop 3 the active node', (await chipText()) === 'Presenting stop 3', await chipText())
  ok('the strip fell back to its closed height (64)', Math.round((await strip().boundingBox()).height) === 64, String((await strip().boundingBox()).height))

  // ── ■ → confirm ends the lecture; the chrome comes back ───────────────────────
  await page.locator('[aria-label="end lecture"]').click()
  await page.waitForTimeout(200)
  ok('■ asks first', (await page.locator('[role="dialog"][aria-label="end this lecture"]').count()) === 1)
  await page.getByRole('button', { name: 'end lecture' }).last().click()
  await page.waitForTimeout(700)
  ok('ending brings the app chrome back', (await page.locator('[aria-label="studio-header"]').count()) === 1 && (await playBtn().count()) === 1)
  ok('the chip reads "Lecture ended <total>"', /^Lecture ended \d\d:\d\d total$/.test(await chipText()), await chipText())
  ok('the toolbar ▶ reads "resume" and is pressable', (await playBtn().getAttribute('title')) === 'resume' && !(await playBtn().isDisabled()))
  if (projector) {
    await projector.waitForTimeout(300)
    ok('the projector went dark', (await projector.locator('[data-projector="dark"]').count()) === 1)
  }

  // ── ▶ resumes; the palette's Present after an end returns to the preview ─────
  await playBtn().click()
  await page.bringToFront()
  await page.waitForTimeout(700)
  ok('▶ resumes: the lecture is live again, chrome gone, chip "Presenting stop 3"', (await page.locator('[aria-label="studio-header"]').count()) === 0 && (await chipText()) === 'Presenting stop 3', await chipText())
  await page.locator('[aria-label="end lecture"]').click()
  await page.getByRole('button', { name: 'end lecture' }).last().click()
  await page.waitForTimeout(600)
  await openPalette()
  await page.getByLabel('studio-preset-present').click()
  await page.waitForTimeout(600)
  ok('the palette\'s Present after an end returns to the PREVIEW', /^Preview stop \d+$/.test(await chipText()) && (await page.locator('[data-presenter-clock]').count()) === 0, await chipText())
  await openPalette()
  await page.getByLabel('studio-preset-explore').click()
  await page.waitForTimeout(600)
  ok('picking a composition preset leaves the presenter', (await page.locator('[data-presenter-header]').count()) === 0 && (await page.locator('[aria-label="studio-pane-map"]').count()) === 1)
  ok('no page errors', errors.filter((e) => e.includes('pageerror')).length === 0)
} catch (e) {
  errors.push('exception: ' + (e && e.stack || e))
}

await page.evaluate(() => localStorage.clear()).catch(() => {})
await browser.close()
vite.kill()

console.log(checks.join('\n'))
if (errors.length) {
  console.error('\n' + errors.length + ' failure(s):\n' + errors.join('\n'))
  process.exit(1)
}
console.log(`\n${checks.length} checks passed`)
