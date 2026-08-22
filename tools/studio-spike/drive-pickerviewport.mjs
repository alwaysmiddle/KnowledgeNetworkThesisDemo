// Does the new version's node picker open somewhere you can actually reach?
//
// NodePicker anchors its menu at `rect.bottom + 4`, unconditionally — no
// viewport-edge flip, in the port AND in the DS source. VersionedGroup's own
// version menu DOES flip up at the edge. So a picker sitting low in the pane
// should open a menu that runs off the bottom of the window.
//
// This drives the case: take the LAST group card on the road (the lowest one),
// add a version to it, open the picker, and measure the menu against the
// viewport instead of trusting that it looked fine higher up.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const REPO = 'D:/ShiZhong/MyCode/KnowledgeNetworkThesisDemo'
const OUT = REPO + '/tools/studio-spike/shots'
const PORT = 5205
mkdirSync(OUT, { recursive: true })

const require = createRequire(REPO + '/package.json')
const { chromium } = require('playwright-core')

const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'], {
  cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'],
})
let viteOut = ''
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('vite did not become ready:\n' + viteOut)), 30000)
  const watch = (d) => { viteOut += String(d); if (viteOut.includes('localhost:')) { clearTimeout(t); res() } }
  vite.stdout.on('data', watch); vite.stderr.on('data', watch)
  vite.on('exit', (c) => rej(new Error('vite exited early ' + c + ':\n' + viteOut)))
})

const VIEW = { width: 1750, height: 950 }
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: VIEW })
const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })

await page.goto(`http://localhost:${PORT}/`)
await page.evaluate(() => localStorage.clear())
await page.reload()
await page.waitForTimeout(700)
await page.locator('[aria-label="studio-preset-plan"]').click()
await page.waitForTimeout(600)

// take the LAST group card — the lowest on the road
const cards = page.locator('[data-road-root] [data-rstage]')
const n = await cards.count()
console.log('group cards =', n)
const card = cards.nth(n - 1)
await card.scrollIntoViewIfNeeded()
await page.waitForTimeout(300)

const row = card.locator('[role="button"]').filter({ hasText: /v\d/ }).first()
const rb = await row.boundingBox()
console.log('version row at y =', Math.round(rb.y), '(viewport height', VIEW.height + ')')
await page.mouse.click(rb.x + 6, rb.y + rb.height / 2)
await page.waitForTimeout(400)

const addRow = page.getByText(/add new version/i).first()
if (!(await addRow.count())) {
  console.log('!! add-version row not found')
} else {
  await addRow.click()
  await page.waitForTimeout(700)

  const pk = page.locator('[data-rpicknode]').first()
  await pk.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const trigger = pk.locator('button').first()
  const tb = await trigger.boundingBox()
  console.log('picker trigger box =', JSON.stringify(tb))
  await trigger.click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/pickerviewport-01.png` })

  // the menu is the fixed-position div holding the search field
  const menuBox = await page.evaluate(() => {
    const input = document.querySelector('input[placeholder="search nodes"]')
    if (!input) return null
    let el = input
    while (el && getComputedStyle(el).position !== 'fixed') el = el.parentElement
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height }
  })
  console.log('menu box =', JSON.stringify(menuBox))
  if (!menuBox) {
    console.log('!! menu did not open at all')
  } else {
    const overflow = Math.round(menuBox.bottom - VIEW.height)
    console.log(`menu bottom = ${Math.round(menuBox.bottom)} · viewport = ${VIEW.height} · overflow = ${overflow}px`)
    if (overflow > 0) {
      console.log(`!! THE MENU RUNS ${overflow}px OFF THE BOTTOM OF THE WINDOW — that is the bug`)
    } else {
      console.log('menu fits in the viewport here')
    }

    // how many rows can you actually click?
    const rows = await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="search nodes"]')
      if (!input) return null
      let el = input
      while (el && getComputedStyle(el).position !== 'fixed') el = el.parentElement
      const items = [...el.querySelectorAll('div')].filter((d) => d.onclick || d.textContent && d.children.length === 2)
      const vh = window.innerHeight
      let reachable = 0
      for (const it of items) { const r = it.getBoundingClientRect(); if (r.height && r.bottom <= vh && r.top >= 0) reachable++ }
      return { total: items.length, reachable }
    })
    console.log('menu rows =', JSON.stringify(rows))
  }
}

console.log('\npage errors:', errors.length ? errors.join('\n') : '(none)')
await browser.close()
vite.kill()
