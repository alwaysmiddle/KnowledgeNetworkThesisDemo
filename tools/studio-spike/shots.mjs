// Verification for the Studio tab (src/experiments/StudioView.tsx,
// LensPane.tsx, lens.ts), the instrument-palette mock: every current view is
// a pickable INSTRUMENT sharing one sync bus (focus / route / visited), and a
// PRESET is a curated instrument list + layout. Same pattern as the other
// spikes: createRequire -> playwright-core, msedge, headless, viewport
// 1750x950, collect pageerror/console errors, exit nonzero on any. The
// behaviors worth provoking:
//   1. SIDEBAR PALETTE — all 11 instruments + 2 presets listed, Coding is the
//      default composition (tree + three lenses, 4 panes on).
//   2/3. FOCUS BUS — picking a tree leaf writes focus; every lens pane reads
//      it and recenters; clicking a chip INSIDE a lens writes focus back,
//      recentering all three lenses at once (not just the one clicked in).
//   4. DEPTH is local per-pane state, not bus state — toggling it changes
//      only that lens's cone and exposes frontier counts at the cap.
//   5. MANUAL TOGGLING after a preset de-highlights it ("custom
//      composition") and composes side-by-side panes for comparison.
//   6/7/8. TEACHING PRESET — map + unfold-graph + document + walk strip,
//      lenses benched (not unmounted). Growing the unfold graph paints
//      visited rings on the map and drives the document pane; "teach me
//      this" runs lens.ts's curriculum over the focused leaf's depends_on
//      cone and drops it onto the shared route, ending AT the goal.
//   9. ROUNDTRIP — switching preset only changes which panes are ON; a
//      benched instrument (kept mounted, display:none) keeps its own state,
//      so switching Teaching -> Coding -> Teaching must not lose the grown
//      unfold graph or the route.
import { createRequire } from 'node:module'
const require = createRequire('D:/ShiZhong/MyCode/KnowledgeNetworkThesisDemo/package.json')
const { chromium } = require('playwright-core')

const OUT = 'D:/ShiZhong/MyCode/KnowledgeNetworkThesisDemo/tools/studio-spike/out'
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

const LENS_TYPES = ['depends_on', 'references', 'data_flow']
const focusReadout = page.locator('[data-focus]')

await page.goto('http://localhost:3000')
await page.waitForTimeout(600)

// ── 1. enter Studio — sidebar palette, default Coding composition ─────────
await page.getByRole('button', { name: /instrument palette/ }).click()
await page.waitForTimeout(300)

const sidebar = page.locator('[aria-label="studio-sidebar"]')
if (!(await sidebar.isVisible())) fail('sidebar not visible')

const instCount = await page.locator('[aria-label^="studio-inst-"]').count()
console.log('sidebar instruments =', instCount, '(expect 11)')
if (instCount !== 11) fail(`expected 11 instrument entries, got ${instCount}`)

const presetCount = await page.locator('[aria-label^="studio-preset-"]').count()
console.log('sidebar presets =', presetCount, '(expect 2)')
if (presetCount !== 2) fail(`expected 2 preset buttons, got ${presetCount}`)

let onPanes = await page.locator('[data-slot="on"]').count()
console.log('coding preset default: panes on =', onPanes, '(expect 4 — tree + 3 lenses)')
if (onPanes !== 4) fail(`expected 4 panes on by default, got ${onPanes}`)

await page.screenshot({ path: `${OUT}/01-coding-empty.png` })
console.log('01-coding-empty.png taken')

// ── 2. tree: expand Enrichment, click the Embedding Builder leaf ──────────
const treePane = page.locator('[aria-label="studio-pane-tree"]')
// Ingestion is expanded by default (depth-2 from ROOT); Enrichment is one
// level deeper and starts collapsed.
const enrichmentToggle = treePane.getByText('Enrichment', { exact: true }).locator('..').locator('button').first()
await enrichmentToggle.click()
await page.waitForTimeout(200)
await treePane.getByText('Embedding Builder', { exact: true }).click()
await page.waitForTimeout(300)

