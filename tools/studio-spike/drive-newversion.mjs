// Repro: "I can't pick a node when I create a new version."
//
// Walks the real gesture — open a group card's version menu, click its add-version
// row, then try to bind a node in the fresh version's empty slot — and reports what
// is actually in the DOM at each step rather than asserting a guess.
//
// Run:  node tools/studio-spike/drive-newversion.mjs
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const REPO = 'D:/ShiZhong/MyCode/KnowledgeNetworkThesisDemo'
const OUT = REPO + '/tools/studio-spike/shots'
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
const page = await browser.newPage({ viewport: { width: 1750, height: 950 } })
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })

await page.goto(`http://localhost:${PORT}/`)
await page.evaluate(() => localStorage.clear())
await page.reload()
await page.waitForTimeout(700)
await page.locator('[aria-label="studio-preset-plan"]').click()
await page.waitForTimeout(600)

const pickers = () => page.locator('[data-rpicknode]').count()
const nodes = () => page.locator('[data-road-root] [data-node]').count()

console.log('=== before ===')
console.log('road nodes =', await nodes(), '· pickers on the road =', await pickers())

// The version menu lives on a group card's picker row. Find the first group card
// and open it, then click the add-version row by its visible word.
const cards = page.locator('[data-road-root] [data-rstage]')
console.log('group cards =', await cards.count())

// the picker row is the control that opens the version list — click the first
// card's version name area
const firstCard = cards.first()
await firstCard.scrollIntoViewIfNeeded()
const cardText = (await firstCard.textContent()) || ''
console.log('first card text =', JSON.stringify(cardText.slice(0, 120)))

// open the version menu. The row is role="button" and its onClick is guarded by
// `if (!editing)`; the version NAME inside it is an InlineText whose own onOpen
// starts a rename instead. So click the row's LEFT EDGE (the check glyph), which
// is the row itself and not the editable span.
const versionRow = firstCard.locator('[role="button"]').filter({ hasText: /v\d/ }).first()
const vrCount = await versionRow.count()
console.log('version-row candidates =', vrCount)
if (vrCount === 0) {
  console.log('!! could not find the version row — dumping the card buttons')
  const btns = await firstCard.locator('button').evaluateAll((els) =>
    els.map((e) => ({ text: (e.textContent || '').trim().slice(0, 40), title: e.getAttribute('title') })))
  console.log(JSON.stringify(btns, null, 2))
} else {
  const rowBox = await versionRow.boundingBox()
  await page.mouse.click(rowBox.x + 6, rowBox.y + rowBox.height / 2)
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/newversion-01-menu.png` })

  // the menu portals to body — look for the add row anywhere on the page
  const addRow = page.getByText(/new version|add version|\+ *version/i).first()
  const addCount = await addRow.count()
  console.log('add-version row found =', addCount)
  if (addCount === 0) {
    const all = await page.locator('body *').evaluateAll((els) =>
      els.filter((e) => e.children.length === 0 && /version/i.test(e.textContent || ''))
        .map((e) => (e.textContent || '').trim()).slice(0, 20))
    console.log('elements mentioning "version":', JSON.stringify(all, null, 2))
  } else {
    await addRow.click()
    await page.waitForTimeout(600)
    console.log('=== after add-version ===')
    console.log('road nodes =', await nodes(), '· pickers on the road =', await pickers())
    await page.screenshot({ path: `${OUT}/newversion-02-added.png` })

    // now try to actually pick
    const pk = page.locator('[data-rpicknode]').first()
    if ((await pk.count()) === 0) {
      console.log('!! NO PICKER RENDERED for the new empty version — this is the bug')
    } else {
      const box = await pk.boundingBox()
      console.log('picker box =', JSON.stringify(box))
      console.log('picker visible =', await pk.isVisible())

      // click the picker's OWN button, not the wrapper div around it
      const trigger = pk.locator('button').first()
      console.log('trigger buttons inside the picker =', await trigger.count())
      await trigger.click()
      await page.waitForTimeout(600)
      await page.screenshot({ path: `${OUT}/newversion-03-picker-open.png` })

      // NodePicker's menu is a plain div with no role — its search field is the
      // unambiguous tell that it opened (AuthorRoad passes `search`)
      const searchField = page.locator('input[placeholder="search nodes"]')
      const opened = await searchField.count()
      console.log('menu open (search field present) =', opened)
      if (!opened) {
        console.log('!! THE MENU DID NOT OPEN — this is the bug')
      } else {
        // NodePicker's rows are DIVs (MenuItem), not buttons — scope every count to
        // the fixed-position menu itself rather than guessing at a tag
        const menuRows = () =>
          page.evaluate(() => {
            const input = document.querySelector('input[placeholder="search nodes"]')
            if (!input) return []
            let el = input
            while (el && getComputedStyle(el).position !== 'fixed') el = el.parentElement
            if (!el) return []
            return [...el.querySelectorAll('div')]
              .filter((d) => d.children.length === 2 && d.textContent.trim())
              .map((d) => d.textContent.trim())
          })
        const rows = await menuRows()
        console.log('menu option rows =', rows.length, '· first three =', JSON.stringify(rows.slice(0, 3)))

        const before = await pickers()
        await page.locator('input[placeholder="search nodes"]').fill('TCP')
        await page.waitForTimeout(350)
        await page.screenshot({ path: `${OUT}/newversion-04-filtered.png` })
        const filtered = await menuRows()
        console.log('filtered rows for "TCP" =', JSON.stringify(filtered))
        if (filtered.length) {
          // click the row by its text, inside the menu
          await page.evaluate(() => {
            const input = document.querySelector('input[placeholder="search nodes"]')
            let el = input
            while (el && getComputedStyle(el).position !== 'fixed') el = el.parentElement
            const row = [...el.querySelectorAll('div')].find((d) => d.children.length === 2 && d.textContent.trim())
            row?.click()
          })
          await page.waitForTimeout(450)
          console.log('pickers before pick =', before, '· after =', await pickers())
          console.log('road nodes after pick =', await nodes(), '(the slot became a real node)')
          await page.screenshot({ path: `${OUT}/newversion-05-bound.png` })
        }
      }
    }
  }
}

console.log('\n=== page errors ===')
console.log(errors.length ? errors.join('\n') : '(none)')

await browser.close()
vite.kill()
