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
//   10. MAP CAMERA SYNC (asserted in 7, 8 and 10 via the svg's data-tx /
//      data-ty / data-zoom): an unfold-graph open FLIES the map to the node
//      plus its graph neighbors and pins it (neighbors held visible);
//      "teach me this" refits to the WHOLE path; a walk step click pans at
//      CONSTANT zoom; the walk header's ⤢ button refits the path on demand.
//   11. DEEP LAYERS — the tree discloses the corpus below the topic level:
//      expanding the cs flagship spine reaches the level-8 node (Lomuto vs.
//      Hoare); focusing it leaves the topic-only machinery honest (lenses
//      show their topic-level empty state, teach disabled), and focusing a
//      topic again restores the full lens picture.
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

const LENS_TYPES = ['depends_on', 'see_also', 'uses']
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

// ── 2. tree: expand Cryptography, click the TLS & Certificates leaf ───────
const treePane = page.locator('[aria-label="studio-pane-tree"]')
// Domains are expanded by default (depth-2 from ROOT); the Cryptography
// module is one level deeper and starts collapsed. TLS is the corpus's
// richest builds-on cone — the lens/curriculum showcase.
const cryptoToggle = treePane.getByText('Cryptography', { exact: true }).locator('..').locator('button').first()
await cryptoToggle.click()
await page.waitForTimeout(200)
await treePane.getByText('TLS & Certificates', { exact: true }).click()
await page.waitForTimeout(300)

const focusVal = await focusReadout.getAttribute('data-focus')
console.log('focus after leaf click =', focusVal, '(expect cry-tls-certificates)')
if (focusVal !== 'cry-tls-certificates') fail(`expected focus cry-tls-certificates, got ${focusVal}`)