const focusVal = await focusReadout.getAttribute('data-focus')
console.log('focus after leaf click =', focusVal, '(expect enr-embedding-builder)')
if (focusVal !== 'enr-embedding-builder') fail(`expected focus enr-embedding-builder, got ${focusVal}`)

for (const t of LENS_TYPES) {
  const header = page.locator(`[data-lens="${t}"] header`)
  const text = await header.innerText()
  if (!text.includes('Embedding Builder')) fail(`lens ${t} header does not show focus title: "${text.replace(/\s+/g, ' ')}"`)
  const nodeCount = await page.locator(`[data-lens="${t}"] [data-lens-node]`).count()
  console.log(`lens ${t}: header ok, data-lens-node count = ${nodeCount}`)
  if (t === 'depends_on' && nodeCount === 0) fail(`deps pane has zero data-lens-node chips`)
}
await page.screenshot({ path: `${OUT}/02-coding-focused.png` })
console.log('02-coding-focused.png taken')

// ── 3. click a chip in the depends_on lens → all three recenter ───────────
const depsChip = page.locator('[data-lens="depends_on"] [data-lens-node]').first()
const clickedId = await depsChip.getAttribute('data-lens-node')
await depsChip.click()
await page.waitForTimeout(300)

const focusVal2 = await focusReadout.getAttribute('data-focus')
console.log('clicked chip id =', clickedId, '· new focus =', focusVal2)
if (focusVal2 !== clickedId) fail(`expected focus to become clicked chip id ${clickedId}, got ${focusVal2}`)

const newTitle = (await focusReadout.innerText()).trim()
console.log('new focus title =', JSON.stringify(newTitle))
for (const t of LENS_TYPES) {
  const header = page.locator(`[data-lens="${t}"] header`)
  const text = await header.innerText()
  if (!text.includes(newTitle)) fail(`lens ${t} header does not show new focus title "${newTitle}": "${text.replace(/\s+/g, ' ')}"`)
}
const visitedAfterRecenter = parseInt(await page.locator('[aria-label="studio-visited"]').innerText(), 10)
console.log('studio-visited after recenter =', visitedAfterRecenter, '(expect >= 2)')
if (!(visitedAfterRecenter >= 2)) fail(`expected studio-visited >= 2, got ${visitedAfterRecenter}`)
await page.screenshot({ path: `${OUT}/03-coding-recentered.png` })
console.log('03-coding-recentered.png taken')

// ── 4. depth toggle in the deps pane: 1 then 2 → chip count changes ───────
const depsPane = page.locator('[data-lens="depends_on"]')
const depthCountBefore = await depsPane.locator('[data-lens-node]').count()
await depsPane.getByRole('button', { name: '1', exact: true }).click()
await page.waitForTimeout(200)
const depthCount1 = await depsPane.locator('[data-lens-node]').count()
console.log('deps chip count: depth 2 (default) =', depthCountBefore, '· depth 1 =', depthCount1, '(expect different)')
if (depthCount1 === depthCountBefore) fail(`expected chip count to change between depth 2 and depth 1, both ${depthCount1}`)

await depsPane.getByRole('button', { name: '2', exact: true }).click()
await page.waitForTimeout(200)
const depthCount2 = await depsPane.locator('[data-lens-node]').count()
const frontierBadges = await depsPane.locator('text=/⤳ \\d+/').count()
console.log('deps chip count back at depth 2 =', depthCount2, '· frontier badges (⤳ n) =', frontierBadges, '(expect >= 1)')
if (frontierBadges === 0) fail('expected at least one frontier badge (⤳ n) at depth 2, found none')

// ── 5. sidebar compare: toggle Map on, then Contours on ────────────────────
await page.locator('[aria-label="studio-inst-map"]').click()
await page.waitForTimeout(300)
onPanes = await page.locator('[data-slot="on"]').count()
console.log('after enabling map: panes on =', onPanes, '(expect 5)')
if (onPanes !== 5) fail(`expected 5 panes on after enabling map, got ${onPanes}`)

