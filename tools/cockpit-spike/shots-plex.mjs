// Follow-up verification for the plex (the radial relationship diagram that
// replaced the flat Jira-style Roads-from-here list). Same pattern as
// shots.mjs: createRequire -> playwright-core, msedge, headless, viewport
// 1750x950, collect pageerror/console errors, exit nonzero on any.
import { createRequire } from 'node:module'
const require = createRequire('D:/ShiZhong/MyCode/KnowledgeNetworkThesisDemo/package.json')
const { chromium } = require('playwright-core')

const OUT = 'D:/ShiZhong/MyCode/KnowledgeNetworkThesisDemo/tools/cockpit-spike/out'
const errors = []

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1750, height: 950 } })
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`)
})

const surfaceText = async (label) => (await page.locator(`[aria-label="${label}"]`).textContent()) ?? ''

await page.goto('http://localhost:3000')
await page.waitForTimeout(600)
await page.getByText('Cockpit —', { exact: false }).click()
await page.waitForTimeout(500)

const plex = page.locator('[aria-label="plex-panel"]')

// ── container case: System (the default root) has no parent (it IS root)
// and no graph edges (edges are leaf-to-leaf only) — the plex should show
// only its 5 domain children plus the "containment only" note.
console.log('CONTAINER PLEX (System, the default root):')
console.log(`  circles: ${await plex.locator('circle').count()}`)
console.log(`  note text: "${((await plex.locator('div').last().textContent()) ?? '').trim()}"`)
await page.screenshot({ path: `${OUT}/plex-container.png` })
console.log('plex-container.png taken')

// ── leaf case: zoom into Ingestion, select Embedding Builder — the same
// named hub the original spike used to demonstrate JUMP.
const ingestionLabel = page.locator('[aria-label="map-panel"] svg text', { hasText: 'Ingestion' }).first()
const ingestionBox = await ingestionLabel.boundingBox()
if (!ingestionBox) throw new Error('could not find the Ingestion label on the map')
await page.mouse.dblclick(ingestionBox.x + ingestionBox.width / 2, ingestionBox.y + ingestionBox.height / 2)
await page.waitForTimeout(400)
await page.getByText('Embedding Builder', { exact: true }).click()
await page.waitForTimeout(300)

console.log('LEAF PLEX (Embedding Builder, a named hub):')
console.log(`  circles: ${await plex.locator('circle').count()} (center + parent + every road, split across up to 4 rings per side)`)
await page.screenshot({ path: `${OUT}/plex-hub.png` })
console.log('plex-hub.png taken')

// ── click a plex ring node directly (not the adjacent list) to prove the
// diagram itself is a real JUMP surface, not decoration. Search Index is a
// confirmed cross-domain neighbor of Embedding Builder from the original
// spike's verified run (tools/cockpit-spike/RESULTS.md).
const breadcrumbBefore = (await surfaceText('breadcrumb')).trim()
const target = plex.locator('circle').filter({ has: page.locator('title', { hasText: 'Search Index' }) })
if ((await target.count()) === 0) throw new Error("Search Index not found among Embedding Builder's plex neighbors — corpus assumption broke")
await target.first().click()
await page.waitForTimeout(400)
const breadcrumbAfter = (await surfaceText('breadcrumb')).trim()
const trailChips = await page.locator('[aria-label="trail-strip"] button[title*="·"]').allTextContents()
console.log('BREADCRUMB BEFORE PLEX CLICK:', breadcrumbBefore)
console.log('BREADCRUMB AFTER PLEX CLICK:', breadcrumbAfter)
console.log('LAST TRAIL CHIP:', JSON.stringify(trailChips.slice(-1)))
console.log(
  breadcrumbAfter !== breadcrumbBefore
    ? 'DIVERGENCE CONFIRMED: plex click JUMPed cross-domain'
    : 'DIVERGENCE NOT OBSERVED: investigate',
)
await page.screenshot({ path: `${OUT}/plex-jump.png` })
console.log('plex-jump.png taken')

await browser.close()
if (errors.length) {
  console.log('ERRORS:\n' + errors.join('\n'))
  process.exit(1)
}
console.log('DONE')