for (const t of LENS_TYPES) {
  const header = page.locator(`[data-lens="${t}"] header`)
  const text = await header.innerText()
  if (!text.includes('TLS & Certificates')) fail(`lens ${t} header does not show focus title: "${text.replace(/\s+/g, ' ')}"`)
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
// Re-focus TLS first: scenario 3 left focus on Cryptographic Hashing, whose
// builds-on cone is only ONE level deep (foundations are nearby in the
// authored corpus), so depth 1 and 2 would render identically there. Depth
// semantics need a deep cone — TLS's reaches 3 levels.
await treePane.getByText('TLS & Certificates', { exact: true }).click()
await page.waitForTimeout(300)
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
const refsOn = await slotOf('lens-see_also')
const dataflowOn = await slotOf('lens-uses')
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

// ── 7. unfold from the hub picker, grow 2 NAMED fresh nodes ────────────────
// Growth is deterministic on purpose: HTTP & REST → TCP & UDP → IP & Routing.
// Blind fresh.first() could land focus on a foundation topic whose builds-on
// cone is EMPTY (the corpus has roots now), which would starve scenario 8's
// curriculum — a named path guarantees a real prerequisite cone.
const unfoldPane = page.locator('[aria-label="studio-pane-unfoldg"]')
const mapPane = page.locator('[aria-label="studio-pane-map"]')
const docPane = page.locator('[aria-label="studio-pane-doc"]')

const mapSvg = mapPane.locator('svg').first()
const mapCam = async () => ({
  tx: parseFloat(await mapSvg.getAttribute('data-tx')),
  ty: parseFloat(await mapSvg.getAttribute('data-ty')),
  zoom: parseFloat(await mapSvg.getAttribute('data-zoom')),
})
const camBefore = await mapCam()

await unfoldPane.getByRole('button', { name: /HTTP & REST/ }).first().click()
await page.waitForTimeout(400)

for (const title of ['TCP & UDP', 'IP & Routing']) {
  const fresh = unfoldPane.locator('button[data-onmap="false"]', { hasText: title })
  if ((await fresh.count()) === 0) {
    fail(`unfold: fresh candidate "${title}" not offered — corpus assumption broke`)
    break
  }
  await fresh.first().click()
  await page.waitForTimeout(500)
}

// map sync: the last unfold open (IP & Routing) must have FLOWN the camera,
// pinned the node, and held its graph neighbors visible on the map
await page.waitForTimeout(700) // let the camera tween land
const camAfterGrow = await mapCam()
console.log('map camera: before =', JSON.stringify(camBefore), '· after unfold growth =', JSON.stringify(camAfterGrow), '(expect moved)')
if (camAfterGrow.tx === camBefore.tx && camAfterGrow.ty === camBefore.ty && camAfterGrow.zoom === camBefore.zoom)
  fail('map camera did not move after unfold-graph opens')
if (!(await mapPane.getByRole('button', { name: /start walk here/ }).isVisible())) fail('map did not pin the unfold-opened node')
if (!(await mapPane.getByText('Link Layer & Ethernet', { exact: true }).isVisible()))
  fail('IP & Routing neighbor "Link Layer & Ethernet" not on the map after the fly (flyHold broken?)')

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

// teach also refits the map to the WHOLE curriculum path
await page.waitForTimeout(700)
const camAfterTeach = await mapCam()
console.log('map camera after teach (whole-path fit) =', JSON.stringify(camAfterTeach), '(expect ≠ after-grow)')
if (camAfterTeach.tx === camAfterGrow.tx && camAfterTeach.zoom === camAfterGrow.zoom)
  fail('map camera did not change for the teach whole-path fit')

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

// ── 10. map camera sync from the walk strip ────────────────────────────────
// Drag the camera away by hand, refit the whole path with the walk header's
// ⤢ button, then click an earlier step card: 'center' mode must PAN the map
// (tx/ty move) without changing altitude (zoom identical).
const mapBox = await mapSvg.boundingBox()
await page.mouse.move(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2)
await page.mouse.down()
await page.mouse.move(mapBox.x + mapBox.width / 2 + 140, mapBox.y + mapBox.height / 2 + 60, { steps: 5 })
await page.mouse.up()
const camDragged = await mapCam()

const fitBtn = page.locator('[aria-label="studio-walk-fit"]')
if (!(await fitBtn.isVisible())) fail('walk header ⤢ path-on-map button missing')
await fitBtn.click()
await page.waitForTimeout(800)
const camFit = await mapCam()
console.log('cam dragged away =', JSON.stringify(camDragged), '→ after ⤢ path on map =', JSON.stringify(camFit), '(expect moved back)')
if (camFit.tx === camDragged.tx && camFit.ty === camDragged.ty) fail('⤢ path on map did not move the camera')

// no \b here: the card's textContent runs "step 2" straight into the title
const step2Card = walkPane.locator('button', { hasText: /step 2(?!\d)/ }).first()
await step2Card.click() // backtrack to step 2 — a walk interaction, so the map pans to it
await page.waitForTimeout(800)
const camStep = await mapCam()
console.log('cam after step-2 card click =', JSON.stringify(camStep), '(expect same zoom, new center)')
if (camStep.zoom !== camFit.zoom) fail(`walk step centering changed zoom: ${camFit.zoom} → ${camStep.zoom}`)
if (Math.abs(camStep.tx - camFit.tx) < 1 && Math.abs(camStep.ty - camFit.ty) < 1) fail('walk step centering did not pan the map')
await page.screenshot({ path: `${OUT}/10-walk-map-sync.png` })
console.log('10-walk-map-sync.png taken')

// ── 11. deep layers: walk the cs flagship spine to level 8 in the tree ─────
await page.locator('[aria-label="studio-preset-coding"]').click()
await page.waitForTimeout(400)

// domains start expanded (depth-2 default); everything below needs its ▸.
// data-node-id hooks were added to TreeRow exactly for this walk.
const SPINE = [
  'alg',
  'alg-sorting-searching',
  'alg-sorting-searching-comparison-sorts',
  'alg-sorting-searching-comparison-sorts-quicksort',
  'alg-sorting-searching-comparison-sorts-quicksort-partitioning-schemes',
]
for (const id of SPINE) {
  const toggle = treePane.locator(`[data-node-id="${id}"] button`).first()
  if (!(await toggle.isVisible().catch(() => false))) {
    fail(`tree row for ${id} has no expand toggle — deep layers missing?`)
    break
  }
  await toggle.click()
  await page.waitForTimeout(150)
}
const L8 = 'alg-sorting-searching-comparison-sorts-quicksort-partitioning-schemes-lomuto-vs-hoare'
const l8row = treePane.locator(`[data-node-id="${L8}"]`)
console.log('level-8 row visible =', await l8row.isVisible(), '(expect true)')
if (!(await l8row.isVisible())) fail('level-8 spine node not reachable in the tree')

// the ⤳ link badge lives at the topic level only
const topicRowText = await treePane.locator('[data-node-id="alg-sorting-searching"]').innerText()
const l8rowText = await l8row.innerText()
if (!topicRowText.includes('⤳')) fail('topic row lost its ⤳ typed-link badge')
if (l8rowText.includes('⤳')) fail('deep row shows a ⤳ badge — deep nodes must not carry typed links')

await l8row.click() // deep leaf: immediate select
await page.waitForTimeout(300)
const deepFocus = await focusReadout.getAttribute('data-focus')
console.log('focus after level-8 click =', deepFocus)
if (deepFocus !== L8) fail(`expected focus ${L8}, got ${deepFocus}`)

const teachDisabledDeep = await page.locator('[aria-label="studio-teach"]').isDisabled()
const lensEmptyState = await page
  .locator('[data-lens="depends_on"]')
  .getByText('lenses read topics — typed links live at the topic level')
  .isVisible()
console.log('deep focus: teach disabled =', teachDisabledDeep, '· lens topic-only empty state =', lensEmptyState, '(both expect true)')
if (!teachDisabledDeep) fail('teach button enabled on a deep (non-topic) focus')
if (!lensEmptyState) fail('deps lens did not show the topic-only empty state for a deep focus')

// focusing a topic again restores the lens picture (container row: select
// fires after the double-click grace timeout)
await treePane.locator('[data-node-id="alg-sorting-searching"]').click()
await page.waitForTimeout(400)
const lensHeaderBack = await page.locator('[data-lens="depends_on"] header').innerText()
if (!lensHeaderBack.includes('Sorting & Searching')) fail(`deps lens did not recenter on the topic: "${lensHeaderBack.replace(/\s+/g, ' ')}"`)
await page.screenshot({ path: `${OUT}/11-deep-spine.png` })
console.log('11-deep-spine.png taken')

await browser.close()
if (errors.length) {
  console.log('ERRORS:\n' + errors.join('\n'))
  process.exit(1)
}
console.log('DONE — all assertions passed')