await page.locator('[aria-label="studio-inst-contours"]').click()
await page.waitForTimeout(300)
onPanes = await page.locator('[data-slot="on"]').count()
console.log('after enabling contours: panes on =', onPanes, '(expect 6)')
if (onPanes !== 6) fail(`expected 6 panes on after enabling contours, got ${onPanes}`)

const captionText = await sidebar.innerText()
if (!captionText.includes('custom composition')) fail('sidebar does not show "custom composition" after manual toggling')
await page.screenshot({ path: `${OUT}/05-custom-compare.png` })
console.log('05-custom-compare.png taken')

// ── 6. apply teaching preset ────────────────────────────────────────────────
await page.locator('[aria-label="studio-preset-teaching"]').click()
await page.waitForTimeout(400)

const slotOf = async (inst) => (await page.locator(`[aria-label="studio-pane-${inst}"]`).getAttribute('data-slot')) === 'on'
const mapOn = await slotOf('map')
const unfoldgOn = await slotOf('unfoldg')
const docOn = await slotOf('doc')
const walkOn = await slotOf('walk')
const depsOn = await slotOf('lens-depends_on')
const refsOn = await slotOf('lens-references')
const dataflowOn = await slotOf('lens-data_flow')
console.log(
  'teaching preset: map=', mapOn, 'unfoldg=', unfoldgOn, 'doc=', docOn, 'walk=', walkOn,
  '(all expect true) · lenses on=', depsOn, refsOn, dataflowOn, '(all expect false/benched)',
)
if (!(mapOn && unfoldgOn && docOn && walkOn)) fail('teaching preset did not activate map/unfoldg/doc/walk')
if (depsOn || refsOn || dataflowOn) fail('teaching preset left a lens pane active (should be benched)')

const walkStripVisible = await page.locator('[aria-label="studio-pane-walk"]').isVisible()
console.log('walk strip visible =', walkStripVisible)
if (!walkStripVisible) fail('walk strip not visible under teaching preset')
await page.screenshot({ path: `${OUT}/06-teaching-empty.png` })
console.log('06-teaching-empty.png taken')

// ── 7. unfold from the hub picker, grow 2 fresh nodes ──────────────────────
const unfoldPane = page.locator('[aria-label="studio-pane-unfoldg"]')
const mapPane = page.locator('[aria-label="studio-pane-map"]')
const docPane = page.locator('[aria-label="studio-pane-doc"]')

await unfoldPane.getByRole('button', { name: /Embedding Builder/ }).first().click()
await page.waitForTimeout(400)

for (let i = 0; i < 2; i++) {
  const fresh = unfoldPane.locator('button[data-onmap="false"]')
  if ((await fresh.count()) === 0) {
    fail(`unfold: no fresh (data-onmap=false) candidate available at growth step ${i + 1}`)
    break
  }
  await fresh.first().click()
  await page.waitForTimeout(500)
}

const lastOpenedTitle = (await focusReadout.innerText()).trim()
console.log('after growing 2 nodes: focus title =', JSON.stringify(lastOpenedTitle))

const docTitle = await docPane.locator('.text-\\[15px\\].font-bold').first().innerText().catch(() => null)
console.log('doc pane title =', JSON.stringify(docTitle))
if (!docTitle || !docTitle.includes(lastOpenedTitle)) fail(`doc pane title "${docTitle}" does not match last-opened focus title "${lastOpenedTitle}"`)

const visitedAfterGrow = parseInt(await page.locator('[aria-label="studio-visited"]').innerText(), 10)
console.log('studio-visited =', visitedAfterGrow, '(expect >= 3)')
if (!(visitedAfterGrow >= 3)) fail(`expected studio-visited >= 3, got ${visitedAfterGrow}`)

const visitedRings = await mapPane.locator('circle[data-visited]').count()
console.log('map circle[data-visited] count =', visitedRings, '(expect >= 3)')
if (!(visitedRings >= 3)) fail(`expected >= 3 circle[data-visited] on map, got ${visitedRings}`)

