// browsertest-groupedit.mjs — OB-110 (#256): a group card's WHOLE-CARD edit mode.
//
// A TEST. It opens the real walk editor in a real browser, makes a group, and works the
// five clauses of the item on the card the road draws:
//   (5) a freshly-made group opens straight into edit mode, the title holding the caret;
//   (3) a mousedown outside the card COMMITS what was typed and closes edit mode;
//   (1) clicking a line at rest opens nothing — only the pencil opens the three together;
//   (4) Escape reverts all three to their last-committed values;
//   (2) committing an empty title clears it, and at rest an empty title draws nothing;
//   (5b) adding a version puts the card back into edit mode.
// Every reading is off the DOM: how many `contenteditable` lines the card holds, which one
// has the focus, and what the card's text reads after each gesture.
//
// The outside click is dispatched as a real `mousedown` on the document body rather than
// aimed at a blank patch of the road — the listener under test is a document-level
// mousedown, and a blank patch is not something the seed road promises to have.
//
// Spawns vite ITSELF — backgrounded dev servers die on this machine.
// Run from anywhere:  node tools/studio-spike/browsertest-groupedit.mjs
// Exits nonzero on any failed check or any page error.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'

const REPO = 'D:/ShiZhong/MyCode/KnowledgeNetworkThesisDemo'
const PORT = 5238

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

try {
  await page.goto(`http://localhost:${PORT}/`)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForTimeout(700)
  await page.getByLabel('studio-preset-plan').click()
  await page.waitForTimeout(600)

  const road = () => page.locator('[data-road-root]')
  const chip = (node) => road().locator(`[data-rnode][data-node="${node}"]`)
  const newCards = () => road().locator('[data-rstage^="draft-"]')
  const groupButton = () => page.getByTitle('group the selected steps')
  const card = () => newCards().first()
  const open = () => card().locator('[contenteditable="true"]')
  const openCount = () => open().count()
  const focusedIs = (n) => open().nth(n).evaluate((el) => el === document.activeElement)
  const text = () => card().innerText()
  const outsideMousedown = () => page.evaluate(() => document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })))
  // the card's CENTRE is under a step chip (the road floats the version's steps over the
  // body slot as board-level siblings), so presence is woken on the head row instead
  const wakeHead = async () => {
    const b = await card().boundingBox()
    await page.mouse.move(b.x + 30, b.y + 10)
    await page.waitForTimeout(250)
  }
  const pencil = async () => {
    await wakeHead()
    await card().getByLabel('edit', { exact: true }).click()
    await page.waitForTimeout(250)
  }

  ok('the walk editor is on the desk', (await road().count()) === 1)
  await chip('web-sockets-apis').click({ modifiers: ['Control'] })
  await chip('app-authentication-authorization').click({ modifiers: ['Control'] })
  await page.waitForTimeout(200)
  await groupButton().click()
  await page.waitForTimeout(700)
  ok('Group made one new card', (await newCards().count()) === 1)

  // (5) a fresh group opens straight into edit mode
  ok('clause 5: the fresh card opens with its three lines editable', (await openCount()) === 3, `${await openCount()} open`)
  ok('and the TITLE holds the caret, not the other two', await focusedIs(0) && !(await focusedIs(1)) && !(await focusedIs(2)))
  ok('the pencil reads "done editing" while open', (await card().getByLabel('done editing', { exact: true }).count()) === 1)

  // (3) an outside mousedown commits, then closes
  await page.keyboard.type('Alpha stage')
  await outsideMousedown()
  await page.waitForTimeout(300)
  ok('clause 3: an outside mousedown closes edit mode', (await openCount()) === 0, `${await openCount()} still open`)
  ok('and what was typed is COMMITTED, not reverted', (await text()).includes('Alpha stage'), (await text()).replace(/\n/g, ' | '))

  // (1) a click on the words opens nothing
  await card().getByText('Alpha stage').click()
  await page.waitForTimeout(250)
  ok('clause 1: clicking the title at rest opens nothing', (await openCount()) === 0)
  await pencil()
  ok('the pencil opens all three lines together', (await openCount()) === 3, `${await openCount()} open`)
  ok('with the caret on the title again', await focusedIs(0))

  // (4) Escape reverts every line
  await open().nth(1).click()
  await page.keyboard.type('scratch words')
  ok('typing into the description lands there', (await text()).includes('scratch words'))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  ok('clause 4: Escape closes edit mode', (await openCount()) === 0)
  ok('and the description reverted', !(await text()).includes('scratch words'))
  ok('while the committed title stands', (await text()).includes('Alpha stage'))

  // (2) an empty commit clears the title; at rest an empty title draws nothing
  await pencil()
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(250)
  ok('Enter commits without leaving edit mode', (await openCount()) === 3)
  ok('the emptied title shows its invitation while open', (await text()).includes('name this stage'))
  await outsideMousedown()
  await page.waitForTimeout(300)
  const rest = await text()
  ok('clause 2: an empty commit CLEARED the title', !rest.includes('Alpha stage'), rest.replace(/\n/g, ' | '))
  ok('and at rest an empty title draws nothing — not the invitation either', !rest.includes('name this stage'))

  // (5b) adding a version re-enters edit mode
  await wakeHead()
  await card().locator('[role="button"]').first().click()
  await page.waitForTimeout(250)
  await page.getByText('add new version').click()
  await page.waitForTimeout(400)
  ok('clause 5b: adding a version puts the card into edit mode', (await openCount()) === 3, `${await openCount()} open`)
  await open().nth(2).click()
  await page.keyboard.type('Second take')
  await outsideMousedown()
  await page.waitForTimeout(300)
  ok('and the new version can be named at once', (await text()).includes('Second take'), (await text()).replace(/\n/g, ' | '))
  ok('no page errors', errors.filter((e) => e.startsWith('pageerror')).length === 0)
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