const unfoldNodeCountAtScenario7 = await unfoldPane.locator('circle[data-node]').count()
console.log('unfold pane circle[data-node] count =', unfoldNodeCountAtScenario7, '(captured for roundtrip check in 9)')

await page.screenshot({ path: `${OUT}/07-teaching-unfold.png` })
console.log('07-teaching-unfold.png taken')

// ── 8. teach me this ────────────────────────────────────────────────────────
const teachBtn = page.locator('[aria-label="studio-teach"]')
console.log('teach button disabled? =', await teachBtn.isDisabled(), '(expect false — focus is a leaf)')
await teachBtn.click()
await page.waitForTimeout(400)

const routeBadgeAtScenario8 = await page.locator('text=/\\d+ route/').innerText()
const routeLen = parseInt(routeBadgeAtScenario8, 10)
console.log('route badge =', routeBadgeAtScenario8, '(expect >= 2)')
if (!(routeLen >= 2)) fail(`expected route length >= 2 after teach, got "${routeBadgeAtScenario8}"`)

const walkPane = page.locator('[aria-label="studio-pane-walk"]')
const stepCards = walkPane.locator('button', { hasText: /step \d/ })
const stepCount = await stepCards.count()
console.log('walk strip step cards =', stepCount, '(expect >= 2)')
if (!(stepCount >= 2)) fail(`expected >= 2 walk step cards, got ${stepCount}`)

const focusTitleAtTeach = (await focusReadout.innerText()).trim()
const lastCardText = (await stepCards.nth(stepCount - 1).innerText()).trim()
console.log('last step card text =', JSON.stringify(lastCardText.replace(/\s+/g, ' ')), '· focused node title =', JSON.stringify(focusTitleAtTeach), '(expect last card to contain it — the goal comes last)')
if (!lastCardText.includes(focusTitleAtTeach)) fail(`last step card "${lastCardText}" does not contain focused node title "${focusTitleAtTeach}"`)

await page.screenshot({ path: `${OUT}/08-teaching-curriculum.png` })
console.log('08-teaching-curriculum.png taken')

// ── 9. roundtrip: coding recenters on bus focus, teaching keeps state ──────
await page.locator('[aria-label="studio-preset-coding"]').click()
await page.waitForTimeout(400)

const focusTitleCoding = (await focusReadout.innerText()).trim()
console.log('coding preset (roundtrip): focus =', JSON.stringify(focusTitleCoding))
for (const t of LENS_TYPES) {
  const header = page.locator(`[data-lens="${t}"] header`)
  const text = await header.innerText()
  if (!text.includes(focusTitleCoding)) fail(`lens ${t} header does not show current bus focus "${focusTitleCoding}": "${text.replace(/\s+/g, ' ')}"`)
}

await page.locator('[aria-label="studio-preset-teaching"]').click()
await page.waitForTimeout(400)

const unfoldNodeCountAfterRoundtrip = await unfoldPane.locator('circle[data-node]').count()
console.log('unfold pane circle[data-node] after roundtrip =', unfoldNodeCountAfterRoundtrip, '(expect', unfoldNodeCountAtScenario7, '— unchanged)')
if (unfoldNodeCountAfterRoundtrip !== unfoldNodeCountAtScenario7) fail(`expected unfold node count unchanged at ${unfoldNodeCountAtScenario7}, got ${unfoldNodeCountAfterRoundtrip}`)

const routeBadgeAfterRoundtrip = await page.locator('text=/\\d+ route/').innerText()
console.log('route badge after roundtrip =', routeBadgeAfterRoundtrip, '(expect', routeBadgeAtScenario8, '— unchanged)')
if (routeBadgeAfterRoundtrip !== routeBadgeAtScenario8) fail(`expected route badge unchanged at "${routeBadgeAtScenario8}", got "${routeBadgeAfterRoundtrip}"`)

await page.screenshot({ path: `${OUT}/09-roundtrip.png` })
console.log('09-roundtrip.png taken')

await browser.close()
if (errors.length) {
  console.log('ERRORS:\n' + errors.join('\n'))
  process.exit(1)
}
console.log('DONE — all assertions passed')
